package core

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"sterling-rec/api/internal/db"
)

type FacilitiesService struct {
	db    *db.DB
	redis *redis.Client
}

func NewFacilitiesService(database *db.DB, redisClient *redis.Client) *FacilitiesService {
	return &FacilitiesService{
		db:    database,
		redis: redisClient,
	}
}

// BookingRequest represents a booking request
type BookingRequest struct {
	FacilityID     uuid.UUID
	UserID         uuid.UUID
	HouseholdID    *uuid.UUID
	ParticipantIDs []uuid.UUID
	StartTime      time.Time
	EndTime        time.Time
	Notes          *string
	IdempotencyKey *string
}

// CreateBooking creates a new facility booking with distributed locking
func (fs *FacilitiesService) CreateBooking(ctx context.Context, req BookingRequest) (*db.FacilityBooking, error) {
	// Check for idempotency key first (before acquiring lock)
	if req.IdempotencyKey != nil && *req.IdempotencyKey != "" {
		existing, err := fs.db.GetBookingByIdempotencyKey(*req.IdempotencyKey)
		if err != nil {
			return nil, fmt.Errorf("failed to check idempotency key: %w", err)
		}
		if existing != nil {
			// Return existing booking (idempotent response)
			return existing, nil
		}
	}

	// Build lock key for this facility and time range
	lockKey := fs.buildBookingLockKey(req.FacilityID, req.StartTime, req.EndTime)

	// Acquire distributed lock to prevent race conditions
	lock, err := fs.acquireLock(ctx, lockKey, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to acquire lock (another booking may be in progress): %w", err)
	}
	defer fs.releaseLock(ctx, lockKey, lock)

	// Double-check idempotency key after acquiring lock
	if req.IdempotencyKey != nil && *req.IdempotencyKey != "" {
		existing, err := fs.db.GetBookingByIdempotencyKey(*req.IdempotencyKey)
		if err != nil {
			return nil, fmt.Errorf("failed to check idempotency key: %w", err)
		}
		if existing != nil {
			return existing, nil
		}
	}

	// Check availability (includes all validation)
	if err := fs.db.CheckAvailability(req.FacilityID, req.StartTime, req.EndTime); err != nil {
		return nil, fmt.Errorf("slot not available: %w", err)
	}

	// Validate cancellation cutoff for this booking
	facility, err := fs.db.GetFacilityByID(req.FacilityID)
	if err != nil {
		return nil, fmt.Errorf("failed to get facility: %w", err)
	}
	if facility == nil {
		return nil, fmt.Errorf("facility not found")
	}

	// Create the booking
	booking := &db.FacilityBooking{
		FacilityID:     req.FacilityID,
		UserID:         req.UserID,
		HouseholdID:    req.HouseholdID,
		ParticipantIDs: req.ParticipantIDs,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		Status:         "confirmed",
		Notes:          req.Notes,
		IdempotencyKey: req.IdempotencyKey,
	}

	createdBooking, err := fs.db.CreateBooking(booking)
	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	return createdBooking, nil
}

// CancelBooking cancels a booking with validation
func (fs *FacilitiesService) CancelBooking(ctx context.Context, bookingID, userID uuid.UUID, reason *string) error {
	// Get the booking
	booking, err := fs.db.GetBooking(bookingID)
	if err != nil {
		return fmt.Errorf("failed to get booking: %w", err)
	}
	if booking == nil {
		return fmt.Errorf("booking not found")
	}

	// Verify user owns this booking
	if booking.UserID != userID {
		return fmt.Errorf("you do not have permission to cancel this booking")
	}

	// Check if already cancelled
	if booking.Status == "cancelled" {
		return fmt.Errorf("booking is already cancelled")
	}

	// Get facility to check cancellation cutoff
	facility, err := fs.db.GetFacilityByID(booking.FacilityID)
	if err != nil {
		return fmt.Errorf("failed to get facility: %w", err)
	}
	if facility == nil {
		return fmt.Errorf("facility not found")
	}

	// Check cancellation cutoff
	cutoffTime := booking.StartTime.Add(-time.Duration(facility.CancellationCutoffHours) * time.Hour)
	if time.Now().After(cutoffTime) {
		return fmt.Errorf("cancellation deadline has passed (must cancel at least %d hours before booking)",
			facility.CancellationCutoffHours)
	}

	// Build lock key for this facility and time range
	lockKey := fs.buildBookingLockKey(booking.FacilityID, booking.StartTime, booking.EndTime)

	// Acquire distributed lock
	lock, err := fs.acquireLock(ctx, lockKey, 10*time.Second)
	if err != nil {
		return fmt.Errorf("failed to acquire lock: %w", err)
	}
	defer fs.releaseLock(ctx, lockKey, lock)

	// Cancel the booking
	return fs.db.CancelBooking(bookingID, userID, reason)
}

// GetUserBookings retrieves all bookings for a user
func (fs *FacilitiesService) GetUserBookings(ctx context.Context, userID uuid.UUID, includeHistory bool) ([]db.FacilityBooking, error) {
	status := ""
	if !includeHistory {
		status = "confirmed"
	}

	bookings, err := fs.db.GetBookings(nil, &userID, nil, nil, status)
	if err != nil {
		return nil, fmt.Errorf("failed to get bookings: %w", err)
	}

	// Load facility details for each booking
	for i := range bookings {
		facility, err := fs.db.GetFacilityByID(bookings[i].FacilityID)
		if err != nil {
			return nil, fmt.Errorf("failed to get facility: %w", err)
		}
		bookings[i].Facility = facility
	}

	return bookings, nil
}

// GetFacilityBookings retrieves all bookings for a facility (admin)
func (fs *FacilitiesService) GetFacilityBookings(ctx context.Context, facilityID uuid.UUID, startTime, endTime *time.Time) ([]db.FacilityBooking, error) {
	status := "confirmed"
	bookings, err := fs.db.GetBookings(&facilityID, nil, startTime, endTime, status)
	if err != nil {
		return nil, fmt.Errorf("failed to get bookings: %w", err)
	}

	// Load user details for each booking
	for i := range bookings {
		var user db.User
		err := fs.db.QueryRow(`
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

	return bookings, nil
}

// GetAvailableSlots returns available time slots for a facility
func (fs *FacilitiesService) GetAvailableSlots(ctx context.Context, facilityID uuid.UUID, startDate, endDate time.Time, duration int) ([]db.AvailabilitySlot, error) {
	query := db.AvailabilityQuery{
		FacilityID: facilityID,
		StartDate:  startDate,
		EndDate:    endDate,
		Duration:   duration,
	}

	return fs.db.GetAvailableSlots(query)
}

// buildBookingLockKey creates a lock key for a facility booking
func (fs *FacilitiesService) buildBookingLockKey(facilityID uuid.UUID, startTime, endTime time.Time) string {
	// Use facility ID and time range for lock key
	// This ensures only one booking can be created for overlapping time slots
	return fmt.Sprintf("sterling:facility:%s:%d:%d",
		facilityID.String(),
		startTime.Unix(),
		endTime.Unix(),
	)
}

// acquireLock acquires a distributed lock using Redis
func (fs *FacilitiesService) acquireLock(ctx context.Context, key string, ttl time.Duration) (string, error) {
	lockValue := uuid.New().String()

	// Try to set lock with NX (only if not exists)
	success, err := fs.redis.SetNX(ctx, key, lockValue, ttl).Result()
	if err != nil {
		return "", fmt.Errorf("redis error: %w", err)
	}

	if !success {
		return "", fmt.Errorf("lock already held")
	}

	return lockValue, nil
}

// releaseLock releases a distributed lock
func (fs *FacilitiesService) releaseLock(ctx context.Context, key, lockValue string) error {
	// Use Lua script to ensure we only delete our own lock
	script := `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`

	_, err := fs.redis.Eval(ctx, script, []string{key}, lockValue).Result()
	return err
}
