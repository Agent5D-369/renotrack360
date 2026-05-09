-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "brandSecondaryColor" TEXT,
ADD COLUMN     "companyTagline" TEXT;

-- RenameIndex
ALTER INDEX "ProfileRelationship_fromProfileId_toProfileId_relationshipType_" RENAME TO "ProfileRelationship_fromProfileId_toProfileId_relationshipT_key";
