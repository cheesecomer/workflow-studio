import type {
  ApprovalPolicyEditorState,
  ApprovalRequirementEditorState,
  DocumentBuilderState,
  FieldEditorState,
  FieldGroupEditorState,
} from './document-draft-state';

export type DocumentBuilderAction =
  | { type: 'ADD_GROUP' }
  | { type: 'REMOVE_GROUP'; groupId: string }
  | {
      type: 'UPDATE_GROUP';
      groupId: string;
      patch: Partial<Omit<FieldGroupEditorState, 'id' | 'fields'>>;
    }
  | { type: 'ADD_FIELD'; groupId: string }
  | { type: 'REMOVE_FIELD'; groupId: string; fieldId: string }
  | {
      type: 'UPDATE_FIELD';
      groupId: string;
      fieldId: string;
      patch: Partial<Omit<FieldEditorState, 'id'>>;
    }
  | { type: 'ADD_POLICY' }
  | { type: 'REMOVE_POLICY'; policyId: string }
  | {
      type: 'UPDATE_POLICY';
      policyId: string;
      patch: Partial<Omit<ApprovalPolicyEditorState, 'id' | 'requirements'>>;
    }
  | { type: 'ADD_REQUIREMENT'; policyId: string }
  | { type: 'REMOVE_REQUIREMENT'; policyId: string; requirementId: string }
  | {
      type: 'UPDATE_REQUIREMENT';
      policyId: string;
      requirementId: string;
      patch: Partial<Omit<ApprovalRequirementEditorState, 'id'>>;
    };

// `key` is a technical, backend-only identifier (see
// document-draft-state.ts) — it's never shown or edited in the UI, so it's
// generated once here and never touched again after creation.
function createField(): FieldEditorState {
  return {
    id: crypto.randomUUID(),
    key: crypto.randomUUID(),
    label: '',
    fieldType: 'text',
    required: false,
    settings: {},
  };
}

function createGroup(): FieldGroupEditorState {
  return {
    id: crypto.randomUUID(),
    key: crypto.randomUUID(),
    label: '',
    repeatable: false,
    minRows: 1,
    fields: [],
  };
}

function createRequirement(): ApprovalRequirementEditorState {
  return {
    id: crypto.randomUUID(),
    name: '',
    departmentScope: 'same_tree',
    positionOperator: 'eq',
    positionId: '',
    upperPositionId: null,
    requiredCount: 1,
  };
}

function createPolicy(): ApprovalPolicyEditorState {
  return {
    id: crypto.randomUUID(),
    name: '',
    operator: 'all',
    requirements: [],
  };
}

export function documentBuilderReducer(
  state: DocumentBuilderState,
  action: DocumentBuilderAction,
): DocumentBuilderState {
  switch (action.type) {
    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, createGroup()] };

    case 'REMOVE_GROUP':
      return {
        ...state,
        groups: state.groups.filter((group) => group.id !== action.groupId),
      };

    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.groupId ? { ...group, ...action.patch } : group,
        ),
      };

    case 'ADD_FIELD':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.groupId
            ? { ...group, fields: [...group.fields, createField()] }
            : group,
        ),
      };

    case 'REMOVE_FIELD':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.groupId
            ? {
                ...group,
                fields: group.fields.filter(
                  (field) => field.id !== action.fieldId,
                ),
              }
            : group,
        ),
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.groupId
            ? {
                ...group,
                fields: group.fields.map((field) =>
                  field.id === action.fieldId
                    ? { ...field, ...action.patch }
                    : field,
                ),
              }
            : group,
        ),
      };

    case 'ADD_POLICY':
      return { ...state, policies: [...state.policies, createPolicy()] };

    case 'REMOVE_POLICY':
      return {
        ...state,
        policies: state.policies.filter(
          (policy) => policy.id !== action.policyId,
        ),
      };

    case 'UPDATE_POLICY':
      return {
        ...state,
        policies: state.policies.map((policy) =>
          policy.id === action.policyId
            ? { ...policy, ...action.patch }
            : policy,
        ),
      };

    case 'ADD_REQUIREMENT':
      return {
        ...state,
        policies: state.policies.map((policy) =>
          policy.id === action.policyId
            ? {
                ...policy,
                requirements: [...policy.requirements, createRequirement()],
              }
            : policy,
        ),
      };

    case 'REMOVE_REQUIREMENT':
      return {
        ...state,
        policies: state.policies.map((policy) =>
          policy.id === action.policyId
            ? {
                ...policy,
                requirements: policy.requirements.filter(
                  (requirement) => requirement.id !== action.requirementId,
                ),
              }
            : policy,
        ),
      };

    case 'UPDATE_REQUIREMENT':
      return {
        ...state,
        policies: state.policies.map((policy) =>
          policy.id === action.policyId
            ? {
                ...policy,
                requirements: policy.requirements.map((requirement) =>
                  requirement.id === action.requirementId
                    ? { ...requirement, ...action.patch }
                    : requirement,
                ),
              }
            : policy,
        ),
      };

    default:
      return state;
  }
}
