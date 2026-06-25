/*
  Warnings:

  - You are about to drop the `document_drafts` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `draft_content` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "document_drafts" DROP CONSTRAINT "document_drafts_document_id_fkey";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "draft_content" JSONB NOT NULL,
ADD COLUMN     "published_content" JSONB;

-- DropTable
DROP TABLE "document_drafts";
