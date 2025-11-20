package db

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

// RegistrationRequest represents a registration attempt
type RegistrationRequest struct {
	ParentType    string
	ParentID      uuid.UUID
	SessionID     *uuid.UUID
	ParticipantID uuid.UUID
}

// RegistrationResult contains the outcome of a registration
type RegistrationResult struct {
	Registration *Registration
	IsWaitlisted bool
	Position     *int
}

// CreateRegistration creates a new registration with capacity management
// This MUST be called within the context of a capacity lock (see core/registration.go)
func (db *DB) CreateRegistration(req RegistrationRequest) (*RegistrationResult, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get capacity for this parent/session
	capacity, err := db.getCapacityInTx(tx, req.ParentType, req.ParentID, req.SessionID)
	if err != nil {
		return nil, err
	}

	// Lock and count confirmed registrations
	var confirmedCount int
	if req.SessionID != nil {
		err = tx.QueryRow(`
			SELECT COUNT(*) FROM (
				SELECT id FROM registrations
				WHERE parent_type = $1 AND parent_id = $2 AND session_id = $3 AND status = 'confirmed'
				FOR UPDATE
			) AS locked_rows
		`, req.ParentType, req.ParentID, req.SessionID).Scan(&confirmedCount)
	} else {
		err = tx.QueryRow(`
			SELECT COUNT(*) FROM (
				SELECT id FROM registrations
				WHERE parent_type = $1 AND parent_id = $2 AND session_id IS NULL AND status = 'confirmed'
				FOR UPDATE
			) AS locked_rows
		`, req.ParentType, req.ParentID).Scan(&confirmedCount)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to count registrations: %w", err)
	}

	var result RegistrationResult
	var status string
	var position *int

	if confirmedCount < capacity {
		// Space available - confirm registration
		status = "confirmed"
	} else {
		// Full - add to waitlist
		status = "waitlisted"

		// Get next position
		var nextPos int
		if req.SessionID != nil {
			err = tx.QueryRow(`
				SELECT COALESCE(MAX(position), 0) + 1
				FROM waitlist_positions
				WHERE parent_type = $1 AND parent_id = $2 AND session_id = $3
			`, req.ParentType, req.ParentID, req.SessionID).Scan(&nextPos)
		} else {
			err = tx.QueryRow(`
				SELECT COALESCE(MAX(position), 0) + 1
				FROM waitlist_positions
				WHERE parent_type = $1 AND parent_id = $2 AND session_id IS NULL
			`, req.ParentType, req.ParentID).Scan(&nextPos)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to get next waitlist position: %w", err)
		}

		position = &nextPos

		// Insert waitlist position
		_, err = tx.Exec(`
			INSERT INTO waitlist_positions (parent_type, parent_id, session_id, participant_id, position, notify_opt_in)
			VALUES ($1, $2, $3, $4, $5, true)
			ON CONFLICT (parent_type, parent_id, session_id, participant_id) DO NOTHING
		`, req.ParentType, req.ParentID, req.SessionID, req.ParticipantID, nextPos)
		if err != nil {
			return nil, fmt.Errorf("failed to create waitlist position: %w", err)
		}
	}

	// Create registration
	var reg Registration
	err = tx.QueryRow(`
		INSERT INTO registrations (parent_type, parent_id, session_id, participant_id, status)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (parent_type, parent_id, session_id, participant_id) DO UPDATE SET status = EXCLUDED.status
		RETURNING id, parent_type, parent_id, session_id, participant_id, status, created_at
	`, req.ParentType, req.ParentID, req.SessionID, req.ParticipantID, status).Scan(
		&reg.ID, &reg.ParentType, &reg.ParentID, &reg.SessionID, &reg.ParticipantID, &reg.Status, &reg.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create registration: %w", err)
	}

	// Queue notification
	err = db.queueNotificationInTx(tx, status, req, position)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	result.Registration = &reg
	result.IsWaitlisted = (status == "waitlisted")
	result.Position = position

	return &result, nil
}

// CancelRegistration cancels a registration and promotes from waitlist if needed
func (db *DB) CancelRegistration(registrationID uuid.UUID, participantID uuid.UUID) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Get registration details
	var reg Registration
	err = tx.QueryRow(`
		SELECT id, parent_type, parent_id, session_id, participant_id, status
		FROM registrations
		WHERE id = $1 AND participant_id = $2
		FOR UPDATE
	`, registrationID, participantID).Scan(
		&reg.ID, &reg.ParentType, &reg.ParentID, &reg.SessionID, &reg.ParticipantID, &reg.Status,
	)
	if err == sql.ErrNoRows {
		return fmt.Errorf("registration not found")
	}
	if err != nil {
		return fmt.Errorf("failed to get registration: %w", err)
	}

	// Update to cancelled
	_, err = tx.Exec(`
		UPDATE registrations
		SET status = 'cancelled'
		WHERE id = $1
	`, registrationID)
	if err != nil {
		return fmt.Errorf("failed to cancel registration: %w", err)
	}

	// If was confirmed, promote from waitlist
	if reg.Status == "confirmed" {
		err = db.promoteFromWaitlistInTx(tx, reg.ParentType, reg.ParentID, reg.SessionID)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// promoteFromWaitlistInTx promotes the next person from the waitlist
func (db *DB) promoteFromWaitlistInTx(tx *sql.Tx, parentType string, parentID uuid.UUID, sessionID *uuid.UUID) error {
	// Get next waitlist position
	var wpID uuid.UUID
	var participantID uuid.UUID
	var query string

	if sessionID != nil {
		query = `
			SELECT id, participant_id
			FROM waitlist_positions
			WHERE parent_type = $1 AND parent_id = $2 AND session_id = $3
			ORDER BY position ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		`
		err := tx.QueryRow(query, parentType, parentID, sessionID).Scan(&wpID, &participantID)
		if err == sql.ErrNoRows {
			return nil // No one on waitlist
		}
		if err != nil {
			return fmt.Errorf("failed to get waitlist position: %w", err)
		}
	} else {
		query = `
			SELECT id, participant_id
			FROM waitlist_positions
			WHERE parent_type = $1 AND parent_id = $2 AND session_id IS NULL
			ORDER BY position ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		`
		err := tx.QueryRow(query, parentType, parentID).Scan(&wpID, &participantID)
		if err == sql.ErrNoRows {
			return nil // No one on waitlist
		}
		if err != nil {
			return fmt.Errorf("failed to get waitlist position: %w", err)
		}
	}

	// Update registration to confirmed
	_, err := tx.Exec(`
		UPDATE registrations
		SET status = 'confirmed'
		WHERE parent_type = $1 AND parent_id = $2 AND session_id IS DISTINCT FROM $3 AND participant_id = $4
	`, parentType, parentID, sessionID, participantID)
	if err != nil {
		return fmt.Errorf("failed to promote registration: %w", err)
	}

	// Delete waitlist position
	_, err = tx.Exec(`DELETE FROM waitlist_positions WHERE id = $1`, wpID)
	if err != nil {
		return fmt.Errorf("failed to delete waitlist position: %w", err)
	}

	// Queue promotion notification
	err = db.queueNotificationInTx(tx, "promoted", RegistrationRequest{
		ParentType:    parentType,
		ParentID:      parentID,
		SessionID:     sessionID,
		ParticipantID: participantID,
	}, nil)
	if err != nil {
		return err
	}

	return nil
}

// getCapacityInTx gets the effective capacity for a parent/session
func (db *DB) getCapacityInTx(tx *sql.Tx, parentType string, parentID uuid.UUID, sessionID *uuid.UUID) (int, error) {
	if sessionID != nil {
		// Session-specific capacity
		var capacityOverride *int
		var defaultCapacity int
		err := tx.QueryRow(`
			SELECT s.capacity_override, p.capacity
			FROM sessions s
			LEFT JOIN programs p ON p.id = s.parent_id AND s.parent_type = 'program'
			LEFT JOIN events e ON e.id = s.parent_id AND s.parent_type = 'event'
			WHERE s.id = $1
		`, sessionID).Scan(&capacityOverride, &defaultCapacity)
		if err != nil {
			return 0, fmt.Errorf("failed to get session capacity: %w", err)
		}
		if capacityOverride != nil {
			return *capacityOverride, nil
		}
		return defaultCapacity, nil
	}

	// Parent-level capacity
	var capacity int
	if parentType == "program" {
		err := tx.QueryRow(`SELECT capacity FROM programs WHERE id = $1`, parentID).Scan(&capacity)
		if err != nil {
			return 0, fmt.Errorf("failed to get program capacity: %w", err)
		}
	} else {
		err := tx.QueryRow(`SELECT capacity FROM events WHERE id = $1`, parentID).Scan(&capacity)
		if err != nil {
			return 0, fmt.Errorf("failed to get event capacity: %w", err)
		}
	}

	return capacity, nil
}

// queueNotificationInTx queues an email notification
func (db *DB) queueNotificationInTx(tx *sql.Tx, notifType string, req RegistrationRequest, position *int) error {
	payload := map[string]interface{}{
		"parent_type":    req.ParentType,
		"parent_id":      req.ParentID,
		"participant_id": req.ParticipantID,
	}
	if req.SessionID != nil {
		payload["session_id"] = req.SessionID
	}
	if position != nil {
		payload["position"] = *position
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	var emailType string
	switch notifType {
	case "confirmed":
		emailType = "CONFIRMATION"
	case "waitlisted":
		emailType = "WAITLIST_SPOT"
	case "promoted":
		emailType = "WAITLIST_PROMOTED"
	default:
		return fmt.Errorf("unknown notification type: %s", notifType)
	}

	_, err = tx.Exec(`
		INSERT INTO notification_queue (type, payload)
		VALUES ($1, $2)
	`, emailType, payloadJSON)
	if err != nil {
		return fmt.Errorf("failed to queue notification: %w", err)
	}

	return nil
}

// GetUserRegistrations retrieves all registrations for a user's participants
func (db *DB) GetUserRegistrations(userID uuid.UUID) ([]Registration, error) {
	rows, err := db.Query(`
		SELECT DISTINCT
			r.id, r.parent_type, r.parent_id, r.session_id, r.participant_id, r.status, r.created_at
		FROM registrations r
		JOIN participants p ON p.id = r.participant_id
		JOIN households h ON h.id = p.household_id
		WHERE h.owner_user_id = $1 AND r.status != 'cancelled'
		ORDER BY r.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get registrations: %w", err)
	}
	defer rows.Close()

	var registrations []Registration
	for rows.Next() {
		var r Registration
		err := rows.Scan(
			&r.ID, &r.ParentType, &r.ParentID, &r.SessionID, &r.ParticipantID, &r.Status, &r.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan registration: %w", err)
		}
		registrations = append(registrations, r)
	}

	return registrations, nil
}
