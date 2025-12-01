package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const (
	// TrendingSearchKey is the Redis key for trending searches ZSET
	TrendingSearchKey = "trending_search"
)

// LogsRepository handles database operations for impressions and clicks
type LogsRepository struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

// NewLogsRepository creates a new LogsRepository
func NewLogsRepository(pool *pgxpool.Pool, redis *redis.Client) *LogsRepository {
	return &LogsRepository{
		pool:  pool,
		redis: redis,
	}
}

// InsertImpression inserts a new search impression record
func (r *LogsRepository) InsertImpression(ctx context.Context, userID *uuid.UUID, keyword, normalizedKeyword, suggestion, suggestionType string, worldID *uuid.UUID, position int) error {
	query := `
		INSERT INTO search_impressions 
		(user_id, keyword, normalized_keyword, suggestion, suggestion_type, world_id, position, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	
	_, err := r.pool.Exec(ctx, query,
		userID,
		keyword,
		normalizedKeyword,
		suggestion,
		suggestionType,
		worldID,
		position,
		time.Now(),
	)
	return err
}

// InsertImpressionsBatch inserts multiple impression records in a batch
func (r *LogsRepository) InsertImpressionsBatch(ctx context.Context, impressions []ImpressionRecord) error {
	if len(impressions) == 0 {
		return nil
	}
	
	query := `
		INSERT INTO search_impressions 
		(user_id, keyword, normalized_keyword, suggestion, suggestion_type, world_id, position, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	
	batch := &pgxpool.Pool{}
	_ = batch // Using individual inserts for simplicity
	
	now := time.Now()
	for _, imp := range impressions {
		_, err := r.pool.Exec(ctx, query,
			imp.UserID,
			imp.Keyword,
			imp.NormalizedKeyword,
			imp.Suggestion,
			imp.SuggestionType,
			imp.WorldID,
			imp.Position,
			now,
		)
		if err != nil {
			return err
		}
	}
	
	return nil
}

// ImpressionRecord is a helper struct for batch inserts
type ImpressionRecord struct {
	UserID            *uuid.UUID
	Keyword           string
	NormalizedKeyword string
	Suggestion        string
	SuggestionType    string
	WorldID           *uuid.UUID
	Position          int
}

// InsertClick inserts a new search click record
func (r *LogsRepository) InsertClick(ctx context.Context, userID *uuid.UUID, keyword, normalizedKeyword, clickedSuggestion, suggestionType string, worldID *uuid.UUID, position *int) error {
	query := `
		INSERT INTO search_clicks 
		(user_id, keyword, normalized_keyword, clicked_suggestion, suggestion_type, world_id, position, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	
	_, err := r.pool.Exec(ctx, query,
		userID,
		keyword,
		normalizedKeyword,
		clickedSuggestion,
		suggestionType,
		worldID,
		position,
		time.Now(),
	)
	return err
}

// IncrementTrending increments the score for a keyword in the trending ZSET
func (r *LogsRepository) IncrementTrending(ctx context.Context, normalizedKeyword string) error {
	return r.redis.ZIncrBy(ctx, TrendingSearchKey, 1, normalizedKeyword).Err()
}

// GetTrendingKeywords gets keywords from the trending ZSET with prefix match
func (r *LogsRepository) GetTrendingKeywords(ctx context.Context, prefix string, limit int) ([]TrendingKeyword, error) {
	// Get all members and filter by prefix (Redis doesn't support prefix filtering in ZSET)
	// For production, consider using a separate sorted set per prefix or Redis Search
	members, err := r.redis.ZRevRangeWithScores(ctx, TrendingSearchKey, 0, 100).Result()
	if err != nil {
		return nil, err
	}
	
	var results []TrendingKeyword
	for _, m := range members {
		keyword := m.Member.(string)
		if len(keyword) >= len(prefix) && keyword[:len(prefix)] == prefix {
			results = append(results, TrendingKeyword{
				Keyword: keyword,
				Score:   m.Score,
			})
			if len(results) >= limit {
				break
			}
		}
	}
	
	return results, nil
}

// GetTopTrending gets the top N trending keywords
func (r *LogsRepository) GetTopTrending(ctx context.Context, limit int) ([]TrendingKeyword, error) {
	members, err := r.redis.ZRevRangeWithScores(ctx, TrendingSearchKey, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}
	
	results := make([]TrendingKeyword, len(members))
	for i, m := range members {
		results[i] = TrendingKeyword{
			Keyword: m.Member.(string),
			Score:   m.Score,
		}
	}
	
	return results, nil
}

// TrendingKeyword holds a keyword and its trending score
type TrendingKeyword struct {
	Keyword string
	Score   float64
}

// CTRStats holds click-through rate statistics for a suggestion
type CTRStats struct {
	Impressions int
	Clicks      int
}

// GetCTRStats gets the CTR statistics for a suggestion
func (r *LogsRepository) GetCTRStats(ctx context.Context, suggestion string, suggestionType string) (*CTRStats, error) {
	// Get impression count
	impressionQuery := `
		SELECT COUNT(*)
		FROM search_impressions
		WHERE suggestion = $1 AND suggestion_type = $2
		  AND created_at > NOW() - INTERVAL '7 days'
	`
	
	var impressions int
	err := r.pool.QueryRow(ctx, impressionQuery, suggestion, suggestionType).Scan(&impressions)
	if err != nil {
		return nil, err
	}
	
	// Get click count
	clickQuery := `
		SELECT COUNT(*)
		FROM search_clicks
		WHERE clicked_suggestion = $1 AND suggestion_type = $2
		  AND created_at > NOW() - INTERVAL '7 days'
	`
	
	var clicks int
	err = r.pool.QueryRow(ctx, clickQuery, suggestion, suggestionType).Scan(&clicks)
	if err != nil {
		return nil, err
	}
	
	return &CTRStats{
		Impressions: impressions,
		Clicks:      clicks,
	}, nil
}
