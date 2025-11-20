package core

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
	textTemplate "text/template"
	"time"

	"sterling-rec/api/internal/db"
)

type EmailService struct {
	host     string
	port     string
	username string
	password string
	from     string
	db       *db.DB
}

func NewEmailService(database *db.DB) *EmailService {
	return &EmailService{
		host:     os.Getenv("SMTP_HOST"),
		port:     os.Getenv("SMTP_PORT"),
		username: os.Getenv("SMTP_USERNAME"),
		password: os.Getenv("SMTP_PASSWORD"),
		from:     os.Getenv("SMTP_FROM"),
		db:       database,
	}
}

func (es *EmailService) SendEmail(to, subject, bodyHTML, bodyText string) error {
	addr := fmt.Sprintf("%s:%s", es.host, es.port)

	// Construct email
	msg := []byte(
		"From: " + es.from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: multipart/alternative; boundary=boundary\r\n" +
		"\r\n" +
		"--boundary\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" +
		bodyText + "\r\n" +
		"--boundary\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" +
		bodyHTML + "\r\n" +
		"--boundary--\r\n",
	)

	var auth smtp.Auth
	if es.username != "" && es.password != "" {
		auth = smtp.PlainAuth("", es.username, es.password, es.host)
	}

	err := smtp.SendMail(addr, auth, es.from, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("Email sent to %s: %s", to, subject)
	return nil
}

func (es *EmailService) SendTemplatedEmail(to, templateKey string, data map[string]interface{}) error {
	// Get template from database
	var tmpl db.EmailTemplate
	err := es.db.QueryRow(`
		SELECT template_key, subject, body_html, body_text
		FROM email_templates
		WHERE template_key = $1
	`, templateKey).Scan(&tmpl.TemplateKey, &tmpl.Subject, &tmpl.BodyHTML, &tmpl.BodyText)
	if err != nil {
		return fmt.Errorf("failed to get email template: %w", err)
	}

	// Parse and execute subject template
	subjectTmpl, err := textTemplate.New("subject").Parse(tmpl.Subject)
	if err != nil {
		return fmt.Errorf("failed to parse subject template: %w", err)
	}
	var subjectBuf bytes.Buffer
	if err := subjectTmpl.Execute(&subjectBuf, data); err != nil {
		return fmt.Errorf("failed to execute subject template: %w", err)
	}

	// Parse and execute HTML template
	htmlTmpl, err := template.New("html").Parse(tmpl.BodyHTML)
	if err != nil {
		return fmt.Errorf("failed to parse HTML template: %w", err)
	}
	var htmlBuf bytes.Buffer
	if err := htmlTmpl.Execute(&htmlBuf, data); err != nil {
		return fmt.Errorf("failed to execute HTML template: %w", err)
	}

	// Parse and execute text template
	textTmpl, err := textTemplate.New("text").Parse(tmpl.BodyText)
	if err != nil {
		return fmt.Errorf("failed to parse text template: %w", err)
	}
	var textBuf bytes.Buffer
	if err := textTmpl.Execute(&textBuf, data); err != nil {
		return fmt.Errorf("failed to execute text template: %w", err)
	}

	return es.SendEmail(to, subjectBuf.String(), htmlBuf.String(), textBuf.String())
}

// ProcessNotificationQueue processes pending notifications
func (es *EmailService) ProcessNotificationQueue() error {
	rows, err := es.db.Query(`
		SELECT id, type, payload, attempts, max_attempts
		FROM notification_queue
		WHERE attempts < max_attempts
			AND (not_before_ts IS NULL OR not_before_ts <= $1)
		ORDER BY created_at ASC
		LIMIT 100
		FOR UPDATE SKIP LOCKED
	`, time.Now())
	if err != nil {
		return fmt.Errorf("failed to query notification queue: %w", err)
	}
	defer rows.Close()

	var processed int
	for rows.Next() {
		var notif db.NotificationQueue
		err := rows.Scan(&notif.ID, &notif.Type, &notif.Payload, &notif.Attempts, &notif.MaxAttempts)
		if err != nil {
			log.Printf("Failed to scan notification: %v", err)
			continue
		}

		err = es.processNotification(&notif)
		if err != nil {
			log.Printf("Failed to process notification %d: %v", notif.ID, err)
			// Update with error
			es.db.Exec(`
				UPDATE notification_queue
				SET attempts = attempts + 1, last_error = $1
				WHERE id = $2
			`, err.Error(), notif.ID)
		} else {
			// Delete successful notification
			es.db.Exec(`DELETE FROM notification_queue WHERE id = $1`, notif.ID)
			processed++
		}
	}

	if processed > 0 {
		log.Printf("Processed %d notifications", processed)
	}

	return nil
}

func (es *EmailService) processNotification(notif *db.NotificationQueue) error {
	// Parse payload
	var payload map[string]interface{}
	if err := json.Unmarshal(notif.Payload, &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	// Get participant and user email
	participantID := payload["participant_id"].(string)
	var userEmail, participantName string
	err := es.db.QueryRow(`
		SELECT u.email, p.first_name || ' ' || p.last_name
		FROM participants p
		JOIN households h ON h.id = p.household_id
		JOIN users u ON u.id = h.owner_user_id
		WHERE p.id = $1
	`, participantID).Scan(&userEmail, &participantName)
	if err != nil {
		return fmt.Errorf("failed to get user email: %w", err)
	}

	// Get program/event info
	parentType := payload["parent_type"].(string)
	parentID := payload["parent_id"].(string)

	var programTitle, location string
	var sessionDate *time.Time

	if parentType == "program" {
		err = es.db.QueryRow(`
			SELECT title, location
			FROM programs
			WHERE id = $1
		`, parentID).Scan(&programTitle, &location)
	} else {
		err = es.db.QueryRow(`
			SELECT title, location, starts_at
			FROM events
			WHERE id = $1
		`, parentID).Scan(&programTitle, &location, &sessionDate)
	}
	if err != nil {
		return fmt.Errorf("failed to get program/event info: %w", err)
	}

	// Check for session date
	if sessionIDStr, ok := payload["session_id"].(string); ok && sessionIDStr != "" {
		es.db.QueryRow(`
			SELECT starts_at
			FROM sessions
			WHERE id = $1
		`, sessionIDStr).Scan(&sessionDate)
	}

	// Build template data
	templateData := map[string]interface{}{
		"ParticipantName": participantName,
		"ProgramTitle":    programTitle,
		"Location":        location,
	}
	if sessionDate != nil {
		templateData["SessionDate"] = sessionDate.Format("Monday, January 2, 2006 at 3:04 PM")
	}
	if position, ok := payload["position"]; ok {
		templateData["Position"] = position
	}

	// Determine template key
	templateKey := notif.Type
	if notif.Type == "REMINDER" {
		// Could be 72h or 24h
		templateKey = "REMINDER_24H" // Default
	}

	return es.SendTemplatedEmail(userEmail, templateKey, templateData)
}
