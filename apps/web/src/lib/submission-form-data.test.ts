import {
  buildFieldGroupRowsFromFormData,
  buildFieldName,
} from './submission-form-data';
import type { FieldGroupDefinition } from '@/types/api';

const basicInfoGroup: FieldGroupDefinition = {
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
    {
      id: '12',
      key: 'amount',
      label: '金額',
      fieldType: 'number',
      required: true,
      position: 2,
      settings: {},
    },
  ],
};

const expenseLinesGroup: FieldGroupDefinition = {
  id: '2',
  key: 'lines',
  label: '交通費明細',
  position: 2,
  repeatable: true,
  minRows: 1,
  fieldDefinitions: [
    {
      id: '21',
      key: 'date',
      label: '日付',
      fieldType: 'date',
      required: true,
      position: 1,
      settings: {},
    },
    {
      id: '22',
      key: 'method',
      label: '交通手段',
      fieldType: 'select',
      required: false,
      position: 2,
      settings: {
        options: [
          { value: 'train', label: '電車' },
          { value: 'bus', label: 'バス' },
        ],
      },
    },
  ],
};

describe('buildFieldName', () => {
  it('joins the group id, row key, and field id with the fg_ prefix', () => {
    expect(buildFieldName('1', 'row-a', '11')).toBe('fg_1.row-a.11');
  });
});

describe('buildFieldGroupRowsFromFormData', () => {
  it('parses a single non-repeatable group into one row', () => {
    const formData = new FormData();
    formData.set(buildFieldName('1', 'row-a', '11'), '6月交通費精算');
    formData.set(buildFieldName('1', 'row-a', '12'), '3000');

    const rows = buildFieldGroupRowsFromFormData(formData, [basicInfoGroup]);

    expect(rows).toEqual([
      {
        fieldGroupDefinitionId: '1',
        position: 1,
        fieldValues: [
          { fieldDefinitionId: '11', value: '6月交通費精算' },
          { fieldDefinitionId: '12', value: 3000 },
        ],
      },
    ]);
  });

  it('coerces number fields with Number() and leaves other types as strings', () => {
    const formData = new FormData();
    formData.set(buildFieldName('2', 'row-a', '21'), '2026-06-30');
    formData.set(buildFieldName('2', 'row-a', '22'), 'train');

    const rows = buildFieldGroupRowsFromFormData(formData, [
      expenseLinesGroup,
    ]);

    expect(rows[0].fieldValues).toEqual([
      { fieldDefinitionId: '21', value: '2026-06-30' },
      { fieldDefinitionId: '22', value: 'train' },
    ]);
  });

  it('converts empty strings to null regardless of field type', () => {
    const formData = new FormData();
    formData.set(buildFieldName('1', 'row-a', '11'), '');
    formData.set(buildFieldName('1', 'row-a', '12'), '');

    const rows = buildFieldGroupRowsFromFormData(formData, [basicInfoGroup]);

    expect(rows[0].fieldValues).toEqual([
      { fieldDefinitionId: '11', value: null },
      { fieldDefinitionId: '12', value: null },
    ]);
  });

  it('numbers repeatable rows sequentially starting at 1 within their group', () => {
    const formData = new FormData();
    formData.set(buildFieldName('2', 'row-a', '21'), '2026-06-30');
    formData.set(buildFieldName('2', 'row-a', '22'), 'train');
    formData.set(buildFieldName('2', 'row-b', '21'), '2026-07-01');
    formData.set(buildFieldName('2', 'row-b', '22'), 'bus');

    const rows = buildFieldGroupRowsFromFormData(formData, [
      expenseLinesGroup,
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].position).toBe(1);
    expect(rows[1].position).toBe(2);
    expect(rows[0].fieldValues).toEqual([
      { fieldDefinitionId: '21', value: '2026-06-30' },
      { fieldDefinitionId: '22', value: 'train' },
    ]);
    expect(rows[1].fieldValues).toEqual([
      { fieldDefinitionId: '21', value: '2026-07-01' },
      { fieldDefinitionId: '22', value: 'bus' },
    ]);
  });

  it('orders output rows by group definition order, not FormData iteration order', () => {
    const formData = new FormData();
    // Intentionally append the second group's field before the first
    // group's — output must still follow `groups` order (basicInfo, then
    // expenseLines), not append order.
    formData.set(buildFieldName('2', 'row-a', '21'), '2026-06-30');
    formData.set(buildFieldName('1', 'row-a', '11'), '出張申請');

    const rows = buildFieldGroupRowsFromFormData(formData, [
      basicInfoGroup,
      expenseLinesGroup,
    ]);

    expect(rows.map((row) => row.fieldGroupDefinitionId)).toEqual(['1', '2']);
  });

  it('resets row position numbering independently per group', () => {
    const formData = new FormData();
    formData.set(buildFieldName('1', 'row-a', '11'), '出張申請');
    formData.set(buildFieldName('1', 'row-a', '12'), '1000');
    formData.set(buildFieldName('2', 'row-a', '21'), '2026-06-30');
    formData.set(buildFieldName('2', 'row-b', '21'), '2026-07-01');

    const rows = buildFieldGroupRowsFromFormData(formData, [
      basicInfoGroup,
      expenseLinesGroup,
    ]);

    const basicRow = rows.find((row) => row.fieldGroupDefinitionId === '1');
    const lineRows = rows.filter((row) => row.fieldGroupDefinitionId === '2');

    expect(basicRow?.position).toBe(1);
    expect(lineRows.map((row) => row.position)).toEqual([1, 2]);
  });

  it('ignores form fields that do not match the fg_ naming convention', () => {
    const formData = new FormData();
    formData.set(buildFieldName('1', 'row-a', '11'), '出張申請');
    formData.set('unrelated-field', 'ignored');

    const rows = buildFieldGroupRowsFromFormData(formData, [basicInfoGroup]);

    expect(rows).toHaveLength(1);
    expect(rows[0].fieldValues).toHaveLength(1);
  });

  it('drops rows belonging to a group not present in the given definitions', () => {
    const formData = new FormData();
    formData.set(buildFieldName('999', 'row-a', '11'), 'unknown group');

    const rows = buildFieldGroupRowsFromFormData(formData, [basicInfoGroup]);

    expect(rows).toEqual([]);
  });
});
