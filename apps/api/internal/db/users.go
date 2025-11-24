package db

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// CreateUser creates a new user with hashed password
func (db *DB) CreateUser(email, password, firstName, lastName string, phone *string) (*User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	var user User
	err = db.QueryRow(`
		INSERT INTO users (email, password_hash, first_name, last_name, phone)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, email, first_name, last_name, phone, role, created_at
	`, email, string(hash), firstName, lastName, phone).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Phone, &user.Role, &user.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create default household for user
	_, err = db.Exec(`
		INSERT INTO households (owner_user_id, email)
		VALUES ($1, $2)
	`, user.ID, email)
	if err != nil {
		return nil, fmt.Errorf("failed to create household: %w", err)
	}

	return &user, nil
}

// GetUserByEmail retrieves a user by email
func (db *DB) GetUserByEmail(email string) (*User, error) {
	var user User
	err := db.QueryRow(`
		SELECT id, email, password_hash, first_name, last_name, phone, role, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName, &user.Phone, &user.Role, &user.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func (db *DB) GetUserByID(id uuid.UUID) (*User, error) {
	var user User
	err := db.QueryRow(`
		SELECT id, email, first_name, last_name, phone, role, created_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Phone, &user.Role, &user.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// CheckPassword verifies a password against the stored hash
func (db *DB) CheckPassword(user *User, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	return err == nil
}

// GetUserHousehold retrieves the user's household
func (db *DB) GetUserHousehold(userID uuid.UUID) (*Household, error) {
	var h Household
	err := db.QueryRow(`
		SELECT id, owner_user_id, name, phone, email, address_line1, city, state, zip, created_at
		FROM households
		WHERE owner_user_id = $1
	`, userID).Scan(
		&h.ID, &h.OwnerUserID, &h.Name, &h.Phone, &h.Email, &h.AddressLine1, &h.City, &h.State, &h.Zip, &h.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get household: %w", err)
	}
	return &h, nil
}

// GetHouseholdByID retrieves a household by ID
func (db *DB) GetHouseholdByID(householdID uuid.UUID) (*Household, error) {
	var h Household
	err := db.QueryRow(`
		SELECT id, owner_user_id, name, phone, email, address_line1, city, state, zip, created_at
		FROM households
		WHERE id = $1
	`, householdID).Scan(
		&h.ID, &h.OwnerUserID, &h.Name, &h.Phone, &h.Email, &h.AddressLine1, &h.City, &h.State, &h.Zip, &h.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get household: %w", err)
	}
	return &h, nil
}

// GetHouseholdParticipants retrieves all participants in a household
func (db *DB) GetHouseholdParticipants(householdID uuid.UUID) ([]Participant, error) {
	rows, err := db.Query(`
		SELECT id, household_id, first_name, last_name, dob, notes, medical_notes,
		       emergency_contact_name, emergency_contact_phone, is_favorite, gender, shirt_size, created_at
		FROM participants
		WHERE household_id = $1
		ORDER BY is_favorite DESC, created_at ASC
	`, householdID)
	if err != nil {
		return nil, fmt.Errorf("failed to get participants: %w", err)
	}
	defer rows.Close()

	var participants []Participant
	for rows.Next() {
		var p Participant
		err := rows.Scan(
			&p.ID, &p.HouseholdID, &p.FirstName, &p.LastName, &p.DOB, &p.Notes, &p.MedicalNotes,
			&p.EmergencyContactName, &p.EmergencyContactPhone, &p.IsFavorite, &p.Gender, &p.ShirtSize, &p.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan participant: %w", err)
		}
		participants = append(participants, p)
	}

	return participants, nil
}

// CreateParticipant creates a new participant
func (db *DB) CreateParticipant(householdID uuid.UUID, firstName, lastName string, dob *string, notes, medicalNotes *string) (*Participant, error) {
	var p Participant
	err := db.QueryRow(`
		INSERT INTO participants (household_id, first_name, last_name, dob, notes, medical_notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, household_id, first_name, last_name, dob, notes, medical_notes, created_at
	`, householdID, firstName, lastName, dob, notes, medicalNotes).Scan(
		&p.ID, &p.HouseholdID, &p.FirstName, &p.LastName, &p.DOB, &p.Notes, &p.MedicalNotes, &p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create participant: %w", err)
	}
	return &p, nil
}

// GetParticipantByID retrieves a participant by ID
func (db *DB) GetParticipantByID(id uuid.UUID) (*Participant, error) {
	var p Participant
	err := db.QueryRow(`
		SELECT id, household_id, first_name, last_name, dob, notes, medical_notes,
		       emergency_contact_name, emergency_contact_phone, is_favorite, gender, shirt_size, created_at
		FROM participants
		WHERE id = $1
	`, id).Scan(
		&p.ID, &p.HouseholdID, &p.FirstName, &p.LastName, &p.DOB, &p.Notes, &p.MedicalNotes,
		&p.EmergencyContactName, &p.EmergencyContactPhone, &p.IsFavorite, &p.Gender, &p.ShirtSize, &p.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get participant: %w", err)
	}
	return &p, nil
}
