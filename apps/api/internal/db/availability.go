package db

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AvailabilityQuery represents a query for available time slots
type AvailabilityQuery struct {
	FacilityID uuid.UUID
	StartDate  time.Time
	EndDate    time.Time
	Duration   int // duration in minutes
}

// CheckAvailability checks if a specific time slot is available for booking
// Returns error if slot is not available with reason
func (db *DB) CheckAvailability(facilityID uuid.UUID, startTime, endTime time.Time) error {
	facility, err := db.GetFacilityByID(facilityID)
	if err != nil {
		return fmt.Errorf("failed to get facility: %w", err)
	}
	if facility == nil {
		return fmt.Errorf("facility not found")
	}

	// Check 1: Facility must be active
	if !facility.IsActive {
		return fmt.Errorf("facility is not active")
	}

	// Check 2: Duration constraints
	duration := int(endTime.Sub(startTime).Minutes())
	if duration < facility.MinBookingDurationMinutes {
		return fmt.Errorf("booking duration %d minutes is less than minimum %d minutes",
			duration, facility.MinBookingDurationMinutes)
	}
	if duration > facility.MaxBookingDurationMinutes {
		return fmt.Errorf("booking duration %d minutes exceeds maximum %d minutes",
			duration, facility.MaxBookingDurationMinutes)
	}

	// Check 3: Advance booking constraint
	now := time.Now()
	maxAdvanceDate := now.AddDate(0, 0, facility.AdvanceBookingDays)
	if startTime.After(maxAdvanceDate) {
		return fmt.Errorf("cannot book more than %d days in advance", facility.AdvanceBookingDays)
	}

	// Check 4: Cannot book in the past
	if startTime.Before(now) {
		return fmt.Errorf("cannot book in the past")
	}

	// Check 5: Within facility availability windows
	if err := db.checkWithinAvailabilityWindows(facilityID, startTime, endTime); err != nil {
		return err
	}

	// Check 6: Not during a closure
	if err := db.checkNotDuringClosure(facilityID, startTime, endTime); err != nil {
		return err
	}

	// Check 7: No conflicting bookings (includes buffer time)
	if err := db.checkNoConflictingBookings(facilityID, startTime, endTime, facility.BufferMinutes); err != nil {
		return err
	}

	return nil
}

// checkWithinAvailabilityWindows checks if the time slot falls within availability windows
func (db *DB) checkWithinAvailabilityWindows(facilityID uuid.UUID, startTime, endTime time.Time) error {
	// Get all availability windows for the facility
	windows, err := db.GetAvailabilityWindows(facilityID)
	if err != nil {
		return fmt.Errorf("failed to get availability windows: %w", err)
	}

	if len(windows) == 0 {
		return fmt.Errorf("facility has no availability windows configured")
	}

	// Check each day in the booking range
	currentDate := startTime
	for currentDate.Before(endTime) {
		dayOfWeek := int(currentDate.Weekday())
		dayStart := time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day(), 0, 0, 0, 0, currentDate.Location())
		dayEnd := dayStart.AddDate(0, 0, 1)

		// Find applicable windows for this day
		var applicableWindows []AvailabilityWindow
		for _, window := range windows {
			if window.DayOfWeek != dayOfWeek {
				continue
			}

			// Check effective date range
			if window.EffectiveFrom != nil && currentDate.Before(*window.EffectiveFrom) {
				continue
			}
			if window.EffectiveUntil != nil && currentDate.After(*window.EffectiveUntil) {
				continue
			}

			applicableWindows = append(applicableWindows, window)
		}

		if len(applicableWindows) == 0 {
			return fmt.Errorf("facility is not available on %s", currentDate.Weekday())
		}

		// Check if the booking time on this day falls within any window
		bookingStart := startTime
		if bookingStart.Before(dayStart) {
			bookingStart = dayStart
		}
		bookingEnd := endTime
		if bookingEnd.After(dayEnd) {
			bookingEnd = dayEnd
		}

		withinWindow := false
		for _, window := range applicableWindows {
			// Parse window times
			windowStart, err := time.Parse("15:04:05", window.StartTime)
			if err != nil {
				return fmt.Errorf("invalid window start time: %w", err)
			}
			windowEnd, err := time.Parse("15:04:05", window.EndTime)
			if err != nil {
				return fmt.Errorf("invalid window end time: %w", err)
			}

			// Convert to actual timestamps for this day
			windowStartTime := time.Date(
				currentDate.Year(), currentDate.Month(), currentDate.Day(),
				windowStart.Hour(), windowStart.Minute(), windowStart.Second(),
				0, currentDate.Location(),
			)
			windowEndTime := time.Date(
				currentDate.Year(), currentDate.Month(), currentDate.Day(),
				windowEnd.Hour(), windowEnd.Minute(), windowEnd.Second(),
				0, currentDate.Location(),
			)

			// Check if booking falls within this window
			if !bookingStart.Before(windowStartTime) && !bookingEnd.After(windowEndTime) {
				withinWindow = true
				break
			}
		}

		if !withinWindow {
			return fmt.Errorf("booking time is outside facility availability hours on %s",
				currentDate.Format("Monday, January 2"))
		}

		// Move to next day
		currentDate = dayEnd
	}

	return nil
}

// checkNotDuringClosure checks if the time slot conflicts with any closures
func (db *DB) checkNotDuringClosure(facilityID uuid.UUID, startTime, endTime time.Time) error {
	closures, err := db.GetClosures(facilityID, startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to get closures: %w", err)
	}

	for _, closure := range closures {
		// Check if there's any overlap
		if startTime.Before(closure.EndTime) && endTime.After(closure.StartTime) {
			reason := "scheduled closure"
			if closure.Reason != nil {
				reason = *closure.Reason
			}
			return fmt.Errorf("facility is closed during this time: %s", reason)
		}
	}

	return nil
}

// checkNoConflictingBookings checks for overlapping confirmed bookings
func (db *DB) checkNoConflictingBookings(facilityID uuid.UUID, startTime, endTime time.Time, bufferMinutes int) error {
	// Add buffer time to the check
	checkStart := startTime.Add(-time.Duration(bufferMinutes) * time.Minute)
	checkEnd := endTime.Add(time.Duration(bufferMinutes) * time.Minute)

	query := `
		SELECT COUNT(*)
		FROM facility_bookings
		WHERE facility_id = $1
			AND status = 'confirmed'
			AND start_time < $3
			AND end_time > $2
	`

	var count int
	err := db.QueryRow(query, facilityID, checkStart, checkEnd).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check for conflicts: %w", err)
	}

	if count > 0 {
		if bufferMinutes > 0 {
			return fmt.Errorf("time slot conflicts with existing booking (including %d minute buffer)", bufferMinutes)
		}
		return fmt.Errorf("time slot conflicts with existing booking")
	}

	return nil
}

// GetAvailableSlots returns all available time slots for a facility within a date range
func (db *DB) GetAvailableSlots(query AvailabilityQuery) ([]AvailabilitySlot, error) {
	facility, err := db.GetFacilityByID(query.FacilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to get facility: %w", err)
	}
	if facility == nil {
		return nil, fmt.Errorf("facility not found")
	}

	if !facility.IsActive {
		return nil, fmt.Errorf("facility is not active")
	}

	// Get availability windows
	windows, err := db.GetAvailabilityWindows(query.FacilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to get availability windows: %w", err)
	}

	if len(windows) == 0 {
		return []AvailabilitySlot{}, nil
	}

	// Get all closures in range
	closures, err := db.GetClosures(query.FacilityID, query.StartDate, query.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get closures: %w", err)
	}

	// Get all confirmed bookings in range
	bookings, err := db.GetBookings(&query.FacilityID, nil, &query.StartDate, &query.EndDate, "confirmed")
	if err != nil {
		return nil, fmt.Errorf("failed to get bookings: %w", err)
	}

	// Generate all potential slots based on availability windows
	var allSlots []AvailabilitySlot
	currentDate := query.StartDate
	for currentDate.Before(query.EndDate) {
		dayOfWeek := int(currentDate.Weekday())

		// Find applicable windows for this day
		for _, window := range windows {
			if window.DayOfWeek != dayOfWeek {
				continue
			}

			// Check effective date range
			if window.EffectiveFrom != nil && currentDate.Before(*window.EffectiveFrom) {
				continue
			}
			if window.EffectiveUntil != nil && currentDate.After(*window.EffectiveUntil) {
				continue
			}

			// Parse window times
			windowStart, err := time.Parse("15:04:05", window.StartTime)
			if err != nil {
				continue
			}
			windowEnd, err := time.Parse("15:04:05", window.EndTime)
			if err != nil {
				continue
			}

			// Convert to actual timestamps for this day
			windowStartTime := time.Date(
				currentDate.Year(), currentDate.Month(), currentDate.Day(),
				windowStart.Hour(), windowStart.Minute(), windowStart.Second(),
				0, currentDate.Location(),
			)
			windowEndTime := time.Date(
				currentDate.Year(), currentDate.Month(), currentDate.Day(),
				windowEnd.Hour(), windowEnd.Minute(), windowEnd.Second(),
				0, currentDate.Location(),
			)

			// Generate slots within this window
			slotStart := windowStartTime
			for slotStart.Add(time.Duration(query.Duration) * time.Minute).Before(windowEndTime) ||
				slotStart.Add(time.Duration(query.Duration)*time.Minute).Equal(windowEndTime) {

				slotEnd := slotStart.Add(time.Duration(query.Duration) * time.Minute)

				// Check if slot is in the future
				if slotStart.After(time.Now()) {
					// Check if slot is within advance booking limit
					maxAdvanceDate := time.Now().AddDate(0, 0, facility.AdvanceBookingDays)
					if slotStart.Before(maxAdvanceDate) || slotStart.Equal(maxAdvanceDate) {
						allSlots = append(allSlots, AvailabilitySlot{
							StartTime: slotStart,
							EndTime:   slotEnd,
						})
					}
				}

				// Move to next potential slot (using minimum booking duration as increment)
				slotStart = slotStart.Add(time.Duration(facility.MinBookingDurationMinutes) * time.Minute)
			}
		}

		// Move to next day
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	// Filter out slots that conflict with closures or bookings
	var availableSlots []AvailabilitySlot
	for _, slot := range allSlots {
		available := true

		// Check closures
		for _, closure := range closures {
			if slot.StartTime.Before(closure.EndTime) && slot.EndTime.After(closure.StartTime) {
				available = false
				break
			}
		}

		if !available {
			continue
		}

		// Check bookings (with buffer)
		bufferDuration := time.Duration(facility.BufferMinutes) * time.Minute
		for _, booking := range bookings {
			bookingStart := booking.StartTime.Add(-bufferDuration)
			bookingEnd := booking.EndTime.Add(bufferDuration)

			if slot.StartTime.Before(bookingEnd) && slot.EndTime.After(bookingStart) {
				available = false
				break
			}
		}

		if available {
			availableSlots = append(availableSlots, slot)
		}
	}

	return availableSlots, nil
}
