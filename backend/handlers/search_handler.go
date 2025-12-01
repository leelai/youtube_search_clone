package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/worlds-search/backend/models"
	"github.com/worlds-search/backend/services"
	"github.com/worlds-search/backend/utils"
)

// SearchHandler handles search-related HTTP requests
type SearchHandler struct {
	searchService      *services.SearchService
	suggestionsService *services.SuggestionsService
	compareService     *services.CompareService
}

// NewSearchHandler creates a new SearchHandler
func NewSearchHandler(
	searchService *services.SearchService,
	suggestionsService *services.SuggestionsService,
	compareService *services.CompareService,
) *SearchHandler {
	return &SearchHandler{
		searchService:      searchService,
		suggestionsService: suggestionsService,
		compareService:     compareService,
	}
}

// ============================================================
// POST /api/search/input
// ============================================================
// Logs a search input and updates trending.
// Called when user commits a search (presses Enter or clicks a keyword suggestion).
func (h *SearchHandler) LogInput(c *gin.Context) {
	var input models.SearchInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	if err := h.searchService.LogSearchInput(c.Request.Context(), &input); err != nil {
		utils.RespondInternalError(c, "Failed to log search input: "+err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// ============================================================
// GET /api/search/suggestions
// ============================================================
// Returns ranked autocomplete suggestions while typing.
// Query params:
//   - keyword (required): the current input text
//   - userId (optional): user ID for personal scoring
//
// Response:
//
//	{
//	  "keyword": "ga",
//	  "suggestions": [
//	    {
//	      "type": "keyword",
//	      "text": "garmin 北高",
//	      "source": "user_history",
//	      "worldId": null,
//	      "position": 0,
//	      "scores": { ... }
//	    },
//	    {
//	      "type": "world",
//	      "text": "Garmin 840 北高實測 World",
//	      "source": "world_title",
//	      "worldId": "uuid-111",
//	      "position": 1,
//	      "scores": { ... }
//	    }
//	  ]
//	}
func (h *SearchHandler) GetSuggestions(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		c.JSON(http.StatusOK, models.SuggestionsResponse{
			Keyword:     "",
			Suggestions: []models.Suggestion{},
		})
		return
	}

	var userID *uuid.UUID
	if userIDStr := c.Query("userId"); userIDStr != "" {
		parsed, err := uuid.Parse(userIDStr)
		if err == nil {
			userID = &parsed
		}
	}

	response, err := h.suggestionsService.GetSuggestions(c.Request.Context(), keyword, userID)
	if err != nil {
		utils.RespondInternalError(c, "Failed to get suggestions: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// ============================================================
// POST /api/search/click
// ============================================================
// Logs a user click on a suggestion.
// Request body:
//
//	{
//	  "userId": "uuid-string",
//	  "keyword": "original prefix when suggestions were shown",
//	  "suggestion": "text of clicked suggestion",
//	  "suggestionType": "keyword" | "world",
//	  "worldId": "uuid-or-null",
//	  "position": 0
//	}
//
// Behavior:
//   - For keyword clicks: logs the click, user navigates to /search?query=<suggestion>
//   - For world clicks: logs the click, updates search history, user navigates to /worlds/<worldId>
func (h *SearchHandler) LogClick(c *gin.Context) {
	var click models.ClickInput
	if err := c.ShouldBindJSON(&click); err != nil {
		utils.RespondBadRequest(c, "Invalid request body: "+err.Error())
		return
	}

	// Validate suggestion type
	if click.SuggestionType != models.SuggestionTypeKeyword && click.SuggestionType != models.SuggestionTypeWorld {
		utils.RespondBadRequest(c, "suggestionType must be 'keyword' or 'world'")
		return
	}

	if err := h.searchService.LogClick(c.Request.Context(), &click); err != nil {
		utils.RespondInternalError(c, "Failed to log click: "+err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// ============================================================
// GET /api/search/results
// ============================================================
// Returns a list of worlds for a given keyword (search result page).
// Query params:
//   - keyword (required): the search query
//   - userId (optional): user ID for personalization
//
// Response:
//
//	{
//	  "keyword": "garmin 北高",
//	  "worlds": [
//	    {
//	      "id": "uuid",
//	      "title": "Garmin 840 北高實測 World",
//	      "description": "short snippet...",
//	      "createdAt": "2025-01-01T00:00:00Z"
//	    }
//	  ]
//	}
func (h *SearchHandler) GetResults(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		c.JSON(http.StatusOK, services.SearchResults{
			Keyword: "",
			Worlds:  []models.WorldCard{},
		})
		return
	}

	var userID *uuid.UUID
	if userIDStr := c.Query("userId"); userIDStr != "" {
		parsed, err := uuid.Parse(userIDStr)
		if err == nil {
			userID = &parsed
		}
	}

	results, err := h.searchService.SearchWorlds(c.Request.Context(), keyword, userID)
	if err != nil {
		utils.RespondInternalError(c, "Failed to search worlds: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, results)
}

// ============================================================
// GET /api/search/trending
// ============================================================
// Returns top trending keywords from Redis ZSET.
// Query params:
//   - limit (optional): number of keywords to return (default: 10)
//
// Response:
//
//	{
//	  "keywords": ["garmin", "giant", "postgresql", ...]
//	}
func (h *SearchHandler) GetTrending(c *gin.Context) {
	limit := 10 // Default limit

	results, err := h.searchService.GetTrending(c.Request.Context(), limit)
	if err != nil {
		utils.RespondInternalError(c, "Failed to get trending: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"keywords": results,
	})
}

// ============================================================
// GET /api/search/compare
// ============================================================
// Returns search results comparing TRGM vs BIGRAM algorithms.
// This is for the Search Modes Lab page.
// Query params:
//   - keyword (required): the search query
//   - mode (required): "trgm" | "bigram" | "both"
//
// Response:
//
//	{
//	  "keyword": "garmin",
//	  "mode": "both",
//	  "trgmResults": [
//	    {
//	      "id": "uuid",
//	      "title": "Garmin 840 北高實測 World",
//	      "description": "...",
//	      "score": 0.83
//	    }
//	  ],
//	  "bigramResults": [
//	    {
//	      "id": "uuid",
//	      "title": "Garmin Edge 設定教學",
//	      "description": "...",
//	      "score": 0.91
//	    }
//	  ]
//	}
func (h *SearchHandler) HandleSearchCompare(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		c.JSON(http.StatusOK, services.SearchCompareResponse{
			Keyword:       "",
			Mode:          services.SearchModeTrgm,
			TrgmResults:   []services.CompareWorldResult{},
			BigramResults: []services.CompareWorldResult{},
		})
		return
	}

	modeStr := c.Query("mode")
	var mode services.SearchMode
	switch modeStr {
	case "trgm":
		mode = services.SearchModeTrgm
	case "bigram":
		mode = services.SearchModeBigram
	case "both":
		mode = services.SearchModeBoth
	default:
		utils.RespondBadRequest(c, "mode must be 'trgm', 'bigram', or 'both'")
		return
	}

	const limit = 20
	response, err := h.compareService.SearchCompare(c.Request.Context(), keyword, mode, limit)
	if err != nil {
		utils.RespondInternalError(c, "Failed to compare search: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}
