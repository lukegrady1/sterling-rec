package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Dashboard summary response
type DashboardSummary struct {
	ActivePrograms   int          `json:"activePrograms"`
	UpcomingEvents7d int          `json:"upcomingEvents7d"`
	PendingBookings  int          `json:"pendingBookings"`
	RegistrationsMTD int          `json:"registrationsMTD"`
	Utilization7dPct float64      `json:"utilization7dPct"`
	Payments         PaymentsInfo `json:"payments"`
}

type PaymentsInfo struct {
	Enabled  bool    `json:"enabled"`
	GrossMTD float64 `json:"grossMTD"`
}

// Upcoming event response
type DashboardUpcomingEvent struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	StartsAt   time.Time `json:"startsAt"`
	EndsAt     time.Time `json:"endsAt"`
	Capacity   int       `json:"capacity"`
	Registered int       `json:"registered"`
	Location   string    `json:"location"`
}

// Recent booking response
type RecentBooking struct {
	ID             string    `json:"id"`
	CreatedAt      time.Time `json:"createdAt"`
	FacilityName   string    `json:"facilityName"`
	SlotStartsAt   time.Time `json:"slotStartsAt"`
	SlotEndsAt     time.Time `json:"slotEndsAt"`
	RequesterName  string    `json:"requesterName"`
	RequesterEmail string    `json:"requesterEmail"`
	Status         string    `json:"status"`
}

// Utilization series response
type UtilizationSeries struct {
	Series []UtilizationPoint `json:"series"`
}

type UtilizationPoint struct {
	WeekStart string  `json:"weekStart"`
	Pct       float64 `json:"pct"`
}

// Onboarding checklist
type OnboardingChecklist struct {
	LogoUploaded      bool      `json:"logoUploaded"`
	HomepagePublished bool      `json:"homepagePublished"`
	FirstProgram      bool      `json:"firstProgram"`
	FirstFacility     bool      `json:"firstFacility"`
	FirstBooking      bool      `json:"firstBooking"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// GetDashboardSummary returns aggregated KPIs for the dashboard
func (h *Handler) GetDashboardSummary(c *gin.Context) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	summary := DashboardSummary{
		Payments: PaymentsInfo{
			Enabled:  false,
			GrossMTD: 0,
		},
	}

	// Active programs count
	var activePrograms int
	err := h.db.QueryRow(
		`SELECT COUNT(*) FROM programs WHERE is_active = true`,
	).Scan(&activePrograms)
	if err == nil {
		summary.ActivePrograms = activePrograms
	}

	// Upcoming events (next 7 days)
	var upcomingEvents int
	err = h.db.QueryRow(
		`SELECT COUNT(*) FROM events WHERE starts_at >= $1 AND starts_at <= $2`,
		now, now.AddDate(0, 0, 7),
	).Scan(&upcomingEvents)
	if err == nil {
		summary.UpcomingEvents7d = upcomingEvents
	}

	// Pending bookings (Sterling doesn't have bookings table yet, return 0 for now)
	summary.PendingBookings = 0

	// Registrations MTD (month-to-date)
	var registrationsMTD int
	err = h.db.QueryRow(
		`SELECT COUNT(*) FROM registrations WHERE created_at >= $1`,
		monthStart,
	).Scan(&registrationsMTD)
	if err == nil {
		summary.RegistrationsMTD = registrationsMTD
	}

	// Facility utilization (7 days) - Sterling doesn't have facilities yet, return 0 for now
	summary.Utilization7dPct = 0.0

	c.JSON(http.StatusOK, summary)
}

// GetDashboardUpcomingEvents returns events in the next 7 days
func (h *Handler) GetDashboardUpcomingEvents(c *gin.Context) {
	now := time.Now()
	weekFromNow := now.AddDate(0, 0, 7)

	rows, err := h.db.Query(
		`SELECT
			e.id, e.title, e.starts_at, e.ends_at, e.location, e.capacity
		FROM events e
		WHERE e.starts_at >= $1
		AND e.starts_at <= $2
		AND e.is_active = true
		ORDER BY e.starts_at ASC
		LIMIT 10`,
		now, weekFromNow,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
		return
	}
	defer rows.Close()

	events := []DashboardUpcomingEvent{}
	for rows.Next() {
		var e DashboardUpcomingEvent
		var location *string
		var startsAt, endsAt *time.Time

		err := rows.Scan(&e.ID, &e.Title, &startsAt, &endsAt, &location, &e.Capacity)
		if err != nil {
			continue
		}

		if startsAt != nil {
			e.StartsAt = *startsAt
		}
		if endsAt != nil {
			e.EndsAt = *endsAt
		}
		if location != nil {
			e.Location = *location
		}

		// Count registered participants for this event
		var registered int
		h.db.QueryRow(
			`SELECT COUNT(*) FROM registrations WHERE parent_type = 'event' AND parent_id = $1 AND status = 'confirmed'`,
			e.ID,
		).Scan(&registered)
		e.Registered = registered

		events = append(events, e)
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// GetRecentBookings returns the most recent booking requests
func (h *Handler) GetRecentBookings(c *gin.Context) {
	// Sterling doesn't have bookings table yet, return empty array
	bookings := []RecentBooking{}
	c.JSON(http.StatusOK, gin.H{"bookings": bookings})
}

// GetUtilizationSeries returns facility utilization for the past 8 weeks
func (h *Handler) GetUtilizationSeries(c *gin.Context) {
	// Sterling doesn't have facilities yet, return empty series
	series := []UtilizationPoint{}

	// Generate 8 weeks of zero data
	now := time.Now()
	for i := 7; i >= 0; i-- {
		weekStart := now.AddDate(0, 0, -7*(i+1))
		series = append(series, UtilizationPoint{
			WeekStart: weekStart.Format("2006-01-02"),
			Pct:       0.0,
		})
	}

	c.JSON(http.StatusOK, UtilizationSeries{Series: series})
}

// GetOnboarding returns the onboarding checklist state
func (h *Handler) GetOnboarding(c *gin.Context) {
	checklist := OnboardingChecklist{
		UpdatedAt: time.Now(),
	}

	// Check first program
	var programCount int
	h.db.QueryRow(
		`SELECT COUNT(*) FROM programs`,
	).Scan(&programCount)
	checklist.FirstProgram = programCount > 0

	// Check first facility - Sterling doesn't have facilities yet
	checklist.FirstFacility = false

	// Check first booking - Sterling doesn't have bookings yet
	checklist.FirstBooking = false

	// Logo and homepage - not implemented yet
	checklist.LogoUploaded = false
	checklist.HomepagePublished = false

	c.JSON(http.StatusOK, checklist)
}
