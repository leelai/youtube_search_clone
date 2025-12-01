package models

import (
	"time"

	"github.com/google/uuid"
)

// SearchClick represents a user click on a suggestion
type SearchClick struct {
	ID                int64      `json:"id"`
	UserID            *uuid.UUID `json:"userId"`
	Keyword           string     `json:"keyword"`           // prefix user had when suggestions were shown
	NormalizedKeyword string     `json:"normalizedKeyword"`
	ClickedSuggestion string     `json:"clickedSuggestion"` // text of clicked suggestion
	SuggestionType    string     `json:"suggestionType"`    // "keyword" | "world"
	WorldID           *uuid.UUID `json:"worldId"`           // if click was on a world suggestion
	Position          *int       `json:"position"`          // position in suggestion dropdown
	CreatedAt         time.Time  `json:"createdAt"`
}

// ClickInput is the request body for logging a click
type ClickInput struct {
	UserID         string  `json:"userId"`
	Keyword        string  `json:"keyword" binding:"required"`
	Suggestion     string  `json:"suggestion" binding:"required"`
	SuggestionType string  `json:"suggestionType" binding:"required"` // "keyword" | "world"
	WorldID        *string `json:"worldId"`
	Position       *int    `json:"position"`
}
