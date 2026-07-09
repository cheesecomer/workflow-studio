import {
  buildDocumentDraft,
  parseDocumentDraft,
  type DocumentBuilderState,
} from './document-draft-state';

describe('parseDocumentDraft', () => {
  it('returns empty groups/policies for an empty object (a brand-new document)', () => {
    const result = parseDocumentDraft({});

    expect(result.groups).toEqual([]);
    expect(result.policies).toEqual([]);
  });

  it.each([null, undefined, [], 'not-an-object', 42])(
    'returns empty groups/policies when the top-level value itself is %p',
    (raw) => {
      const result = parseDocumentDraft(raw);

      expect(result.groups).toEqual([]);
      expect(result.policies).toEqual([]);
    },
  );

  it('assigns each group and field a stable client-only id', () => {
    const result = parseDocumentDraft({
      groups: [
        {
          key: 'basic',
          label: '基本情報',
          repeatable: false,
          minRows: 1,
          fields: [
            {
              key: 'subject',
              label: '件名',
              fieldType: 'text',
              required: true,
              settings: { maxLength: 100 },
            },
          ],
        },
      ],
    });

    expect(result.groups).toHaveLength(1);
    expect(typeof result.groups[0].id).toBe('string');
    expect(result.groups[0].id).not.toBe('');
    expect(result.groups[0]).toMatchObject({
      key: 'basic',
      label: '基本情報',
      repeatable: false,
      minRows: 1,
    });
    expect(result.groups[0].fields[0]).toMatchObject({
      key: 'subject',
      label: '件名',
      fieldType: 'text',
      required: true,
      settings: { maxLength: 100 },
    });
    expect(typeof result.groups[0].fields[0].id).toBe('string');
  });

  it('parses nested workflow.policies with requirements', () => {
    const result = parseDocumentDraft({
      workflow: {
        policies: [
          {
            name: '上長承認',
            condition: null,
            operator: 'all',
            requirements: [
              {
                name: '直属上長',
                departmentScope: 'same_tree',
                positionOperator: 'gte',
                positionId: '1',
                upperPositionId: null,
                requiredCount: 1,
              },
            ],
          },
        ],
      },
    });

    expect(result.policies).toHaveLength(1);
    expect(result.policies[0]).toMatchObject({
      name: '上長承認',
      operator: 'all',
    });
    expect(result.policies[0].requirements[0]).toMatchObject({
      name: '直属上長',
      departmentScope: 'same_tree',
      positionOperator: 'gte',
      positionId: '1',
      upperPositionId: null,
      requiredCount: 1,
    });
  });

  it('falls back to safe defaults for malformed/missing fields instead of throwing', () => {
    const result = parseDocumentDraft({
      groups: [
        { fields: 'not-an-array' },
        null,
        'not-an-object',
        { key: 'ok', label: 'OK', repeatable: true, minRows: 2, fields: [] },
      ],
      workflow: { policies: 'not-an-array' },
    });

    expect(result.groups).toHaveLength(4);
    expect(result.groups[0]).toMatchObject({ label: '', fields: [] });
    expect(result.groups[1]).toMatchObject({ label: '' });
    expect(result.groups[3]).toMatchObject({
      key: 'ok',
      label: 'OK',
      repeatable: true,
      minRows: 2,
    });
    expect(result.policies).toEqual([]);
  });

  it('backfills a generated key when a group/field key is missing or blank, instead of publishing an empty one', () => {
    const result = parseDocumentDraft({
      groups: [
        {
          key: '',
          label: 'G',
          fields: [{ label: 'F' }, { key: '', label: 'F2' }],
        },
      ],
    });

    expect(result.groups[0].key).not.toBe('');
    expect(result.groups[0].fields[0].key).not.toBe('');
    expect(result.groups[0].fields[1].key).not.toBe('');
    // Each backfilled key must still be distinct.
    expect(
      new Set([
        result.groups[0].key,
        result.groups[0].fields[0].key,
        result.groups[0].fields[1].key,
      ]).size,
    ).toBe(3);
  });

  it('preserves an existing non-blank key as-is', () => {
    const result = parseDocumentDraft({
      groups: [{ key: 'basic', label: 'G', fields: [] }],
    });

    expect(result.groups[0].key).toBe('basic');
  });

  it('defaults an invalid fieldType/enum value rather than passing it through', () => {
    const result = parseDocumentDraft({
      groups: [
        {
          key: 'g',
          label: 'G',
          fields: [
            { key: 'f', label: 'F', fieldType: 'not-a-real-type' },
          ],
        },
      ],
    });

    expect(result.groups[0].fields[0].fieldType).toBe('text');
  });

  it('clamps a non-positive or missing minRows/requiredCount to at least 1', () => {
    const result = parseDocumentDraft({
      groups: [
        { key: 'g', label: 'G', minRows: -3, fields: [] },
        { key: 'g2', label: 'G2', minRows: 0, fields: [] },
      ],
      workflow: {
        policies: [
          {
            name: 'P',
            operator: 'all',
            requirements: [
              {
                name: 'R',
                positionId: '1',
                requiredCount: -1,
              },
            ],
          },
        ],
      },
    });

    expect(result.groups[0].minRows).toBe(1);
    expect(result.groups[1].minRows).toBe(1);
    expect(result.policies[0].requirements[0].requiredCount).toBe(1);
  });
});

describe('buildDocumentDraft', () => {
  it('strips client-only ids and produces the DocumentDraft wire shape', () => {
    const state: DocumentBuilderState = {
      groups: [
        {
          id: 'client-group-1',
          key: 'basic',
          label: '基本情報',
          repeatable: false,
          minRows: 1,
          fields: [
            {
              id: 'client-field-1',
              key: 'subject',
              label: '件名',
              fieldType: 'text',
              required: true,
              settings: {},
            },
          ],
        },
      ],
      policies: [
        {
          id: 'client-policy-1',
          name: '上長承認',
          operator: 'all',
          requirements: [
            {
              id: 'client-req-1',
              name: '直属上長',
              departmentScope: 'same_tree',
              positionOperator: 'eq',
              positionId: '1',
              upperPositionId: null,
              requiredCount: 1,
            },
          ],
        },
      ],
    };

    const draft = buildDocumentDraft(state);

    expect(draft).toEqual({
      groups: [
        {
          key: 'basic',
          label: '基本情報',
          repeatable: false,
          minRows: 1,
          fields: [
            {
              key: 'subject',
              label: '件名',
              fieldType: 'text',
              required: true,
              settings: {},
            },
          ],
        },
      ],
      workflow: {
        policies: [
          {
            name: '上長承認',
            condition: null,
            operator: 'all',
            requirements: [
              {
                name: '直属上長',
                departmentScope: 'same_tree',
                positionOperator: 'eq',
                positionId: '1',
                upperPositionId: null,
                requiredCount: 1,
              },
            ],
          },
        ],
      },
    });
  });

  it('nulls out a stale upperPositionId when positionOperator is not "between"', () => {
    const state: DocumentBuilderState = {
      groups: [],
      policies: [
        {
          id: '1',
          name: 'P',
          operator: 'all',
          requirements: [
            {
              id: 'r1',
              name: 'R',
              departmentScope: 'same_tree',
              // Simulates the user having picked 'between' + an upper
              // position, then switching back to 'eq' — the editor hides
              // the field but the stale value can still be in state.
              positionOperator: 'eq',
              positionId: '1',
              upperPositionId: '9',
              requiredCount: 1,
            },
          ],
        },
      ],
    };

    const requirement = buildDocumentDraft(state).workflow.policies[0]
      .requirements[0];

    expect(requirement.upperPositionId).toBeNull();
  });

  it('keeps upperPositionId when positionOperator is "between"', () => {
    const state: DocumentBuilderState = {
      groups: [],
      policies: [
        {
          id: '1',
          name: 'P',
          operator: 'all',
          requirements: [
            {
              id: 'r1',
              name: 'R',
              departmentScope: 'same_tree',
              positionOperator: 'between',
              positionId: '1',
              upperPositionId: '9',
              requiredCount: 1,
            },
          ],
        },
      ],
    };

    const requirement = buildDocumentDraft(state).workflow.policies[0]
      .requirements[0];

    expect(requirement.upperPositionId).toBe('9');
  });

  it('always sends condition: null (MVP does not support conditional policies)', () => {
    const state: DocumentBuilderState = {
      groups: [],
      policies: [
        {
          id: '1',
          name: 'P',
          operator: 'any',
          requirements: [],
        },
      ],
    };

    expect(buildDocumentDraft(state).workflow.policies[0].condition).toBeNull();
  });

  it('round-trips through parseDocumentDraft back to the same wire shape', () => {
    const original = {
      groups: [
        {
          key: 'lines',
          label: '交通費明細',
          repeatable: true,
          minRows: 1,
          fields: [
            {
              key: 'amount',
              label: '金額',
              fieldType: 'number' as const,
              required: true,
              settings: { min: 0 },
            },
          ],
        },
      ],
      workflow: {
        policies: [
          {
            name: 'ポリシー',
            condition: null,
            operator: 'any' as const,
            requirements: [],
          },
        ],
      },
    };

    const roundTripped = buildDocumentDraft(parseDocumentDraft(original));

    expect(roundTripped).toEqual(original);
  });
});
