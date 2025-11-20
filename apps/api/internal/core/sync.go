package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"

	"sterling-rec/api/internal/db"
)

type SyncClient struct {
	baseURL    string
	apiKey     string
	tenantSlug string
	httpClient *http.Client
	db         *db.DB
	enabled    bool
}

func NewSyncClient(database *db.DB) *SyncClient {
	enabled := os.Getenv("SYNC_ENABLED") == "true"

	return &SyncClient{
		baseURL:    os.Getenv("CENTRAL_PLATFORM_URL"),
		apiKey:     os.Getenv("CENTRAL_PLATFORM_API_KEY"),
		tenantSlug: os.Getenv("TENANT_SLUG"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		db:      database,
		enabled: enabled,
	}
}

// SyncEvent represents an event to be synced to the central platform
type SyncEvent struct {
	ID         int64
	EventType  string
	EntityType string
	EntityID   uuid.UUID
	Payload    map[string]interface{}
}

// RegistrationCreatedPayload for sync to central platform
type RegistrationCreatedPayload struct {
	TenantSlug    string    `json:"tenant_slug"`
	RegistrationID uuid.UUID `json:"registration_id"`
	ParentType    string    `json:"parent_type"`
	ParentID      uuid.UUID `json:"parent_id"`
	SessionID     *uuid.UUID `json:"session_id,omitempty"`
	ParticipantID uuid.UUID `json:"participant_id"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// RegistrationCancelledPayload for sync to central platform
type RegistrationCancelledPayload struct {
	TenantSlug     string    `json:"tenant_slug"`
	RegistrationID uuid.UUID `json:"registration_id"`
	CancelledAt    time.Time `json:"cancelled_at"`
}

// QueueRegistrationCreated queues a registration created event for sync
func (sc *SyncClient) QueueRegistrationCreated(ctx context.Context, result *db.RegistrationResult, req *db.RegistrationRequest) error {
	if !sc.enabled {
		return nil // Sync disabled
	}

	// Determine status based on whether waitlisted
	status := "confirmed"
	if result.IsWaitlisted {
		status = "waitlisted"
	}

	payload := map[string]interface{}{
		"tenant_slug":     sc.tenantSlug,
		"registration_id": result.Registration.ID,
		"parent_type":     req.ParentType,
		"parent_id":       req.ParentID,
		"session_id":      req.SessionID,
		"participant_id":  req.ParticipantID,
		"status":          status,
		"created_at":      time.Now(),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	_, err = sc.db.Exec(`
		INSERT INTO sync_events (event_type, entity_type, entity_id, payload, status, max_attempts)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, "REGISTRATION_CREATED", "registration", result.Registration.ID, payloadJSON, "pending", 5)

	return err
}

// QueueRegistrationCancelled queues a registration cancelled event for sync
func (sc *SyncClient) QueueRegistrationCancelled(ctx context.Context, registrationID uuid.UUID) error {
	if !sc.enabled {
		return nil // Sync disabled
	}

	payload := map[string]interface{}{
		"tenant_slug":     sc.tenantSlug,
		"registration_id": registrationID,
		"cancelled_at":    time.Now(),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	_, err = sc.db.Exec(`
		INSERT INTO sync_events (event_type, entity_type, entity_id, payload, status, max_attempts)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, "REGISTRATION_CANCELLED", "registration", registrationID, payloadJSON, "pending", 5)

	return err
}

// SyncRegistrationCreated syncs a registration created event to central platform
func (sc *SyncClient) SyncRegistrationCreated(ctx context.Context, payload map[string]interface{}) error {
	url := fmt.Sprintf("%s/api/sync/registrations", sc.baseURL)
	return sc.makeRequest(ctx, "POST", url, payload)
}

// SyncRegistrationCancelled syncs a registration cancelled event to central platform
func (sc *SyncClient) SyncRegistrationCancelled(ctx context.Context, payload map[string]interface{}) error {
	url := fmt.Sprintf("%s/api/sync/registrations/cancel", sc.baseURL)
	return sc.makeRequest(ctx, "POST", url, payload)
}

// makeRequest makes an HTTP request to the central platform
func (sc *SyncClient) makeRequest(ctx context.Context, method, url string, payload interface{}) error {
	var body io.Reader
	if payload != nil {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", sc.apiKey))
	req.Header.Set("X-Tenant-Slug", sc.tenantSlug)

	resp, err := sc.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sync request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// FetchPrograms fetches programs from central platform with caching
func (sc *SyncClient) FetchPrograms(ctx context.Context) ([]map[string]interface{}, error) {
	cacheKey := "central:programs"

	// Check cache first
	var cachedData []byte
	var expiresAt time.Time
	err := sc.db.QueryRow(`
		SELECT data, expires_at FROM central_data_cache
		WHERE cache_key = $1 AND expires_at > NOW()
	`, cacheKey).Scan(&cachedData, &expiresAt)

	if err == nil {
		var programs []map[string]interface{}
		if err := json.Unmarshal(cachedData, &programs); err == nil {
			return programs, nil
		}
	}

	// Cache miss or expired, fetch from central platform
	url := fmt.Sprintf("%s/api/public/programs", sc.baseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Tenant-Slug", sc.tenantSlug)

	resp, err := sc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("fetch failed with status %d", resp.StatusCode)
	}

	var programs []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&programs); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Cache the result (15 minute TTL)
	programsJSON, _ := json.Marshal(programs)
	_, _ = sc.db.Exec(`
		INSERT INTO central_data_cache (cache_key, data, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
		ON CONFLICT (cache_key) DO UPDATE
		SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at
	`, cacheKey, programsJSON)

	return programs, nil
}

// FetchEvents fetches events from central platform with caching
func (sc *SyncClient) FetchEvents(ctx context.Context) ([]map[string]interface{}, error) {
	cacheKey := "central:events"

	// Check cache first
	var cachedData []byte
	var expiresAt time.Time
	err := sc.db.QueryRow(`
		SELECT data, expires_at FROM central_data_cache
		WHERE cache_key = $1 AND expires_at > NOW()
	`, cacheKey).Scan(&cachedData, &expiresAt)

	if err == nil {
		var events []map[string]interface{}
		if err := json.Unmarshal(cachedData, &events); err == nil {
			return events, nil
		}
	}

	// Cache miss or expired, fetch from central platform
	url := fmt.Sprintf("%s/api/public/events", sc.baseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Tenant-Slug", sc.tenantSlug)

	resp, err := sc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("fetch failed with status %d", resp.StatusCode)
	}

	var events []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&events); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Cache the result (15 minute TTL)
	eventsJSON, _ := json.Marshal(events)
	_, _ = sc.db.Exec(`
		INSERT INTO central_data_cache (cache_key, data, expires_at)
		VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
		ON CONFLICT (cache_key) DO UPDATE
		SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at
	`, cacheKey, eventsJSON)

	return events, nil
}
