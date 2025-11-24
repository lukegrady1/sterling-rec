package http

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sterling-rec/api/internal/db"
)

// GetProgramWaivers retrieves all waivers for a program (public endpoint)
func (h *Handler) GetProgramWaivers(c *gin.Context) {
	programID, err := uuid.Parse(c.Param("program_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid program ID"})
		return
	}

	waivers, err := h.db.GetProgramWaivers(programID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get program waivers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"waivers": waivers})
}

// AcceptParticipantWaiver records a participant's acceptance of a waiver
func (h *Handler) AcceptParticipantWaiver(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	participantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	waiverID, err := uuid.Parse(c.Param("waiver_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid waiver ID"})
		return
	}

	// Verify user owns this participant
	participant, err := h.db.GetParticipantByID(participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get participant"})
		return
	}
	if participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}

	// Get household and verify ownership
	household, err := h.db.GetHouseholdByID(participant.HouseholdID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get household"})
		return
	}
	if household == nil || household.OwnerUserID.String() != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to accept waivers for this participant"})
		return
	}

	// Get waiver to get current version
	waiver, err := h.db.GetWaiverByID(waiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get waiver"})
		return
	}
	if waiver == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Waiver not found"})
		return
	}

	var req struct {
		ProgramID *string `json:"program_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var programIDPtr *uuid.UUID
	if req.ProgramID != nil && *req.ProgramID != "" {
		pid, err := uuid.Parse(*req.ProgramID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid program ID"})
			return
		}
		programIDPtr = &pid
	}

	// Get client IP and user agent
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	acceptance := &db.ParticipantWaiverAcceptance{
		ParticipantID:    participantID,
		WaiverID:         waiverID,
		WaiverVersion:    waiver.Version,
		ProgramID:        programIDPtr,
		AcceptedByUserID: uuid.MustParse(userID.(string)),
		IPAddress:        &ipAddress,
		UserAgent:        &userAgent,
	}

	created, err := h.db.AcceptWaiver(acceptance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record waiver acceptance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"acceptance": created})
}

// GetParticipantWaivers retrieves all waiver acceptances for a participant
func (h *Handler) GetParticipantWaivers(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	participantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	// Verify user owns this participant
	participant, err := h.db.GetParticipantByID(participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get participant"})
		return
	}
	if participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}

	// Get household and verify ownership
	household, err := h.db.GetHouseholdByID(participant.HouseholdID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get household"})
		return
	}
	if household == nil || household.OwnerUserID.String() != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view waivers for this participant"})
		return
	}

	acceptances, err := h.db.GetParticipantWaiverAcceptances(participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get waiver acceptances"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"acceptances": acceptances})
}

// SaveParticipantForm saves or updates a form for a participant
func (h *Handler) SaveParticipantForm(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	participantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	// Verify user owns this participant
	participant, err := h.db.GetParticipantByID(participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get participant"})
		return
	}
	if participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}

	// Get household and verify ownership
	household, err := h.db.GetHouseholdByID(participant.HouseholdID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get household"})
		return
	}
	if household == nil || household.OwnerUserID.String() != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to save forms for this participant"})
		return
	}

	var req struct {
		FormTemplateID string          `json:"form_template_id" binding:"required"`
		DataJSON       json.RawMessage `json:"data_json" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	templateID, err := uuid.Parse(req.FormTemplateID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form template ID"})
		return
	}

	// Get template to get current version
	template, err := h.db.GetFormTemplateByID(templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get form template"})
		return
	}
	if template == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Form template not found"})
		return
	}

	submission := &db.ParticipantFormSubmission{
		ParticipantID:     participantID,
		FormTemplateID:    templateID,
		FormVersion:       template.Version,
		DataJSON:          req.DataJSON,
		SubmittedByUserID: uuid.MustParse(userID.(string)),
	}

	saved, err := h.db.SaveParticipantForm(submission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save form"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"form_submission": saved})
}

// GetParticipantForms retrieves all forms for a participant
func (h *Handler) GetParticipantForms(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	participantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant ID"})
		return
	}

	// Verify user owns this participant
	participant, err := h.db.GetParticipantByID(participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get participant"})
		return
	}
	if participant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Participant not found"})
		return
	}

	// Get household and verify ownership
	household, err := h.db.GetHouseholdByID(participant.HouseholdID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get household"})
		return
	}
	if household == nil || household.OwnerUserID.String() != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view forms for this participant"})
		return
	}

	forms, err := h.db.GetParticipantForms(participantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get participant forms"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"forms": forms})
}

// GetFormTemplates retrieves all active form templates (public endpoint)
func (h *Handler) GetFormTemplates(c *gin.Context) {
	formType := c.Query("type")

	var formTypePtr *string
	if formType != "" {
		formTypePtr = &formType
	}

	templates, err := h.db.GetAllFormTemplates(true, formTypePtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get form templates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"form_templates": templates})
}
