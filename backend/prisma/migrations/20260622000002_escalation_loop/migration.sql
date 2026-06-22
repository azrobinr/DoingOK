-- Add per-user configurable delay between escalation steps (default 15 minutes).
ALTER TABLE "checkin_schedules"
  ADD COLUMN "escalation_delay_minutes" INTEGER NOT NULL DEFAULT 15;

-- Enums for escalation contact tracking.
CREATE TYPE "escalation_method" AS ENUM ('sms', 'call', 'email');
CREATE TYPE "escalation_contact_status" AS ENUM ('sent', 'delivered', 'failed');

-- Records each notification sent to a trusted contact for a given alert.
-- trustedContactId is nullable so the row survives a contact being deleted.
-- priorityOrder is copied from the contact at notification time for audit purposes.
CREATE TABLE "escalation_contacts" (
  "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  "alert_event_id"      UUID        NOT NULL,
  "trusted_contact_id"  UUID,
  "priority_order"      INTEGER     NOT NULL,
  "method"              "escalation_method"          NOT NULL,
  "status"              "escalation_contact_status"  NOT NULL DEFAULT 'sent',
  "notified_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "error_message"       TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "escalation_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "escalation_contacts_alert_event_id_idx"    ON "escalation_contacts"("alert_event_id");
CREATE INDEX "escalation_contacts_trusted_contact_id_idx" ON "escalation_contacts"("trusted_contact_id");

ALTER TABLE "escalation_contacts"
  ADD CONSTRAINT "escalation_contacts_alert_event_id_fkey"
    FOREIGN KEY ("alert_event_id") REFERENCES "alert_events"("id") ON DELETE CASCADE;

ALTER TABLE "escalation_contacts"
  ADD CONSTRAINT "escalation_contacts_trusted_contact_id_fkey"
    FOREIGN KEY ("trusted_contact_id") REFERENCES "trusted_contacts"("id") ON DELETE SET NULL;
