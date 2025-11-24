package http

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sterling-rec/api/internal/db"
)

// AdminGetAllWaivers retrieves all waivers
func (h *Handler) AdminGetAllWaivers(c *gin.Context) {
	activeOnly := c.Query("active_only") == "true"

	waivers, err := h.db.GetAllWaivers(activeOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get waivers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"waivers": waivers})
}

// AdminGetWaiver retrieves a single waiver by ID
func (h *Handler) AdminGetWaiver(c *gin.Context) {
	waiverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid waiver ID"})
		return
	}

	waiver, err := h.db.GetWaiverByID(waiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get waiver"})
		return
	}

	if waiver == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Waiver not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"waiver": waiver})
}

// AdminCreateWaiver creates a new waiver
func (h *Handler) AdminCreateWaiver(c *gin.Context) {
	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description *string `json:"description"`
		BodyHTML    string  `json:"body_html" binding:"required"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	waiver := &db.Waiver{
		Title:       req.Title,
		Description: req.Description,
		BodyHTML:    req.BodyHTML,
		Version:     1,
		IsActive:    isActive,
	}

	createdWaiver, err := h.db.CreateWaiver(waiver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create waiver"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"waiver": createdWaiver})
}

// AdminUpdateWaiver updates an existing waiver
func (h *Handler) AdminUpdateWaiver(c *gin.Context) {
	waiverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid waiver ID"})
		return
	}

	// Get current waiver for version
	currentWaiver, err := h.db.GetWaiverByID(waiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get waiver"})
		return
	}
	if currentWaiver == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Waiver not found"})
		return
	}

	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description *string `json:"description"`
		BodyHTML    string  `json:"body_html" binding:"required"`
		IsActive    *bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isActive := currentWaiver.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	waiver := &db.Waiver{
		Title:       req.Title,
		Description: req.Description,
		BodyHTML:    req.BodyHTML,
		Version:     currentWaiver.Version, // Will be incremented by UpdateWaiver if body changed
		IsActive:    isActive,
	}

	err = h.db.UpdateWaiver(waiverID, waiver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update waiver"})
		return
	}

	// Fetch updated waiver to return
	updatedWaiver, err := h.db.GetWaiverByID(waiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated waiver"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"waiver": updatedWaiver})
}

// AdminDeleteWaiver soft-deletes a waiver
func (h *Handler) AdminDeleteWaiver(c *gin.Context) {
	waiverID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid waiver ID"})
		return
	}

	err = h.db.DeleteWaiver(waiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete waiver"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Waiver deleted successfully"})
}

// AdminAssignWaiverToProgram assigns a waiver to a program
func (h *Handler) AdminAssignWaiverToProgram(c *gin.Context) {
	var req struct {
		ProgramID   string `json:"program_id" binding:"required"`
		WaiverID    string `json:"waiver_id" binding:"required"`
		IsRequired  *bool  `json:"is_required"`
		IsPerSeason *bool  `json:"is_per_season"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	programID, err := uuid.Parse(req.ProgramID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid program ID"})
		return
	}

	waiverID, err := uuid.Parse(req.WaiverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid waiver ID"})
		return
	}

	isRequired := true
	if req.IsRequired != nil {
		isRequired = *req.IsRequired
	}

	isPerSeason := false
	if req.IsPerSeason != nil {
		isPerSeason = *req.IsPerSeason
	}

	programWaiver := &db.ProgramWaiver{
		ProgramID:   programID,
		WaiverID:    waiverID,
		IsRequired:  isRequired,
		IsPerSeason: isPerSeason,
	}

	created, err := h.db.AssignWaiverToProgram(programWaiver)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign waiver to program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"program_waiver": created})
}

// AdminRemoveWaiverFromProgram removes a waiver from a program
func (h *Handler) AdminRemoveWaiverFromProgram(c *gin.Context) {
	programIDStr := c.Query("program_id")
	waiverIDStr := c.Query("waiver_id")

	if programIDStr == "" || waiverIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "program_id and waiver_id are required"})
		return
	}

	programID, err := uuid.Parse(programIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid program ID"})
		return
	}

	waiverID, err := uuid.Parse(waiverIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid waiver ID"})
		return
	}

	err = h.db.RemoveWaiverFromProgram(programID, waiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove waiver from program"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Waiver removed from program successfully"})
}

// AdminGetAllFormTemplates retrieves all form templates
func (h *Handler) AdminGetAllFormTemplates(c *gin.Context) {
	activeOnly := c.Query("active_only") == "true"
	formType := c.Query("type")

	var formTypePtr *string
	if formType != "" {
		formTypePtr = &formType
	}

	templates, err := h.db.GetAllFormTemplates(activeOnly, formTypePtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get form templates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"form_templates": templates})
}

// AdminCreateFormTemplate creates a new form template
func (h *Handler) AdminCreateFormTemplate(c *gin.Context) {
	var req struct {
		Type        string          `json:"type" binding:"required"`
		Title       string          `json:"title" binding:"required"`
		Description *string         `json:"description"`
		SchemaJSON  json.RawMessage `json:"schema_json" binding:"required"`
		IsActive    *bool           `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	formTemplate := &db.FormTemplate{
		Type:        req.Type,
		Title:       req.Title,
		Description: req.Description,
		SchemaJSON:  req.SchemaJSON,
		Version:     1,
		IsActive:    isActive,
	}

	created, err := h.db.CreateFormTemplate(formTemplate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form template"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"form_template": created})
}

// AdminUpdateFormTemplate updates an existing form template
func (h *Handler) AdminUpdateFormTemplate(c *gin.Context) {
	templateID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	// Get current template for version
	currentTemplate, err := h.db.GetFormTemplateByID(templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get form template"})
		return
	}
	if currentTemplate == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Form template not found"})
		return
	}

	var req struct {
		Type        string          `json:"type" binding:"required"`
		Title       string          `json:"title" binding:"required"`
		Description *string         `json:"description"`
		SchemaJSON  json.RawMessage `json:"schema_json" binding:"required"`
		IsActive    *bool           `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isActive := currentTemplate.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	formTemplate := &db.FormTemplate{
		Type:        req.Type,
		Title:       req.Title,
		Description: req.Description,
		SchemaJSON:  req.SchemaJSON,
		Version:     currentTemplate.Version, // Will be incremented by UpdateFormTemplate if schema changed
		IsActive:    isActive,
	}

	err = h.db.UpdateFormTemplate(templateID, formTemplate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update form template"})
		return
	}

	// Fetch updated template
	updatedTemplate, err := h.db.GetFormTemplateByID(templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated form template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"form_template": updatedTemplate})
}

// AdminDeleteFormTemplate soft-deletes a form template
func (h *Handler) AdminDeleteFormTemplate(c *gin.Context) {
	templateID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	err = h.db.DeleteFormTemplate(templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete form template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Form template deleted successfully"})
}
