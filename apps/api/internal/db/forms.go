package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// FormTemplate represents a reusable form definition
type FormTemplate struct {
	ID          uuid.UUID       `json:"id"`
	Type        string          `json:"type"` // 'medical', 'emergency', 'custom'
	Title       string          `json:"title"`
	Description *string         `json:"description,omitempty"`
	SchemaJSON  json.RawMessage `json:"schema_json"`
	Version     int             `json:"version"`
	IsActive    bool            `json:"is_active"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// ParticipantFormSubmission represents saved form data for a participant
type ParticipantFormSubmission struct {
	ID               uuid.UUID       `json:"id"`
	ParticipantID    uuid.UUID       `json:"participant_id"`
	FormTemplateID   uuid.UUID       `json:"form_template_id"`
	FormVersion      int             `json:"form_version"`
	DataJSON         json.RawMessage `json:"data_json"`
	SubmittedByUserID uuid.UUID      `json:"submitted_by_user_id"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`

	// Joined fields
	FormTemplate *FormTemplate `json:"form_template,omitempty"`
}

// CreateFormTemplate creates a new form template
func (db *DB) CreateFormTemplate(ft *FormTemplate) (*FormTemplate, error) {
	query := `
		INSERT INTO form_templates (type, title, description, schema_json, version, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	err := db.QueryRow(query, ft.Type, ft.Title, ft.Description, ft.SchemaJSON, ft.Version, ft.IsActive).
		Scan(&ft.ID, &ft.CreatedAt, &ft.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create form template: %w", err)
	}

	return ft, nil
}

// GetFormTemplateByID retrieves a form template by ID
func (db *DB) GetFormTemplateByID(id uuid.UUID) (*FormTemplate, error) {
	var ft FormTemplate
	query := `
		SELECT id, type, title, description, schema_json, version, is_active, created_at, updated_at
		FROM form_templates
		WHERE id = $1
	`

	err := db.QueryRow(query, id).Scan(
		&ft.ID, &ft.Type, &ft.Title, &ft.Description, &ft.SchemaJSON,
		&ft.Version, &ft.IsActive, &ft.CreatedAt, &ft.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get form template: %w", err)
	}

	return &ft, nil
}

// GetAllFormTemplates retrieves all form templates (optionally filtered)
func (db *DB) GetAllFormTemplates(activeOnly bool, formType *string) ([]FormTemplate, error) {
	query := `
		SELECT id, type, title, description, schema_json, version, is_active, created_at, updated_at
		FROM form_templates
		WHERE ($1 = false OR is_active = true)
		AND ($2::TEXT IS NULL OR type = $2)
		ORDER BY type ASC, title ASC
	`

	rows, err := db.Query(query, activeOnly, formType)
	if err != nil {
		return nil, fmt.Errorf("failed to query form templates: %w", err)
	}
	defer rows.Close()

	var templates []FormTemplate
	for rows.Next() {
		var ft FormTemplate
		err := rows.Scan(
			&ft.ID, &ft.Type, &ft.Title, &ft.Description, &ft.SchemaJSON,
			&ft.Version, &ft.IsActive, &ft.CreatedAt, &ft.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan form template: %w", err)
		}
		templates = append(templates, ft)
	}

	return templates, nil
}

// UpdateFormTemplate updates a form template and increments version if schema changed
func (db *DB) UpdateFormTemplate(id uuid.UUID, ft *FormTemplate) error {
	// First check if schema changed
	var oldSchema json.RawMessage
	err := db.QueryRow("SELECT schema_json FROM form_templates WHERE id = $1", id).Scan(&oldSchema)
	if err != nil {
		return fmt.Errorf("failed to get current form template: %w", err)
	}

	// Increment version if schema changed
	newVersion := ft.Version
	if string(oldSchema) != string(ft.SchemaJSON) {
		newVersion = ft.Version + 1
	}

	query := `
		UPDATE form_templates
		SET type = $1, title = $2, description = $3, schema_json = $4,
		    version = $5, is_active = $6, updated_at = NOW()
		WHERE id = $7
	`

	result, err := db.Exec(query, ft.Type, ft.Title, ft.Description, ft.SchemaJSON, newVersion, ft.IsActive, id)
	if err != nil {
		return fmt.Errorf("failed to update form template: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("form template not found")
	}

	return nil
}

// DeleteFormTemplate soft-deletes a form template
func (db *DB) DeleteFormTemplate(id uuid.UUID) error {
	query := `UPDATE form_templates SET is_active = false, updated_at = NOW() WHERE id = $1`
	result, err := db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete form template: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("form template not found")
	}

	return nil
}

// SaveParticipantForm saves or updates a participant's form submission
func (db *DB) SaveParticipantForm(pfs *ParticipantFormSubmission) (*ParticipantFormSubmission, error) {
	query := `
		INSERT INTO participant_form_submissions
		(participant_id, form_template_id, form_version, data_json, submitted_by_user_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (participant_id, form_template_id) DO UPDATE
		SET form_version = EXCLUDED.form_version,
		    data_json = EXCLUDED.data_json,
		    submitted_by_user_id = EXCLUDED.submitted_by_user_id,
		    updated_at = NOW()
		RETURNING id, created_at, updated_at
	`

	err := db.QueryRow(query,
		pfs.ParticipantID, pfs.FormTemplateID, pfs.FormVersion, pfs.DataJSON, pfs.SubmittedByUserID,
	).Scan(&pfs.ID, &pfs.CreatedAt, &pfs.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to save participant form: %w", err)
	}

	return pfs, nil
}

// GetParticipantForms retrieves all form submissions for a participant
func (db *DB) GetParticipantForms(participantID uuid.UUID) ([]ParticipantFormSubmission, error) {
	query := `
		SELECT pfs.id, pfs.participant_id, pfs.form_template_id, pfs.form_version,
		       pfs.data_json, pfs.submitted_by_user_id, pfs.created_at, pfs.updated_at,
		       ft.id, ft.type, ft.title, ft.description, ft.schema_json, ft.version, ft.is_active, ft.created_at, ft.updated_at
		FROM participant_form_submissions pfs
		JOIN form_templates ft ON pfs.form_template_id = ft.id
		WHERE pfs.participant_id = $1
		ORDER BY ft.type ASC, ft.title ASC
	`

	rows, err := db.Query(query, participantID)
	if err != nil {
		return nil, fmt.Errorf("failed to query participant forms: %w", err)
	}
	defer rows.Close()

	var submissions []ParticipantFormSubmission
	for rows.Next() {
		var pfs ParticipantFormSubmission
		var ft FormTemplate

		err := rows.Scan(
			&pfs.ID, &pfs.ParticipantID, &pfs.FormTemplateID, &pfs.FormVersion,
			&pfs.DataJSON, &pfs.SubmittedByUserID, &pfs.CreatedAt, &pfs.UpdatedAt,
			&ft.ID, &ft.Type, &ft.Title, &ft.Description, &ft.SchemaJSON,
			&ft.Version, &ft.IsActive, &ft.CreatedAt, &ft.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan participant form: %w", err)
		}

		pfs.FormTemplate = &ft
		submissions = append(submissions, pfs)
	}

	return submissions, nil
}

// GetParticipantFormByTemplate retrieves a specific form submission for a participant
func (db *DB) GetParticipantFormByTemplate(participantID, templateID uuid.UUID) (*ParticipantFormSubmission, error) {
	var pfs ParticipantFormSubmission
	var ft FormTemplate

	query := `
		SELECT pfs.id, pfs.participant_id, pfs.form_template_id, pfs.form_version,
		       pfs.data_json, pfs.submitted_by_user_id, pfs.created_at, pfs.updated_at,
		       ft.id, ft.type, ft.title, ft.description, ft.schema_json, ft.version, ft.is_active, ft.created_at, ft.updated_at
		FROM participant_form_submissions pfs
		JOIN form_templates ft ON pfs.form_template_id = ft.id
		WHERE pfs.participant_id = $1 AND pfs.form_template_id = $2
	`

	err := db.QueryRow(query, participantID, templateID).Scan(
		&pfs.ID, &pfs.ParticipantID, &pfs.FormTemplateID, &pfs.FormVersion,
		&pfs.DataJSON, &pfs.SubmittedByUserID, &pfs.CreatedAt, &pfs.UpdatedAt,
		&ft.ID, &ft.Type, &ft.Title, &ft.Description, &ft.SchemaJSON,
		&ft.Version, &ft.IsActive, &ft.CreatedAt, &ft.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get participant form: %w", err)
	}

	pfs.FormTemplate = &ft
	return &pfs, nil
}

// DeleteParticipantForm deletes a participant's form submission
func (db *DB) DeleteParticipantForm(participantID, templateID uuid.UUID) error {
	query := `DELETE FROM participant_form_submissions WHERE participant_id = $1 AND form_template_id = $2`
	result, err := db.Exec(query, participantID, templateID)
	if err != nil {
		return fmt.Errorf("failed to delete participant form: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("participant form not found")
	}

	return nil
}
