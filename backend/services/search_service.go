package services

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/worlds-search/backend/models"
	"github.com/worlds-search/backend/repositories"
	"github.com/worlds-search/backend/utils"
)

// SearchService handles search operations
type SearchService struct {
	worldsRepo *repositories.WorldsRepository
	searchRepo *repositories.SearchRepository
	logsRepo   *repositories.LogsRepository
}

// NewSearchService creates a new SearchService
func NewSearchService(
	worldsRepo *repositories.WorldsRepository,
	searchRepo *repositories.SearchRepository,
	logsRepo *repositories.LogsRepository,
) *SearchService {
	return &SearchService{
		worldsRepo: worldsRepo,
		searchRepo: searchRepo,
		logsRepo:   logsRepo,
	}
}

// SearchResults is the response for search results
type SearchResults struct {
	Keyword   string             `json:"keyword"`
	Worlds    []models.WorldCard `json:"worlds"`
	ElapsedMs int64              `json:"elapsedMs"` // 後端處理時間（毫秒）
}

// LogSearchInput logs a search input and updates trending
func (s *SearchService) LogSearchInput(ctx context.Context, input *models.SearchInput) error {
	normalizedKeyword := utils.NormalizeKeyword(input.Keyword)

	userID, err := uuid.Parse(input.UserID)
	if err != nil {
		return err
	}

	// Insert into search_history
	history := &models.SearchHistory{
		UserID:            userID,
		Keyword:           input.Keyword,
		NormalizedKeyword: normalizedKeyword,
		Device:            input.Device,
		ClientAppVersion:  input.ClientAppVersion,
	}

	if err := s.searchRepo.InsertHistory(ctx, history); err != nil {
		return err
	}

	// Increment trending score in Redis
	if err := s.logsRepo.IncrementTrending(ctx, normalizedKeyword); err != nil {
		// Log error but don't fail the request
		// In production, you'd use proper logging
	}

	return nil
}

// LogClick logs a click on a suggestion
func (s *SearchService) LogClick(ctx context.Context, click *models.ClickInput) error {
	normalizedKeyword := utils.NormalizeKeyword(click.Keyword)

	var userID *uuid.UUID
	if click.UserID != "" {
		parsed, err := uuid.Parse(click.UserID)
		if err == nil {
			userID = &parsed
		}
	}

	var worldID *uuid.UUID
	if click.WorldID != nil && *click.WorldID != "" {
		parsed, err := uuid.Parse(*click.WorldID)
		if err == nil {
			worldID = &parsed
		}
	}

	// Insert click record
	if err := s.logsRepo.InsertClick(
		ctx,
		userID,
		click.Keyword,
		normalizedKeyword,
		click.Suggestion,
		click.SuggestionType,
		worldID,
		click.Position,
	); err != nil {
		return err
	}

	// If it's a world click, update the latest search history
	if click.SuggestionType == models.SuggestionTypeWorld && userID != nil && worldID != nil {
		_ = s.searchRepo.UpdateHistoryResult(ctx, *userID, *worldID)
	}

	return nil
}

// SearchWorlds searches for worlds matching the keyword
func (s *SearchService) SearchWorlds(ctx context.Context, keyword string, userID *uuid.UUID) (*SearchResults, error) {
	startTime := time.Now()

	normalizedKeyword := utils.NormalizeKeyword(keyword)

	if normalizedKeyword == "" {
		return &SearchResults{
			Keyword:   keyword,
			Worlds:    []models.WorldCard{},
			ElapsedMs: time.Since(startTime).Milliseconds(),
		}, nil
	}

	// Use combined search (prefix + fuzzy + contains)
	results, err := s.worldsRepo.SearchCombined(ctx, normalizedKeyword, 20)
	if err != nil {
		return nil, err
	}

	// Convert to WorldCard format
	worlds := make([]models.WorldCard, len(results))
	for i, ws := range results {
		worlds[i] = models.WorldCard{
			ID:          ws.World.ID,
			Title:       ws.World.Title,
			Description: utils.TruncateString(ws.World.Description, 200),
			CreatedAt:   ws.World.CreatedAt,
		}
	}

	return &SearchResults{
		Keyword:   keyword,
		Worlds:    worlds,
		ElapsedMs: time.Since(startTime).Milliseconds(),
	}, nil
}

// GetWorld fetches a single world by ID
func (s *SearchService) GetWorld(ctx context.Context, id uuid.UUID) (*models.World, error) {
	return s.worldsRepo.GetByID(ctx, id)
}

// GetTrending returns the top trending keywords
func (s *SearchService) GetTrending(ctx context.Context, limit int) ([]string, error) {
	trending, err := s.logsRepo.GetTopTrending(ctx, limit)
	if err != nil {
		return nil, err
	}

	keywords := make([]string, len(trending))
	for i, tk := range trending {
		keywords[i] = tk.Keyword
	}

	return keywords, nil
}
