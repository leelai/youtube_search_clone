package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/worlds-search/backend/models"
	"github.com/worlds-search/backend/repositories"
	"github.com/worlds-search/backend/utils"
)

// SuggestionsService handles autocomplete suggestions
type SuggestionsService struct {
	worldsRepo  *repositories.WorldsRepository
	searchRepo  *repositories.SearchRepository
	logsRepo    *repositories.LogsRepository
	rankingService *RankingService
}

// NewSuggestionsService creates a new SuggestionsService
func NewSuggestionsService(
	worldsRepo *repositories.WorldsRepository,
	searchRepo *repositories.SearchRepository,
	logsRepo *repositories.LogsRepository,
	rankingService *RankingService,
) *SuggestionsService {
	return &SuggestionsService{
		worldsRepo:     worldsRepo,
		searchRepo:     searchRepo,
		logsRepo:       logsRepo,
		rankingService: rankingService,
	}
}

// GetSuggestions returns ranked autocomplete suggestions for a keyword
// This is the main entry point for the suggestions API
func (s *SuggestionsService) GetSuggestions(ctx context.Context, keyword string, userID *uuid.UUID) (*models.SuggestionsResponse, error) {
	normalizedKeyword := utils.NormalizeKeyword(keyword)
	
	if normalizedKeyword == "" {
		return &models.SuggestionsResponse{
			Keyword:     keyword,
			Suggestions: []models.Suggestion{},
		}, nil
	}

	// ============================================================
	// Step 1: Gather candidates from all sources
	// ============================================================
	candidates := make([]models.SuggestionCandidate, 0, 50)

	// A) Keyword candidates from personal history
	if userID != nil {
		historyKeywords, err := s.searchRepo.GetUserHistoryKeywords(ctx, *userID, normalizedKeyword, 10)
		if err == nil {
			for _, kf := range historyKeywords {
				candidates = append(candidates, models.SuggestionCandidate{
					Type:   models.SuggestionTypeKeyword,
					Text:   kf.Keyword,
					Source: models.SourceUserHistory,
				})
			}
		}
	}

	// B) Keyword candidates from global trending (Redis ZSET)
	trendingKeywords, err := s.logsRepo.GetTrendingKeywords(ctx, normalizedKeyword, 10)
	trendingMap := make(map[string]float64)
	if err == nil {
		for _, tk := range trendingKeywords {
			trendingMap[tk.Keyword] = tk.Score
			candidates = append(candidates, models.SuggestionCandidate{
				Type:   models.SuggestionTypeKeyword,
				Text:   tk.Keyword,
				Source: models.SourceTrending,
			})
		}
	}

	// C) World candidates from prefix match
	prefixWorlds, err := s.worldsRepo.SearchByPrefix(ctx, normalizedKeyword, 10)
	if err == nil {
		for _, w := range prefixWorlds {
			worldID := w.ID
			candidates = append(candidates, models.SuggestionCandidate{
				Type:       models.SuggestionTypeWorld,
				Text:       w.Title,
				Source:     models.SourceWorldTitle,
				WorldID:    &worldID,
				Similarity: 1.0, // Prefix match has perfect similarity
			})
		}
	}

	// D) World candidates from fuzzy match (pg_trgm)
	fuzzyWorlds, err := s.worldsRepo.SearchByFuzzy(ctx, normalizedKeyword, 10)
	if err == nil {
		for _, ws := range fuzzyWorlds {
			worldID := ws.World.ID
			// Check if already added from prefix match
			alreadyAdded := false
			for _, c := range candidates {
				if c.WorldID != nil && *c.WorldID == worldID {
					alreadyAdded = true
					break
				}
			}
			if !alreadyAdded {
				candidates = append(candidates, models.SuggestionCandidate{
					Type:       models.SuggestionTypeWorld,
					Text:       ws.World.Title,
					Source:     models.SourceFuzzy,
					WorldID:    &worldID,
					Similarity: ws.Similarity,
				})
			}
		}
	}

	// ============================================================
	// Step 2: Score and rank all candidates
	// ============================================================
	scoredSuggestions, err := s.rankingService.RankSuggestions(
		ctx,
		candidates,
		normalizedKeyword,
		userID,
		trendingMap,
	)
	if err != nil {
		return nil, err
	}

	// ============================================================
	// Step 3: Deduplicate and limit results
	// ============================================================
	scoredSuggestions = DeduplicateSuggestions(scoredSuggestions)
	
	// Limit to top 10 suggestions
	maxSuggestions := 10
	if len(scoredSuggestions) > maxSuggestions {
		scoredSuggestions = scoredSuggestions[:maxSuggestions]
	}

	// ============================================================
	// Step 4: Convert to response format and log impressions
	// ============================================================
	suggestions := make([]models.Suggestion, len(scoredSuggestions))
	impressions := make([]repositories.ImpressionRecord, len(scoredSuggestions))

	for i, ss := range scoredSuggestions {
		suggestions[i] = models.Suggestion{
			Type:     ss.Candidate.Type,
			Text:     ss.Candidate.Text,
			Source:   ss.Candidate.Source,
			WorldID:  ss.Candidate.WorldID,
			Position: i,
			Scores:   &ss.Scores,
		}

		impressions[i] = repositories.ImpressionRecord{
			UserID:            userID,
			Keyword:           keyword,
			NormalizedKeyword: normalizedKeyword,
			Suggestion:        ss.Candidate.Text,
			SuggestionType:    ss.Candidate.Type,
			WorldID:           ss.Candidate.WorldID,
			Position:          i,
		}
	}

	// Log impressions asynchronously (fire and forget)
	go func() {
		_ = s.logsRepo.InsertImpressionsBatch(context.Background(), impressions)
	}()

	return &models.SuggestionsResponse{
		Keyword:     keyword,
		Suggestions: suggestions,
	}, nil
}
