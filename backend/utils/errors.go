package utils

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Common errors
var (
	ErrNotFound     = errors.New("resource not found")
	ErrInvalidInput = errors.New("invalid input")
	ErrInternal     = errors.New("internal server error")
)

// ErrorResponse is the standard error response format
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// RespondError sends an error response
func RespondError(c *gin.Context, statusCode int, err error, message string) {
	c.JSON(statusCode, ErrorResponse{
		Error:   err.Error(),
		Message: message,
	})
}

// RespondNotFound sends a 404 response
func RespondNotFound(c *gin.Context, message string) {
	RespondError(c, http.StatusNotFound, ErrNotFound, message)
}

// RespondBadRequest sends a 400 response
func RespondBadRequest(c *gin.Context, message string) {
	RespondError(c, http.StatusBadRequest, ErrInvalidInput, message)
}

// RespondInternalError sends a 500 response
func RespondInternalError(c *gin.Context, message string) {
	RespondError(c, http.StatusInternalServerError, ErrInternal, message)
}

