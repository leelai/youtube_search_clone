package models

import (
	"time"

	"github.com/google/uuid"
)

// World represents a searchable content entity (like a YouTube video)
type World struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
}

// WorldCard is a simplified version for search results
type WorldCard struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"` // May be truncated
	CreatedAt   time.Time `json:"createdAt"`
}
