package http

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT from cookie
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("auth_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Next()
	}
}

// GenerateToken creates a JWT token for a user
func GenerateToken(userID uuid.UUID, email string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 7)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// SetAuthCookie sets the authentication cookie
func SetAuthCookie(c *gin.Context, token string) {
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"

	c.SetCookie(
		"auth_token",
		token,
		60*60*24*7, // 7 days
		"/",
		cookieDomain,
		cookieSecure,
		true, // httpOnly
	)
}

// ClearAuthCookie removes the authentication cookie
func ClearAuthCookie(c *gin.Context) {
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	c.SetCookie(
		"auth_token",
		"",
		-1,
		"/",
		cookieDomain,
		false,
		true,
	)
}

// RateLimitMiddleware provides simple in-memory rate limiting
func RateLimitMiddleware(maxRequests int, window time.Duration) gin.HandlerFunc {
	type client struct {
		requests []time.Time
	}
	clients := make(map[string]*client)

	return func(c *gin.Context) {
		ip := c.ClientIP()

		now := time.Now()
		if clients[ip] == nil {
			clients[ip] = &client{requests: []time.Time{}}
		}

		// Remove old requests outside window
		var validRequests []time.Time
		for _, reqTime := range clients[ip].requests {
			if now.Sub(reqTime) < window {
				validRequests = append(validRequests, reqTime)
			}
		}
		clients[ip].requests = validRequests

		// Check if over limit
		if len(clients[ip].requests) >= maxRequests {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
			c.Abort()
			return
		}

		// Add this request
		clients[ip].requests = append(clients[ip].requests, now)
		c.Next()
	}
}

// ErrorHandler middleware for consistent error responses
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there were any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last()

			// Log the error
			c.Error(err)

			// Return appropriate status
			status := c.Writer.Status()
			if status == http.StatusOK {
				status = http.StatusInternalServerError
			}

			c.JSON(status, gin.H{
				"error": err.Error(),
			})
		}
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, false
	}
	return userID.(uuid.UUID), true
}

// ValidateContentType ensures JSON content type for POST/PUT
func ValidateContentType() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			contentType := c.GetHeader("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Content-Type must be application/json"})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}
