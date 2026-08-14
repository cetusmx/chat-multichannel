
ALTER TYPE "ConversationStatus" ADD VALUE 'WAITING_CUSTOMER';
ALTER TYPE "ConversationStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "ConversationStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "ConversationStatus" ADD VALUE 'DISCARDED';
ALTER TYPE "ConversationStatus" ADD VALUE 'CLOSED_INACTIVE';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "on_hold_expiration" TIMESTAMP(3),
ADD COLUMN     "on_hold_reason" VARCHAR(255),
ADD COLUMN     "scheduled_at" TIMESTAMP(3),
ADD COLUMN     "status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "auto_close_inactive_hours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "is_sla_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Add Check Constraints
ALTER TABLE "tenants" ADD CONSTRAINT "chk_auto_close_inactive_hours" CHECK ("auto_close_inactive_hours" >= 0);
ALTER TABLE "conversations" ADD CONSTRAINT "chk_status_scheduled" CHECK ("status"::text != 'SCHEDULED' OR "scheduled_at" IS NOT NULL);
ALTER TABLE "conversations" ADD CONSTRAINT "chk_status_on_hold" CHECK ("status"::text != 'ON_HOLD' OR ("on_hold_expiration" IS NOT NULL AND NULLIF(BTRIM("on_hold_reason", E' \t\n\r'), '') IS NOT NULL));
ALTER TABLE "conversations" ADD CONSTRAINT "chk_no_dangling_paused_data" CHECK (("status"::text = 'SCHEDULED' AND "on_hold_expiration" IS NULL AND "on_hold_reason" IS NULL) OR ("status"::text = 'ON_HOLD' AND "scheduled_at" IS NULL) OR ("status"::text NOT IN ('SCHEDULED', 'ON_HOLD') AND "scheduled_at" IS NULL AND "on_hold_expiration" IS NULL AND "on_hold_reason" IS NULL));

-- Create Trigger for statusUpdatedAt
CREATE OR REPLACE FUNCTION update_conversation_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.on_hold_expiration IS NOT NULL AND NEW.on_hold_expiration <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN
      RAISE EXCEPTION 'must be in future';
    END IF;
    IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN
      RAISE EXCEPTION 'must be in future';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.on_hold_expiration IS DISTINCT FROM OLD.on_hold_expiration AND NEW.on_hold_expiration <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN
      RAISE EXCEPTION 'must be in future';
    END IF;
    IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND NEW.scheduled_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') THEN
      RAISE EXCEPTION 'must be in future';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status_updated_at = OLD.status_updated_at THEN
        NEW.status_updated_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
      END IF;

      IF NEW.status::text != 'SCHEDULED' THEN
        NEW.scheduled_at = NULL;
      END IF;
      IF NEW.status::text != 'ON_HOLD' THEN
        NEW.on_hold_expiration = NULL;
        NEW.on_hold_reason = NULL;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_conversation_status_lifecycle
BEFORE INSERT OR UPDATE ON "conversations"
FOR EACH ROW
EXECUTE FUNCTION update_conversation_status_updated_at();

-- CreateIndex
CREATE INDEX "conversations_status_on_hold_expiration_idx" ON "conversations"("status", "on_hold_expiration");

-- CreateIndex
CREATE INDEX "conversations_status_scheduled_at_idx" ON "conversations"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "conversations_status_status_updated_at_idx" ON "conversations"("status", "status_updated_at");
