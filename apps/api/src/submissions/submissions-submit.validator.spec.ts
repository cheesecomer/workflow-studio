import { BadRequestException } from '@nestjs/common';
import { SubmissionsSubmitValidator } from './submissions-submit.validator';
import { SubmissionWithFieldGroupRows } from './types/submission-with-field-group-rows';
import { DocumentDefinitionWithFieldGroups } from './types/document-definition-with-field-groups';

describe('SubmissionsSubmitValidator', () => {
  let validator: SubmissionsSubmitValidator;

  beforeEach(() => {
    validator = new SubmissionsSubmitValidator();
  });

  const createDocumentDefinition: () => DocumentDefinitionWithFieldGroups =
    () => ({
      id: 1n,
      fieldGroupDefinitions: [
        {
          id: 10n,
          repeatable: false,
          minRows: 1,
          maxRows: 1,
          fieldDefinitions: [
            {
              id: 100n,
              required: true,
            },
            {
              id: 101n,
              required: false,
            },
          ],
        },
        {
          id: 20n,
          repeatable: true,
          minRows: 1,
          maxRows: 2,
          fieldDefinitions: [
            {
              id: 200n,
              required: true,
            },
          ],
        },
      ],
    });

  const createSubmission: () => SubmissionWithFieldGroupRows = () => ({
    id: 1n,
    fieldGroupRows: [
      {
        id: 1000n,
        fieldGroupDefinitionId: 10n,
        fieldValues: [
          {
            id: 10000n,
            fieldDefinitionId: 100n,
            value: 'title',
            submissionFieldGroupRowId: 1000n,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        submissionId: 1n,
        position: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2000n,
        fieldGroupDefinitionId: 20n,
        fieldValues: [
          {
            id: 20000n,
            fieldDefinitionId: 200n,
            value: 3000,
            submissionFieldGroupRowId: 1000n,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        submissionId: 1n,
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    documentDefinitionId: 1n,
    createdById: 1n,
    submittedById: null,
    applicantDepartmentId: null,
    status: 'draft',
    currentAppliedApprovalPolicyId: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('validates valid submission field groups', () => {
    expect(() =>
      validator.validate(createSubmission(), createDocumentDefinition()),
    ).not.toThrow();
  });

  it('throws BadRequestException when field group does not belong to document definition', () => {
    const submission = createSubmission();
    submission.fieldGroupRows[0].fieldGroupDefinitionId = 999n;

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when non-repeatable field group has multiple rows', () => {
    const submission = createSubmission();

    submission.fieldGroupRows.push({
      id: 1001n,
      fieldGroupDefinitionId: 10n,
      fieldValues: [
        {
          id: 10001n,
          fieldDefinitionId: 100n,
          value: 'another title',
          submissionFieldGroupRowId: 1001n,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      submissionId: 1n,
      position: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when rows are fewer than minRows', () => {
    const submission = createSubmission();

    submission.fieldGroupRows = submission.fieldGroupRows.filter(
      (row) => row.fieldGroupDefinitionId !== 20n,
    );

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when rows are more than maxRows', () => {
    const submission = createSubmission();

    submission.fieldGroupRows.push(
      {
        id: 2001n,
        fieldGroupDefinitionId: 20n,
        fieldValues: [
          {
            id: 20001n,
            fieldDefinitionId: 200n,
            value: 3000,
            submissionFieldGroupRowId: 2000n,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        submissionId: 1n,
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2002n,
        fieldGroupDefinitionId: 20n,
        fieldValues: [
          {
            id: 20002n,
            fieldDefinitionId: 200n,
            value: 4000,
            submissionFieldGroupRowId: 2000n,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        submissionId: 1n,
        position: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when field definition does not belong to field group', () => {
    const submission = createSubmission();

    submission.fieldGroupRows[0].fieldValues.push({
      id: 10001n,
      fieldDefinitionId: 200n,
      value: 3000,
      submissionFieldGroupRowId: 1000n,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when field definition is duplicated in row', () => {
    const submission = createSubmission();

    submission.fieldGroupRows[0].fieldValues.push({
      id: 10001n,
      fieldDefinitionId: 100n,
      value: 'duplicated',
      submissionFieldGroupRowId: 1000n,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when required field is missing', () => {
    const submission = createSubmission();

    submission.fieldGroupRows[0].fieldValues = [];

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when required field value is null', () => {
    const submission = createSubmission();

    submission.fieldGroupRows[0].fieldValues[0].value = null;

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException when required field value is empty string', () => {
    const submission = createSubmission();

    submission.fieldGroupRows[0].fieldValues[0].value = '';

    expect(() =>
      validator.validate(submission, createDocumentDefinition()),
    ).toThrow(BadRequestException);
  });
});
