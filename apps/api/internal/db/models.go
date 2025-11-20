package db

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

// User represents a public user account
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Phone        *string   `json:"phone,omitempty"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// Household represents a family/household
type Household struct {
	ID           uuid.UUID `json:"id"`
	OwnerUserID  uuid.UUID `json:"owner_user_id"`
	Name         *string   `json:"name,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	Email        *string   `json:"email,omitempty"`
	AddressLine1 *string   `json:"address_line1,omitempty"`
	City         *string   `json:"city,omitempty"`
	State        *string   `json:"state,omitempty"`
	Zip          *string   `json:"zip,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// Participant represents a person who can be registered
type Participant struct {
	ID                     uuid.UUID  `json:"id"`
	HouseholdID            uuid.UUID  `json:"household_id"`
	FirstName              string     `json:"first_name"`
	LastName               string     `json:"last_name"`
	DOB                    *time.Time `json:"dob,omitempty"`
	Notes                  *string    `json:"notes,omitempty"`
	MedicalNotes           *string    `json:"medical_notes,omitempty"`
	EmergencyContactName   *string    `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone  *string    `json:"emergency_contact_phone,omitempty"`
	IsFavorite             bool       `json:"is_favorite"`
	Gender                 *string    `json:"gender,omitempty"`
	ShirtSize              *string    `json:"shirt_size,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
}

// ParticipantWaiver represents a waiver acceptance
type ParticipantWaiver struct {
	ID            int64     `json:"id"`
	ParticipantID uuid.UUID `json:"participant_id"`
	WaiverKey     string    `json:"waiver_key"`
	AcceptedAt    time.Time `json:"accepted_at"`
}

// Program represents a recurring program
type Program struct {
	ID            uuid.UUID  `json:"id"`
	Slug          string     `json:"slug"`
	Title         string     `json:"title"`
	Description   *string    `json:"description,omitempty"`
	AgeMin        *int       `json:"age_min,omitempty"`
	AgeMax        *int       `json:"age_max,omitempty"`
	Location      *string    `json:"location,omitempty"`
	Capacity      int        `json:"capacity"`
	StartDate     *time.Time `json:"start_date,omitempty"`
	EndDate       *time.Time `json:"end_date,omitempty"`
	ScheduleNotes *string    `json:"schedule_notes,omitempty"`
	IsActive      bool       `json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// Computed fields
	Sessions      []Session `json:"sessions,omitempty"`
	SpotsLeft     *int      `json:"spots_left,omitempty"`
	WaitlistCount *int      `json:"waitlist_count,omitempty"`
}

// Event represents a one-time event
type Event struct {
	ID          uuid.UUID  `json:"id"`
	Slug        string     `json:"slug"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Location    *string    `json:"location,omitempty"`
	Capacity    int        `json:"capacity"`
	StartsAt    *time.Time `json:"starts_at,omitempty"`
	EndsAt      *time.Time `json:"ends_at,omitempty"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Computed fields
	SpotsLeft     *int `json:"spots_left,omitempty"`
	WaitlistCount *int `json:"waitlist_count,omitempty"`
}

// Session represents a specific occurrence of a program
type Session struct {
	ID               uuid.UUID  `json:"id"`
	ParentType       string     `json:"parent_type"`
	ParentID         uuid.UUID  `json:"parent_id"`
	StartsAt         *time.Time `json:"starts_at,omitempty"`
	EndsAt           *time.Time `json:"ends_at,omitempty"`
	CapacityOverride *int       `json:"capacity_override,omitempty"`
	IsActive         bool       `json:"is_active"`

	// Computed fields
	SpotsLeft     *int `json:"spots_left,omitempty"`
	WaitlistCount *int `json:"waitlist_count,omitempty"`
}

// Registration represents a participant's registration
type Registration struct {
	ID            uuid.UUID  `json:"id"`
	ParentType    string     `json:"parent_type"`
	ParentID      uuid.UUID  `json:"parent_id"`
	SessionID     *uuid.UUID `json:"session_id,omitempty"`
	ParticipantID uuid.UUID  `json:"participant_id"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`

	// Joined fields
	Participant *Participant `json:"participant,omitempty"`
	ProgramInfo *Program     `json:"program,omitempty"`
	EventInfo   *Event       `json:"event,omitempty"`
	SessionInfo *Session     `json:"session,omitempty"`
}

// WaitlistPosition represents a position on a waitlist
type WaitlistPosition struct {
	ID            uuid.UUID  `json:"id"`
	ParentType    string     `json:"parent_type"`
	ParentID      uuid.UUID  `json:"parent_id"`
	SessionID     *uuid.UUID `json:"session_id,omitempty"`
	ParticipantID uuid.UUID  `json:"participant_id"`
	Position      int        `json:"position"`
	NotifyOptIn   bool       `json:"notify_opt_in"`
	CreatedAt     time.Time  `json:"created_at"`
}

// NotificationQueue represents an email to send
type NotificationQueue struct {
	ID           int64           `json:"id"`
	Type         string          `json:"type"`
	Payload      sql.RawBytes    `json:"payload"`
	NotBeforeTS  *time.Time      `json:"not_before_ts,omitempty"`
	Attempts     int             `json:"attempts"`
	MaxAttempts  int             `json:"max_attempts"`
	LastError    *string         `json:"last_error,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

// EmailTemplate represents an email template
type EmailTemplate struct {
	ID          uuid.UUID `json:"id"`
	TemplateKey string    `json:"template_key"`
	Subject     string    `json:"subject"`
	BodyHTML    string    `json:"body_html"`
	BodyText    string    `json:"body_text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Metric represents a simple metric
type Metric struct {
	ID          int64      `json:"id"`
	MetricType  string     `json:"metric_type"`
	MetricValue float64    `json:"metric_value"`
	RefID       *uuid.UUID `json:"ref_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}
