import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@workflow-studio/db';
import { SubmissionWithFieldGroupRows } from './types/submission-with-field-group-rows';
import { DocumentDefinitionWithFieldGroups } from './types/document-definition-with-field-groups';

@Injectable()
export class SubmissionsSubmitValidator {
  validate(
    submission: SubmissionWithFieldGroupRows,
    documentDefinition: DocumentDefinitionWithFieldGroups,
  ) {
    const groupDefinitionById = new Map(
      documentDefinition.fieldGroupDefinitions.map((groupDefinition) => [
        groupDefinition.id,
        groupDefinition,
      ]),
    );

    for (const row of submission.fieldGroupRows) {
      if (!groupDefinitionById.has(row.fieldGroupDefinitionId)) {
        throw new BadRequestException(
          `Field group ${row.fieldGroupDefinitionId.toString()} does not belong to document definition`,
        );
      }
    }

    const rowsByGroupId = new Map<bigint, typeof submission.fieldGroupRows>();

    for (const row of submission.fieldGroupRows) {
      const rows = rowsByGroupId.get(row.fieldGroupDefinitionId) ?? [];
      rows.push(row);
      rowsByGroupId.set(row.fieldGroupDefinitionId, rows);
    }

    for (const groupDefinition of documentDefinition.fieldGroupDefinitions) {
      const rows = rowsByGroupId.get(groupDefinition.id) ?? [];

      if (!groupDefinition.repeatable && rows.length > 1) {
        throw new BadRequestException(
          `Field group ${groupDefinition.id.toString()} is not repeatable`,
        );
      }

      if (
        groupDefinition.minRows !== null &&
        rows.length < groupDefinition.minRows
      ) {
        throw new BadRequestException(
          `Field group ${groupDefinition.id.toString()} has fewer rows than minRows`,
        );
      }

      if (
        groupDefinition.maxRows !== null &&
        rows.length > groupDefinition.maxRows
      ) {
        throw new BadRequestException(
          `Field group ${groupDefinition.id.toString()} has more rows than maxRows`,
        );
      }

      const fieldDefinitionById = new Map(
        groupDefinition.fieldDefinitions.map((fieldDefinition) => [
          fieldDefinition.id,
          fieldDefinition,
        ]),
      );

      for (const row of rows) {
        const seenFieldDefinitionIds = new Set<bigint>();

        for (const fieldValue of row.fieldValues) {
          if (seenFieldDefinitionIds.has(fieldValue.fieldDefinitionId)) {
            throw new BadRequestException(
              `Field definition ${fieldValue.fieldDefinitionId.toString()} is duplicated in row`,
            );
          }

          seenFieldDefinitionIds.add(fieldValue.fieldDefinitionId);

          if (!fieldDefinitionById.has(fieldValue.fieldDefinitionId)) {
            throw new BadRequestException(
              `Field definition ${fieldValue.fieldDefinitionId.toString()} does not belong to field group ${groupDefinition.id.toString()}`,
            );
          }
        }

        for (const fieldDefinition of groupDefinition.fieldDefinitions) {
          if (!fieldDefinition.required) {
            continue;
          }

          const fieldValue = row.fieldValues.find(
            (value) => value.fieldDefinitionId === fieldDefinition.id,
          );

          if (!fieldValue || this.isEmptySubmissionValue(fieldValue.value)) {
            throw new BadRequestException(
              `Required field ${fieldDefinition.id.toString()} is missing`,
            );
          }
        }
      }
    }
  }

  private isEmptySubmissionValue(value: Prisma.JsonValue | null) {
    return value === null || value === '';
  }
}
