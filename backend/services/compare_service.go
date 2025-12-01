package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/worlds-search/backend/repositories"
	"github.com/worlds-search/backend/utils"
)

// SearchMode represents the search algorithm mode
type SearchMode string

const (
	SearchModeTrgm   SearchMode = "trgm"
	SearchModeBigram SearchMode = "bigram"
	SearchModeBoth   SearchMode = "both"
)

// CompareWorldResult represents a single world result with score
type CompareWorldResult struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Score       float64   `json:"score"`
}

// SearchCompareResponse is the response for search compare API
type SearchCompareResponse struct {
	Keyword       string               `json:"keyword"`
	Mode          SearchMode           `json:"mode"`
	TrgmResults   []CompareWorldResult `json:"trgmResults"`
	BigramResults []CompareWorldResult `json:"bigramResults"`
}

// CompareService handles search comparison operations
type CompareService struct {
	worldsRepo *repositories.WorldsRepository
}

// NewCompareService creates a new CompareService
func NewCompareService(worldsRepo *repositories.WorldsRepository) *CompareService {
	return &CompareService{
		worldsRepo: worldsRepo,
	}
}

// SearchTrgm performs TRGM-only search
func (s *CompareService) SearchTrgm(ctx context.Context, keyword string, limit int) ([]CompareWorldResult, error) {
	normalizedKeyword := utils.NormalizeKeyword(keyword)
	if normalizedKeyword == "" {
		return []CompareWorldResult{}, nil
	}

	results, err := s.worldsRepo.FindByTitleTrgm(ctx, normalizedKeyword, limit)
	if err != nil {
		return nil, err
	}

	return s.convertToCompareResults(results), nil
}

// SearchBigram performs BIGRAM-only search
func (s *CompareService) SearchBigram(ctx context.Context, keyword string, limit int) ([]CompareWorldResult, error) {
	normalizedKeyword := utils.NormalizeKeyword(keyword)
	if normalizedKeyword == "" {
		return []CompareWorldResult{}, nil
	}

	results, err := s.worldsRepo.FindByTitleBigram(ctx, normalizedKeyword, limit)
	if err != nil {
		return nil, err
	}

	return s.convertToCompareResults(results), nil
}

// SearchBoth performs both TRGM and BIGRAM searches
func (s *CompareService) SearchBoth(ctx context.Context, keyword string, limit int) (trgmResults []CompareWorldResult, bigramResults []CompareWorldResult, err error) {
	normalizedKeyword := utils.NormalizeKeyword(keyword)
	if normalizedKeyword == "" {
		return []CompareWorldResult{}, []CompareWorldResult{}, nil
	}

	// Run TRGM search
	trgm, err := s.worldsRepo.FindByTitleTrgm(ctx, normalizedKeyword, limit)
	if err != nil {
		return nil, nil, err
	}

	// Run BIGRAM search
	bigram, err := s.worldsRepo.FindByTitleBigram(ctx, normalizedKeyword, limit)
	if err != nil {
		return nil, nil, err
	}

	return s.convertToCompareResults(trgm), s.convertToCompareResults(bigram), nil
}

// SearchCompare performs search based on mode and returns formatted response
func (s *CompareService) SearchCompare(ctx context.Context, keyword string, mode SearchMode, limit int) (*SearchCompareResponse, error) {
	response := &SearchCompareResponse{
		Keyword:       keyword,
		Mode:          mode,
		TrgmResults:   []CompareWorldResult{},
		BigramResults: []CompareWorldResult{},
	}

	switch mode {
	case SearchModeTrgm:
		results, err := s.SearchTrgm(ctx, keyword, limit)
		if err != nil {
			return nil, err
		}
		response.TrgmResults = results

	case SearchModeBigram:
		results, err := s.SearchBigram(ctx, keyword, limit)
		if err != nil {
			return nil, err
		}
		response.BigramResults = results

	case SearchModeBoth:
		trgm, bigram, err := s.SearchBoth(ctx, keyword, limit)
		if err != nil {
			return nil, err
		}
		response.TrgmResults = trgm
		response.BigramResults = bigram
	}

	return response, nil
}

// convertToCompareResults converts WorldWithSimilarity slice to CompareWorldResult slice
func (s *CompareService) convertToCompareResults(results []repositories.WorldWithSimilarity) []CompareWorldResult {
	compareResults := make([]CompareWorldResult, len(results))
	for i, ws := range results {
		compareResults[i] = CompareWorldResult{
			ID:          ws.World.ID,
			Title:       ws.World.Title,
			Description: utils.TruncateString(ws.World.Description, 200),
			Score:       ws.Similarity,
		}
	}
	return compareResults
}

