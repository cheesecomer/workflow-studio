// Types for the JSON contracts returned/accepted by apps/api.
//
// These are intentionally hand-written and NOT derived from `packages/db`'s
// Prisma types or the API's DTO classes — the frontend should depend on the
// wire shape (what `BigIntInterceptor`-serialized JSON actually looks like),
// not on backend implementation types. IDs are always `string` (bigints are
// serialized to strings), and dates are always `string` (ISO, via JSON).

export type PaginatedResult<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Enums

export type FieldType = 'text' | 'number' | 'date' | 'select';
export type ApprovalPolicyOperator = 'all' | 'any';
export type DepartmentScope =
  | 'same_tree'
  | 'same_department'
  | 'entire_company';
export type PositionOperator = 'eq' | 'gte' | 'between';
export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'withdrawn';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApproverStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type ApprovalDecisionType = 'approved' | 'rejected';

// Master data (GET /positions, GET /departments)

export type Position = {
  id: string;
  name: string;
  rank: number;
};

export type Department = {
  id: string;
  parentId: string | null;
  name: string;
};

// Published document definition structure

export type FieldDefinition = {
  id: string;
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  position: number;
  settings: Record<string, unknown>;
};

export type FieldGroupDefinition = {
  id: string;
  key: string;
  label: string;
  position: number;
  repeatable: boolean;
  minRows: number;
  fieldDefinitions: FieldDefinition[];
};

export type ApprovalRequirement = {
  id: string;
  name: string;
  departmentScope: DepartmentScope;
  positionOperator: PositionOperator;
  positionId: string;
  upperPositionId: string | null;
  requiredCount: number;
};

export type ApprovalPolicy = {
  id: string;
  name: string;
  condition: Record<string, unknown> | null;
  operator: ApprovalPolicyOperator;
  position: number;
  requirements: ApprovalRequirement[];
};

export type DocumentDefinitionDetail = {
  id: string;
  documentId: string;
  name: string;
  version: number;
  fieldGroupDefinitions: FieldGroupDefinition[];
  approvalPolicies: ApprovalPolicy[];
};

// Documents (GET/POST/PATCH/DELETE /documents, GET /documents/submittable)

export type Document = {
  id: string;
  name: string;
  draftContent: Record<string, unknown>;
  publishedContent: Record<string, unknown> | null;
  currentDocumentDefinitionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentWithCurrentDefinition = Document & {
  currentDocumentDefinition: DocumentDefinitionDetail | null;
};

// GET /documents/submittable returns DocumentDefinition rows directly (the
// currently-published definition of each published Document), not Document
// rows — `id` here is the DocumentDefinition id, ready to use as
// `documentDefinitionId` in POST /submissions.
export type SubmittableDocument = {
  id: string;
  documentId: string;
  name: string;
  version: number;
};

export type CreateDocumentInput = {
  name: string;
  draftContent?: Record<string, unknown>;
};

export type UpdateDocumentInput = {
  name?: string;
  draftContent?: Record<string, unknown>;
};

// Draft payload shape for POST /documents/:id/publish. Hand-copied from
// apps/api/src/documents/types/document-draft.ts (not imported — see file
// header). `maxRows` is intentionally absent: the backend never persists it.
export type DocumentDraftField = {
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  settings: Record<string, unknown>;
};

export type DocumentDraftFieldGroup = {
  key: string;
  label: string;
  repeatable: boolean;
  minRows: number;
  fields: DocumentDraftField[];
};

export type DocumentDraftApprovalRequirement = {
  name: string;
  departmentScope: DepartmentScope;
  positionOperator: PositionOperator;
  positionId: string;
  upperPositionId?: string | null;
  requiredCount: number;
};

// MVP does not support conditional approval policies; `condition` is always
// sent as `null`.
export type DocumentDraftApprovalPolicy = {
  name: string;
  condition: Record<string, unknown> | null;
  operator: ApprovalPolicyOperator;
  requirements: DocumentDraftApprovalRequirement[];
};

export type DocumentDraft = {
  groups: DocumentDraftFieldGroup[];
  workflow: {
    policies: DocumentDraftApprovalPolicy[];
  };
};

export type PublishDocumentInput = {
  name: string;
  draftContent: DocumentDraft;
};

// Submissions

export type UserSummary = {
  id: string;
  name: string;
  email: string;
};

export type DepartmentSummary = {
  id: string;
  name: string;
};

export type DocumentDefinitionSummary = {
  id: string;
  documentId: string;
  name: string;
  version: number;
};

export type ApprovalPolicySummary = {
  id: string;
  name: string;
  operator: ApprovalPolicyOperator;
  position: number;
};

// GET /submissions includes the full AppliedApprovalPolicy row (Prisma
// `include`), while GET /submissions/approvable only selects `id` +
// `approvalPolicy` (Prisma `select`) — these are genuinely different shapes,
// not the same type with optional fields.
export type AppliedApprovalPolicySummary = {
  id: string;
  submissionId: string;
  approvalPolicyId: string;
  position: number;
  status: ApprovalStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvalPolicy: ApprovalPolicySummary;
};

export type AppliedApprovalPolicyMinimal = {
  id: string;
  approvalPolicy: ApprovalPolicySummary;
};

export type SubmissionFieldValue = {
  id: string;
  fieldDefinitionId: string;
  value: unknown;
};

export type SubmissionFieldGroupRow = {
  id: string;
  fieldGroupDefinitionId: string;
  position: number;
  fieldValues: SubmissionFieldValue[];
};

// Bare Submission row (no joins) — this is what create/update/submit/approve/
// reject/withdraw return; the mutation endpoints never return the joined
// list/detail shapes below.
export type Submission = {
  id: string;
  documentDefinitionId: string;
  createdById: string;
  submittedById: string | null;
  applicantDepartmentId: string | null;
  status: SubmissionStatus;
  currentAppliedApprovalPolicyId: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionWithFieldGroupRows = Submission & {
  fieldGroupRows: SubmissionFieldGroupRow[];
};

// GET /submissions item
export type SubmissionListItem = Submission & {
  documentDefinition: DocumentDefinitionSummary;
  applicantDepartment: DepartmentSummary | null;
  currentAppliedApprovalPolicy: AppliedApprovalPolicySummary | null;
};

// GET /submissions/approvable item
export type ApprovableSubmissionListItem = Submission & {
  documentDefinition: DocumentDefinitionSummary;
  createdBy: UserSummary;
  applicantDepartment: DepartmentSummary | null;
  currentAppliedApprovalPolicy: AppliedApprovalPolicyMinimal | null;
};

export type ApprovalDecision = {
  id: string;
  approverId: string;
  actorId: string;
  decision: ApprovalDecisionType;
  comment: string | null;
  decidedAt: string;
  actor: UserSummary;
};

export type Approver = {
  id: string;
  appliedApprovalRequirementId: string;
  userId: string;
  status: ApproverStatus;
  decidedAt: string | null;
  user: UserSummary;
  decisions: ApprovalDecision[];
};

export type AppliedApprovalRequirement = {
  id: string;
  appliedApprovalPolicyId: string;
  approvalRequirementId: string;
  status: ApprovalStatus;
  requiredCount: number;
  approvedCount: number;
  approvedAt: string | null;
  rejectedAt: string | null;
  approvalRequirement: ApprovalRequirement;
  approvers: Approver[];
};

export type AppliedApprovalPolicy = {
  id: string;
  submissionId: string;
  approvalPolicyId: string;
  position: number;
  status: ApprovalStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
  approvalPolicy: ApprovalPolicy;
  requirements: AppliedApprovalRequirement[];
};

export type SubmissionAvailableAction =
  | 'submit'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'withdraw';

export type SubmissionActivityType =
  | 'created'
  | 'submitted'
  | 'approval_decision'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type SubmissionActivity = {
  type: SubmissionActivityType;
  occurredAt: string;
  actor?: { id: string; name?: string; email?: string };
  decision?: 'approved' | 'rejected';
  comment?: string | null;
  approvalPolicy?: { id: string; name: string; position: number };
  approvalRequirement?: { id: string; name: string };
};

// GET /submissions/:id
export type SubmissionDetail = Submission & {
  createdBy: UserSummary;
  submittedBy: UserSummary | null;
  documentDefinition: DocumentDefinitionSummary & {
    fieldGroupDefinitions: FieldGroupDefinition[];
  };
  fieldGroupRows: SubmissionFieldGroupRow[];
  appliedApprovalPolicies: AppliedApprovalPolicy[];
  availableActions: SubmissionAvailableAction[];
  activities: SubmissionActivity[];
};

// Request inputs

export type FieldValueInput = {
  fieldDefinitionId: string;
  value: unknown;
};

export type FieldGroupRowInput = {
  fieldGroupDefinitionId: string;
  position: number;
  fieldValues: FieldValueInput[];
};

export type CreateSubmissionInput = {
  documentDefinitionId: string;
  fieldGroupRows: FieldGroupRowInput[];
};

export type UpdateSubmissionInput = {
  fieldGroupRows: FieldGroupRowInput[];
};

export type ListSubmissionsParams = {
  status?: SubmissionStatus;
  page?: number;
  limit?: number;
};

export type ListApprovableSubmissionsParams = {
  page?: number;
  limit?: number;
};
