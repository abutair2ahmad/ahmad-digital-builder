-- NACRE — production schema (PostgreSQL 14+ / Supabase)
--
-- Apply with:  psql "$DATABASE_URL" -f db/schema.sql
-- or:          npm run db:setup

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- btree_gist lets an exclusion constraint mix equality (doctor) with range
-- overlap (appointment window). This is what makes double booking impossible
-- at the database level rather than merely unlikely at the application level.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference   text        NOT NULL UNIQUE,
  patient_name        text        NOT NULL CHECK (length(btrim(patient_name)) BETWEEN 2 AND 120),
  phone               text        NOT NULL CHECK (length(btrim(phone)) BETWEEN 6 AND 32),
  email               text        NOT NULL CHECK (position('@' IN email) > 1),
  treatment_id        text        NOT NULL,
  doctor_id           text        NOT NULL,
  "date"              date        NOT NULL,
  start_time          time        NOT NULL,
  end_time            time        NOT NULL,
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  note                text,
  calendar_event_id   text,
  calendar_sync_state text        NOT NULL DEFAULT 'pending'
                                  CHECK (calendar_sync_state IN ('pending','synced','simulated','failed','not_applicable')),
  manage_token_hash   text        NOT NULL,
  source              text        NOT NULL DEFAULT 'website'
                                  CHECK (source IN ('website','phone','walk_in')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  cancelled_at        timestamptz,
  cancellation_reason text,
  CONSTRAINT bookings_time_order CHECK (end_time > start_time)
);

-- A doctor cannot hold two overlapping appointments. Cancelled and no-show
-- rows are excluded so a released slot becomes bookable again immediately.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tsrange(("date" + start_time), ("date" + end_time)) WITH &&
  ) WHERE (status IN ('pending','confirmed','completed'));

CREATE INDEX IF NOT EXISTS bookings_date_idx        ON bookings ("date");
CREATE INDEX IF NOT EXISTS bookings_doctor_date_idx ON bookings (doctor_id, "date");
CREATE INDEX IF NOT EXISTS bookings_status_idx      ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_token_idx       ON bookings (manage_token_hash);

CREATE TABLE IF NOT EXISTS integration_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings (id) ON DELETE CASCADE,
  channel    text        NOT NULL CHECK (channel IN ('google_calendar','whatsapp')),
  action     text        NOT NULL,
  mode       text        NOT NULL CHECK (mode IN ('live','simulated')),
  status     text        NOT NULL CHECK (status IN ('success','failed','skipped')),
  detail     text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_events_created_idx ON integration_events (created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_touch_updated_at ON bookings;
CREATE TRIGGER bookings_touch_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
