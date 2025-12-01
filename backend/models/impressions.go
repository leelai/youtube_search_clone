package models

import (
	"time"

	"github.com/google/uuid"
)

// SearchImpression represents a suggestion shown to the user
type SearchImpression struct {
	ID                int64      `json:"id"`
	UserID            *uuid.UUID `json:"userId"`
	Keyword           string     `json:"keyword"`           // original input at suggestion time
	NormalizedKeyword string     `json:"normalizedKeyword"`
	Suggestion        string     `json:"suggestion"`     // what was shown
	SuggestionType    string     `json:"suggestionType"` // "keyword" | "world"
	WorldID           *uuid.UUID `json:"worldId"`        // if type = world
	Position          int        `json:"position"`       // rank index in suggestion list
	CreatedAt         time.Time  `json:"createdAt"`
}
