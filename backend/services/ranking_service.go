package services

import (
	"context"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/worlds-search/backend/models"
	"github.com/worlds-search/backend/repositories"
)

// ============================================================
// RANKING SERVICE
// ============================================================
// This service implements the core ranking logic for autocomplete suggestions.
// The ranking formula is:
//
//   final_score = prefix_score + personal_score + trending_score + fuzzy_score + ctr_score
//
// Score weights and priorities:
//   - prefix_score:   Strong signal (100 for prefix match, 50 for contains)
//   - personal_score: Strong signal (frequency * 20)
//   - trending_score: Medium signal (redis_score * 1.0)
//   - fuzzy_score:    Weak signal (similarity * 10)
//   - ctr_score:      Refinement signal (ctr * 50)
// ============================================================

// RankingService handles scoring and ranking of suggestions
type RankingService struct {
	searchRepo *repositories.SearchRepository
	logsRepo   *repositories.LogsRepository
}

// NewRankingService creates a new RankingService
func NewRankingService(searchRepo *repositories.SearchRepository, logsRepo *repositories.LogsRepository) *RankingService {
	return &RankingService{
		searchRepo: searchRepo,
		logsRepo:   logsRepo,
	}
}

// ScoredSuggestion is a suggestion with its computed scores
type ScoredSuggestion struct {
	Candidate models.SuggestionCandidate
	Scores    models.SuggestionScores
}

// RankSuggestions scores and ranks a list of suggestion candidates
// Parameters:
//   - ctx: context for database calls
//   - candidates: list of suggestion candidates to rank
//   - normalizedQuery: the normalized search query from user
//   - userID: optional user ID for personal scoring
//   - trendingKeywords: map of keyword -> trending score from Redis
//
// Returns sorted list of scored suggestions (highest score first)
func (s *RankingService) RankSuggestions(
	ctx context.Context,
	candidates []models.SuggestionCandidate,
	normalizedQuery string,
	userID *uuid.UUID,
	trendingKeywords map[string]float64,
) ([]ScoredSuggestion, error) {
	scored := make([]ScoredSuggestion, 0, len(candidates))

	for _, candidate := range candidates {
		scores, err := s.computeScores(ctx, candidate, normalizedQuery, userID, trendingKeywords)
		if err != nil {
			// Log error but continue with other candidates
			continue
		}

		scored = append(scored, ScoredSuggestion{
			Candidate: candidate,
			Scores:    scores,
		})
	}

	// Sort by final score descending
	sort.Slice(scored, func(i, j int) bool {
		return scored[i].Scores.FinalScore > scored[j].Scores.FinalScore
	})

	return scored, nil
}

// computeScores calculates all score components for a single candidate
func (s *RankingService) computeScores(
	ctx context.Context,
	candidate models.SuggestionCandidate,
	normalizedQuery string,
	userID *uuid.UUID,
	trendingKeywords map[string]float64,
) (models.SuggestionScores, error) {
	var scores models.SuggestionScores

	// ============================================================
	// 1. PREFIX SCORE
	// ============================================================
	// If suggestion text starts with normalized_query: prefix_score = 100
	// Else if suggestion text contains normalized_query at a later position: prefix_score = 50
	// Else: prefix_score = 0
	normalizedText := strings.ToLower(candidate.Text)
	if strings.HasPrefix(normalizedText, normalizedQuery) {
		scores.PrefixScore = 100.0
	} else if strings.Contains(normalizedText, normalizedQuery) {
		scores.PrefixScore = 50.0
	} else {
		scores.PrefixScore = 0.0
	}

	// ============================================================
	// 2. PERSONAL SCORE
	// ============================================================
	// For keyword suggestions: freq = number of times user searched this keyword
	// For world suggestions: count how many times user clicked this world
	// personal_score = freq * 20
	if userID != nil {
		if candidate.Type == models.SuggestionTypeKeyword {
			// Get frequency from user's search history
			keywords, err := s.searchRepo.GetUserHistoryKeywords(ctx, *userID, normalizedQuery, 100)
			if err == nil {
				for _, kf := range keywords {
					if strings.ToLower(kf.Keyword) == normalizedText {
						scores.PersonalScore = float64(kf.Frequency) * 20.0
						break
					}
				}
			}
		} else if candidate.Type == models.SuggestionTypeWorld && candidate.WorldID != nil {
			// Get click count for this world
			count, err := s.searchRepo.GetUserWorldClickCount(ctx, *userID, *candidate.WorldID, normalizedQuery)
			if err == nil {
				scores.PersonalScore = float64(count) * 20.0
			}
		}
	}

	// ============================================================
	// 3. TRENDING SCORE
	// ============================================================
	// For keyword suggestions: Use Redis ZSET score
	// trending_score = redis_score * 1.0
	if candidate.Type == models.SuggestionTypeKeyword {
		if trendingScore, ok := trendingKeywords[normalizedText]; ok {
			scores.TrendingScore = trendingScore * 1.0
		}
	}
	// For world suggestions, trending score is 0 (could be extended to track world popularity)

	// ============================================================
	// 4. FUZZY SCORE
	// ============================================================
	// For world suggestions: similarity = pg_trgm similarity (0-1)
	// fuzzy_score = similarity * 10
	// For keyword suggestions: only if using fuzzy corrections
	if candidate.Source == models.SourceFuzzy || candidate.Source == models.SourceWorldTitle {
		scores.FuzzyScore = candidate.Similarity * 10.0
	}

	// ============================================================
	// 5. CTR SCORE (Optional - Basic Implementation)
	// ============================================================
	// ctr = clicks / GREATEST(impressions, 1)
	// ctr_score = ctr * 50
	//
	// Note: This is a simplified implementation. In production, you would:
	// - Cache CTR stats
	// - Use time-weighted CTR
	// - Consider position bias correction
	ctrStats, err := s.logsRepo.GetCTRStats(ctx, candidate.Text, candidate.Type)
	if err == nil && ctrStats.Impressions > 0 {
		ctr := float64(ctrStats.Clicks) / float64(ctrStats.Impressions)
		scores.CTRScore = ctr * 50.0
	}

	// ============================================================
	// FINAL SCORE
	// ============================================================
	scores.FinalScore = scores.PrefixScore +
		scores.PersonalScore +
		scores.TrendingScore +
		scores.FuzzyScore +
		scores.CTRScore

	return scores, nil
}

// DeduplicateSuggestions removes duplicate suggestions, keeping the one with higher score
func DeduplicateSuggestions(suggestions []ScoredSuggestion) []ScoredSuggestion {
	seen := make(map[string]int) // text -> index in result
	result := make([]ScoredSuggestion, 0, len(suggestions))

	for _, s := range suggestions {
		key := strings.ToLower(s.Candidate.Text)
		if existingIdx, exists := seen[key]; exists {
			// Keep the one with higher score
			if s.Scores.FinalScore > result[existingIdx].Scores.FinalScore {
				result[existingIdx] = s
			}
		} else {
			seen[key] = len(result)
			result = append(result, s)
		}
	}

	return result
}
