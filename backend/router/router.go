package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/worlds-search/backend/handlers"
)

// New creates and configures the Gin router
func New(
	searchHandler *handlers.SearchHandler,
	worldsHandler *handlers.WorldsHandler,
) *gin.Engine {
	r := gin.Default()

	// Configure CORS for frontend access
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173", "http://frontend:3000", "*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Search endpoints
		search := api.Group("/search")
		{
			// POST /api/search/input - Log search input and update trending
			search.POST("/input", searchHandler.LogInput)

			// GET /api/search/suggestions - Get autocomplete suggestions
			search.GET("/suggestions", searchHandler.GetSuggestions)

			// POST /api/search/click - Log click on a suggestion
			search.POST("/click", searchHandler.LogClick)

			// GET /api/search/results - Get search results (worlds list)
			search.GET("/results", searchHandler.GetResults)

			// GET /api/search/trending - Get trending keywords
			search.GET("/trending", searchHandler.GetTrending)

			// GET /api/search/compare - Compare TRGM vs BIGRAM search (Search Modes Lab)
			search.GET("/compare", searchHandler.HandleSearchCompare)
		}

		// Worlds endpoints
		worlds := api.Group("/worlds")
		{
			// GET /api/worlds/:id - Get world details
			worlds.GET("/:id", worldsHandler.GetWorld)
		}
	}

	return r
}
