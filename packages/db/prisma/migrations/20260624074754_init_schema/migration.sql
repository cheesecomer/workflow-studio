-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'number', 'date', 'select');

-- CreateEnum
CREATE TYPE "ApprovalPolicyOperator" AS ENUM ('all', 'any');

-- CreateEnum
CREATE TYPE "DepartmentScope" AS ENUM ('same_tree', 'same_department', 'entire_company');

-- CreateEnum
CREATE TYPE "PositionOperator" AS ENUM ('eq', 'gte', 'between');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ApproverStatus" AS ENUM ('pending', 'approved', 'rejected', 'skipped');

-- CreateEnum
CREATE TYPE "ApprovalDecisionType" AS ENUM ('approved', 'rejected');

-- CreateTable
CREATE TABLE "documents" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "current_document_definition_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_drafts" (
    "id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_definitions" (
    "id" BIGSERIAL NOT NULL,
    "document_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "published_by_id" BIGINT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "document_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" BIGSERIAL NOT NULL,
    "document_definition_id" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_policies" (
    "id" BIGSERIAL NOT NULL,
    "document_definition_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB,
    "operator" "ApprovalPolicyOperator" NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requirements" (
    "id" BIGSERIAL NOT NULL,
    "approval_policy_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "department_scope" "DepartmentScope" NOT NULL,
    "position_operator" "PositionOperator" NOT NULL,
    "position_id" BIGINT NOT NULL,
    "upper_position_id" BIGINT,
    "required_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "approval_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_digest" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "parent_id" BIGINT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_memberships" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "department_id" BIGINT NOT NULL,
    "position_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "department_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" BIGSERIAL NOT NULL,
    "document_definition_id" BIGINT NOT NULL,
    "created_by_id" BIGINT NOT NULL,
    "submitted_by_id" BIGINT,
    "applicant_department_id" BIGINT,
    "status" "SubmissionStatus" NOT NULL,
    "current_applied_approval_policy_id" BIGINT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_field_values" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "field_definition_id" BIGINT NOT NULL,
    "value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applied_approval_policies" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "approval_policy_id" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "applied_approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applied_approval_requirements" (
    "id" BIGSERIAL NOT NULL,
    "applied_approval_policy_id" BIGINT NOT NULL,
    "approval_requirement_id" BIGINT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "required_count" INTEGER NOT NULL,
    "approved_count" INTEGER NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "applied_approval_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvers" (
    "id" BIGSERIAL NOT NULL,
    "applied_approval_requirement_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "status" "ApproverStatus" NOT NULL,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "approvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decisions" (
    "id" BIGSERIAL NOT NULL,
    "approver_id" BIGINT NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "decision" "ApprovalDecisionType" NOT NULL,
    "comment" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_current_document_definition_id_idx" ON "documents"("current_document_definition_id");

-- CreateIndex
CREATE INDEX "document_drafts_document_id_idx" ON "document_drafts"("document_id");

-- CreateIndex
CREATE INDEX "document_definitions_document_id_idx" ON "document_definitions"("document_id");

-- CreateIndex
CREATE INDEX "document_definitions_published_by_id_idx" ON "document_definitions"("published_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_definitions_document_id_version_key" ON "document_definitions"("document_id", "version");

-- CreateIndex
CREATE INDEX "field_definitions_document_definition_id_idx" ON "field_definitions"("document_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_document_definition_id_key_key" ON "field_definitions"("document_definition_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_document_definition_id_position_key" ON "field_definitions"("document_definition_id", "position");

-- CreateIndex
CREATE INDEX "approval_policies_document_definition_id_idx" ON "approval_policies"("document_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_policies_document_definition_id_position_key" ON "approval_policies"("document_definition_id", "position");

-- CreateIndex
CREATE INDEX "approval_requirements_approval_policy_id_idx" ON "approval_requirements"("approval_policy_id");

-- CreateIndex
CREATE INDEX "approval_requirements_position_id_idx" ON "approval_requirements"("position_id");

-- CreateIndex
CREATE INDEX "approval_requirements_upper_position_id_idx" ON "approval_requirements"("upper_position_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE INDEX "positions_rank_idx" ON "positions"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "positions_rank_key" ON "positions"("rank");

-- CreateIndex
CREATE INDEX "department_memberships_user_id_idx" ON "department_memberships"("user_id");

-- CreateIndex
CREATE INDEX "department_memberships_department_id_idx" ON "department_memberships"("department_id");

-- CreateIndex
CREATE INDEX "department_memberships_position_id_idx" ON "department_memberships"("position_id");

-- CreateIndex
CREATE INDEX "submissions_document_definition_id_idx" ON "submissions"("document_definition_id");

-- CreateIndex
CREATE INDEX "submissions_created_by_id_idx" ON "submissions"("created_by_id");

-- CreateIndex
CREATE INDEX "submissions_submitted_by_id_idx" ON "submissions"("submitted_by_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_current_applied_approval_policy_id_idx" ON "submissions"("current_applied_approval_policy_id");

-- CreateIndex
CREATE INDEX "submission_field_values_submission_id_idx" ON "submission_field_values"("submission_id");

-- CreateIndex
CREATE INDEX "submission_field_values_field_definition_id_idx" ON "submission_field_values"("field_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_field_values_submission_id_field_definition_id_key" ON "submission_field_values"("submission_id", "field_definition_id");

-- CreateIndex
CREATE INDEX "applied_approval_policies_submission_id_idx" ON "applied_approval_policies"("submission_id");

-- CreateIndex
CREATE INDEX "applied_approval_policies_approval_policy_id_idx" ON "applied_approval_policies"("approval_policy_id");

-- CreateIndex
CREATE INDEX "applied_approval_policies_status_idx" ON "applied_approval_policies"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applied_approval_policies_submission_id_position_key" ON "applied_approval_policies"("submission_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "applied_approval_policies_submission_id_approval_policy_id_key" ON "applied_approval_policies"("submission_id", "approval_policy_id");

-- CreateIndex
CREATE INDEX "applied_approval_requirements_applied_approval_policy_id_idx" ON "applied_approval_requirements"("applied_approval_policy_id");

-- CreateIndex
CREATE INDEX "applied_approval_requirements_approval_requirement_id_idx" ON "applied_approval_requirements"("approval_requirement_id");

-- CreateIndex
CREATE INDEX "applied_approval_requirements_status_idx" ON "applied_approval_requirements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applied_approval_requirements_applied_approval_policy_id_ap_key" ON "applied_approval_requirements"("applied_approval_policy_id", "approval_requirement_id");

-- CreateIndex
CREATE INDEX "approvers_applied_approval_requirement_id_idx" ON "approvers"("applied_approval_requirement_id");

-- CreateIndex
CREATE INDEX "approvers_user_id_idx" ON "approvers"("user_id");

-- CreateIndex
CREATE INDEX "approvers_status_idx" ON "approvers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "approvers_applied_approval_requirement_id_user_id_key" ON "approvers"("applied_approval_requirement_id", "user_id");

-- CreateIndex
CREATE INDEX "approval_decisions_approver_id_idx" ON "approval_decisions"("approver_id");

-- CreateIndex
CREATE INDEX "approval_decisions_actor_id_idx" ON "approval_decisions"("actor_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_document_definition_id_fkey" FOREIGN KEY ("current_document_definition_id") REFERENCES "document_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_drafts" ADD CONSTRAINT "document_drafts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_definitions" ADD CONSTRAINT "document_definitions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_definitions" ADD CONSTRAINT "document_definitions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_document_definition_id_fkey" FOREIGN KEY ("document_definition_id") REFERENCES "document_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_document_definition_id_fkey" FOREIGN KEY ("document_definition_id") REFERENCES "document_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requirements" ADD CONSTRAINT "approval_requirements_approval_policy_id_fkey" FOREIGN KEY ("approval_policy_id") REFERENCES "approval_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requirements" ADD CONSTRAINT "approval_requirements_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requirements" ADD CONSTRAINT "approval_requirements_upper_position_id_fkey" FOREIGN KEY ("upper_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_memberships" ADD CONSTRAINT "department_memberships_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_document_definition_id_fkey" FOREIGN KEY ("document_definition_id") REFERENCES "document_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_applicant_department_id_fkey" FOREIGN KEY ("applicant_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_current_applied_approval_policy_id_fkey" FOREIGN KEY ("current_applied_approval_policy_id") REFERENCES "applied_approval_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_field_values" ADD CONSTRAINT "submission_field_values_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_field_values" ADD CONSTRAINT "submission_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_approval_policies" ADD CONSTRAINT "applied_approval_policies_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_approval_policies" ADD CONSTRAINT "applied_approval_policies_approval_policy_id_fkey" FOREIGN KEY ("approval_policy_id") REFERENCES "approval_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_approval_requirements" ADD CONSTRAINT "applied_approval_requirements_applied_approval_policy_id_fkey" FOREIGN KEY ("applied_approval_policy_id") REFERENCES "applied_approval_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_approval_requirements" ADD CONSTRAINT "applied_approval_requirements_approval_requirement_id_fkey" FOREIGN KEY ("approval_requirement_id") REFERENCES "approval_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvers" ADD CONSTRAINT "approvers_applied_approval_requirement_id_fkey" FOREIGN KEY ("applied_approval_requirement_id") REFERENCES "applied_approval_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvers" ADD CONSTRAINT "approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "approvers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
