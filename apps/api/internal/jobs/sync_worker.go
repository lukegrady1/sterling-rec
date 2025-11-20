package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"strconv"
	"time"

	"sterling-rec/api/internal/core"
	"sterling-rec/api/internal/db"
)

type SyncWorker struct {
	db         *db.DB
	syncClient *core.SyncClient
	interval   time.Duration
	stopChan   chan bool
}

func NewSyncWorker(database *db.DB, syncClient *core.SyncClient) *SyncWorker {
	return &SyncWorker{
		db:         database,
		syncClient: syncClient,
		interval:   30 * time.Second, // Process sync queue every 30 seconds
		stopChan:   make(chan bool),
	}
}

func (sw *SyncWorker) Start() {
	log.Println("Starting sync worker...")
	go sw.run()
}

func (sw *SyncWorker) Stop() {
	log.Println("Stopping sync worker...")
	sw.stopChan <- true
}

func (sw *SyncWorker) run() {
	ticker := time.NewTicker(sw.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			sw.processSyncQueue()
		case <-sw.stopChan:
			return
		}
	}
}

func (sw *SyncWorker) processSyncQueue() {
	ctx := context.Background()

	// Get pending sync events that are ready to be retried
	rows, err := sw.db.Query(`
		SELECT id, event_type, entity_type, entity_id, payload, attempts, max_attempts
		FROM sync_events
		WHERE status IN ('pending', 'retrying')
		AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		ORDER BY created_at ASC
		LIMIT 100
	`)
	if err != nil {
		log.Printf("Error querying sync events: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var eventType, entityType string
		var entityID string
		var payloadJSON []byte
		var attempts, maxAttempts int

		if err := rows.Scan(&id, &eventType, &entityType, &entityID, &payloadJSON, &attempts, &maxAttempts); err != nil {
			log.Printf("Error scanning sync event: %v", err)
			continue
		}

		// Parse payload
		var payload map[string]interface{}
		if err := json.Unmarshal(payloadJSON, &payload); err != nil {
			log.Printf("Error unmarshaling payload for event %d: %v", id, err)
			sw.markFailed(id, "Invalid payload JSON")
			continue
		}

		// Process the event
		sw.processSyncEvent(ctx, id, eventType, payload, attempts, maxAttempts)
	}
}

func (sw *SyncWorker) processSyncEvent(ctx context.Context, id int64, eventType string, payload map[string]interface{}, attempts, maxAttempts int) {
	log.Printf("Processing sync event %d (type: %s, attempt: %d/%d)", id, eventType, attempts+1, maxAttempts)

	// Increment attempts
	attempts++

	var err error
	switch eventType {
	case "REGISTRATION_CREATED":
		err = sw.syncClient.SyncRegistrationCreated(ctx, payload)
	case "REGISTRATION_CANCELLED":
		err = sw.syncClient.SyncRegistrationCancelled(ctx, payload)
	default:
		sw.markFailed(id, fmt.Sprintf("Unknown event type: %s", eventType))
		return
	}

	if err != nil {
		log.Printf("Sync event %d failed: %v", id, err)

		// Check if we should retry
		if attempts >= maxAttempts {
			sw.markFailed(id, err.Error())
			sw.logSyncEvent(id, "ERROR", fmt.Sprintf("Max attempts reached: %v", err), nil)
		} else {
			// Calculate exponential backoff
			nextRetry := sw.calculateNextRetry(attempts)
			sw.markRetrying(id, attempts, err.Error(), nextRetry)
			sw.logSyncEvent(id, "WARN", fmt.Sprintf("Retry scheduled for %v: %v", nextRetry, err), nil)
		}
	} else {
		// Success
		sw.markSuccess(id)
		sw.logSyncEvent(id, "INFO", "Successfully synced to central platform", nil)
		log.Printf("Sync event %d completed successfully", id)
	}
}

func (sw *SyncWorker) calculateNextRetry(attempts int) time.Time {
	// Get initial delay from env or default to 5 seconds
	initialDelayStr := os.Getenv("SYNC_RETRY_INITIAL_DELAY_SECONDS")
	initialDelay := 5
	if initialDelayStr != "" {
		if parsed, err := strconv.Atoi(initialDelayStr); err == nil {
			initialDelay = parsed
		}
	}

	// Exponential backoff: initialDelay * 2^(attempts-1)
	// attempts=1: 5s, attempts=2: 10s, attempts=3: 20s, attempts=4: 40s, attempts=5: 80s
	delaySeconds := float64(initialDelay) * math.Pow(2, float64(attempts-1))

	// Cap at 5 minutes
	if delaySeconds > 300 {
		delaySeconds = 300
	}

	return time.Now().Add(time.Duration(delaySeconds) * time.Second)
}

func (sw *SyncWorker) markSuccess(id int64) {
	_, err := sw.db.Exec(`
		UPDATE sync_events
		SET status = 'success', synced_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		log.Printf("Error marking sync event %d as success: %v", id, err)
	}
}

func (sw *SyncWorker) markRetrying(id int64, attempts int, errorMsg string, nextRetry time.Time) {
	_, err := sw.db.Exec(`
		UPDATE sync_events
		SET status = 'retrying', attempts = $2, last_error = $3, next_retry_at = $4, updated_at = NOW()
		WHERE id = $1
	`, id, attempts, errorMsg, nextRetry)
	if err != nil {
		log.Printf("Error marking sync event %d as retrying: %v", id, err)
	}
}

func (sw *SyncWorker) markFailed(id int64, errorMsg string) {
	_, err := sw.db.Exec(`
		UPDATE sync_events
		SET status = 'failed', last_error = $2, updated_at = NOW()
		WHERE id = $1
	`, id, errorMsg)
	if err != nil {
		log.Printf("Error marking sync event %d as failed: %v", id, err)
	}
}

func (sw *SyncWorker) logSyncEvent(syncEventID int64, level, message string, details map[string]interface{}) {
	var detailsJSON []byte
	if details != nil {
		detailsJSON, _ = json.Marshal(details)
	}

	_, err := sw.db.Exec(`
		INSERT INTO sync_logs (sync_event_id, log_level, message, details)
		VALUES ($1, $2, $3, $4)
	`, syncEventID, level, message, detailsJSON)

	if err != nil {
		log.Printf("Error logging sync event %d: %v", syncEventID, err)
	}
}

// CleanupOldSyncEvents removes old successful sync events (keep for 30 days)
func (sw *SyncWorker) CleanupOldSyncEvents() error {
	result, err := sw.db.Exec(`
		DELETE FROM sync_events
		WHERE status = 'success'
		AND synced_at < NOW() - INTERVAL '30 days'
	`)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d old sync events", rowsAffected)
	}

	return nil
}

// CleanupExpiredCache removes expired cache entries
func (sw *SyncWorker) CleanupExpiredCache() error {
	result, err := sw.db.Exec(`
		DELETE FROM central_data_cache
		WHERE expires_at < NOW()
	`)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d expired cache entries", rowsAffected)
	}

	return nil
}
