# Sterling Recreation Public Site

A standalone public-facing website for Sterling Recreation with online program/event registration, capacity management, waitlist functionality, and automated email notifications.

## Features

- **Programs & Events**: Browse and register for recreational programs and community events
- **Facilities Booking**: Book fields, courts, and rooms with real-time availability checking
- **Online Registration**: Secure registration with capacity enforcement and automatic waitlist management
- **Email Notifications**: Automated confirmations, waitlist updates, and event reminders (72h/24h)
- **Household Management**: Create participants and manage registrations for family members
- **Double-Booking Prevention**: Redis distributed locking ensures no conflicting reservations
- **Mobile-First Design**: Responsive, accessible UI built with Tailwind CSS and shadcn/ui
- **Standalone Database**: Isolated PostgreSQL database for Sterling Recreation data

## Tech Stack

### Backend
- **Go 1.22** with Gin framework
- **PostgreSQL 15** for data persistence
- **Redis 7** for distributed locks and job queues
- **SMTP** email integration (MailHog for development)

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **TanStack Query** for server state management
- **React Router** for navigation
- **shadcn/ui** component library
- **Tailwind CSS** for styling

### Infrastructure
- **Docker** & **Docker Compose** for containerization
- **Nginx** for production serving of frontend assets

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Make (optional, for convenience commands)

### Quick Start

1. **Clone the repository**
   ```bash
   cd sterling-rec
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update any necessary values. The defaults work for local development.

   **Port Conflicts?** If you have other applications running, see [QUICK_START_CUSTOM_PORTS.md](QUICK_START_CUSTOM_PORTS.md) for easy port configuration.

3. **Start all services**
   ```bash
   make up
   ```

   Or without Make:
   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build
   ```

4. **Run database migrations**
   ```bash
   make migrate
   ```

5. **Seed sample data (optional)**
   ```bash
   make seed
   ```

6. **Access the application**
   - **Web App**: http://localhost:5173
   - **API**: http://localhost:8000/api
   - **MailHog UI**: http://localhost:8025 (view sent emails)

### Available Commands

```bash
make help      # Show all available commands
make up        # Start all services
make down      # Stop all services
make logs      # View service logs
make migrate   # Run database migrations
make seed      # Seed sample data
make restart   # Restart services
make clean     # Stop and remove all data
```

## Project Structure

```
sterling-rec/
├── apps/
│   ├── api/                    # Go backend
│   │   ├── cmd/api/           # Main entry point
│   │   ├── internal/
│   │   │   ├── db/            # Database layer
│   │   │   ├── http/          # HTTP handlers & middleware
│   │   │   ├── core/          # Business logic services
│   │   │   └── jobs/          # Background jobs
│   │   └── migrations/        # SQL migration files
│   └── web/                   # React frontend
│       ├── src/
│       │   ├── components/    # Reusable components
│       │   ├── pages/         # Page components
│       │   ├── lib/           # API client, hooks, utilities
│       │   └── styles/        # Global styles
│       └── Dockerfile
├── deploy/
│   └── docker-compose.yml     # Container orchestration
├── .env.example               # Environment template
└── Makefile                   # Convenience commands
```

## Development

### Running Backend Locally

```bash
cd apps/api
cp ../../.env.example ../../.env
# Update .env with local values (PG_HOST=localhost, REDIS_ADDR=localhost:6379)

# Install dependencies
go mod download

# Run migrations
go run cmd/api/main.go -migrate

# Start server
go run cmd/api/main.go
```

### Running Frontend Locally

```bash
cd apps/web

# Install dependencies
npm install

# Start dev server
npm run dev
```

Set `VITE_API_URL=http://localhost:8000/api` in `.env` for local API connection.

## API Endpoints

### Public Routes
- `POST /api/public/register` - Create user account
- `POST /api/public/login` - Login
- `GET /api/programs` - List active programs
- `GET /api/programs/:slug` - Get program details
- `GET /api/events` - List active events
- `GET /api/events/:slug` - Get event details
- `GET /api/facilities` - List available facilities
- `GET /api/facilities/:slug` - Get facility details
- `GET /api/facilities/:slug/availability` - Check available time slots

### Protected Routes (requires authentication)
- `GET /api/me` - Get current user, household, participants
- `POST /api/participants` - Add participant to household
- `POST /api/registrations` - Create registration
- `POST /api/registrations/cancel` - Cancel registration
- `POST /api/bookings` - Create facility booking
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/logout` - Logout

### Admin Routes (requires admin authentication)
- `GET /admin/facilities` - List all facilities
- `POST /admin/facilities` - Create facility
- `PUT /admin/facilities/:id` - Update facility
- `DELETE /admin/facilities/:id` - Delete facility
- `POST /admin/facilities/:id/availability` - Add availability window
- `DELETE /admin/facilities/:id/availability/:windowId` - Remove availability window
- `POST /admin/facilities/:id/closures` - Add closure period
- `GET /admin/bookings/export` - Export bookings as CSV

## Database Schema

The application uses the following main tables:

- **users** - Public user accounts
- **households** - Family/household groupings
- **participants** - Individuals who can be registered
- **programs** - Recurring programs
- **events** - One-time events
- **sessions** - Specific occurrences of programs
- **registrations** - Program/event registrations
- **waitlist_positions** - Waitlist management
- **facilities** - Bookable facilities (fields, courts, rooms)
- **availability_windows** - Recurring weekly availability schedules
- **facility_closures** - Ad-hoc closure periods
- **facility_bookings** - Facility reservations
- **notification_queue** - Email notification queue
- **email_templates** - Email template storage

See migration files in [apps/api/migrations/](apps/api/migrations/) for the complete schema.

## Background Jobs

The API runs background jobs for:

1. **Email Worker** (every 30s) - Processes notification queue and sends emails
2. **Reminder Scheduler** (hourly) - Schedules 72h and 24h reminder emails
3. **Waitlist Promotion** - Automatically promotes from waitlist when spots open

## Deployment

### Production Checklist

1. **Update `.env` for production**
   - Set strong `JWT_SECRET`
   - Configure real SMTP settings
   - Update `APP_ORIGIN` and `SITE_URL`
   - Set `COOKIE_SECURE=true`
   - Use production database credentials

2. **Build and deploy with Docker**
   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build
   ```

3. **Run migrations**
   ```bash
   docker compose -f deploy/docker-compose.yml exec api /app/api -migrate
   ```

4. **Configure reverse proxy (optional)**
   - Use Nginx or Traefik to handle SSL/TLS
   - Route `/api/*` to backend service
   - Route all other traffic to frontend service

## Security

- Passwords hashed with bcrypt
- JWT-based authentication with HTTP-only cookies
- Rate limiting on auth endpoints
- CORS configured for specific origins
- SQL injection prevention via parameterized queries
- XSS protection via React's built-in escaping

## Additional Documentation

- **[PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)** - Complete guide to configuring custom ports
- **[QUICK_START_CUSTOM_PORTS.md](QUICK_START_CUSTOM_PORTS.md)** - Quick reference for port configuration
- **[SYNC_IMPLEMENTATION.md](SYNC_IMPLEMENTATION.md)** - Central platform sync integration guide
- **[claude.md](claude.md)** - Original project specification

## License

Copyright © 2025 Sterling Recreation. All rights reserved.

## Support

For questions or issues, contact the Sterling Recreation office:
- **Email**: info@sterlingrec.org
- **Phone**: (555) 123-4567
