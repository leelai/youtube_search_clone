package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/worlds-search/backend/config"
	"github.com/worlds-search/backend/db"
	"github.com/worlds-search/backend/handlers"
	"github.com/worlds-search/backend/repositories"
	"github.com/worlds-search/backend/router"
	"github.com/worlds-search/backend/services"
)

func main() {
	log.Println("🚀 Starting Worlds Search Backend...")

	// Load configuration
	cfg := config.Load()
	log.Printf("📋 Config loaded: Port=%s", cfg.ServerPort)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to databases
	database, err := db.New(ctx, cfg.PostgresDSN, cfg.RedisAddr)
	if err != nil {
		log.Fatalf("❌ Failed to connect to databases: %v", err)
	}
	defer database.Close()

	// Initialize repositories
	worldsRepo := repositories.NewWorldsRepository(database.Pool)
	searchRepo := repositories.NewSearchRepository(database.Pool)
	logsRepo := repositories.NewLogsRepository(database.Pool, database.Redis)

	// Initialize services
	rankingService := services.NewRankingService(searchRepo, logsRepo)
	suggestionsService := services.NewSuggestionsService(worldsRepo, searchRepo, logsRepo, rankingService)
	searchService := services.NewSearchService(worldsRepo, searchRepo, logsRepo)
	compareService := services.NewCompareService(worldsRepo)

	// Initialize handlers
	searchHandler := handlers.NewSearchHandler(searchService, suggestionsService, compareService)
	worldsHandler := handlers.NewWorldsHandler(searchService)

	// Create router
	r := router.New(searchHandler, worldsHandler)

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("✅ Server listening on http://0.0.0.0:%s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	// Give outstanding requests 5 seconds to complete
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("❌ Server forced to shutdown: %v", err)
	}

	log.Println("👋 Server exited")
}
