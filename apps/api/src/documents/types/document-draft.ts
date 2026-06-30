export type DocumentDraft = {
  groups: DocumentDraftFieldGroup[];
  workflow: {
    policies: DocumentDraftApprovalPolicy[];
  };
};

export type DocumentDraftFieldGroup = {
  key: string;
  label: string;
  repeatable: boolean;
  minRows: number;
  fields: DocumentDraftField[];
};

export type DocumentDraftField = {
  key: string;
  label: string;
  fieldType: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  settings: Record<string, unknown>;
};

export type DocumentDraftApprovalPolicy = {
  name: string;
  condition: Record<string, unknown> | null;
  operator: 'all' | 'any';
  requirements: DocumentDraftApprovalRequirement[];
};

export type DocumentDraftApprovalRequirement = {
  name: string;
  departmentScope: 'same_tree' | 'same_department' | 'entire_company';
  positionOperator: 'eq' | 'gte' | 'between';
  positionId: bigint;
  upperPositionId?: bigint | null;
  requiredCount: number;
};
