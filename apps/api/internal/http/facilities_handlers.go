package http

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"sterling-rec/api/internal/core"
)

// GetFacilities retrieves all active facilities (public)
func (h *Handler) GetFacilities(c *gin.Context) {
	facilities, err := h.db.GetAllFacilities(true) // active only
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

// GetFacilityBySlug retrieves a single facility by slug (public)
func (h *Handler) GetFacilityBySlug(c *gin.Context) {
	slug := c.Param("slug")

	facility, err := h.db.GetFacilityBySlug(slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get facility"})
		return
	}

	if facility == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Facility not found"})
		return
	}

	if !facility.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Facility not found"})
		return
	}

	// Load availability windows
	windows, err := h.db.GetAvailabilityWindows(facility.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get availability windows"})
		return
	}
	facility.AvailabilityWindows = windows

	c.JSON(http.StatusOK, gin.H{"facility": facility})
}

// GetAvailability checks availability for a facility (public)
func (h *Handler) GetAvailability(c *gin.Context) {
	slug := c.Param("slug")

	// Required query params
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	durationStr := c.Query("duration")

	if startDateStr == "" || endDateStr == "" || durationStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date, end_date, and duration are required"})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (use YYYY-MM-DD)"})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (use YYYY-MM-DD)"})
		return
	}

	// Parse duration
	var duration int
	_, err = fmt.Sscanf(durationStr, "%d", &duration)
	if err != nil || duration <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid duration (must be positive integer minutes)"})
		return
	}

	// Get facility
	facility, err := h.db.GetFacilityBySlug(slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get facility"})
		return
	}

	if facility == nil || !facility.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Facility not found"})
		return
	}

	// Get available slots
	slots, err := h.facilitiesService.GetAvailableSlots(
		c.Request.Context(),
		facility.ID,
		startDate,
		endDate.AddDate(0, 0, 1), // Include end date
		duration,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"slots": slots})
}

// CreateBooking creates a new facility booking (authenticated)
func (h *Handler) CreateBooking(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		FacilityID     string   `json:"facility_id" binding:"required"`
		ParticipantIDs []string `json:"participant_ids"`
		StartTime      string   `json:"start_time" binding:"required"`
		EndTime        string   `json:"end_time" binding:"required"`
		Notes          *string  `json:"notes"`
		IdempotencyKey *string  `json:"idempotency_key"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse facility ID
	facilityID, err := uuid.Parse(req.FacilityID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid facility_id"})
		return
	}

	// Parse times
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

	// Parse participant IDs
	var participantIDs []uuid.UUID
	for _, pidStr := range req.ParticipantIDs {
		pid, err := uuid.Parse(pidStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant_id"})
			return
		}
		participantIDs = append(participantIDs, pid)
	}

	// Get user's household
	var householdID *uuid.UUID
	err = h.db.QueryRow(`
		SELECT id FROM households WHERE owner_user_id = $1
	`, userID).Scan(&householdID)
	if err != nil {
		// User may not have a household yet, that's okay
		householdID = nil
	}

	// Verify all participants belong to the user's household
	if len(participantIDs) > 0 && householdID != nil {
		for _, pid := range participantIDs {
			var count int
			err = h.db.QueryRow(`
				SELECT COUNT(*) FROM participants
				WHERE id = $1 AND household_id = $2
			`, pid, householdID).Scan(&count)
			if err != nil || count == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid participant_id"})
				return
			}
		}
	}

	// Create booking using service (with locking)
	bookingReq := core.BookingRequest{
		FacilityID:     facilityID,
		UserID:         userID,
		HouseholdID:    householdID,
		ParticipantIDs: participantIDs,
		StartTime:      startTime,
		EndTime:        endTime,
		Notes:          req.Notes,
		IdempotencyKey: req.IdempotencyKey,
	}

	booking, err := h.facilitiesService.CreateBooking(c.Request.Context(), bookingReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Send confirmation email with ICS attachment

	c.JSON(http.StatusCreated, gin.H{"booking": booking})
}

// GetMyBookings retrieves the current user's bookings (authenticated)
func (h *Handler) GetMyBookings(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	includeHistory := c.Query("include_history") == "true"

	bookings, err := h.facilitiesService.GetUserBookings(c.Request.Context(), userID, includeHistory)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get bookings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"bookings": bookings})
}

// CancelBooking cancels a booking (authenticated)
func (h *Handler) CancelBooking(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	bookingID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid booking ID"})
		return
	}

	var req struct {
		Reason *string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.facilitiesService.CancelBooking(c.Request.Context(), bookingID, userID, req.Reason)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Send cancellation email

	c.JSON(http.StatusOK, gin.H{"message": "Booking cancelled"})
}
