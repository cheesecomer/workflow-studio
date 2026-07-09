// class-transformer's @Type() decorator needs Reflect.getMetadata at module
// load time. Other spec files get this for free by importing @nestjs/testing
// first (which pulls it in as a side effect); this file imports the DTOs
// directly, so it needs the polyfill itself.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSubmissionDto } from './create-submission.dto';
import { UpdateSubmissionDto } from './update-submission.dto';
import { ApproveSubmissionDto } from './approve-submission.dto';
import { RejectSubmissionDto } from './reject-submission.dto';

// Regression coverage for a bug where these DTOs had zero class-validator
// decorators: with the app's real ValidationPipe ({ whitelist: true,
// forbidNonWhitelisted: true } in main.ts), every property on an
// undecorated DTO is treated as unrecognized and rejected — meaning
// POST /submissions (and update/approve/reject) rejected every request in
// the real running app. The e2e tests never caught this because they didn't
// register the same ValidationPipe main.ts does (now fixed alongside this).
// These tests validate at the DTO level directly, independent of any
// particular pipe wiring, so this class of regression fails fast here too.
async function validateWhitelisted(instance: object) {
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('CreateSubmissionDto', () => {
  it('accepts a well-formed payload with no validation errors', async () => {
    const instance = plainToInstance(CreateSubmissionDto, {
      documentDefinitionId: '10',
      fieldGroupRows: [
        {
          fieldGroupDefinitionId: '1',
          position: 1,
          fieldValues: [{ fieldDefinitionId: '11', value: '6月交通費精算' }],
        },
      ],
    });

    await expect(validateWhitelisted(instance)).resolves.toEqual([]);
  });

  it('accepts a null field value (SubmissionFieldValue.value is nullable)', async () => {
    const instance = plainToInstance(CreateSubmissionDto, {
      documentDefinitionId: '10',
      fieldGroupRows: [
        {
          fieldGroupDefinitionId: '1',
          position: 1,
          fieldValues: [{ fieldDefinitionId: '11', value: null }],
        },
      ],
    });

    await expect(validateWhitelisted(instance)).resolves.toEqual([]);
  });

  it('rejects an unrecognized top-level property', async () => {
    const instance = plainToInstance(CreateSubmissionDto, {
      documentDefinitionId: '10',
      fieldGroupRows: [],
      notAValidProperty: 'x',
    });

    const errors = await validateWhitelisted(instance);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-numeric-string documentDefinitionId', async () => {
    const instance = plainToInstance(CreateSubmissionDto, {
      documentDefinitionId: 'not-a-number',
      fieldGroupRows: [],
    });

    const errors = await validateWhitelisted(instance);
    expect(errors.some((e) => e.property === 'documentDefinitionId')).toBe(
      true,
    );
  });
});

describe('UpdateSubmissionDto', () => {
  it('accepts a well-formed payload with no validation errors', async () => {
    const instance = plainToInstance(UpdateSubmissionDto, {
      fieldGroupRows: [
        {
          fieldGroupDefinitionId: '1',
          position: 1,
          fieldValues: [{ fieldDefinitionId: '11', value: 3000 }],
        },
      ],
    });

    await expect(validateWhitelisted(instance)).resolves.toEqual([]);
  });
});

describe('ApproveSubmissionDto', () => {
  it('accepts an empty payload (comment is optional)', async () => {
    const instance = plainToInstance(ApproveSubmissionDto, {});
    await expect(validateWhitelisted(instance)).resolves.toEqual([]);
  });

  it('accepts a payload with a comment', async () => {
    const instance = plainToInstance(ApproveSubmissionDto, {
      comment: 'LGTM',
    });
    await expect(validateWhitelisted(instance)).resolves.toEqual([]);
  });

  it('rejects an unrecognized property', async () => {
    const instance = plainToInstance(ApproveSubmissionDto, {
      notAValidProperty: 'x',
    });
    const errors = await validateWhitelisted(instance);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RejectSubmissionDto', () => {
  it('accepts an empty payload (comment is optional)', async () => {
    const instance = plainToInstance(RejectSubmissionDto, {});
    await expect(validateWhitelisted(instance)).resolves.toEqual([]);
  });

  it('rejects an unrecognized property', async () => {
    const instance = plainToInstance(RejectSubmissionDto, {
      notAValidProperty: 'x',
    });
    const errors = await validateWhitelisted(instance);
    expect(errors.length).toBeGreaterThan(0);
  });
});
