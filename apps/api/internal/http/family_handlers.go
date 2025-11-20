package http

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetHousehold returns the user's household, creating one if it doesn't exist
func (h *Handler) GetHousehold(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	household, err := h.db.GetUserHousehold(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve household"})
		return
	}

	// Auto-create household if it doesn't exist
	if household == nil {
		user, err := h.db.GetUserByID(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
			return
		}

		// Create household
		_, err = h.db.Exec(`
			INSERT INTO households (owner_user_id, email)
			VALUES ($1, $2)
		`, userID, user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create household"})
			return
		}

		// Retrieve the newly created household
		household, err = h.db.GetUserHousehold(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve household"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"household": household})
}

// UpdateHousehold updates household information
func (h *Handler) UpdateHousehold(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		Name         *string `json:"name"`
		Phone        *string `json:"phone"`
		Email        *string `json:"email"`
		AddressLine1 *string `json:"address_line1"`
		City         *string `json:"city"`
		State        *string `json:"state"`
		Zip          *string `json:"zip"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify household ownership
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Household not found"})
		return
	}

	// Update household
	_, err = h.db.Exec(`
		UPDATE households
		SET name = COALESCE($1, name),
		    phone = COALESCE($2, phone),
		    email = COALESCE($3, email),
		    address_line1 = COALESCE($4, address_line1),
		    city = COALESCE($5, city),
		    state = COALESCE($6, state),
		    zip = COALESCE($7, zip)
		WHERE id = $8
	`, req.Name, req.Phone, req.Email, req.AddressLine1, req.City, req.State, req.Zip, household.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update household"})
		return
	}

	// Return updated household
	updatedHousehold, _ := h.db.GetUserHousehold(userID)
	c.JSON(http.StatusOK, gin.H{"household": updatedHousehold})
}

// GetParticipants returns all participants for the user's household
func (h *Handler) GetParticipants(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Household not found"})
		return
	}

	participants, err := h.db.GetHouseholdParticipants(household.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve participants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"participants": participants})
}

// CreateParticipantEnhanced creates a new participant with all fields
func (h *Handler) CreateParticipantEnhanced(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req struct {
		FirstName             string  `json:"first_name" binding:"required"`
		LastName              string  `json:"last_name" binding:"required"`
		DOB                   *string `json:"dob"`
		Notes                 *string `json:"notes"`
		MedicalNotes          *string `json:"medical_notes"`
		EmergencyContactName  *string `json:"emergency_contact_name"`
		EmergencyContactPhone *string `json:"emergency_contact_phone"`
		IsFavorite            *bool   `json:"is_favorite"`
		Gender                *string `json:"gender"`
		ShirtSize             *string `json:"shirt_size"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get household
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Household not found"})
		return
	}

	// Check participant limit (max 20)
	participants, err := h.db.GetHouseholdParticipants(household.ID)
	if err == nil && len(participants) >= 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 20 participants per household"})
		return
	}

	isFavorite := false
	if req.IsFavorite != nil {
		isFavorite = *req.IsFavorite
	}

	// Create participant
	var p struct {
		ID                    uuid.UUID  `json:"id"`
		HouseholdID           uuid.UUID  `json:"household_id"`
		FirstName             string     `json:"first_name"`
		LastName              string     `json:"last_name"`
		DOB                   *time.Time `json:"dob"`
		Notes                 *string    `json:"notes"`
		MedicalNotes          *string    `json:"medical_notes"`
		EmergencyContactName  *string    `json:"emergency_contact_name"`
		EmergencyContactPhone *string    `json:"emergency_contact_phone"`
		IsFavorite            bool       `json:"is_favorite"`
		Gender                *string    `json:"gender"`
		ShirtSize             *string    `json:"shirt_size"`
		CreatedAt             time.Time  `json:"created_at"`
	}

	err = h.db.QueryRow(`
		INSERT INTO participants (
			household_id, first_name, last_name, dob, notes, medical_notes,
			emergency_contact_name, emergency_contact_phone, is_favorite, gender, shirt_size
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, household_id, first_name, last_name, dob, notes, medical_notes,
		          emergency_contact_name, emergency_contact_phone, is_favorite, gender, shirt_size, created_at
	`, household.ID, req.FirstName, req.LastName, req.DOB, req.Notes, req.MedicalNotes,
		req.EmergencyContactName, req.EmergencyContactPhone, isFavorite, req.Gender, req.ShirtSize).Scan(
		&p.ID, &p.HouseholdID, &p.FirstName, &p.LastName, &p.DOB, &p.Notes, &p.MedicalNotes,
		&p.EmergencyContactName, &p.EmergencyContactPhone, &p.IsFavorite, &p.Gender, &p.ShirtSize, &p.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create participant"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"participant": p})
}

// UpdateParticipantEnhanced updates a participant with ownership check
func (h *Handler) UpdateParticipantEnhanced(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	participantIDStr := c.Param("id")
	participantID, err := uuid.Parse(participantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	var req struct {
		FirstName             *string `json:"first_name"`
		LastName              *string `json:"last_name"`
		DOB                   *string `json:"dob"`
		Notes                 *string `json:"notes"`
		MedicalNotes          *string `json:"medical_notes"`
		EmergencyContactName  *string `json:"emergency_contact_name"`
		EmergencyContactPhone *string `json:"emergency_contact_phone"`
		IsFavorite            *bool   `json:"is_favorite"`
		Gender                *string `json:"gender"`
		ShirtSize             *string `json:"shirt_size"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify ownership
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Household not found"})
		return
	}

	// Check if participant belongs to user's household
	var ownerCheck uuid.UUID
	err = h.db.QueryRow(`
		SELECT household_id FROM participants WHERE id = $1
	`, participantID).Scan(&ownerCheck)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if ownerCheck != household.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this participant"})
		return
	}

	// Update participant (only non-nil fields)
	_, err = h.db.Exec(`
		UPDATE participants
		SET first_name = COALESCE($1, first_name),
		    last_name = COALESCE($2, last_name),
		    dob = COALESCE($3, dob),
		    notes = COALESCE($4, notes),
		    medical_notes = COALESCE($5, medical_notes),
		    emergency_contact_name = COALESCE($6, emergency_contact_name),
		    emergency_contact_phone = COALESCE($7, emergency_contact_phone),
		    is_favorite = COALESCE($8, is_favorite),
		    gender = COALESCE($9, gender),
		    shirt_size = COALESCE($10, shirt_size)
		WHERE id = $11
	`, req.FirstName, req.LastName, req.DOB, req.Notes, req.MedicalNotes,
		req.EmergencyContactName, req.EmergencyContactPhone, req.IsFavorite, req.Gender, req.ShirtSize, participantID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update participant"})
		return
	}

	// Return updated participant
	participant, _ := h.db.GetParticipantByID(participantID)
	c.JSON(http.StatusOK, gin.H{"participant": participant})
}

// DeleteParticipantEnhanced deletes a participant with ownership check
func (h *Handler) DeleteParticipantEnhanced(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	participantIDStr := c.Param("id")
	participantID, err := uuid.Parse(participantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	// Verify ownership
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Household not found"})
		return
	}

	// Check if participant belongs to user's household
	var ownerCheck uuid.UUID
	err = h.db.QueryRow(`
		SELECT household_id FROM participants WHERE id = $1
	`, participantID).Scan(&ownerCheck)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if ownerCheck != household.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this participant"})
		return
	}

	// Delete participant
	_, err = h.db.Exec(`DELETE FROM participants WHERE id = $1`, participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete participant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Participant deleted successfully"})
}

// GetParticipantEligibility checks if a participant is eligible for a program/event
func (h *Handler) GetParticipantEligibility(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	participantIDStr := c.Param("id")
	participantID, err := uuid.Parse(participantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	parentType := c.Query("parentType")
	parentIDStr := c.Query("parentId")

	if parentType == "" || parentIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "parentType and parentId are required"})
		return
	}

	parentID, err := uuid.Parse(parentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parentId"})
		return
	}

	// Get participant
	participant, err := h.db.GetParticipantByID(participantID)
	if err != nil || participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}

	// Check if participant has a DOB
	if participant.DOB == nil {
		c.JSON(http.StatusOK, gin.H{
			"eligible": true,
			"reason":   "",
		})
		return
	}

	// Get program/event to check age restrictions
	var ageMin, ageMax *int
	if parentType == "program" {
		err = h.db.QueryRow(`
			SELECT age_min, age_max FROM programs WHERE id = $1
		`, parentID).Scan(&ageMin, &ageMax)
	} else if parentType == "event" {
		// Events don't have age restrictions in current schema
		c.JSON(http.StatusOK, gin.H{
			"eligible": true,
			"reason":   "",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"eligible": true,
			"reason":   "",
		})
		return
	}

	// Calculate age (simplified - using today's date)
	age := time.Now().Year() - participant.DOB.Year()

	// Check age eligibility
	if ageMin != nil && age < *ageMin {
		c.JSON(http.StatusOK, gin.H{
			"eligible": false,
			"reason":   "Participant is too young for this program",
		})
		return
	}

	if ageMax != nil && age > *ageMax {
		c.JSON(http.StatusOK, gin.H{
			"eligible": false,
			"reason":   "Participant is too old for this program",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"eligible": true,
		"reason":   "",
	})
}

// AcceptWaiver records a waiver acceptance for a participant
func (h *Handler) AcceptWaiver(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists || userID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	participantIDStr := c.Param("id")
	participantID, err := uuid.Parse(participantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	var req struct {
		WaiverKey string `json:"waiver_key" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Verify ownership
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Household not found"})
		return
	}

	// Check if participant belongs to user's household
	var ownerCheck uuid.UUID
	err = h.db.QueryRow(`
		SELECT household_id FROM participants WHERE id = $1
	`, participantID).Scan(&ownerCheck)

	if err != nil || ownerCheck != household.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	// Insert waiver acceptance (or update if exists)
	_, err = h.db.Exec(`
		INSERT INTO participant_waivers (participant_id, waiver_key, accepted_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (participant_id, waiver_key) DO UPDATE SET accepted_at = NOW()
	`, participantID, req.WaiverKey)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record waiver acceptance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Waiver accepted successfully"})
}
