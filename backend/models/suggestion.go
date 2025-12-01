package models

import "github.com/google/uuid"

// SuggestionType constants
const (
	SuggestionTypeKeyword = "keyword"
	SuggestionTypeWorld   = "world"
)

// SuggestionSource constants
const (
	SourceUserHistory = "user_history"
	SourceTrending    = "trending"
	SourceWorldTitle  = "world_title"
	SourceFuzzy       = "fuzzy"
)

// Suggestion represents a single autocomplete suggestion
type Suggestion struct {
	Type     string            `json:"type"`     // "keyword" | "world"
	Text     string            `json:"text"`     // display text
	Source   string            `json:"source"`   // "user_history" | "trending" | "world_title" | "fuzzy"
	WorldID  *uuid.UUID        `json:"worldId"`  // only for world suggestions
	Position int               `json:"position"` // rank in suggestion list
	Scores   *SuggestionScores `json:"scores"`   // score breakdown for debugging
}

// SuggestionScores holds the breakdown of how a suggestion was scored
type SuggestionScores struct {
	PrefixScore   float64 `json:"prefixScore"`
	PersonalScore float64 `json:"personalScore"`
	TrendingScore float64 `json:"trendingScore"`
	FuzzyScore    float64 `json:"fuzzyScore"`
	CTRScore      float64 `json:"ctrScore"`
	FinalScore    float64 `json:"finalScore"`
}

// SuggestionsResponse is the API response for suggestions
type SuggestionsResponse struct {
	Keyword     string       `json:"keyword"`
	Suggestions []Suggestion `json:"suggestions"`
}

// SuggestionCandidate is an internal struct for ranking
type SuggestionCandidate struct {
	Type       string
	Text       string
	Source     string
	WorldID    *uuid.UUID
	Similarity float64 // pg_trgm similarity (0-1)
}
