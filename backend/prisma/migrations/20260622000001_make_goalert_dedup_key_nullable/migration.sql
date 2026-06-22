-- GoAlert is no longer used for alert routing; make dedup key optional.
ALTER TABLE "alert_events" ALTER COLUMN "goalert_dedup_key" DROP NOT NULL;
