package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/worlds-search/backend/services"
	"github.com/worlds-search/backend/utils"
)

// WorldsHandler handles world-related HTTP requests
type WorldsHandler struct {
	searchService *services.SearchService
}

// NewWorldsHandler creates a new WorldsHandler
func NewWorldsHandler(searchService *services.SearchService) *WorldsHandler {
	return &WorldsHandler{
		searchService: searchService,
	}
}

// ============================================================
// GET /api/worlds/:id
// ============================================================
// Returns world details for the world detail page.
// Response:
//   {
//     "id": "uuid",
//     "title": "Garmin 840 北高實測 World",
//     "description": "Longer description...",
//     "createdAt": "2025-01-01T00:00:00Z"
//   }
func (h *WorldsHandler) GetWorld(c *gin.Context) {
	idStr := c.Param("id")
	
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.RespondBadRequest(c, "Invalid world ID format")
		return
	}

	world, err := h.searchService.GetWorld(c.Request.Context(), id)
	if err != nil {
		if err == pgx.ErrNoRows {
			utils.RespondNotFound(c, "World not found")
			return
		}
		utils.RespondInternalError(c, "Failed to get world: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, world)
}
