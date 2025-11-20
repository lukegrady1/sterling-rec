package db

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

// GetActivePrograms retrieves all active programs with capacity info
func (db *DB) GetActivePrograms() ([]Program, error) {
	rows, err := db.Query(`
		SELECT
			p.id, p.slug, p.title, p.description, p.age_min, p.age_max,
			p.location, p.capacity, p.start_date, p.end_date, p.schedule_notes,
			p.is_active, p.created_at, p.updated_at,
			COALESCE(p.capacity - COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END), 0) as spots_left,
			COUNT(DISTINCT CASE WHEN r.status = 'waitlisted' THEN r.id END) as waitlist_count
		FROM programs p
		LEFT JOIN registrations r ON r.parent_type = 'program' AND r.parent_id = p.id AND r.session_id IS NULL
		WHERE p.is_active = true
		GROUP BY p.id
		ORDER BY p.start_date ASC NULLS LAST, p.title ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get programs: %w", err)
	}
	defer rows.Close()

	var programs []Program
	for rows.Next() {
		var p Program
		var spotsLeft, waitlistCount int
		err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Description, &p.AgeMin, &p.AgeMax,
			&p.Location, &p.Capacity, &p.StartDate, &p.EndDate, &p.ScheduleNotes,
			&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
			&spotsLeft, &waitlistCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan program: %w", err)
		}
		p.SpotsLeft = &spotsLeft
		p.WaitlistCount = &waitlistCount
		programs = append(programs, p)
	}

	return programs, nil
}

// GetProgramBySlug retrieves a program by slug with sessions
func (db *DB) GetProgramBySlug(slug string) (*Program, error) {
	var p Program
	err := db.QueryRow(`
		SELECT
			id, slug, title, description, age_min, age_max,
			location, capacity, start_date, end_date, schedule_notes,
			is_active, created_at, updated_at
		FROM programs
		WHERE slug = $1 AND is_active = true
	`, slug).Scan(
		&p.ID, &p.Slug, &p.Title, &p.Description, &p.AgeMin, &p.AgeMax,
		&p.Location, &p.Capacity, &p.StartDate, &p.EndDate, &p.ScheduleNotes,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get program: %w", err)
	}

	// Get sessions with capacity info
	sessions, err := db.GetProgramSessions(p.ID, p.Capacity)
	if err != nil {
		return nil, err
	}
	p.Sessions = sessions

	// Calculate overall capacity
	if len(sessions) == 0 {
		// No sessions, use program-level registration
		var spotsLeft, waitlistCount int
		err = db.QueryRow(`
			SELECT
				COALESCE($1 - COUNT(DISTINCT CASE WHEN status = 'confirmed' THEN id END), 0),
				COUNT(DISTINCT CASE WHEN status = 'waitlisted' THEN id END)
			FROM registrations
			WHERE parent_type = 'program' AND parent_id = $2 AND session_id IS NULL
		`, p.Capacity, p.ID).Scan(&spotsLeft, &waitlistCount)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate capacity: %w", err)
		}
		p.SpotsLeft = &spotsLeft
		p.WaitlistCount = &waitlistCount
	}

	return &p, nil
}

// GetProgramSessions retrieves sessions for a program
func (db *DB) GetProgramSessions(programID uuid.UUID, defaultCapacity int) ([]Session, error) {
	rows, err := db.Query(`
		SELECT
			s.id, s.parent_type, s.parent_id, s.starts_at, s.ends_at,
			s.capacity_override, s.is_active,
			COALESCE(s.capacity_override, $1) as effective_capacity,
			COALESCE(COALESCE(s.capacity_override, $1) - COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END), 0) as spots_left,
			COUNT(DISTINCT CASE WHEN r.status = 'waitlisted' THEN r.id END) as waitlist_count
		FROM sessions s
		LEFT JOIN registrations r ON r.session_id = s.id
		WHERE s.parent_type = 'program' AND s.parent_id = $2 AND s.is_active = true
		GROUP BY s.id
		ORDER BY s.starts_at ASC NULLS LAST
	`, defaultCapacity, programID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sessions: %w", err)
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		var effectiveCapacity, spotsLeft, waitlistCount int
		err := rows.Scan(
			&s.ID, &s.ParentType, &s.ParentID, &s.StartsAt, &s.EndsAt,
			&s.CapacityOverride, &s.IsActive,
			&effectiveCapacity, &spotsLeft, &waitlistCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		s.SpotsLeft = &spotsLeft
		s.WaitlistCount = &waitlistCount
		sessions = append(sessions, s)
	}

	return sessions, nil
}

// GetActiveEvents retrieves all active events with capacity info
func (db *DB) GetActiveEvents() ([]Event, error) {
	rows, err := db.Query(`
		SELECT
			e.id, e.slug, e.title, e.description, e.location, e.capacity,
			e.starts_at, e.ends_at, e.is_active, e.created_at, e.updated_at,
			COALESCE(e.capacity - COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END), 0) as spots_left,
			COUNT(DISTINCT CASE WHEN r.status = 'waitlisted' THEN r.id END) as waitlist_count
		FROM events e
		LEFT JOIN registrations r ON r.parent_type = 'event' AND r.parent_id = e.id
		WHERE e.is_active = true
		GROUP BY e.id
		ORDER BY e.starts_at ASC NULLS LAST, e.title ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get events: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var spotsLeft, waitlistCount int
		err := rows.Scan(
			&e.ID, &e.Slug, &e.Title, &e.Description, &e.Location, &e.Capacity,
			&e.StartsAt, &e.EndsAt, &e.IsActive, &e.CreatedAt, &e.UpdatedAt,
			&spotsLeft, &waitlistCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}
		e.SpotsLeft = &spotsLeft
		e.WaitlistCount = &waitlistCount
		events = append(events, e)
	}

	return events, nil
}

// GetEventBySlug retrieves an event by slug
func (db *DB) GetEventBySlug(slug string) (*Event, error) {
	var e Event
	err := db.QueryRow(`
		SELECT
			e.id, e.slug, e.title, e.description, e.location, e.capacity,
			e.starts_at, e.ends_at, e.is_active, e.created_at, e.updated_at,
			COALESCE(e.capacity - COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END), 0) as spots_left,
			COUNT(DISTINCT CASE WHEN r.status = 'waitlisted' THEN r.id END) as waitlist_count
		FROM events e
		LEFT JOIN registrations r ON r.parent_type = 'event' AND r.parent_id = e.id
		WHERE e.slug = $1 AND e.is_active = true
		GROUP BY e.id
	`, slug).Scan(
		&e.ID, &e.Slug, &e.Title, &e.Description, &e.Location, &e.Capacity,
		&e.StartsAt, &e.EndsAt, &e.IsActive, &e.CreatedAt, &e.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %w", err)
	}

	// Calculate capacity
	var spotsLeft, waitlistCount int
	err = db.QueryRow(`
		SELECT
			COALESCE($1 - COUNT(DISTINCT CASE WHEN status = 'confirmed' THEN id END), 0),
			COUNT(DISTINCT CASE WHEN status = 'waitlisted' THEN id END)
		FROM registrations
		WHERE parent_type = 'event' AND parent_id = $2
	`, e.Capacity, e.ID).Scan(&spotsLeft, &waitlistCount)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate capacity: %w", err)
	}
	e.SpotsLeft = &spotsLeft
	e.WaitlistCount = &waitlistCount

	return &e, nil
}
