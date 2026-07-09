import type {
  ApprovalPolicyOperator,
  DepartmentScope,
  DocumentDraft,
  FieldType,
  PositionOperator,
} from '@/types/api';

export type FieldEditorState = {
  id: string;
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  settings: Record<string, unknown>;
};

export type FieldGroupEditorState = {
  id: string;
  key: string;
  label: string;
  repeatable: boolean;
  minRows: number;
  fields: FieldEditorState[];
};

export type ApprovalRequirementEditorState = {
  id: string;
  name: string;
  departmentScope: DepartmentScope;
  positionOperator: PositionOperator;
  positionId: string;
  upperPositionId: string | null;
  requiredCount: number;
};

export type ApprovalPolicyEditorState = {
  id: string;
  name: string;
  operator: ApprovalPolicyOperator;
  requirements: ApprovalRequirementEditorState[];
};

export type DocumentBuilderState = {
  groups: FieldGroupEditorState[];
  policies: ApprovalPolicyEditorState[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFieldType(value: unknown): FieldType {
  return value === 'text' ||
    value === 'number' ||
    value === 'date' ||
    value === 'select'
    ? value
    : 'text';
}

function parseDepartmentScope(value: unknown): DepartmentScope {
  return value === 'same_tree' ||
    value === 'same_department' ||
    value === 'entire_company'
    ? value
    : 'same_tree';
}

function parsePositionOperator(value: unknown): PositionOperator {
  return value === 'eq' || value === 'gte' || value === 'between'
    ? value
    : 'eq';
}

function parseApprovalPolicyOperator(value: unknown): ApprovalPolicyOperator {
  return value === 'all' || value === 'any' ? value : 'all';
}

// Both `minRows` and `requiredCount` are meaningless below 1 — clamp rather
// than trust whatever was persisted (mirrors the same clamp applied to the
// editors' own number inputs).
function parsePositiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' ? Math.max(1, Math.trunc(value)) : fallback;
}

// `key` is a backend uniqueness-constrained identifier (see the reducer's
// createGroup()/createField()) — a malformed draft with a missing/blank key
// must not be allowed to flow through to publish as `''`, so this backfills
// one exactly the same way a freshly-created group/field would get one.
function parseKey(value: unknown): string {
  return typeof value === 'string' && value !== '' ? value : crypto.randomUUID();
}

function parseField(raw: unknown): FieldEditorState {
  const record = isRecord(raw) ? raw : {};
  return {
    id: crypto.randomUUID(),
    key: parseKey(record.key),
    label: typeof record.label === 'string' ? record.label : '',
    fieldType: parseFieldType(record.fieldType),
    required: record.required === true,
    settings: isRecord(record.settings) ? record.settings : {},
  };
}

function parseGroup(raw: unknown): FieldGroupEditorState {
  const record = isRecord(raw) ? raw : {};
  return {
    id: crypto.randomUUID(),
    key: parseKey(record.key),
    label: typeof record.label === 'string' ? record.label : '',
    repeatable: record.repeatable === true,
    minRows: parsePositiveInt(record.minRows, 1),
    fields: Array.isArray(record.fields) ? record.fields.map(parseField) : [],
  };
}

function parseRequirement(raw: unknown): ApprovalRequirementEditorState {
  const record = isRecord(raw) ? raw : {};
  return {
    id: crypto.randomUUID(),
    name: typeof record.name === 'string' ? record.name : '',
    departmentScope: parseDepartmentScope(record.departmentScope),
    positionOperator: parsePositionOperator(record.positionOperator),
    positionId: typeof record.positionId === 'string' ? record.positionId : '',
    upperPositionId:
      typeof record.upperPositionId === 'string'
        ? record.upperPositionId
        : null,
    requiredCount: parsePositiveInt(record.requiredCount, 1),
  };
}

function parsePolicy(raw: unknown): ApprovalPolicyEditorState {
  const record = isRecord(raw) ? raw : {};
  return {
    id: crypto.randomUUID(),
    name: typeof record.name === 'string' ? record.name : '',
    operator: parseApprovalPolicyOperator(record.operator),
    requirements: Array.isArray(record.requirements)
      ? record.requirements.map(parseRequirement)
      : [],
  };
}

// Document.draftContent is untyped JSON that can be `{}` (a brand-new
// document), a partial/malformed shape (editing is allowed to leave it
// incomplete — see domain-model.md), or in principle any JSON value at all
// (null, an array, a string) since nothing enforces its shape at rest — so
// every field here is defensively defaulted rather than trusted, starting
// from the top-level value itself.
export function parseDocumentDraft(raw: unknown): DocumentBuilderState {
  const root = isRecord(raw) ? raw : {};
  const groups = Array.isArray(root.groups) ? root.groups.map(parseGroup) : [];
  const workflow = isRecord(root.workflow) ? root.workflow : {};
  const policies = Array.isArray(workflow.policies)
    ? workflow.policies.map(parsePolicy)
    : [];

  return { groups, policies };
}

// Inverse of parseDocumentDraft: strips the client-only `id` fields and
// produces the exact shape POST /documents/:id/publish and the draftContent
// PATCH expect.
export function buildDocumentDraft(state: DocumentBuilderState): DocumentDraft {
  return {
    groups: state.groups.map((group) => ({
      key: group.key,
      label: group.label,
      repeatable: group.repeatable,
      minRows: group.minRows,
      fields: group.fields.map((field) => ({
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        settings: field.settings,
      })),
    })),
    workflow: {
      policies: state.policies.map((policy) => ({
        name: policy.name,
        condition: null,
        operator: policy.operator,
        requirements: policy.requirements.map((requirement) => ({
          name: requirement.name,
          departmentScope: requirement.departmentScope,
          positionOperator: requirement.positionOperator,
          positionId: requirement.positionId,
          // The upper-position select is only shown (and meaningful) for
          // 'between' — if the editor state still has a stale value from a
          // previous 'between' selection, don't let it leak into the
          // published definition once the operator has moved on.
          upperPositionId:
            requirement.positionOperator === 'between'
              ? requirement.upperPositionId
              : null,
          requiredCount: requirement.requiredCount,
        })),
      })),
    },
  };
}
