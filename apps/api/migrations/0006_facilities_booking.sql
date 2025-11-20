-- Migration: Facilities Booking System
-- Adds tables for managing bookable facilities, availability schedules, bookings, and closures

-- Facilities table: Core facility information
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    facility_type TEXT NOT NULL, -- 'field', 'court', 'room', etc.
    location TEXT,
    capacity INT, -- Optional: max occupancy if applicable

    -- Booking constraints
    min_booking_duration_minutes INT NOT NULL DEFAULT 30, -- Minimum slot duration
    max_booking_duration_minutes INT NOT NULL DEFAULT 180, -- Maximum slot duration
    buffer_minutes INT NOT NULL DEFAULT 0, -- Buffer time between bookings
    advance_booking_days INT NOT NULL DEFAULT 30, -- How far in advance can book
    cancellation_cutoff_hours INT NOT NULL DEFAULT 24, -- Hours before booking starts

    -- Flags
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false, -- For future approval workflows

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facilities_slug ON facilities(slug);
CREATE INDEX idx_facilities_active ON facilities(is_active) WHERE is_active = true;
CREATE INDEX idx_facilities_type ON facilities(facility_type);

-- Availability windows: Recurring weekly availability patterns
-- Example: "Every Monday from 9am-5pm" or "Tuesday/Thursday 6pm-9pm"
CREATE TABLE IF NOT EXISTS availability_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

    -- Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Time range (stored as time without timezone for recurring patterns)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),

    -- Optional: effective date range for seasonal availability
    effective_from DATE,
    effective_until DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_facility ON availability_windows(facility_id);
CREATE INDEX idx_availability_day ON availability_windows(day_of_week);

-- Closures: Ad-hoc unavailability (maintenance, holidays, special events)
CREATE TABLE IF NOT EXISTS facility_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

    -- Date/time range for closure (stored in UTC)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),

    reason TEXT, -- Optional: "Maintenance", "Holiday", etc.

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_closures_facility ON facility_closures(facility_id);
CREATE INDEX idx_closures_time_range ON facility_closures(start_time, end_time);

-- Bookings: Actual reservations made by users
CREATE TABLE IF NOT EXISTS facility_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,

    -- Who made the booking
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,

    -- Optional: participants associated with this booking
    -- (for tracking who is actually using the facility)
    participant_ids UUID[] DEFAULT '{}',

    -- Booking time range (stored in UTC)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),

    -- Notes and metadata
    notes TEXT,

    -- Cancellation tracking
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT,

    -- Idempotency key for preventing duplicate bookings from double-clicks
    idempotency_key TEXT UNIQUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_facility ON facility_bookings(facility_id);
CREATE INDEX idx_bookings_user ON facility_bookings(user_id);
CREATE INDEX idx_bookings_household ON facility_bookings(household_id);
CREATE INDEX idx_bookings_time_range ON facility_bookings(facility_id, start_time, end_time);
CREATE INDEX idx_bookings_status ON facility_bookings(status) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_idempotency ON facility_bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Prevent overlapping confirmed bookings for the same facility
-- This constraint provides database-level protection against double-booking
CREATE UNIQUE INDEX idx_no_overlapping_bookings ON facility_bookings (
    facility_id,
    start_time,
    end_time
) WHERE status = 'confirmed';

-- Add email templates for facility bookings
INSERT INTO email_templates (template_key, subject, body_html, body_text) VALUES
(
    'facility_booking_confirmation',
    'Booking Confirmed: {{.FacilityName}} - {{.StartTime}}',
    '<h2>Booking Confirmation</h2>
    <p>Hi {{.UserFirstName}},</p>
    <p>Your booking has been confirmed!</p>
    <div style="border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3>{{.FacilityName}}</h3>
        <p><strong>Date:</strong> {{.BookingDate}}</p>
        <p><strong>Time:</strong> {{.StartTime}} - {{.EndTime}}</p>
        <p><strong>Location:</strong> {{.Location}}</p>
        {{if .Notes}}<p><strong>Notes:</strong> {{.Notes}}</p>{{end}}
    </div>
    <p>Please arrive on time. If you need to cancel, please do so at least {{.CancellationCutoffHours}} hours in advance.</p>
    <p>View your booking: <a href="{{.BookingURL}}">{{.BookingURL}}</a></p>
    <p>Best regards,<br>Sterling Recreation</p>',
    'Booking Confirmation

Hi {{.UserFirstName}},

Your booking has been confirmed!

Facility: {{.FacilityName}}
Date: {{.BookingDate}}
Time: {{.StartTime}} - {{.EndTime}}
Location: {{.Location}}
{{if .Notes}}Notes: {{.Notes}}{{end}}

Please arrive on time. If you need to cancel, please do so at least {{.CancellationCutoffHours}} hours in advance.

View your booking: {{.BookingURL}}

Best regards,
Sterling Recreation'
),
(
    'facility_booking_reminder',
    'Reminder: {{.FacilityName}} booking tomorrow at {{.StartTime}}',
    '<h2>Booking Reminder</h2>
    <p>Hi {{.UserFirstName}},</p>
    <p>This is a reminder that you have a booking tomorrow:</p>
    <div style="border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3>{{.FacilityName}}</h3>
        <p><strong>Date:</strong> {{.BookingDate}}</p>
        <p><strong>Time:</strong> {{.StartTime}} - {{.EndTime}}</p>
        <p><strong>Location:</strong> {{.Location}}</p>
    </div>
    <p>We look forward to seeing you!</p>
    <p>View your booking: <a href="{{.BookingURL}}">{{.BookingURL}}</a></p>
    <p>Best regards,<br>Sterling Recreation</p>',
    'Booking Reminder

Hi {{.UserFirstName}},

This is a reminder that you have a booking tomorrow:

Facility: {{.FacilityName}}
Date: {{.BookingDate}}
Time: {{.StartTime}} - {{.EndTime}}
Location: {{.Location}}

We look forward to seeing you!

View your booking: {{.BookingURL}}

Best regards,
Sterling Recreation'
),
(
    'facility_booking_cancelled',
    'Booking Cancelled: {{.FacilityName}} - {{.StartTime}}',
    '<h2>Booking Cancelled</h2>
    <p>Hi {{.UserFirstName}},</p>
    <p>Your booking has been cancelled:</p>
    <div style="border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <h3>{{.FacilityName}}</h3>
        <p><strong>Date:</strong> {{.BookingDate}}</p>
        <p><strong>Time:</strong> {{.StartTime}} - {{.EndTime}}</p>
        {{if .CancellationReason}}<p><strong>Reason:</strong> {{.CancellationReason}}</p>{{end}}
    </div>
    <p>If you did not request this cancellation, please contact us immediately.</p>
    <p>Best regards,<br>Sterling Recreation</p>',
    'Booking Cancelled

Hi {{.UserFirstName}},

Your booking has been cancelled:

Facility: {{.FacilityName}}
Date: {{.BookingDate}}
Time: {{.StartTime}} - {{.EndTime}}
{{if .CancellationReason}}Reason: {{.CancellationReason}}{{end}}

If you did not request this cancellation, please contact us immediately.

Best regards,
Sterling Recreation'
)
ON CONFLICT (template_key) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE facilities IS 'Bookable facilities (fields, courts, rooms, etc.)';
COMMENT ON TABLE availability_windows IS 'Recurring weekly availability patterns for facilities';
COMMENT ON TABLE facility_closures IS 'Ad-hoc closures for maintenance, holidays, etc.';
COMMENT ON TABLE facility_bookings IS 'User reservations for facilities';
COMMENT ON INDEX idx_no_overlapping_bookings IS 'Prevents double-booking at the database level';
