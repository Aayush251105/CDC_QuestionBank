-- Drive PINs are exactly 6 digits. A PIN works only while the drive is OPEN
-- and the admin has it switched on (pinEnabled). pinRevokedAt is replaced by
-- the pinEnabled toggle.

-- AlterTable
ALTER TABLE "Drive" DROP COLUMN "pinRevokedAt",
ADD COLUMN     "pinEnabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "submissionPin" SET DATA TYPE CHAR(6);

-- Not expressible in schema.prisma: reject anything that is not 6 digits.
ALTER TABLE "Drive" ADD CONSTRAINT "Drive_submissionPin_six_digits"
  CHECK ("submissionPin" IS NULL OR "submissionPin" ~ '^[0-9]{6}$');
