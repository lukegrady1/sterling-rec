-- Sync tracking tables for Central Platform integration

-- Sync events table to track all sync attempts
CREATE TYPE sync_event_type AS ENUM('REGISTRATION_CREATED','REGISTRATION_CANCELLED','FACILITY_BOOKING','FACILITY_CANCELLATION');
CREATE TYPE sync_status AS ENUM('pending','success','failed','retrying');

CREATE TABLE sync_events (
  id BIGSERIAL PRIMARY KEY,
  event_type sync_event_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status sync_status NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_events_status ON sync_events(status);
CREATE INDEX idx_sync_events_next_retry ON sync_events(next_retry_at) WHERE status = 'pending' OR status = 'retrying';
CREATE INDEX idx_sync_events_entity ON sync_events(entity_type, entity_id);

-- Cache table for central platform data
CREATE TABLE central_data_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_central_cache_key ON central_data_cache(cache_key);
CREATE INDEX idx_central_cache_expiry ON central_data_cache(expires_at);

-- Sync logs for debugging and monitoring
CREATE TABLE sync_logs (
  id BIGSERIAL PRIMARY KEY,
  sync_event_id BIGINT REFERENCES sync_events(id) ON DELETE CASCADE,
  log_level TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_event ON sync_logs(sync_event_id);
CREATE INDEX idx_sync_logs_created ON sync_logs(created_at);
