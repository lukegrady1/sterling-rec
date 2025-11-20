-- Enable CITEXT extension for case-insensitive email
CREATE EXTENSION IF NOT EXISTS citext;

-- Users (public accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

-- Households & Participants
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_households_owner ON households(owner_user_id);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE,
  notes TEXT,
  medical_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_participants_household ON participants(household_id);

-- Programs / Events / Sessions
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  age_min INT,
  age_max INT,
  location TEXT,
  capacity INT NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  schedule_notes TEXT,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_programs_slug ON programs(slug);
CREATE INDEX idx_programs_active ON programs(is_active) WHERE is_active = true;

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  capacity INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_active ON events(is_active) WHERE is_active = true;
CREATE INDEX idx_events_starts_at ON events(starts_at);

CREATE TYPE parent_type AS ENUM('program','event');

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type parent_type NOT NULL,
  parent_id UUID NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  capacity_override INT,
  is_active BOOL NOT NULL DEFAULT true
);

CREATE INDEX idx_sessions_parent ON sessions(parent_type, parent_id);
CREATE INDEX idx_sessions_starts_at ON sessions(starts_at);

-- Registrations / Waitlists
CREATE TYPE reg_status AS ENUM('confirmed','waitlisted','cancelled');

CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type parent_type NOT NULL,
  parent_id UUID NOT NULL,
  session_id UUID,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  status reg_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_type,parent_id,session_id,participant_id)
);

CREATE INDEX idx_registrations_participant ON registrations(participant_id);
CREATE INDEX idx_registrations_parent ON registrations(parent_type, parent_id, session_id);
CREATE INDEX idx_registrations_status ON registrations(status);

CREATE TABLE waitlist_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type parent_type NOT NULL,
  parent_id UUID NOT NULL,
  session_id UUID,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  position INT NOT NULL,
  notify_opt_in BOOL NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_type,parent_id,session_id,participant_id)
);

CREATE INDEX idx_waitlist_parent ON waitlist_positions(parent_type, parent_id, session_id, position);

-- Notifications queue
CREATE TYPE notif_type AS ENUM('CONFIRMATION','REMINDER','WAITLIST_SPOT','WAITLIST_PROMOTED');

CREATE TABLE notification_queue (
  id BIGSERIAL PRIMARY KEY,
  type notif_type NOT NULL,
  payload JSONB NOT NULL,
  not_before_ts TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_queue_pending ON notification_queue(not_before_ts, attempts) WHERE attempts < max_attempts;

-- Simple metrics
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_type ON metrics(metric_type, created_at);
