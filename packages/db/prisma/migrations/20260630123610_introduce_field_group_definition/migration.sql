-- CreateTable
CREATE TABLE "field_group_definitions" (
    "id" BIGSERIAL NOT NULL,
    "document_definition_id" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "repeatable" BOOLEAN NOT NULL,
    "min_rows" INTEGER NOT NULL,
    "max_rows" INTEGER,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "field_group_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_group_definitions_document_definition_id_idx"
ON "field_group_definitions"("document_definition_id");

CREATE UNIQUE INDEX "field_group_definitions_document_definition_id_key_key"
ON "field_group_definitions"("document_definition_id", "key");

CREATE UNIQUE INDEX "field_group_definitions_document_definition_id_position_key"
ON "field_group_definitions"("document_definition_id", "position");

-- AddForeignKey
ALTER TABLE "field_group_definitions"
ADD CONSTRAINT "field_group_definitions_document_definition_id_fkey"
FOREIGN KEY ("document_definition_id")
REFERENCES "document_definitions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- 既存データ移行
-- ==========================================

-- 既存 DocumentDefinition ごとに「基本情報」グループを作成
INSERT INTO "field_group_definitions" (
    "document_definition_id",
    "key",
    "label",
    "repeatable",
    "min_rows",
    "max_rows",
    "position",
    "created_at",
    "updated_at"
)
SELECT
    dd."id",
    'basic',
    '基本情報',
    false,
    1,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "document_definitions" dd;

-- nullable で追加
ALTER TABLE "field_definitions"
ADD COLUMN "field_group_definition_id" BIGINT;

-- 既存 FieldDefinition を基本情報グループへ紐付け
UPDATE "field_definitions" fd
SET "field_group_definition_id" = fgd."id"
FROM "field_group_definitions" fgd
WHERE fgd."document_definition_id" = fd."document_definition_id"
  AND fgd."key" = 'basic';

-- NOT NULL 化
ALTER TABLE "field_definitions"
ALTER COLUMN "field_group_definition_id" SET NOT NULL;

-- 旧制約削除
ALTER TABLE "field_definitions"
DROP CONSTRAINT "field_definitions_document_definition_id_fkey";

DROP INDEX "field_definitions_document_definition_id_idx";
DROP INDEX "field_definitions_document_definition_id_key_key";
DROP INDEX "field_definitions_document_definition_id_position_key";

-- 旧カラム削除
ALTER TABLE "field_definitions"
DROP COLUMN "document_definition_id";

-- 新インデックス
CREATE INDEX "field_definitions_field_group_definition_id_idx"
ON "field_definitions"("field_group_definition_id");

CREATE UNIQUE INDEX "field_definitions_field_group_definition_id_key_key"
ON "field_definitions"("field_group_definition_id", "key");

CREATE UNIQUE INDEX "field_definitions_field_group_definition_id_position_key"
ON "field_definitions"("field_group_definition_id", "position");

-- 新FK
ALTER TABLE "field_definitions"
ADD CONSTRAINT "field_definitions_field_group_definition_id_fkey"
FOREIGN KEY ("field_group_definition_id")
REFERENCES "field_group_definitions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "submission_field_group_rows" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "field_group_definition_id" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_field_group_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_field_group_rows_submission_id_idx"
ON "submission_field_group_rows"("submission_id");

CREATE INDEX "submission_field_group_rows_field_group_definition_id_idx"
ON "submission_field_group_rows"("field_group_definition_id");

CREATE UNIQUE INDEX "submission_field_group_rows_submission_id_field_group_defin_key"
ON "submission_field_group_rows"(
    "submission_id",
    "field_group_definition_id",
    "position"
);

-- AddForeignKey
ALTER TABLE "submission_field_group_rows"
ADD CONSTRAINT "submission_field_group_rows_submission_id_fkey"
FOREIGN KEY ("submission_id")
REFERENCES "submissions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "submission_field_group_rows"
ADD CONSTRAINT "submission_field_group_rows_field_group_definition_id_fkey"
FOREIGN KEY ("field_group_definition_id")
REFERENCES "field_group_definitions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==========================================
-- 既存データ移行
-- ==========================================

-- submission_field_values に nullable で新カラム追加
ALTER TABLE "submission_field_values"
ADD COLUMN "submission_field_group_row_id" BIGINT;

-- 既存 Submission ごとに basic グループの row を作成
INSERT INTO "submission_field_group_rows" (
    "submission_id",
    "field_group_definition_id",
    "position",
    "created_at",
    "updated_at"
)
SELECT
    s."id",
    fgd."id",
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "submissions" s
JOIN "field_group_definitions" fgd
  ON fgd."document_definition_id" = s."document_definition_id"
 AND fgd."key" = 'basic';

-- 既存 SubmissionFieldValue を row に紐付け
UPDATE "submission_field_values" sfv
SET "submission_field_group_row_id" = sfgr."id"
FROM "field_definitions" fd
JOIN "submission_field_group_rows" sfgr
  ON sfgr."field_group_definition_id" = fd."field_group_definition_id"
WHERE sfv."field_definition_id" = fd."id"
  AND sfgr."submission_id" = sfv."submission_id";

-- NOT NULL 化
ALTER TABLE "submission_field_values"
ALTER COLUMN "submission_field_group_row_id" SET NOT NULL;

-- 旧制約削除
ALTER TABLE "submission_field_values"
DROP CONSTRAINT "submission_field_values_submission_id_fkey";

DROP INDEX "submission_field_values_submission_id_idx";
DROP INDEX "submission_field_values_submission_id_field_definition_id_key";

-- 旧カラム削除
ALTER TABLE "submission_field_values"
DROP COLUMN "submission_id";

-- 新インデックス
CREATE INDEX "submission_field_values_submission_field_group_row_id_idx"
ON "submission_field_values"("submission_field_group_row_id");

CREATE UNIQUE INDEX "submission_field_values_submission_field_group_row_id_field_key"
ON "submission_field_values"(
    "submission_field_group_row_id",
    "field_definition_id"
);

-- 新FK
ALTER TABLE "submission_field_values"
ADD CONSTRAINT "submission_field_values_submission_field_group_row_id_fkey"
FOREIGN KEY ("submission_field_group_row_id")
REFERENCES "submission_field_group_rows"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;