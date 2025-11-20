package http

import (
	"net/http"
"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Admin middleware - check if user is admin
func (h *Handler) AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := GetUserID(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		var role string
		err := h.db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check admin status"})
			c.Abort()
			return
		}

		if role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Create Program (Admin only)
func (h *Handler) AdminCreateProgram(c *gin.Context) {
	var req struct {
		Slug          string  `json:"slug" binding:"required"`
		Title         string  `json:"title" binding:"required"`
		Description   *string `json:"description"`
		AgeMin        *int    `json:"age_min"`
		AgeMax        *int    `json:"age_max"`
		Location      *string `json:"location"`
		Capacity      int     `json:"capacity" binding:"required"`
		StartDate     *string `json:"start_date"`
		EndDate       *string `json:"end_date"`
		ScheduleNotes *string `json:"schedule_notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Insert program
	var programID uuid.UUID
	err := h.db.QueryRow(`
		INSERT INTO programs (slug, title, description, age_min, age_max, location, capacity, start_date, end_date, schedule_notes, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
		RETURNING id
	`, req.Slug, req.Title, req.Description, req.AgeMin, req.AgeMax, req.Location, req.Capacity, req.StartDate, req.EndDate, req.ScheduleNotes).Scan(&programID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create program"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"program_id": programID})
}

// Update Program (Admin only)
func (h *Handler) AdminUpdateProgram(c *gin.Context) {
	programID := c.Param("id")

	var req struct {
		Title         *string `json:"title"`
		Description   *string `json:"description"`
		AgeMin        *int    `json:"age_min"`
		AgeMax        *int    `json:"age_max"`
		Location      *string `json:"location"`
		Capacity      *int    `json:"capacity"`
		StartDate     *string `json:"start_date"`
		EndDate       *string `json:"end_date"`
		ScheduleNotes *string `json:"schedule_notes"`
		IsActive      *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build dynamic update query
	_, err := h.db.Exec(`
		UPDATE programs SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			age_min = COALESCE($3, age_min),
			age_max = COALESCE($4, age_max),
			location = COALESCE($5, location),
			capacity = COALESCE($6, capacity),
			start_date = COALESCE($7, start_date),
			end_date = COALESCE($8, end_date),
			schedule_notes = COALESCE($9, schedule_notes),
			is_active = COALESCE($10, is_active),
			updated_at = NOW()
		WHERE id = $11
	`, req.Title, req.Description, req.AgeMin, req.AgeMax, req.Location, req.Capacity, req.StartDate, req.EndDate, req.ScheduleNotes, req.IsActive, programID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Program updated"})
}

// Delete Program (Admin only)
func (h *Handler) AdminDeleteProgram(c *gin.Context) {
	programID := c.Param("id")

	_, err := h.db.Exec("DELETE FROM programs WHERE id = $1", programID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Program deleted"})
}

// Create Event (Admin only)
func (h *Handler) AdminCreateEvent(c *gin.Context) {
	var req struct {
		Slug        string  `json:"slug" binding:"required"`
		Title       string  `json:"title" binding:"required"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		Capacity    int     `json:"capacity" binding:"required"`
		StartsAt    *string `json:"starts_at"`
		EndsAt      *string `json:"ends_at"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var eventID uuid.UUID
	err := h.db.QueryRow(`
		INSERT INTO events (slug, title, description, location, capacity, starts_at, ends_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		RETURNING id
	`, req.Slug, req.Title, req.Description, req.Location, req.Capacity, req.StartsAt, req.EndsAt).Scan(&eventID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"event_id": eventID})
}

// Update Event (Admin only)
func (h *Handler) AdminUpdateEvent(c *gin.Context) {
	eventID := c.Param("id")

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		Capacity    *int    `json:"capacity"`
		StartsAt    *string `json:"starts_at"`
		EndsAt      *string `json:"ends_at"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.db.Exec(`
		UPDATE events SET
			title = COALESCE($1, title),
			description = COALESCE($2, description),
			location = COALESCE($3, location),
			capacity = COALESCE($4, capacity),
			starts_at = COALESCE($5, starts_at),
			ends_at = COALESCE($6, ends_at),
			is_active = COALESCE($7, is_active),
			updated_at = NOW()
		WHERE id = $8
	`, req.Title, req.Description, req.Location, req.Capacity, req.StartsAt, req.EndsAt, req.IsActive, eventID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event updated"})
}

// Delete Event (Admin only)
func (h *Handler) AdminDeleteEvent(c *gin.Context) {
	eventID := c.Param("id")

	_, err := h.db.Exec("DELETE FROM events WHERE id = $1", eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted"})
}

// Get all registrations (Admin only)
func (h *Handler) AdminGetRegistrations(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT r.id, r.parent_type, r.parent_id, r.session_id, r.participant_id, r.status, r.created_at,
		       p.first_name, p.last_name, p.dob,
		       u.email, u.first_name as user_first_name, u.last_name as user_last_name
		FROM registrations r
		JOIN participants p ON r.participant_id = p.id
		JOIN households h ON p.household_id = h.id
		JOIN users u ON h.owner_user_id = u.id
		ORDER BY r.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve registrations"})
		return
	}
	defer rows.Close()

	registrations := []map[string]interface{}{}
	for rows.Next() {
		var reg struct {
			ID            uuid.UUID
			ParentType    string
			ParentID      uuid.UUID
			SessionID     *uuid.UUID
			ParticipantID uuid.UUID
			Status        string
			CreatedAt     string
			FirstName     string
			LastName      string
			Dob           *string
			Email         string
			UserFirstName string
			UserLastName  string
		}

		if err := rows.Scan(&reg.ID, &reg.ParentType, &reg.ParentID, &reg.SessionID, &reg.ParticipantID, &reg.Status, &reg.CreatedAt,
			&reg.FirstName, &reg.LastName, &reg.Dob, &reg.Email, &reg.UserFirstName, &reg.UserLastName); err != nil {
			continue
		}

		registrations = append(registrations, map[string]interface{}{
			"id":             reg.ID,
			"parent_type":    reg.ParentType,
			"parent_id":      reg.ParentID,
			"session_id":     reg.SessionID,
			"participant_id": reg.ParticipantID,
			"status":         reg.Status,
			"created_at":     reg.CreatedAt,
			"participant": map[string]interface{}{
				"first_name": reg.FirstName,
				"last_name":  reg.LastName,
				"dob":        reg.Dob,
			},
			"user": map[string]interface{}{
				"email":      reg.Email,
				"first_name": reg.UserFirstName,
				"last_name":  reg.UserLastName,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{"registrations": registrations})
}
// Get all program registrations (Admin only)
func (h *Handler) AdminGetProgramRegistrations(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT r.id, r.parent_id as program_id, r.participant_id, r.status, r.created_at,
		       prog.title as program_title,
		       p.first_name, p.last_name, p.dob, p.emergency_contact_name, p.emergency_contact_phone, 
		       p.notes, p.medical_notes,
		       u.id as user_id, u.email
		FROM registrations r
		JOIN participants p ON r.participant_id = p.id
		JOIN households h ON p.household_id = h.id
		JOIN users u ON h.owner_user_id = u.id
		JOIN programs prog ON r.parent_id = prog.id
		WHERE r.parent_type = 'program'
		ORDER BY r.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve registrations"})
		return
	}
	defer rows.Close()

	registrations := []map[string]interface{}{}
	for rows.Next() {
		var reg struct {
			ID                     uuid.UUID
			ProgramID              uuid.UUID
			ParticipantID          uuid.UUID
			Status                 string
			CreatedAt              string
			ProgramTitle           string
			FirstName              string
			LastName               string
			Dob                    *string
			EmergencyContactName   *string
			EmergencyContactPhone  *string
			Notes                  *string
			MedicalNotes           *string
			UserID                 uuid.UUID
			Email                  string
		}

		if err := rows.Scan(&reg.ID, &reg.ProgramID, &reg.ParticipantID, &reg.Status, &reg.CreatedAt,
			&reg.ProgramTitle, &reg.FirstName, &reg.LastName, &reg.Dob, 
			&reg.EmergencyContactName, &reg.EmergencyContactPhone, &reg.Notes, &reg.MedicalNotes,
			&reg.UserID, &reg.Email); err != nil {
			continue
		}

		// Calculate participant age if DOB is available
		var participantAge *int
		if reg.Dob != nil {
			// Simple age calculation
			dobYear := (*reg.Dob)[:4]
			if len(dobYear) == 4 {
				var year int
				fmt.Sscanf(dobYear, "%d", &year)
				age := time.Now().Year() - year
				participantAge = &age
			}
		}

		participantName := reg.FirstName + " " + reg.LastName
		emergencyContactName := ""
		if reg.EmergencyContactName != nil {
			emergencyContactName = *reg.EmergencyContactName
		}
		emergencyContactPhone := ""
		if reg.EmergencyContactPhone != nil {
			emergencyContactPhone = *reg.EmergencyContactPhone
		}
		notes := ""
		if reg.Notes != nil {
			notes = *reg.Notes
		}
		if reg.MedicalNotes != nil && *reg.MedicalNotes != "" {
			if notes != "" {
				notes += "\n"
			}
			notes += "Medical: " + *reg.MedicalNotes
		}

		registrations = append(registrations, map[string]interface{}{
			"id":                       reg.ID,
			"program_id":               reg.ProgramID,
			"program_title":            reg.ProgramTitle,
			"user_id":                  reg.UserID,
			"user_email":               reg.Email,
			"participant_name":         participantName,
			"participant_age":          participantAge,
			"emergency_contact_name":   emergencyContactName,
			"emergency_contact_phone":  emergencyContactPhone,
			"notes":                    notes,
			"status":                   reg.Status,
			"registered_at":            reg.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"registrations": registrations})
}

// Update registration status (Admin only)
func (h *Handler) AdminUpdateRegistrationStatus(c *gin.Context) {
	registrationID := c.Param("id")
	
	var req struct {
		Status string `json:"status" binding:"required,oneof=pending approved waitlisted cancelled completed confirmed"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	_, err := h.db.Exec("UPDATE registrations SET status = $1 WHERE id = $2", req.Status, registrationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}
