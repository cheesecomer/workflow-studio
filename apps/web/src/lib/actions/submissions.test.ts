vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../api/submissions', () => ({
  createSubmission: vi.fn(),
  updateSubmission: vi.fn(),
  submitSubmission: vi.fn(),
  deleteSubmission: vi.fn(),
  withdrawSubmission: vi.fn(),
  approveSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
}));

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  approveSubmission,
  createSubmission,
  deleteSubmission,
  rejectSubmission,
  submitSubmission,
  updateSubmission,
  withdrawSubmission,
} from '../api/submissions';
import { ApiClientError } from '../api/client';
import { buildFieldName } from '../submission-form-data';
import {
  approveSubmissionAction,
  createSubmissionAction,
  deleteSubmissionAction,
  rejectSubmissionAction,
  submitSubmissionAction,
  submitSubmissionDirectlyAction,
  updateSubmissionAction,
  withdrawSubmissionAction,
} from './submissions';
import type { FieldGroupDefinition } from '@/types/api';

const group: FieldGroupDefinition = {
  id: '1',
  key: 'basic',
  label: '基本情報',
  position: 1,
  repeatable: false,
  minRows: 1,
  fieldDefinitions: [
    {
      id: '11',
      key: 'subject',
      label: '件名',
      fieldType: 'text',
      required: true,
      position: 1,
      settings: {},
    },
  ],
};

function formDataWithSubject(value: string): FormData {
  const formData = new FormData();
  formData.set(buildFieldName('1', 'row-a', '11'), value);
  return formData;
}

const expectedFieldGroupRows = [
  {
    fieldGroupDefinitionId: '1',
    position: 1,
    fieldValues: [{ fieldDefinitionId: '11', value: '出張申請' }],
  },
];

describe('createSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(createSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('parses the form, creates the submission, revalidates, and redirects to the edit page', async () => {
    vi.mocked(createSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(
      createSubmissionAction(
        '10',
        [group],
        null,
        formDataWithSubject('出張申請'),
      ),
    ).rejects.toThrow('REDIRECT:/submissions/1/edit');

    expect(createSubmission).toHaveBeenCalledWith({
      documentDefinitionId: '10',
      fieldGroupRows: expectedFieldGroupRows,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(redirect).toHaveBeenCalledWith('/submissions/1/edit');
  });

  it('returns an error message and does not redirect when the API rejects', async () => {
    vi.mocked(createSubmission).mockRejectedValue(
      new ApiClientError(400, {
        statusCode: 400,
        message: 'Invalid field definition',
      }),
    );

    const result = await createSubmissionAction(
      '10',
      [group],
      null,
      formDataWithSubject('出張申請'),
    );

    expect(result).toEqual({ ok: false, message: 'Invalid field definition' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('rethrows unexpected (non-ApiClientError) errors', async () => {
    vi.mocked(createSubmission).mockRejectedValue(new Error('network down'));

    await expect(
      createSubmissionAction('10', [group], null, formDataWithSubject('x')),
    ).rejects.toThrow('network down');
  });
});

describe('updateSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(updateSubmission).mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it('saves the draft, revalidates the edit page, and returns a success message without redirecting', async () => {
    vi.mocked(updateSubmission).mockResolvedValue({ id: '1' } as never);

    const result = await updateSubmissionAction(
      '1',
      [group],
      null,
      formDataWithSubject('出張申請'),
    );

    expect(updateSubmission).toHaveBeenCalledWith('1', {
      fieldGroupRows: expectedFieldGroupRows,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1/edit');
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, message: '下書きを保存しました' });
  });

  it('returns an error message when the API rejects', async () => {
    vi.mocked(updateSubmission).mockRejectedValue(
      new ApiClientError(400, { statusCode: 400, message: 'Invalid status' }),
    );

    const result = await updateSubmissionAction(
      '1',
      [group],
      null,
      formDataWithSubject('出張申請'),
    );

    expect(result).toEqual({ ok: false, message: 'Invalid status' });
  });

  it('rethrows unexpected (non-ApiClientError) errors', async () => {
    vi.mocked(updateSubmission).mockRejectedValue(new Error('network down'));

    await expect(
      updateSubmissionAction('1', [group], null, formDataWithSubject('x')),
    ).rejects.toThrow('network down');
  });
});

describe('submitSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(updateSubmission).mockReset();
    vi.mocked(submitSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('saves the current form values before submitting, then redirects to the detail page', async () => {
    vi.mocked(updateSubmission).mockResolvedValue({ id: '1' } as never);
    vi.mocked(submitSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(
      submitSubmissionAction(
        '1',
        [group],
        null,
        formDataWithSubject('出張申請'),
      ),
    ).rejects.toThrow('REDIRECT:/submissions/1');

    expect(updateSubmission).toHaveBeenCalledWith('1', {
      fieldGroupRows: expectedFieldGroupRows,
    });
    expect(submitSubmission).toHaveBeenCalledWith('1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1/edit');
    expect(redirect).toHaveBeenCalledWith('/submissions/1');
  });

  it('does not call submit when saving the current values fails', async () => {
    vi.mocked(updateSubmission).mockRejectedValue(
      new ApiClientError(400, { statusCode: 400, message: 'Invalid status' }),
    );

    const result = await submitSubmissionAction(
      '1',
      [group],
      null,
      formDataWithSubject('出張申請'),
    );

    expect(result).toEqual({ ok: false, message: 'Invalid status' });
    expect(submitSubmission).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns an error message when submit itself rejects', async () => {
    vi.mocked(updateSubmission).mockResolvedValue({ id: '1' } as never);
    vi.mocked(submitSubmission).mockRejectedValue(
      new ApiClientError(400, {
        statusCode: 400,
        message: 'Required fields are missing',
      }),
    );

    const result = await submitSubmissionAction(
      '1',
      [group],
      null,
      formDataWithSubject('出張申請'),
    );

    expect(result).toEqual({
      ok: false,
      message: 'Required fields are missing',
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('rethrows unexpected (non-ApiClientError) errors', async () => {
    vi.mocked(updateSubmission).mockResolvedValue({ id: '1' } as never);
    vi.mocked(submitSubmission).mockRejectedValue(new Error('network down'));

    await expect(
      submitSubmissionAction('1', [group], null, formDataWithSubject('x')),
    ).rejects.toThrow('network down');
  });
});

describe('submitSubmissionDirectlyAction', () => {
  afterEach(() => {
    vi.mocked(submitSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('submits without saving any form values, then redirects to the detail page', async () => {
    vi.mocked(submitSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(submitSubmissionDirectlyAction('1')).rejects.toThrow(
      'REDIRECT:/submissions/1',
    );

    expect(submitSubmission).toHaveBeenCalledWith('1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1/edit');
    expect(redirect).toHaveBeenCalledWith('/submissions/1');
  });
});

describe('withdrawSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(withdrawSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('withdraws the submission, revalidates, and redirects to the detail page', async () => {
    vi.mocked(withdrawSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(withdrawSubmissionAction('1')).rejects.toThrow(
      'REDIRECT:/submissions/1',
    );

    expect(withdrawSubmission).toHaveBeenCalledWith('1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1/edit');
    expect(redirect).toHaveBeenCalledWith('/submissions/1');
  });
});

describe('deleteSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(deleteSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('deletes the submission, revalidates, and redirects to the list', async () => {
    vi.mocked(deleteSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(deleteSubmissionAction('1')).rejects.toThrow(
      'REDIRECT:/submissions',
    );

    expect(deleteSubmission).toHaveBeenCalledWith('1');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(redirect).toHaveBeenCalledWith('/submissions');
  });
});

function formDataWithComment(comment?: string): FormData {
  const formData = new FormData();
  if (comment !== undefined) {
    formData.set('comment', comment);
  }
  return formData;
}

describe('approveSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(approveSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('approves with the given comment, revalidates, and redirects to the detail page', async () => {
    vi.mocked(approveSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(
      approveSubmissionAction('1', formDataWithComment('LGTM')),
    ).rejects.toThrow('REDIRECT:/submissions/1');

    expect(approveSubmission).toHaveBeenCalledWith('1', 'LGTM');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1');
    expect(revalidatePath).toHaveBeenCalledWith('/approvals');
    expect(redirect).toHaveBeenCalledWith('/submissions/1');
  });

  it('passes undefined when the comment is blank', async () => {
    vi.mocked(approveSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(
      approveSubmissionAction('1', formDataWithComment('   ')),
    ).rejects.toThrow('REDIRECT:/submissions/1');

    expect(approveSubmission).toHaveBeenCalledWith('1', undefined);
  });

  it('passes undefined when there is no comment field at all', async () => {
    vi.mocked(approveSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(
      approveSubmissionAction('1', formDataWithComment()),
    ).rejects.toThrow('REDIRECT:/submissions/1');

    expect(approveSubmission).toHaveBeenCalledWith('1', undefined);
  });
});

describe('rejectSubmissionAction', () => {
  afterEach(() => {
    vi.mocked(rejectSubmission).mockReset();
    vi.mocked(redirect).mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it('rejects with the given comment, revalidates, and redirects to the detail page', async () => {
    vi.mocked(rejectSubmission).mockResolvedValue({ id: '1' } as never);

    await expect(
      rejectSubmissionAction('1', formDataWithComment('要修正')),
    ).rejects.toThrow('REDIRECT:/submissions/1');

    expect(rejectSubmission).toHaveBeenCalledWith('1', '要修正');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions');
    expect(revalidatePath).toHaveBeenCalledWith('/submissions/1');
    expect(revalidatePath).toHaveBeenCalledWith('/approvals');
    expect(redirect).toHaveBeenCalledWith('/submissions/1');
  });
});
