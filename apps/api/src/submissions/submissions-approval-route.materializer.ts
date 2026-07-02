import { BadRequestException, Injectable } from '@nestjs/common';
import { ApprovalRequirement, Prisma } from '@workflow-studio/db';
import { SubmissionWithFieldGroupRows } from './types/submission-with-field-group-rows';
import { DocumentDefinitionWithApprovalPolicies } from './types/document-definition-with-approval-policies';

type ApprovalPolicyCondition = {
  fieldDefinitionId: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | number | boolean;
};

@Injectable()
export class SubmissionsApprovalRouteMaterializer {
  async materialize(
    tx: Prisma.TransactionClient,
    params: {
      submission: SubmissionWithFieldGroupRows;
      documentDefinition: DocumentDefinitionWithApprovalPolicies;
      applicantDepartmentId: bigint;
      submittedAt: Date;
    },
  ): Promise<bigint | null> {
    const applicablePolicies =
      params.documentDefinition.approvalPolicies.filter((policy) =>
        this.matchesApprovalPolicyCondition(policy, params.submission),
      );

    let firstAppliedApprovalPolicyId: bigint | null = null;

    for (const [index, policy] of applicablePolicies.entries()) {
      const appliedPolicy = await tx.appliedApprovalPolicy.create({
        data: {
          submissionId: params.submission.id,
          approvalPolicyId: policy.id,
          position: index + 1,
          status: 'pending',
        },
      });

      firstAppliedApprovalPolicyId ??= appliedPolicy.id;

      for (const requirement of policy.requirements) {
        const appliedRequirement = await tx.appliedApprovalRequirement.create({
          data: {
            appliedApprovalPolicyId: appliedPolicy.id,
            approvalRequirementId: requirement.id,
            status: 'pending',
            requiredCount: requirement.requiredCount,
            approvedCount: 0,
          },
        });

        const approverUserIds = await this.resolveApproverUserIds(tx, {
          applicantDepartmentId: params.applicantDepartmentId,
          requirement,
          submittedAt: params.submittedAt,
        });

        if (approverUserIds.length < requirement.requiredCount) {
          throw new BadRequestException('Not enough approvers');
        }

        await tx.approver.createMany({
          data: approverUserIds.map((userId) => ({
            appliedApprovalRequirementId: appliedRequirement.id,
            userId,
            status: 'pending',
          })),
          skipDuplicates: true,
        });
      }
    }

    return firstAppliedApprovalPolicyId;
  }
  private matchesApprovalPolicyCondition(
    policy: {
      condition: Prisma.JsonValue | null;
    },
    submission: SubmissionWithFieldGroupRows,
  ): boolean {
    if (policy.condition === null) {
      return true;
    }

    if (!this.isApprovalPolicyCondition(policy.condition)) {
      throw new BadRequestException('Invalid approval policy condition');
    }

    const condition = policy.condition;

    const fieldValue = submission.fieldGroupRows
      .flatMap((row) => row.fieldValues)
      .find(
        (value) =>
          value.fieldDefinitionId.toString() === condition.fieldDefinitionId,
      );

    if (!fieldValue) {
      return false;
    }

    return this.compareApprovalPolicyConditionValues(
      fieldValue.value,
      condition.operator,
      condition.value,
    );
  }
  private compareApprovalPolicyConditionValues(
    actual: Prisma.JsonValue | null,
    operator: ApprovalPolicyCondition['operator'],
    expected: string | number | boolean,
  ): boolean {
    if (
      actual === null ||
      Array.isArray(actual) ||
      typeof actual === 'object'
    ) {
      return false;
    }

    switch (operator) {
      case 'eq':
        return actual === expected;

      case 'ne':
        return actual !== expected;

      case 'gt':
        return this.compareAsNumber(actual, expected, (a, b) => a > b);

      case 'gte':
        return this.compareAsNumber(actual, expected, (a, b) => a >= b);

      case 'lt':
        return this.compareAsNumber(actual, expected, (a, b) => a < b);

      case 'lte':
        return this.compareAsNumber(actual, expected, (a, b) => a <= b);
    }
  }

  private compareAsNumber(
    actual: string | number | boolean,
    expected: string | number | boolean,
    compare: (actual: number, expected: number) => boolean,
  ): boolean {
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);

    if (Number.isNaN(actualNumber) || Number.isNaN(expectedNumber)) {
      return false;
    }

    return compare(actualNumber, expectedNumber);
  }

  private isApprovalPolicyCondition(
    condition: Prisma.JsonValue,
  ): condition is ApprovalPolicyCondition {
    if (
      condition === null ||
      typeof condition !== 'object' ||
      Array.isArray(condition)
    ) {
      return false;
    }

    return (
      typeof condition.fieldDefinitionId === 'string' &&
      this.isApprovalPolicyOperator(condition.operator) &&
      this.isApprovalPolicyComparableValue(condition.value)
    );
  }

  private isApprovalPolicyOperator(
    operator: unknown,
  ): operator is ApprovalPolicyCondition['operator'] {
    return (
      operator === 'eq' ||
      operator === 'ne' ||
      operator === 'gt' ||
      operator === 'gte' ||
      operator === 'lt' ||
      operator === 'lte'
    );
  }

  private isApprovalPolicyComparableValue(
    value: unknown,
  ): value is string | number | boolean {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private async resolveApproverUserIds(
    tx: Prisma.TransactionClient,
    params: {
      requirement: ApprovalRequirement;
      applicantDepartmentId: bigint;
      submittedAt: Date;
    },
  ): Promise<bigint[]> {
    const departmentIds = await this.resolveTargetDepartmentIds(tx, {
      applicantDepartmentId: params.applicantDepartmentId,
      departmentScope: params.requirement.departmentScope,
    });

    const positionIds = await this.resolveTargetPositionIds(tx, {
      positionOperator: params.requirement.positionOperator,
      positionId: params.requirement.positionId,
      upperPositionId: params.requirement.upperPositionId,
    });

    const memberships = await tx.departmentMembership.findMany({
      where: {
        departmentId: { in: departmentIds },
        positionId: { in: positionIds },
        joinedAt: { lte: params.submittedAt },
        OR: [{ leftAt: null }, { leftAt: { gt: params.submittedAt } }],
        deletedAt: null,
        user: {
          deletedAt: null,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    return memberships.map((membership) => membership.userId);
  }
  private async resolveTargetDepartmentIds(
    tx: Prisma.TransactionClient,
    params: {
      applicantDepartmentId: bigint;
      departmentScope: string;
    },
  ): Promise<bigint[]> {
    switch (params.departmentScope) {
      case 'same_department':
        return [params.applicantDepartmentId];

      case 'same_tree':
        return this.resolveAncestorDepartmentIds(
          tx,
          params.applicantDepartmentId,
        );

      case 'entire_company': {
        const departments = await tx.department.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });

        return departments.map((department) => department.id);
      }

      default:
        throw new BadRequestException('Invalid department scope');
    }
  }

  private async resolveAncestorDepartmentIds(
    tx: Prisma.TransactionClient,
    departmentId: bigint,
  ): Promise<bigint[]> {
    const departmentIds: bigint[] = [];
    let currentDepartmentId: bigint | null = departmentId;

    while (currentDepartmentId !== null) {
      const department: { id: bigint; parentId: bigint | null } | null =
        await tx.department.findFirst({
          where: {
            id: currentDepartmentId,
            deletedAt: null,
          },
          select: {
            id: true,
            parentId: true,
          },
        });

      if (!department) {
        throw new BadRequestException('Applicant department not found');
      }

      departmentIds.push(department.id);
      currentDepartmentId = department.parentId;
    }

    return departmentIds;
  }

  private async resolveTargetPositionIds(
    tx: Prisma.TransactionClient,
    params: {
      positionOperator: string;
      positionId: bigint;
      upperPositionId: bigint | null;
    },
  ): Promise<bigint[]> {
    const basePosition = await tx.position.findFirst({
      where: {
        id: params.positionId,
        deletedAt: null,
      },
      select: {
        id: true,
        rank: true,
      },
    });

    if (!basePosition) {
      throw new BadRequestException('Position not found');
    }

    switch (params.positionOperator) {
      case 'eq':
        return [basePosition.id];

      case 'gte': {
        const positions = await tx.position.findMany({
          where: {
            rank: {
              gte: basePosition.rank,
            },
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        return positions.map((position) => position.id);
      }

      case 'between': {
        if (params.upperPositionId === null) {
          throw new BadRequestException('Upper position is required');
        }

        const upperPosition = await tx.position.findFirst({
          where: {
            id: params.upperPositionId,
            deletedAt: null,
          },
          select: {
            rank: true,
          },
        });

        if (!upperPosition) {
          throw new BadRequestException('Upper position not found');
        }

        const lowerRank = Math.min(basePosition.rank, upperPosition.rank);
        const upperRank = Math.max(basePosition.rank, upperPosition.rank);

        const positions = await tx.position.findMany({
          where: {
            rank: {
              gte: lowerRank,
              lte: upperRank,
            },
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        return positions.map((position) => position.id);
      }

      default:
        throw new BadRequestException('Invalid position operator');
    }
  }
}
