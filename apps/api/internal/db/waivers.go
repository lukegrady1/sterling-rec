package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Waiver represents a versioned waiver document
type Waiver struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	BodyHTML    string    `json:"body_html"`
	Version     int       `json:"version"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ProgramWaiver represents the assignment of a waiver to a program
type ProgramWaiver struct {
	ID          uuid.UUID `json:"id"`
	ProgramID   uuid.UUID `json:"program_id"`
	WaiverID    uuid.UUID `json:"waiver_id"`
	IsRequired  bool      `json:"is_required"`
	IsPerSeason bool      `json:"is_per_season"`
	CreatedAt   time.Time `json:"created_at"`

	// Joined fields
	Waiver *Waiver `json:"waiver,omitempty"`
}

// ParticipantWaiverAcceptance records a participant's acceptance of a waiver
type ParticipantWaiverAcceptance struct {
	ID              uuid.UUID  `json:"id"`
	ParticipantID   uuid.UUID  `json:"participant_id"`
	WaiverID        uuid.UUID  `json:"waiver_id"`
	WaiverVersion   int        `json:"waiver_version"`
	ProgramID       *uuid.UUID `json:"program_id,omitempty"`
	AcceptedByUserID uuid.UUID `json:"accepted_by_user_id"`
	AcceptedAt      time.Time  `json:"accepted_at"`
	IPAddress       *string    `json:"ip_address,omitempty"`
	UserAgent       *string    `json:"user_agent,omitempty"`

	// Joined fields
	Waiver *Waiver `json:"waiver,omitempty"`
}

// CreateWaiver creates a new waiver
func (db *DB) CreateWaiver(w *Waiver) (*Waiver, error) {
	query := `
		INSERT INTO waivers (title, description, body_html, version, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	err := db.QueryRow(query, w.Title, w.Description, w.BodyHTML, w.Version, w.IsActive).
		Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create waiver: %w", err)
	}

	return w, nil
}

// GetWaiverByID retrieves a waiver by ID
func (db *DB) GetWaiverByID(id uuid.UUID) (*Waiver, error) {
	var w Waiver
	query := `
		SELECT id, title, description, body_html, version, is_active, created_at, updated_at
		FROM waivers
		WHERE id = $1
	`

	err := db.QueryRow(query, id).Scan(
		&w.ID, &w.Title, &w.Description, &w.BodyHTML, &w.Version, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get waiver: %w", err)
	}

	return &w, nil
}

// GetAllWaivers retrieves all waivers (optionally filtered by active status)
func (db *DB) GetAllWaivers(activeOnly bool) ([]Waiver, error) {
	query := `
		SELECT id, title, description, body_html, version, is_active, created_at, updated_at
		FROM waivers
		WHERE ($1 = false OR is_active = true)
		ORDER BY title ASC, version DESC
	`

	rows, err := db.Query(query, activeOnly)
	if err != nil {
		return nil, fmt.Errorf("failed to query waivers: %w", err)
	}
	defer rows.Close()

	var waivers []Waiver
	for rows.Next() {
		var w Waiver
		err := rows.Scan(
			&w.ID, &w.Title, &w.Description, &w.BodyHTML, &w.Version, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan waiver: %w", err)
		}
		waivers = append(waivers, w)
	}

	return waivers, nil
}

// UpdateWaiver updates a waiver and increments version if body changed
func (db *DB) UpdateWaiver(id uuid.UUID, w *Waiver) error {
	// First check if body_html changed
	var oldBodyHTML string
	err := db.QueryRow("SELECT body_html FROM waivers WHERE id = $1", id).Scan(&oldBodyHTML)
	if err != nil {
		return fmt.Errorf("failed to get current waiver: %w", err)
	}

	// Increment version if body changed
	newVersion := w.Version
	if oldBodyHTML != w.BodyHTML {
		newVersion = w.Version + 1
	}

	query := `
		UPDATE waivers
		SET title = $1, description = $2, body_html = $3, version = $4, is_active = $5, updated_at = NOW()
		WHERE id = $6
	`

	result, err := db.Exec(query, w.Title, w.Description, w.BodyHTML, newVersion, w.IsActive, id)
	if err != nil {
		return fmt.Errorf("failed to update waiver: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("waiver not found")
	}

	return nil
}

// DeleteWaiver soft-deletes a waiver by setting is_active to false
func (db *DB) DeleteWaiver(id uuid.UUID) error {
	query := `UPDATE waivers SET is_active = false, updated_at = NOW() WHERE id = $1`
	result, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete waiver: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("waiver not found")
	}

	return nil
}

// AssignWaiverToProgram assigns a waiver to a program
func (db *DB) AssignWaiverToProgram(pw *ProgramWaiver) (*ProgramWaiver, error) {
	query := `
		INSERT INTO program_waivers (program_id, waiver_id, is_required, is_per_season)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (program_id, waiver_id) DO UPDATE
		SET is_required = EXCLUDED.is_required, is_per_season = EXCLUDED.is_per_season
		RETURNING id, created_at
	`

	err := db.QueryRow(query, pw.ProgramID, pw.WaiverID, pw.IsRequired, pw.IsPerSeason).
		Scan(&pw.ID, &pw.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to assign waiver to program: %w", err)
	}

	return pw, nil
}

// GetProgramWaivers retrieves all waivers assigned to a program
func (db *DB) GetProgramWaivers(programID uuid.UUID) ([]ProgramWaiver, error) {
	query := `
		SELECT pw.id, pw.program_id, pw.waiver_id, pw.is_required, pw.is_per_season, pw.created_at,
		       w.id, w.title, w.description, w.body_html, w.version, w.is_active, w.created_at, w.updated_at
		FROM program_waivers pw
		JOIN waivers w ON pw.waiver_id = w.id
		WHERE pw.program_id = $1 AND w.is_active = true
		ORDER BY pw.is_required DESC, w.title ASC
	`

	rows, err := db.Query(query, programID)
	if err != nil {
		return nil, fmt.Errorf("failed to query program waivers: %w", err)
	}
	defer rows.Close()

	var programWaivers []ProgramWaiver
	for rows.Next() {
		var pw ProgramWaiver
		var w Waiver

		err := rows.Scan(
			&pw.ID, &pw.ProgramID, &pw.WaiverID, &pw.IsRequired, &pw.IsPerSeason, &pw.CreatedAt,
			&w.ID, &w.Title, &w.Description, &w.BodyHTML, &w.Version, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan program waiver: %w", err)
		}

		pw.Waiver = &w
		programWaivers = append(programWaivers, pw)
	}

	return programWaivers, nil
}

// RemoveWaiverFromProgram removes a waiver assignment from a program
func (db *DB) RemoveWaiverFromProgram(programID, waiverID uuid.UUID) error {
	query := `DELETE FROM program_waivers WHERE program_id = $1 AND waiver_id = $2`
	result, err := db.Exec(query, programID, waiverID)
	if err != nil {
		return fmt.Errorf("failed to remove waiver from program: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("program waiver assignment not found")
	}

	return nil
}

// AcceptWaiver records a participant's acceptance of a waiver
func (db *DB) AcceptWaiver(pwa *ParticipantWaiverAcceptance) (*ParticipantWaiverAcceptance, error) {
	query := `
		INSERT INTO participant_waiver_acceptances
		(participant_id, waiver_id, waiver_version, program_id, accepted_by_user_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (participant_id, waiver_id, waiver_version, program_id) DO UPDATE
		SET accepted_at = NOW(), ip_address = EXCLUDED.ip_address, user_agent = EXCLUDED.user_agent
		RETURNING id, accepted_at
	`

	err := db.QueryRow(query,
		pwa.ParticipantID, pwa.WaiverID, pwa.WaiverVersion, pwa.ProgramID,
		pwa.AcceptedByUserID, pwa.IPAddress, pwa.UserAgent,
	).Scan(&pwa.ID, &pwa.AcceptedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to record waiver acceptance: %w", err)
	}

	return pwa, nil
}

// GetParticipantWaiverAcceptances retrieves all waiver acceptances for a participant
func (db *DB) GetParticipantWaiverAcceptances(participantID uuid.UUID) ([]ParticipantWaiverAcceptance, error) {
	query := `
		SELECT pwa.id, pwa.participant_id, pwa.waiver_id, pwa.waiver_version, pwa.program_id,
		       pwa.accepted_by_user_id, pwa.accepted_at, pwa.ip_address, pwa.user_agent,
		       w.id, w.title, w.description, w.body_html, w.version, w.is_active, w.created_at, w.updated_at
		FROM participant_waiver_acceptances pwa
		JOIN waivers w ON pwa.waiver_id = w.id
		WHERE pwa.participant_id = $1
		ORDER BY pwa.accepted_at DESC
	`

	rows, err := db.Query(query, participantID)
	if err != nil {
		return nil, fmt.Errorf("failed to query waiver acceptances: %w", err)
	}
	defer rows.Close()

	var acceptances []ParticipantWaiverAcceptance
	for rows.Next() {
		var pwa ParticipantWaiverAcceptance
		var w Waiver

		err := rows.Scan(
			&pwa.ID, &pwa.ParticipantID, &pwa.WaiverID, &pwa.WaiverVersion, &pwa.ProgramID,
			&pwa.AcceptedByUserID, &pwa.AcceptedAt, &pwa.IPAddress, &pwa.UserAgent,
			&w.ID, &w.Title, &w.Description, &w.BodyHTML, &w.Version, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan waiver acceptance: %w", err)
		}

		pwa.Waiver = &w
		acceptances = append(acceptances, pwa)
	}

	return acceptances, nil
}

// CheckParticipantWaiverStatus checks if a participant has accepted a specific waiver version
func (db *DB) CheckParticipantWaiverStatus(participantID, waiverID uuid.UUID, waiverVersion int, programID *uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM participant_waiver_acceptances
			WHERE participant_id = $1 AND waiver_id = $2 AND waiver_version = $3
			AND ($4::UUID IS NULL OR program_id = $4)
		)
	`

	var exists bool
	err := db.QueryRow(query, participantID, waiverID, waiverVersion, programID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check waiver status: %w", err)
	}

	return exists, nil
}
