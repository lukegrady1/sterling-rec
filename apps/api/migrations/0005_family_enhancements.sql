-- Migration 0005: Family Section Enhancements
-- Adds address fields to households, new participant fields, and waiver tracking

-- Add address fields to households table
ALTER TABLE households
ADD COLUMN address_line1 TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip TEXT;

-- Add new fields to participants table
ALTER TABLE participants
ADD COLUMN emergency_contact_name TEXT,
ADD COLUMN emergency_contact_phone TEXT,
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN gender TEXT,
ADD COLUMN shirt_size TEXT;

-- Create participant_waivers table for tracking waiver acceptances
CREATE TABLE participant_waivers (
  id BIGSERIAL PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  waiver_key TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, waiver_key)
);

-- Create index on participant_waivers for faster lookups
CREATE INDEX idx_participant_waivers_participant_id ON participant_waivers(participant_id);
CREATE INDEX idx_participant_waivers_waiver_key ON participant_waivers(waiver_key);

-- Add index on is_favorite for faster favorite queries
CREATE INDEX idx_participants_is_favorite ON participants(is_favorite) WHERE is_favorite = true;
