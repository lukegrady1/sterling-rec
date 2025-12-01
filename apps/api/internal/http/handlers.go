package http

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sterling-rec/api/internal/core"
	"sterling-rec/api/internal/db"
)

type Handler struct {
	db                *db.DB
	regService        *core.RegistrationService
	facilitiesService *core.FacilitiesService
}

func NewHandler(database *db.DB, regService *core.RegistrationService, facilitiesService *core.FacilitiesService) *Handler {
	return &Handler{
		db:                database,
		regService:        regService,
		facilitiesService: facilitiesService,
	}
}

// Public routes

func (h *Handler) Register(c *gin.Context) {
	var req struct {
		Email     string  `json:"email" binding:"required,email"`
		Password  string  `json:"password" binding:"required,min=8"`
		FirstName string  `json:"first_name" binding:"required"`
		LastName  string  `json:"last_name" binding:"required"`
		Phone     *string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	existing, err := h.db.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}

	// Create user
	user, err := h.db.CreateUser(req.Email, req.Password, req.FirstName, req.LastName, req.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate token
	token, err := GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	SetAuthCookie(c, token)

	c.JSON(http.StatusCreated, gin.H{
		"user": user,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user
	user, err := h.db.GetUserByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if !h.db.CheckPassword(user, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate token
	token, err := GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	SetAuthCookie(c, token)

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func (h *Handler) Logout(c *gin.Context) {
	ClearAuthCookie(c)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *Handler) GetPrograms(c *gin.Context) {
	programs, err := h.db.GetActivePrograms()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve programs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"programs": programs,
	})
}

func (h *Handler) GetProgram(c *gin.Context) {
	slug := c.Param("slug")

	program, err := h.db.GetProgramBySlug(slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve program"})
		return
	}
	if program == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"program": program,
	})
}

func (h *Handler) GetEvents(c *gin.Context) {
	events, err := h.db.GetActiveEvents()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"events": events,
	})
}

func (h *Handler) GetEvent(c *gin.Context) {
	slug := c.Param("slug")

	event, err := h.db.GetEventBySlug(slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve event"})
		return
	}
	if event == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"event": event,
	})
}

// Protected routes

func (h *Handler) GetMe(c *gin.Context) {
	userID, _ := GetUserID(c)

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	household, err := h.db.GetUserHousehold(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve household"})
		return
	}

	participants := []db.Participant{}
	if household != nil {
		var err error
		participants, err = h.db.GetHouseholdParticipants(household.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve participants"})
			return
		}
	}

	registrations, err := h.db.GetUserRegistrations(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve registrations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"household":     household,
		"participants":  participants,
		"registrations": registrations,
	})
}

func (h *Handler) CreateParticipant(c *gin.Context) {
	userID, _ := GetUserID(c)

	var req struct {
		FirstName    string  `json:"first_name" binding:"required"`
		LastName     string  `json:"last_name" binding:"required"`
		DOB          *string `json:"dob"`
		Notes        *string `json:"notes"`
		MedicalNotes *string `json:"medical_notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user's household
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve household"})
		return
	}

	participant, err := h.db.CreateParticipant(household.ID, req.FirstName, req.LastName, req.DOB, req.Notes, req.MedicalNotes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create participant"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"participant": participant,
	})
}

func (h *Handler) CreateRegistration(c *gin.Context) {
	userID, _ := GetUserID(c)

	var req struct {
		ParentType    string     `json:"parent_type" binding:"required,oneof=program event"`
		ParentID      string     `json:"parent_id" binding:"required,uuid"`
		SessionID     *string    `json:"session_id"`
		ParticipantID string     `json:"participant_id" binding:"required,uuid"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse UUIDs
	parentID, err := uuid.Parse(req.ParentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent_id"})
		return
	}

	participantID, err := uuid.Parse(req.ParticipantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant_id"})
		return
	}

	var sessionID *uuid.UUID
	if req.SessionID != nil && *req.SessionID != "" {
		sid, err := uuid.Parse(*req.SessionID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session_id"})
			return
		}
		sessionID = &sid
	}

	// Verify participant belongs to user
	participant, err := h.db.GetParticipantByID(participantID)
	if err != nil || participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}

	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil || participant.HouseholdID != household.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to register this participant"})
		return
	}

	// Create registration
	result, err := h.regService.Register(c.Request.Context(), db.RegistrationRequest{
		ParentType:    req.ParentType,
		ParentID:      parentID,
		SessionID:     sessionID,
		ParticipantID: participantID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"registration": result.Registration,
		"waitlisted":   result.IsWaitlisted,
		"position":     result.Position,
	})
}

func (h *Handler) CancelRegistration(c *gin.Context) {
	userID, _ := GetUserID(c)

	var req struct {
		RegistrationID string `json:"registration_id" binding:"required,uuid"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	registrationID, err := uuid.Parse(req.RegistrationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid registration_id"})
		return
	}

	// Get registration to verify ownership
	var participantID uuid.UUID
	var householdID uuid.UUID
	err = h.db.QueryRow(`
		SELECT r.participant_id, p.household_id
		FROM registrations r
		JOIN participants p ON p.id = r.participant_id
		WHERE r.id = $1
	`, registrationID).Scan(&participantID, &householdID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registration not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify ownership
	household, err := h.db.GetUserHousehold(userID)
	if err != nil || household == nil || household.ID != householdID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	// Cancel registration
	err = h.regService.CancelRegistration(c.Request.Context(), registrationID, participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registration cancelled successfully"})
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"service": "sterling-rec-api",
	})
}

func (h *Handler) Version(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"version": "1.0.0",
		"service": "sterling-rec-api",
	})
}

