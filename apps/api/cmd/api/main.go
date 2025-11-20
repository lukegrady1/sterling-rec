package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"sterling-rec/api/internal/core"
	"sterling-rec/api/internal/db"
	"sterling-rec/api/internal/http"
	"sterling-rec/api/internal/jobs"
)

func main() {
	// Parse flags
	migrate := flag.Bool("migrate", false, "Run database migrations")
	seed := flag.Bool("seed", false, "Seed database with sample data")
	flag.Parse()

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	database, err := db.NewDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations if requested
	if *migrate {
		migrationsPath := os.Getenv("MIGRATIONS_PATH")
		if migrationsPath == "" {
			migrationsPath = "/app/migrations"
			// Check if running locally
			if _, err := os.Stat("migrations"); err == nil {
				migrationsPath = "migrations"
			}
		}

		absPath, _ := filepath.Abs(migrationsPath)
		log.Printf("Running migrations from: %s", absPath)

		if err := database.RunMigrations(migrationsPath); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		log.Println("Migrations completed successfully")
		return
	}

	// Seed database if requested
	if *seed {
		if err := database.Seed(); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
		log.Println("Database seeded successfully")
		return
	}

	// Connect to Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Redis connection established")

	// Initialize services
	emailService := core.NewEmailService(database)
	regService := core.NewRegistrationService(database, redisClient)
	facilitiesService := core.NewFacilitiesService(database, redisClient)

	// Initialize job manager
	jobManager := jobs.NewJobManager(database, emailService)
	jobManager.Start()
	defer jobManager.Stop()

	// Initialize HTTP handler
	handler := http.NewHandler(database, regService, facilitiesService)

	// Setup Gin
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// CORS configuration
	corsConfig := cors.Config{
		AllowOrigins:     []string{os.Getenv("APP_ORIGIN")},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Health and version endpoints
	router.GET("/health", handler.Health)
	router.GET("/api/version", handler.Version)

	// Public routes (no auth required)
	public := router.Group("/api/public")
	{
		// Rate limit auth endpoints
		authLimited := public.Group("")
		authLimited.Use(http.RateLimitMiddleware(5, 15*time.Minute))
		{
			authLimited.POST("/register", handler.Register)
			authLimited.POST("/login", handler.Login)
		}
	}

	// Public data routes
	api := router.Group("/api")
	{
		api.GET("/programs", handler.GetPrograms)
		api.GET("/programs/:slug", handler.GetProgram)
		api.GET("/events", handler.GetEvents)
		api.GET("/events/:slug", handler.GetEvent)

		// Facilities (public)
		api.GET("/facilities", handler.GetFacilities)
		api.GET("/facilities/:slug", handler.GetFacilityBySlug)
		api.GET("/facilities/:slug/availability", handler.GetAvailability)
	}

	// Protected routes (auth required)
	protected := router.Group("/api")
	protected.Use(http.AuthMiddleware())
	{
		protected.POST("/logout", handler.Logout)
		protected.GET("/me", handler.GetMe)

		// Family/Household management
		protected.GET("/household", handler.GetHousehold)
		protected.PUT("/household", handler.UpdateHousehold)

		// Participant management
		protected.GET("/participants", handler.GetParticipants)
		protected.POST("/participants", handler.CreateParticipantEnhanced)
		protected.PUT("/participants/:id", handler.UpdateParticipantEnhanced)
		protected.DELETE("/participants/:id", handler.DeleteParticipantEnhanced)
		protected.GET("/participants/:id/eligibility", handler.GetParticipantEligibility)
		protected.POST("/participants/:id/waivers", handler.AcceptWaiver)

		// Registration
		protected.POST("/registrations", handler.CreateRegistration)
		protected.POST("/registrations/cancel", handler.CancelRegistration)

		// Facility bookings (authenticated)
		protected.POST("/bookings", handler.CreateBooking)
		protected.GET("/bookings", handler.GetMyBookings)
		protected.POST("/bookings/:id/cancel", handler.CancelBooking)
	}

	// Admin routes (auth + admin required)
	admin := router.Group("/api/admin")
	admin.Use(http.AuthMiddleware())
	admin.Use(handler.AdminOnly())
	{
		// Dashboard
		admin.GET("/dashboard/summary", handler.GetDashboardSummary)
		admin.GET("/dashboard/upcoming-events", handler.GetDashboardUpcomingEvents)
		admin.GET("/dashboard/recent-bookings", handler.GetRecentBookings)
		admin.GET("/dashboard/utilization-series", handler.GetUtilizationSeries)
		admin.GET("/onboarding", handler.GetOnboarding)

		// Programs
		admin.POST("/programs", handler.AdminCreateProgram)
		admin.PUT("/programs/:id", handler.AdminUpdateProgram)
		admin.DELETE("/programs/:id", handler.AdminDeleteProgram)

		// Events
		admin.POST("/events", handler.AdminCreateEvent)
		admin.PUT("/events/:id", handler.AdminUpdateEvent)
		admin.DELETE("/events/:id", handler.AdminDeleteEvent)

		// Registrations
		admin.GET("/registrations", handler.AdminGetRegistrations)
		admin.GET("/program-registrations", handler.AdminGetProgramRegistrations)
		admin.PUT("/program-registrations/:id/status", handler.AdminUpdateRegistrationStatus)

		// Facilities (admin)
		admin.GET("/facilities", handler.AdminGetAllFacilities)
		admin.POST("/facilities", handler.AdminCreateFacility)
		admin.PUT("/facilities/:id", handler.AdminUpdateFacility)
		admin.DELETE("/facilities/:id", handler.AdminDeleteFacility)

		// Availability windows
		admin.POST("/facilities/:id/availability", handler.AdminCreateAvailabilityWindow)
		admin.DELETE("/facilities/:id/availability/:window_id", handler.AdminDeleteAvailabilityWindow)

		// Closures
		admin.GET("/facilities/:id/closures", handler.AdminGetClosures)
		admin.POST("/facilities/:id/closures", handler.AdminCreateClosure)
		admin.DELETE("/facilities/:id/closures/:closure_id", handler.AdminDeleteClosure)

		// Bookings (admin)
		admin.GET("/facilities/:id/bookings", handler.AdminGetFacilityBookings)
		admin.GET("/bookings/export", handler.AdminExportBookings)
	}

	// Start server
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Starting server on port %s...", port)

	// Graceful shutdown
	go func() {
		if err := router.Run(":" + port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
}
