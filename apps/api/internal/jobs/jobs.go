package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"sterling-rec/api/internal/core"
	"sterling-rec/api/internal/db"
)

type JobManager struct {
	db           *db.DB
	emailService *core.EmailService
	ctx          context.Context
	cancel       context.CancelFunc
}

func NewJobManager(database *db.DB, emailService *core.EmailService) *JobManager {
	ctx, cancel := context.WithCancel(context.Background())
	return &JobManager{
		db:           database,
		emailService: emailService,
		ctx:          ctx,
		cancel:       cancel,
	}
}

func (jm *JobManager) Start() {
	log.Println("Starting job manager...")

	// Email worker - process every 30 seconds
	go jm.runPeriodic("email-worker", 30*time.Second, jm.processEmailQueue)

	// Reminder worker - check every hour
	go jm.runPeriodic("reminder-worker", 1*time.Hour, jm.scheduleReminders)

	log.Println("Job manager started")
}

func (jm *JobManager) Stop() {
	log.Println("Stopping job manager...")
	jm.cancel()
}

func (jm *JobManager) runPeriodic(name string, interval time.Duration, fn func() error) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Run immediately on start
	if err := fn(); err != nil {
		log.Printf("[%s] Error: %v", name, err)
	}

	for {
		select {
		case <-jm.ctx.Done():
			log.Printf("[%s] Stopped", name)
			return
		case <-ticker.C:
			if err := fn(); err != nil {
				log.Printf("[%s] Error: %v", name, err)
			}
		}
	}
}

func (jm *JobManager) processEmailQueue() error {
	return jm.emailService.ProcessNotificationQueue()
}

func (jm *JobManager) scheduleReminders() error {
	now := time.Now()
	_ = now.Add(72 * time.Hour) // window72h
	_ = now.Add(24 * time.Hour) // window24h

	// Find sessions starting in ~72 hours (between 71-73 hours from now)
	err := jm.scheduleRemindersForWindow(
		now.Add(71*time.Hour),
		now.Add(73*time.Hour),
		"REMINDER_72H",
	)
	if err != nil {
		log.Printf("Failed to schedule 72h reminders: %v", err)
	}

	// Find sessions starting in ~24 hours (between 23-25 hours from now)
	err = jm.scheduleRemindersForWindow(
		now.Add(23*time.Hour),
		now.Add(25*time.Hour),
		"REMINDER_24H",
	)
	if err != nil {
		log.Printf("Failed to schedule 24h reminders: %v", err)
	}

	// Find events starting in ~72 hours
	err = jm.scheduleEventRemindersForWindow(
		now.Add(71*time.Hour),
		now.Add(73*time.Hour),
		"REMINDER_72H",
	)
	if err != nil {
		log.Printf("Failed to schedule event 72h reminders: %v", err)
	}

	// Find events starting in ~24 hours
	err = jm.scheduleEventRemindersForWindow(
		now.Add(23*time.Hour),
		now.Add(25*time.Hour),
		"REMINDER_24H",
	)
	if err != nil {
		log.Printf("Failed to schedule event 24h reminders: %v", err)
	}

	return nil
}

func (jm *JobManager) scheduleRemindersForWindow(startTime, endTime time.Time, reminderType string) error {
	// Find sessions in time window
	rows, err := jm.db.Query(`
		SELECT s.id, s.parent_type, s.parent_id, s.starts_at
		FROM sessions s
		WHERE s.is_active = true
			AND s.starts_at >= $1
			AND s.starts_at < $2
	`, startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to query sessions: %w", err)
	}
	defer rows.Close()

	var count int
	for rows.Next() {
		var sessionID string
		var parentType, parentID string
		var startsAt time.Time

		err := rows.Scan(&sessionID, &parentType, &parentID, &startsAt)
		if err != nil {
			log.Printf("Failed to scan session: %v", err)
			continue
		}

		// Get confirmed registrations for this session
		regRows, err := jm.db.Query(`
			SELECT participant_id
			FROM registrations
			WHERE parent_type = $1 AND parent_id = $2 AND session_id = $3 AND status = 'confirmed'
		`, parentType, parentID, sessionID)
		if err != nil {
			log.Printf("Failed to query registrations: %v", err)
			continue
		}

		for regRows.Next() {
			var participantID string
			if err := regRows.Scan(&participantID); err != nil {
				log.Printf("Failed to scan participant: %v", err)
				continue
			}

			// Check if reminder already queued
			var exists bool
			err = jm.db.QueryRow(`
				SELECT EXISTS(
					SELECT 1 FROM notification_queue
					WHERE type = $1
						AND payload->>'participant_id' = $2
						AND payload->>'session_id' = $3
				)
			`, reminderType, participantID, sessionID).Scan(&exists)
			if err != nil || exists {
				continue
			}

			// Queue reminder
			payload := map[string]interface{}{
				"parent_type":    parentType,
				"parent_id":      parentID,
				"session_id":     sessionID,
				"participant_id": participantID,
			}
			payloadJSON, _ := json.Marshal(payload)

			_, err = jm.db.Exec(`
				INSERT INTO notification_queue (type, payload, not_before_ts)
				VALUES ($1, $2, $3)
			`, reminderType, payloadJSON, startsAt.Add(-72*time.Hour))
			if err != nil {
				log.Printf("Failed to queue reminder: %v", err)
				continue
			}

			count++
		}
		regRows.Close()
	}

	if count > 0 {
		log.Printf("Scheduled %d %s session reminders", count, reminderType)
	}

	return nil
}

func (jm *JobManager) scheduleEventRemindersForWindow(startTime, endTime time.Time, reminderType string) error {
	// Find events in time window
	rows, err := jm.db.Query(`
		SELECT id, starts_at
		FROM events
		WHERE is_active = true
			AND starts_at >= $1
			AND starts_at < $2
	`, startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var count int
	for rows.Next() {
		var eventID string
		var startsAt time.Time

		err := rows.Scan(&eventID, &startsAt)
		if err != nil {
			log.Printf("Failed to scan event: %v", err)
			continue
		}

		// Get confirmed registrations for this event
		regRows, err := jm.db.Query(`
			SELECT participant_id
			FROM registrations
			WHERE parent_type = 'event' AND parent_id = $1 AND status = 'confirmed'
		`, eventID)
		if err != nil {
			log.Printf("Failed to query registrations: %v", err)
			continue
		}

		for regRows.Next() {
			var participantID string
			if err := regRows.Scan(&participantID); err != nil {
				log.Printf("Failed to scan participant: %v", err)
				continue
			}

			// Check if reminder already queued
			var exists bool
			err = jm.db.QueryRow(`
				SELECT EXISTS(
					SELECT 1 FROM notification_queue
					WHERE type = $1
						AND payload->>'participant_id' = $2
						AND payload->>'parent_id' = $3
				)
			`, reminderType, participantID, eventID).Scan(&exists)
			if err != nil || exists {
				continue
			}

			// Queue reminder
			payload := map[string]interface{}{
				"parent_type":    "event",
				"parent_id":      eventID,
				"participant_id": participantID,
			}
			payloadJSON, _ := json.Marshal(payload)

			_, err = jm.db.Exec(`
				INSERT INTO notification_queue (type, payload, not_before_ts)
				VALUES ($1, $2, $3)
			`, reminderType, payloadJSON, startsAt.Add(-72*time.Hour))
			if err != nil {
				log.Printf("Failed to queue reminder: %v", err)
				continue
			}

			count++
		}
		regRows.Close()
	}

	if count > 0 {
		log.Printf("Scheduled %d %s event reminders", count, reminderType)
	}

	return nil
}
