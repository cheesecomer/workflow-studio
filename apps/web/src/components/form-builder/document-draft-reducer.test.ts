import { documentBuilderReducer } from './document-draft-reducer';
import type { DocumentBuilderState } from './document-draft-state';

const emptyState: DocumentBuilderState = { groups: [], policies: [] };

describe('documentBuilderReducer — groups', () => {
  it('ADD_GROUP appends a new empty group with an auto-generated key', () => {
    const state = documentBuilderReducer(emptyState, { type: 'ADD_GROUP' });

    expect(state.groups).toHaveLength(1);
    expect(state.groups[0]).toMatchObject({
      label: '',
      repeatable: false,
      minRows: 1,
      fields: [],
    });
    expect(state.groups[0].key).not.toBe('');
  });

  it('REMOVE_GROUP removes only the targeted group', () => {
    let state = documentBuilderReducer(emptyState, { type: 'ADD_GROUP' });
    state = documentBuilderReducer(state, { type: 'ADD_GROUP' });
    const [first, second] = state.groups;

    state = documentBuilderReducer(state, {
      type: 'REMOVE_GROUP',
      groupId: first.id,
    });

    expect(state.groups).toEqual([second]);
  });

  it('UPDATE_GROUP patches only the targeted group, leaving others untouched', () => {
    let state = documentBuilderReducer(emptyState, { type: 'ADD_GROUP' });
    state = documentBuilderReducer(state, { type: 'ADD_GROUP' });
    const [first, second] = state.groups;

    state = documentBuilderReducer(state, {
      type: 'UPDATE_GROUP',
      groupId: first.id,
      patch: { label: '基本情報', repeatable: true, minRows: 2 },
    });

    expect(state.groups[0]).toMatchObject({
      label: '基本情報',
      repeatable: true,
      minRows: 2,
    });
    expect(state.groups[1]).toEqual(second);
  });
});

describe('documentBuilderReducer — fields', () => {
  function stateWithOneGroup(): DocumentBuilderState {
    return documentBuilderReducer(emptyState, { type: 'ADD_GROUP' });
  }

  it('ADD_FIELD appends a field to the targeted group only', () => {
    let state = stateWithOneGroup();
    state = documentBuilderReducer(state, { type: 'ADD_GROUP' });
    const [groupA, groupB] = state.groups;

    state = documentBuilderReducer(state, {
      type: 'ADD_FIELD',
      groupId: groupA.id,
    });

    expect(state.groups[0].fields).toHaveLength(1);
    expect(state.groups[1]).toEqual(groupB);
  });

  it('REMOVE_FIELD removes only the targeted field', () => {
    let state = stateWithOneGroup();
    const groupId = state.groups[0].id;
    state = documentBuilderReducer(state, { type: 'ADD_FIELD', groupId });
    state = documentBuilderReducer(state, { type: 'ADD_FIELD', groupId });
    const [firstField, secondField] = state.groups[0].fields;

    state = documentBuilderReducer(state, {
      type: 'REMOVE_FIELD',
      groupId,
      fieldId: firstField.id,
    });

    expect(state.groups[0].fields).toEqual([secondField]);
  });

  it('UPDATE_FIELD patches only the targeted field', () => {
    let state = stateWithOneGroup();
    const groupId = state.groups[0].id;
    state = documentBuilderReducer(state, { type: 'ADD_FIELD', groupId });
    const fieldId = state.groups[0].fields[0].id;

    state = documentBuilderReducer(state, {
      type: 'UPDATE_FIELD',
      groupId,
      fieldId,
      patch: { label: '件名', fieldType: 'select', required: true },
    });

    expect(state.groups[0].fields[0]).toMatchObject({
      label: '件名',
      fieldType: 'select',
      required: true,
    });
  });
});

describe('documentBuilderReducer — policies', () => {
  it('ADD_POLICY appends a new empty policy', () => {
    const state = documentBuilderReducer(emptyState, { type: 'ADD_POLICY' });

    expect(state.policies).toHaveLength(1);
    expect(state.policies[0]).toMatchObject({
      name: '',
      operator: 'all',
      requirements: [],
    });
  });

  it('REMOVE_POLICY removes only the targeted policy', () => {
    let state = documentBuilderReducer(emptyState, { type: 'ADD_POLICY' });
    state = documentBuilderReducer(state, { type: 'ADD_POLICY' });
    const [first, second] = state.policies;

    state = documentBuilderReducer(state, {
      type: 'REMOVE_POLICY',
      policyId: first.id,
    });

    expect(state.policies).toEqual([second]);
  });

  it('UPDATE_POLICY patches only the targeted policy', () => {
    let state = documentBuilderReducer(emptyState, { type: 'ADD_POLICY' });
    state = documentBuilderReducer(state, { type: 'ADD_POLICY' });
    const [first, second] = state.policies;

    state = documentBuilderReducer(state, {
      type: 'UPDATE_POLICY',
      policyId: first.id,
      patch: { name: '上長承認', operator: 'any' },
    });

    expect(state.policies[0]).toMatchObject({ name: '上長承認', operator: 'any' });
    expect(state.policies[1]).toEqual(second);
  });
});

describe('documentBuilderReducer — requirements', () => {
  function stateWithOnePolicy(): DocumentBuilderState {
    return documentBuilderReducer(emptyState, { type: 'ADD_POLICY' });
  }

  it('ADD_REQUIREMENT appends a requirement to the targeted policy only', () => {
    let state = stateWithOnePolicy();
    state = documentBuilderReducer(state, { type: 'ADD_POLICY' });
    const [policyA, policyB] = state.policies;

    state = documentBuilderReducer(state, {
      type: 'ADD_REQUIREMENT',
      policyId: policyA.id,
    });

    expect(state.policies[0].requirements).toHaveLength(1);
    expect(state.policies[1]).toEqual(policyB);
  });

  it('REMOVE_REQUIREMENT removes only the targeted requirement', () => {
    let state = stateWithOnePolicy();
    const policyId = state.policies[0].id;
    state = documentBuilderReducer(state, { type: 'ADD_REQUIREMENT', policyId });
    state = documentBuilderReducer(state, { type: 'ADD_REQUIREMENT', policyId });
    const [first, second] = state.policies[0].requirements;

    state = documentBuilderReducer(state, {
      type: 'REMOVE_REQUIREMENT',
      policyId,
      requirementId: first.id,
    });

    expect(state.policies[0].requirements).toEqual([second]);
  });

  it('UPDATE_REQUIREMENT patches only the targeted requirement', () => {
    let state = stateWithOnePolicy();
    const policyId = state.policies[0].id;
    state = documentBuilderReducer(state, { type: 'ADD_REQUIREMENT', policyId });
    const requirementId = state.policies[0].requirements[0].id;

    state = documentBuilderReducer(state, {
      type: 'UPDATE_REQUIREMENT',
      policyId,
      requirementId,
      patch: { positionId: '5', positionOperator: 'between', upperPositionId: '9' },
    });

    expect(state.policies[0].requirements[0]).toMatchObject({
      positionId: '5',
      positionOperator: 'between',
      upperPositionId: '9',
    });
  });
});
