package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Facility represents a bookable facility
type Facility struct {
	ID                         uuid.UUID  `json:"id"`
	Slug                       string     `json:"slug"`
	Name                       string     `json:"name"`
	Description                *string    `json:"description,omitempty"`
	FacilityType               string     `json:"facility_type"`
	Location                   *string    `json:"location,omitempty"`
	Capacity                   *int       `json:"capacity,omitempty"`
	MinBookingDurationMinutes  int        `json:"min_booking_duration_minutes"`
	MaxBookingDurationMinutes  int        `json:"max_booking_duration_minutes"`
	BufferMinutes              int        `json:"buffer_minutes"`
	AdvanceBookingDays         int        `json:"advance_booking_days"`
	CancellationCutoffHours    int        `json:"cancellation_cutoff_hours"`
	IsActive                   bool       `json:"is_active"`
	RequiresApproval           bool       `json:"requires_approval"`
	CreatedAt                  time.Time  `json:"created_at"`
	UpdatedAt                  time.Time  `json:"updated_at"`

	// Computed/joined fields
	AvailabilityWindows []AvailabilityWindow `json:"availability_windows,omitempty"`
}

// AvailabilityWindow represents a recurring weekly availability pattern
type AvailabilityWindow struct {
	ID              uuid.UUID  `json:"id"`
	FacilityID      uuid.UUID  `json:"facility_id"`
	DayOfWeek       int        `json:"day_of_week"` // 0=Sunday, 1=Monday, ..., 6=Saturday
	StartTime       string     `json:"start_time"`  // HH:MM:SS format
	EndTime         string     `json:"end_time"`    // HH:MM:SS format
	EffectiveFrom   *time.Time `json:"effective_from,omitempty"`
	EffectiveUntil  *time.Time `json:"effective_until,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// FacilityClosure represents an ad-hoc closure
type FacilityClosure struct {
	ID          uuid.UUID  `json:"id"`
	FacilityID  uuid.UUID  `json:"facility_id"`
	StartTime   time.Time  `json:"start_time"`
	EndTime     time.Time  `json:"end_time"`
	Reason      *string    `json:"reason,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	CreatedBy   *uuid.UUID `json:"created_by,omitempty"`
}

// FacilityBooking represents a user's facility booking
type FacilityBooking struct {
	ID                  uuid.UUID   `json:"id"`
	FacilityID          uuid.UUID   `json:"facility_id"`
	UserID              uuid.UUID   `json:"user_id"`
	HouseholdID         *uuid.UUID  `json:"household_id,omitempty"`
	ParticipantIDs      []uuid.UUID `json:"participant_ids,omitempty"`
	StartTime           time.Time   `json:"start_time"`
	EndTime             time.Time   `json:"end_time"`
	Status              string      `json:"status"` // 'confirmed', 'cancelled'
	Notes               *string     `json:"notes,omitempty"`
	CancelledAt         *time.Time  `json:"cancelled_at,omitempty"`
	CancelledBy         *uuid.UUID  `json:"cancelled_by,omitempty"`
	CancellationReason  *string     `json:"cancellation_reason,omitempty"`
	IdempotencyKey      *string     `json:"idempotency_key,omitempty"`
	CreatedAt           time.Time   `json:"created_at"`
	UpdatedAt           time.Time   `json:"updated_at"`

	// Joined fields
	Facility     *Facility      `json:"facility,omitempty"`
	User         *User          `json:"user,omitempty"`
	Participants []Participant  `json:"participants,omitempty"`
}

// AvailabilitySlot represents an available time slot
type AvailabilitySlot struct {
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

// CreateFacility creates a new facility
func (db *DB) CreateFacility(f *Facility) (*Facility, error) {
	query := `
		INSERT INTO facilities (
			slug, name, description, facility_type, location, capacity,
			min_booking_duration_minutes, max_booking_duration_minutes,
			buffer_minutes, advance_booking_days, cancellation_cutoff_hours,
			is_active, requires_approval
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`

	err := db.QueryRow(
		query,
		f.Slug, f.Name, f.Description, f.FacilityType, f.Location, f.Capacity,
		f.MinBookingDurationMinutes, f.MaxBookingDurationMinutes,
		f.BufferMinutes, f.AdvanceBookingDays, f.CancellationCutoffHours,
		f.IsActive, f.RequiresApproval,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create facility: %w", err)
	}

	return f, nil
}

// UpdateFacility updates an existing facility
func (db *DB) UpdateFacility(id uuid.UUID, f *Facility) error {
	query := `
		UPDATE facilities SET
			slug = $2,
			name = $3,
			description = $4,
			facility_type = $5,
			location = $6,
			capacity = $7,
			min_booking_duration_minutes = $8,
			max_booking_duration_minutes = $9,
			buffer_minutes = $10,
			advance_booking_days = $11,
			cancellation_cutoff_hours = $12,
			is_active = $13,
			requires_approval = $14,
			updated_at = NOW()
		WHERE id = $1
	`

	result, err := db.Exec(
		query,
		id, f.Slug, f.Name, f.Description, f.FacilityType, f.Location, f.Capacity,
		f.MinBookingDurationMinutes, f.MaxBookingDurationMinutes,
		f.BufferMinutes, f.AdvanceBookingDays, f.CancellationCutoffHours,
		f.IsActive, f.RequiresApproval,
	)

	if err != nil {
		return fmt.Errorf("failed to update facility: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("facility not found")
	}

	return nil
}

// GetFacilityByID retrieves a facility by ID
func (db *DB) GetFacilityByID(id uuid.UUID) (*Facility, error) {
	var f Facility
	query := `
		SELECT id, slug, name, description, facility_type, location, capacity,
			min_booking_duration_minutes, max_booking_duration_minutes,
			buffer_minutes, advance_booking_days, cancellation_cutoff_hours,
			is_active, requires_approval, created_at, updated_at
		FROM facilities
		WHERE id = $1
	`

	err := db.QueryRow(query, id).Scan(
		&f.ID, &f.Slug, &f.Name, &f.Description, &f.FacilityType, &f.Location, &f.Capacity,
		&f.MinBookingDurationMinutes, &f.MaxBookingDurationMinutes,
		&f.BufferMinutes, &f.AdvanceBookingDays, &f.CancellationCutoffHours,
		&f.IsActive, &f.RequiresApproval, &f.CreatedAt, &f.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get facility: %w", err)
	}

	return &f, nil
}

// GetFacilityBySlug retrieves a facility by slug
func (db *DB) GetFacilityBySlug(slug string) (*Facility, error) {
	var f Facility
	query := `
		SELECT id, slug, name, description, facility_type, location, capacity,
			min_booking_duration_minutes, max_booking_duration_minutes,
			buffer_minutes, advance_booking_days, cancellation_cutoff_hours,
			is_active, requires_approval, created_at, updated_at
		FROM facilities
		WHERE slug = $1
	`

	err := db.QueryRow(query, slug).Scan(
		&f.ID, &f.Slug, &f.Name, &f.Description, &f.FacilityType, &f.Location, &f.Capacity,
		&f.MinBookingDurationMinutes, &f.MaxBookingDurationMinutes,
		&f.BufferMinutes, &f.AdvanceBookingDays, &f.CancellationCutoffHours,
		&f.IsActive, &f.RequiresApproval, &f.CreatedAt, &f.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get facility: %w", err)
	}

	return &f, nil
}

// GetAllFacilities retrieves all facilities
func (db *DB) GetAllFacilities(activeOnly bool) ([]Facility, error) {
	query := `
		SELECT id, slug, name, description, facility_type, location, capacity,
			min_booking_duration_minutes, max_booking_duration_minutes,
			buffer_minutes, advance_booking_days, cancellation_cutoff_hours,
			is_active, requires_approval, created_at, updated_at
		FROM facilities
		WHERE ($1 = false OR is_active = true)
		ORDER BY name ASC
	`

	rows, err := db.Query(query, activeOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to query facilities: %w", err)
	}
	defer rows.Close()

	var facilities []Facility
	for rows.Next() {
		var f Facility
		err := rows.Scan(
			&f.ID, &f.Slug, &f.Name, &f.Description, &f.FacilityType, &f.Location, &f.Capacity,
			&f.MinBookingDurationMinutes, &f.MaxBookingDurationMinutes,
			&f.BufferMinutes, &f.AdvanceBookingDays, &f.CancellationCutoffHours,
			&f.IsActive, &f.RequiresApproval, &f.CreatedAt, &f.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan facility: %w", err)
		}
		facilities = append(facilities, f)
	}

	return facilities, nil
}

// DeleteFacility deletes a facility (soft delete by setting is_active = false)
func (db *DB) DeleteFacility(id uuid.UUID) error {
	query := `UPDATE facilities SET is_active = false, updated_at = NOW() WHERE id = $1`
	result, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete facility: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("facility not found")
	}

	return nil
}

// CreateAvailabilityWindow creates a new availability window
func (db *DB) CreateAvailabilityWindow(aw *AvailabilityWindow) (*AvailabilityWindow, error) {
	query := `
		INSERT INTO availability_windows (
			facility_id, day_of_week, start_time, end_time,
			effective_from, effective_until
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	err := db.QueryRow(
		query,
		aw.FacilityID, aw.DayOfWeek, aw.StartTime, aw.EndTime,
		aw.EffectiveFrom, aw.EffectiveUntil,
	).Scan(&aw.ID, &aw.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create availability window: %w", err)
	}

	return aw, nil
}

// GetAvailabilityWindows retrieves all availability windows for a facility
func (db *DB) GetAvailabilityWindows(facilityID uuid.UUID) ([]AvailabilityWindow, error) {
	query := `
		SELECT id, facility_id, day_of_week, start_time::text, end_time::text,
			effective_from, effective_until, created_at
		FROM availability_windows
		WHERE facility_id = $1
		ORDER BY day_of_week, start_time
	`

	rows, err := db.Query(query, facilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to query availability windows: %w", err)
	}
	defer rows.Close()

	var windows []AvailabilityWindow
	for rows.Next() {
		var aw AvailabilityWindow
		err := rows.Scan(
			&aw.ID, &aw.FacilityID, &aw.DayOfWeek, &aw.StartTime, &aw.EndTime,
			&aw.EffectiveFrom, &aw.EffectiveUntil, &aw.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan availability window: %w", err)
		}
		windows = append(windows, aw)
	}

	return windows, nil
}

// DeleteAvailabilityWindow deletes an availability window
func (db *DB) DeleteAvailabilityWindow(id uuid.UUID) error {
	query := `DELETE FROM availability_windows WHERE id = $1`
	result, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete availability window: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("availability window not found")
	}

	return nil
}

// CreateClosure creates a new closure
func (db *DB) CreateClosure(c *FacilityClosure) (*FacilityClosure, error) {
	query := `
		INSERT INTO facility_closures (
			facility_id, start_time, end_time, reason, created_by
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`

	err := db.QueryRow(
		query,
		c.FacilityID, c.StartTime, c.EndTime, c.Reason, c.CreatedBy,
	).Scan(&c.ID, &c.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create closure: %w", err)
	}

	return c, nil
}

// GetClosures retrieves all closures for a facility within a date range
func (db *DB) GetClosures(facilityID uuid.UUID, startTime, endTime time.Time) ([]FacilityClosure, error) {
	query := `
		SELECT id, facility_id, start_time, end_time, reason, created_at, created_by
		FROM facility_closures
		WHERE facility_id = $1
			AND start_time < $3
			AND end_time > $2
		ORDER BY start_time
	`

	rows, err := db.Query(query, facilityID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query closures: %w", err)
	}
	defer rows.Close()

	var closures []FacilityClosure
	for rows.Next() {
		var c FacilityClosure
		err := rows.Scan(
			&c.ID, &c.FacilityID, &c.StartTime, &c.EndTime, &c.Reason, &c.CreatedAt, &c.CreatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan closure: %w", err)
		}
		closures = append(closures, c)
	}

	return closures, nil
}

// DeleteClosure deletes a closure
func (db *DB) DeleteClosure(id uuid.UUID) error {
	query := `DELETE FROM facility_closures WHERE id = $1`
	result, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete closure: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("closure not found")
	}

	return nil
}

// CreateBooking creates a new facility booking
func (db *DB) CreateBooking(b *FacilityBooking) (*FacilityBooking, error) {
	query := `
		INSERT INTO facility_bookings (
			facility_id, user_id, household_id, participant_ids,
			start_time, end_time, status, notes, idempotency_key
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	err := db.QueryRow(
		query,
		b.FacilityID, b.UserID, b.HouseholdID, pq.Array(b.ParticipantIDs),
		b.StartTime, b.EndTime, b.Status, b.Notes, b.IdempotencyKey,
	).Scan(&b.ID, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	return b, nil
}

// GetBooking retrieves a booking by ID
func (db *DB) GetBooking(id uuid.UUID) (*FacilityBooking, error) {
	var b FacilityBooking
	query := `
		SELECT id, facility_id, user_id, household_id, participant_ids,
			start_time, end_time, status, notes,
			cancelled_at, cancelled_by, cancellation_reason,
			idempotency_key, created_at, updated_at
		FROM facility_bookings
		WHERE id = $1
	`

	err := db.QueryRow(query, id).Scan(
		&b.ID, &b.FacilityID, &b.UserID, &b.HouseholdID, pq.Array(&b.ParticipantIDs),
		&b.StartTime, &b.EndTime, &b.Status, &b.Notes,
		&b.CancelledAt, &b.CancelledBy, &b.CancellationReason,
		&b.IdempotencyKey, &b.CreatedAt, &b.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get booking: %w", err)
	}

	return &b, nil
}

// GetBookings retrieves bookings with optional filters
func (db *DB) GetBookings(facilityID *uuid.UUID, userID *uuid.UUID, startTime, endTime *time.Time, status string) ([]FacilityBooking, error) {
	query := `
		SELECT id, facility_id, user_id, household_id, participant_ids,
			start_time, end_time, status, notes,
			cancelled_at, cancelled_by, cancellation_reason,
			idempotency_key, created_at, updated_at
		FROM facility_bookings
		WHERE ($1::uuid IS NULL OR facility_id = $1)
			AND ($2::uuid IS NULL OR user_id = $2)
			AND ($3::timestamptz IS NULL OR end_time > $3)
			AND ($4::timestamptz IS NULL OR start_time < $4)
			AND ($5 = '' OR status = $5)
		ORDER BY start_time ASC
	`

	rows, err := db.Query(query, facilityID, userID, startTime, endTime, status)
	if err != nil {
		return nil, fmt.Errorf("failed to query bookings: %w", err)
	}
	defer rows.Close()

	var bookings []FacilityBooking
	for rows.Next() {
		var b FacilityBooking
		err := rows.Scan(
			&b.ID, &b.FacilityID, &b.UserID, &b.HouseholdID, pq.Array(&b.ParticipantIDs),
			&b.StartTime, &b.EndTime, &b.Status, &b.Notes,
			&b.CancelledAt, &b.CancelledBy, &b.CancellationReason,
			&b.IdempotencyKey, &b.CreatedAt, &b.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan booking: %w", err)
		}
		bookings = append(bookings, b)
	}

	return bookings, nil
}

// CancelBooking cancels a booking
func (db *DB) CancelBooking(id uuid.UUID, cancelledBy uuid.UUID, reason *string) error {
	query := `
		UPDATE facility_bookings SET
			status = 'cancelled',
			cancelled_at = NOW(),
			cancelled_by = $2,
			cancellation_reason = $3,
			updated_at = NOW()
		WHERE id = $1 AND status = 'confirmed'
	`

	result, err := db.Exec(query, id, cancelledBy, reason)
	if err != nil {
		return fmt.Errorf("failed to cancel booking: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("booking not found or already cancelled")
	}

	return nil
}

// GetBookingByIdempotencyKey retrieves a booking by idempotency key
func (db *DB) GetBookingByIdempotencyKey(key string) (*FacilityBooking, error) {
	var b FacilityBooking
	query := `
		SELECT id, facility_id, user_id, household_id, participant_ids,
			start_time, end_time, status, notes,
			cancelled_at, cancelled_by, cancellation_reason,
			idempotency_key, created_at, updated_at
		FROM facility_bookings
		WHERE idempotency_key = $1
	`

	err := db.QueryRow(query, key).Scan(
		&b.ID, &b.FacilityID, &b.UserID, &b.HouseholdID, pq.Array(&b.ParticipantIDs),
		&b.StartTime, &b.EndTime, &b.Status, &b.Notes,
		&b.CancelledAt, &b.CancelledBy, &b.CancellationReason,
		&b.IdempotencyKey, &b.CreatedAt, &b.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get booking by idempotency key: %w", err)
	}

	return &b, nil
}
