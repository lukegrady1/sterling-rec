package http

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sterling-rec/api/internal/db"
)

// AdminGetAllFacilities retrieves all facilities (admin)
func (h *Handler) AdminGetAllFacilities(c *gin.Context) {
	activeOnly := c.Query("active_only") == "true"

	facilities, err := h.db.GetAllFacilities(activeOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get facilities"})
		return
	}

	// Load availability windows for each facility
	for i := range facilities {
		windows, err := h.db.GetAvailabilityWindows(facilities[i].ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get availability windows"})
			return
		}
		facilities[i].AvailabilityWindows = windows
	}

	c.JSON(http.StatusOK, gin.H{"facilities": facilities})
}

// AdminCreateFacility creates a new facility
func (h *Handler) AdminCreateFacility(c *gin.Context) {
	var req struct {
		Slug                      string  `json:"slug" binding:"required"`
		Name                      string  `json:"name" binding:"required"`
		Description               *string `json:"description"`
		FacilityType              string  `json:"facility_type" binding:"required"`
		Location                  *string `json:"location"`
		Capacity                  *int    `json:"capacity"`
		MinBookingDurationMinutes int     `json:"min_booking_duration_minutes" binding:"required"`
		MaxBookingDurationMinutes int     `json:"max_booking_duration_minutes" binding:"required"`
		BufferMinutes             int     `json:"buffer_minutes"`
		AdvanceBookingDays        int     `json:"advance_booking_days" binding:"required"`
		CancellationCutoffHours   int     `json:"cancellation_cutoff_hours" binding:"required"`
		IsActive                  bool    `json:"is_active"`
		RequiresApproval          bool    `json:"requires_approval"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate constraints
	if req.MinBookingDurationMinutes <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimum booking duration must be positive"})
		return
	}
	if req.MaxBookingDurationMinutes < req.MinBookingDurationMinutes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum booking duration must be >= minimum"})
		return
	}
	if req.BufferMinutes < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Buffer minutes cannot be negative"})
		return
	}
	if req.AdvanceBookingDays <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Advance booking days must be positive"})
		return
	}
	if req.CancellationCutoffHours < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cancellation cutoff cannot be negative"})
		return
	}

	facility := &db.Facility{
		Slug:                      req.Slug,
		Name:                      req.Name,
		Description:               req.Description,
		FacilityType:              req.FacilityType,
		Location:                  req.Location,
		Capacity:                  req.Capacity,
		MinBookingDurationMinutes: req.MinBookingDurationMinutes,
		MaxBookingDurationMinutes: req.MaxBookingDurationMinutes,
		BufferMinutes:             req.BufferMinutes,
		AdvanceBookingDays:        req.AdvanceBookingDays,
		CancellationCutoffHours:   req.CancellationCutoffHours,
		IsActive:                  req.IsActive,
		RequiresApproval:          req.RequiresApproval,
	}

	created, err := h.db.CreateFacility(facility)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create facility"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"facility": created})
}

// AdminUpdateFacility updates a facility
func (h *Handler) AdminUpdateFacility(c *gin.Context) {
	facilityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility ID"})
		return
	}

	var req struct {
		Slug                      string  `json:"slug" binding:"required"`
		Name                      string  `json:"name" binding:"required"`
		Description               *string `json:"description"`
		FacilityType              string  `json:"facility_type" binding:"required"`
		Location                  *string `json:"location"`
		Capacity                  *int    `json:"capacity"`
		MinBookingDurationMinutes int     `json:"min_booking_duration_minutes" binding:"required"`
		MaxBookingDurationMinutes int     `json:"max_booking_duration_minutes" binding:"required"`
		BufferMinutes             int     `json:"buffer_minutes"`
		AdvanceBookingDays        int     `json:"advance_booking_days" binding:"required"`
		CancellationCutoffHours   int     `json:"cancellation_cutoff_hours" binding:"required"`
		IsActive                  bool    `json:"is_active"`
		RequiresApproval          bool    `json:"requires_approval"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate constraints
	if req.MinBookingDurationMinutes <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimum booking duration must be positive"})
		return
	}
	if req.MaxBookingDurationMinutes < req.MinBookingDurationMinutes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum booking duration must be >= minimum"})
		return
	}

	facility := &db.Facility{
		Slug:                      req.Slug,
		Name:                      req.Name,
		Description:               req.Description,
		FacilityType:              req.FacilityType,
		Location:                  req.Location,
		Capacity:                  req.Capacity,
		MinBookingDurationMinutes: req.MinBookingDurationMinutes,
		MaxBookingDurationMinutes: req.MaxBookingDurationMinutes,
		BufferMinutes:             req.BufferMinutes,
		AdvanceBookingDays:        req.AdvanceBookingDays,
		CancellationCutoffHours:   req.CancellationCutoffHours,
		IsActive:                  req.IsActive,
		RequiresApproval:          req.RequiresApproval,
	}

	err = h.db.UpdateFacility(facilityID, facility)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update facility"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Facility updated"})
}

// AdminDeleteFacility soft deletes a facility
func (h *Handler) AdminDeleteFacility(c *gin.Context) {
	facilityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility ID"})
		return
	}

	err = h.db.DeleteFacility(facilityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete facility"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Facility deleted"})
}

// AdminCreateAvailabilityWindow creates a new availability window
func (h *Handler) AdminCreateAvailabilityWindow(c *gin.Context) {
	facilityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility ID"})
		return
	}

	var req struct {
		DayOfWeek      int     `json:"day_of_week" binding:"required,min=0,max=6"`
		StartTime      string  `json:"start_time" binding:"required"`
		EndTime        string  `json:"end_time" binding:"required"`
		EffectiveFrom  *string `json:"effective_from"`
		EffectiveUntil *string `json:"effective_until"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate time format (HH:MM or HH:MM:SS)
	_, err = time.Parse("15:04:05", req.StartTime)
	if err != nil {
		_, err = time.Parse("15:04", req.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format (use HH:MM or HH:MM:SS)"})
			return
		}
		req.StartTime = req.StartTime + ":00"
	}

	_, err = time.Parse("15:04:05", req.EndTime)
	if err != nil {
		_, err = time.Parse("15:04", req.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format (use HH:MM or HH:MM:SS)"})
			return
		}
		req.EndTime = req.EndTime + ":00"
	}

	var effectiveFrom *time.Time
	if req.EffectiveFrom != nil {
		parsed, err := time.Parse("2006-01-02", *req.EffectiveFrom)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid effective_from format (use YYYY-MM-DD)"})
			return
		}
		effectiveFrom = &parsed
	}

	var effectiveUntil *time.Time
	if req.EffectiveUntil != nil {
		parsed, err := time.Parse("2006-01-02", *req.EffectiveUntil)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid effective_until format (use YYYY-MM-DD)"})
			return
		}
		effectiveUntil = &parsed
	}

	window := &db.AvailabilityWindow{
		FacilityID:     facilityID,
		DayOfWeek:      req.DayOfWeek,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		EffectiveFrom:  effectiveFrom,
		EffectiveUntil: effectiveUntil,
	}

	created, err := h.db.CreateAvailabilityWindow(window)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create availability window"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"window": created})
}

// AdminDeleteAvailabilityWindow deletes an availability window
func (h *Handler) AdminDeleteAvailabilityWindow(c *gin.Context) {
	windowID, err := uuid.Parse(c.Param("window_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid window ID"})
		return
	}

	err = h.db.DeleteAvailabilityWindow(windowID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete availability window"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Availability window deleted"})
}

// AdminCreateClosure creates a new closure
func (h *Handler) AdminCreateClosure(c *gin.Context) {
	facilityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility ID"})
		return
	}

	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		StartTime string  `json:"start_time" binding:"required"`
		EndTime   string  `json:"end_time" binding:"required"`
		Reason    *string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format (use RFC3339)"})
		return
	}

	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format (use RFC3339)"})
		return
	}

	if !endTime.After(startTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "end_time must be after start_time"})
		return
	}

	closure := &db.FacilityClosure{
		FacilityID: facilityID,
		StartTime:  startTime,
		EndTime:    endTime,
		Reason:     req.Reason,
		CreatedBy:  &userID,
	}

	created, err := h.db.CreateClosure(closure)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create closure"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"closure": created})
}

// AdminGetClosures gets closures for a facility
func (h *Handler) AdminGetClosures(c *gin.Context) {
	facilityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility ID"})
		return
	}

	// Parse date range
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")

	var startTime, endTime time.Time
	if startTimeStr != "" {
		startTime, err = time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format"})
			return
		}
	} else {
		startTime = time.Now()
	}

	if endTimeStr != "" {
		endTime, err = time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format"})
			return
		}
	} else {
		endTime = startTime.AddDate(1, 0, 0) // Default to 1 year
	}

	closures, err := h.db.GetClosures(facilityID, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get closures"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"closures": closures})
}

// AdminDeleteClosure deletes a closure
func (h *Handler) AdminDeleteClosure(c *gin.Context) {
	closureID, err := uuid.Parse(c.Param("closure_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid closure ID"})
		return
	}

	err = h.db.DeleteClosure(closureID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete closure"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Closure deleted"})
}

// AdminGetFacilityBookings gets all bookings for a facility
func (h *Handler) AdminGetFacilityBookings(c *gin.Context) {
	facilityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility ID"})
		return
	}

	// Parse optional date range
	var startTime, endTime *time.Time
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		parsed, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format"})
			return
		}
		startTime = &parsed
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		parsed, err := time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format"})
			return
		}
		endTime = &parsed
	}

	bookings, err := h.facilitiesService.GetFacilityBookings(c.Request.Context(), facilityID, startTime, endTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get bookings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bookings": bookings})
}

// AdminExportBookings exports bookings as CSV
func (h *Handler) AdminExportBookings(c *gin.Context) {
	// Parse optional filters
	var facilityID *uuid.UUID
	if facilityIDStr := c.Query("facility_id"); facilityIDStr != "" {
		parsed, err := uuid.Parse(facilityIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility_id"})
			return
		}
		facilityID = &parsed
	}

	var startTime, endTime *time.Time
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		parsed, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format"})
			return
		}
		startTime = &parsed
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		parsed, err := time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format"})
			return
		}
		endTime = &parsed
	}

	status := c.Query("status") // "" for all, "confirmed", "cancelled"

	bookings, err := h.db.GetBookings(facilityID, nil, startTime, endTime, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get bookings"})
		return
	}

	// Load facility and user details
	for i := range bookings {
		facility, err := h.db.GetFacilityByID(bookings[i].FacilityID)
		if err == nil {
			bookings[i].Facility = facility
		}

		var user db.User
		err = h.db.QueryRow(`
			SELECT id, email, first_name, last_name, phone, role, created_at
			FROM users WHERE id = $1
		`, bookings[i].UserID).Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName,
			&user.Phone, &user.Role, &user.CreatedAt,
		)
		if err == nil {
			bookings[i].User = &user
		}
	}

	// Set CSV headers
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=bookings_%s.csv", time.Now().Format("2006-01-02")))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write header
	writer.Write([]string{
		"Booking ID", "Facility", "User Email", "User Name",
		"Start Time", "End Time", "Duration (minutes)", "Status",
		"Notes", "Created At",
	})

	// Write rows
	for _, booking := range bookings {
		facilityName := ""
		if booking.Facility != nil {
			facilityName = booking.Facility.Name
		}

		userEmail := ""
		userName := ""
		if booking.User != nil {
			userEmail = booking.User.Email
			userName = fmt.Sprintf("%s %s", booking.User.FirstName, booking.User.LastName)
		}

		duration := int(booking.EndTime.Sub(booking.StartTime).Minutes())
		notes := ""
		if booking.Notes != nil {
			notes = *booking.Notes
		}

		writer.Write([]string{
			booking.ID.String(),
			facilityName,
			userEmail,
			userName,
			booking.StartTime.Format(time.RFC3339),
			booking.EndTime.Format(time.RFC3339),
			fmt.Sprintf("%d", duration),
			booking.Status,
			notes,
			booking.CreatedAt.Format(time.RFC3339),
		})
	}
}
