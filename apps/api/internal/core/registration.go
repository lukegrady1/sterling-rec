package core

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"sterling-rec/api/internal/db"
)

type RegistrationService struct {
	db    *db.DB
	redis *redis.Client
}

func NewRegistrationService(database *db.DB, redisClient *redis.Client) *RegistrationService {
	return &RegistrationService{
		db:    database,
		redis: redisClient,
	}
}

// Register creates a registration with distributed locking
func (rs *RegistrationService) Register(ctx context.Context, req db.RegistrationRequest) (*db.RegistrationResult, error) {
	// Build lock key
	lockKey := rs.buildLockKey(req.ParentType, req.ParentID, req.SessionID)

	// Acquire distributed lock
	lock, err := rs.acquireLock(ctx, lockKey, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to acquire lock: %w", err)
	}
	defer rs.releaseLock(ctx, lockKey, lock)

	// Create registration with capacity check
	result, err := rs.db.CreateRegistration(req)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// CancelRegistration cancels a registration and promotes from waitlist
func (rs *RegistrationService) CancelRegistration(ctx context.Context, registrationID, participantID uuid.UUID) error {
	// Get registration to build lock key
	var parentType string
	var parentID uuid.UUID
	var sessionID *uuid.UUID

	err := rs.db.QueryRow(`
		SELECT parent_type, parent_id, session_id
		FROM registrations
		WHERE id = $1 AND participant_id = $2
	`, registrationID, participantID).Scan(&parentType, &parentID, &sessionID)
	if err != nil {
		return fmt.Errorf("registration not found: %w", err)
	}

	// Build lock key
	lockKey := rs.buildLockKey(parentType, parentID, sessionID)

	// Acquire distributed lock
	lock, err := rs.acquireLock(ctx, lockKey, 10*time.Second)
	if err != nil {
		return fmt.Errorf("failed to acquire lock: %w", err)
	}
	defer rs.releaseLock(ctx, lockKey, lock)

	// Cancel registration (this also promotes from waitlist)
	return rs.db.CancelRegistration(registrationID, participantID)
}

func (rs *RegistrationService) buildLockKey(parentType string, parentID uuid.UUID, sessionID *uuid.UUID) string {
	if sessionID != nil {
		return fmt.Sprintf("sterling:cap:%s:%s:%s", parentType, parentID.String(), sessionID.String())
	}
	return fmt.Sprintf("sterling:cap:%s:%s", parentType, parentID.String())
}

func (rs *RegistrationService) acquireLock(ctx context.Context, key string, ttl time.Duration) (string, error) {
	lockValue := uuid.New().String()

	// Try to set lock with NX (only if not exists)
	success, err := rs.redis.SetNX(ctx, key, lockValue, ttl).Result()
	if err != nil {
		return "", fmt.Errorf("redis error: %w", err)
	}

	if !success {
		return "", fmt.Errorf("lock already held")
	}

	return lockValue, nil
}

func (rs *RegistrationService) releaseLock(ctx context.Context, key, lockValue string) error {
	// Only delete if value matches (atomic check-and-delete)
	script := `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`
	_, err := rs.redis.Eval(ctx, script, []string{key}, lockValue).Result()
	return err
}
