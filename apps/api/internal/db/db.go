package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func NewDB() (*DB, error) {
	host := os.Getenv("PG_HOST")
	port := os.Getenv("PG_PORT")
	user := os.Getenv("PG_USER")
	password := os.Getenv("PG_PASSWORD")
	dbname := os.Getenv("PG_DB")
	sslmode := os.Getenv("PG_SSLMODE")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	sqlDB, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	log.Println("Database connection established")

	return &DB{sqlDB}, nil
}

func (db *DB) RunMigrations(migrationsPath string) error {
	// Create migrations tracking table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get list of migration files
	files, err := filepath.Glob(filepath.Join(migrationsPath, "*.sql"))
	if err != nil {
		return fmt.Errorf("failed to read migration files: %w", err)
	}

	sort.Strings(files)

	for _, file := range files {
		version := filepath.Base(file)

		// Check if already applied
		var exists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration status: %w", err)
		}

		if exists {
			log.Printf("Migration %s already applied, skipping", version)
			continue
		}

		// Read and execute migration
		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}

		_, err = tx.Exec(string(content))
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", version, err)
		}

		_, err = tx.Exec("INSERT INTO schema_migrations (version) VALUES ($1)", version)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration: %w", err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration: %w", err)
		}

		log.Printf("Applied migration: %s", version)
	}

	return nil
}

func (db *DB) Seed() error {
	// Check if we already have data
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM programs").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing data: %w", err)
	}

	if count > 0 {
		log.Println("Database already seeded, skipping")
		return nil
	}

	log.Println("Seeding database with sample data...")

	// Create sample programs
	programs := []struct {
		slug, title, description, location string
		capacity, ageMin, ageMax           int
		startDate, endDate                 string
	}{
		{
			"summer-basketball",
			"Summer Basketball Camp",
			"Learn basketball fundamentals in a fun, supportive environment. All skill levels welcome!",
			"Sterling Community Center Gym",
			20,
			8,
			14,
			"2025-07-01",
			"2025-08-15",
		},
		{
			"youth-soccer",
			"Youth Soccer League",
			"Join our recreational soccer league for kids. Emphasis on teamwork and skill development.",
			"Sterling Recreation Fields",
			30,
			6,
			12,
			"2025-06-15",
			"2025-09-01",
		},
		{
			"arts-crafts",
			"Arts & Crafts Workshop",
			"Creative workshop for young artists. New project each week!",
			"Community Center Room 101",
			15,
			5,
			10,
			"2025-07-08",
			"2025-08-12",
		},
	}

	for _, p := range programs {
		_, err := db.Exec(`
			INSERT INTO programs (slug, title, description, location, capacity, age_min, age_max, start_date, end_date, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
		`, p.slug, p.title, p.description, p.location, p.capacity, p.ageMin, p.ageMax, p.startDate, p.endDate)
		if err != nil {
			return fmt.Errorf("failed to seed program %s: %w", p.slug, err)
		}
	}

	// Create sample events
	events := []struct {
		slug, title, description, location string
		capacity                           int
		startsAt, endsAt                   string
	}{
		{
			"summer-kickoff",
			"Summer Kickoff Celebration",
			"Join us for games, food, and fun as we kick off summer!",
			"Sterling Town Park",
			100,
			"2025-06-21 14:00:00-04",
			"2025-06-21 18:00:00-04",
		},
		{
			"movie-night",
			"Family Movie Night",
			"Bring a blanket and enjoy a family-friendly movie under the stars.",
			"Sterling Recreation Center",
			75,
			"2025-07-15 20:00:00-04",
			"2025-07-15 22:30:00-04",
		},
	}

	for _, e := range events {
		_, err := db.Exec(`
			INSERT INTO events (slug, title, description, location, capacity, starts_at, ends_at, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true)
		`, e.slug, e.title, e.description, e.location, e.capacity, e.startsAt, e.endsAt)
		if err != nil {
			return fmt.Errorf("failed to seed event %s: %w", e.slug, err)
		}
	}

	log.Println("Database seeded successfully")
	return nil
}

// Helper to build WHERE clauses safely
func BuildWhereClause(conditions map[string]interface{}) (string, []interface{}) {
	if len(conditions) == 0 {
		return "", nil
	}

	var clauses []string
	var args []interface{}
	i := 1

	for col, val := range conditions {
		clauses = append(clauses, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}
