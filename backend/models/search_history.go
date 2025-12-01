package models

import (
	"time"

	"github.com/google/uuid"
)

// SearchHistory stores finalized search inputs
type SearchHistory struct {
	ID                int64      `json:"id"`
	UserID            uuid.UUID  `json:"userId"`
	Keyword           string     `json:"keyword"`           // raw user input
	NormalizedKeyword string     `json:"normalizedKeyword"` // lowercased, trimmed
	HasResult         *bool      `json:"hasResult"`
	SelectedWorldID   *uuid.UUID `json:"selectedWorldId"`
	Device            string     `json:"device"`
	ClientAppVersion  string     `json:"clientAppVersion"`
	CreatedAt         time.Time  `json:"createdAt"`
}

// SearchInput is the request body for logging a search
type SearchInput struct {
	UserID           string `json:"userId" binding:"required"`
	Keyword          string `json:"keyword" binding:"required"`
	Device           string `json:"device"`
	ClientAppVersion string `json:"clientAppVersion"`
}
