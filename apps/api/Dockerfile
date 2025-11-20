FROM golang:1.22-alpine AS build

WORKDIR /src

# Install build dependencies
RUN apk add --no-cache build-base git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
WORKDIR /src/cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /out/api .

# Final stage
FROM alpine:3.20

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy binary and migrations
COPY --from=build /out/api /app/api
COPY migrations /app/migrations

# Set environment
ENV API_PORT=8000
ENV MIGRATIONS_PATH=/app/migrations

EXPOSE 8000

CMD ["/app/api"]
