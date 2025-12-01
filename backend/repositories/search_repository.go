package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/worlds-search/backend/models"
)

// SearchRepository handles database operations for search history
type SearchRepository struct {
	pool *pgxpool.Pool
}

// NewSearchRepository creates a new SearchRepository
func NewSearchRepository(pool *pgxpool.Pool) *SearchRepository {
	return &SearchRepository{pool: pool}
}

// InsertHistory inserts a new search history record
func (r *SearchRepository) InsertHistory(ctx context.Context, history *models.SearchHistory) error {
	query := `
		INSERT INTO search_history 
		(user_id, keyword, normalized_keyword, has_result, device, client_app_version, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	
	return r.pool.QueryRow(ctx, query,
		history.UserID,
		history.Keyword,
		history.NormalizedKeyword,
		history.HasResult,
		history.Device,
		history.ClientAppVersion,
		time.Now(),
	).Scan(&history.ID)
}

// UpdateHistoryResult updates the has_result and selected_world_id for a history record
func (r *SearchRepository) UpdateHistoryResult(ctx context.Context, userID uuid.UUID, worldID uuid.UUID) error {
	query := `
		UPDATE search_history
		SET has_result = true, selected_world_id = $2
		WHERE id = (
			SELECT id FROM search_history
			WHERE user_id = $1
			ORDER BY created_at DESC
			LIMIT 1
		)
	`
	
	_, err := r.pool.Exec(ctx, query, userID, worldID)
	return err
}

// KeywordFrequency holds a keyword and its search frequency
type KeywordFrequency struct {
	Keyword   string
	Frequency int
}

// GetUserHistoryKeywords gets distinct keywords from user's search history with prefix match
// Returns keywords searched in the last 30 days with their frequency
func (r *SearchRepository) GetUserHistoryKeywords(ctx context.Context, userID uuid.UUID, prefix string, limit int) ([]KeywordFrequency, error) {
	query := `
		SELECT normalized_keyword, COUNT(*) as freq
		FROM search_history
		WHERE user_id = $1
		  AND normalized_keyword LIKE $2 || '%'
		  AND created_at > NOW() - INTERVAL '30 days'
		GROUP BY normalized_keyword
		ORDER BY freq DESC, MAX(created_at) DESC
		LIMIT $3
	`
	
	rows, err := r.pool.Query(ctx, query, userID, prefix, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var results []KeywordFrequency
	for rows.Next() {
		var kf KeywordFrequency
		if err := rows.Scan(&kf.Keyword, &kf.Frequency); err != nil {
			return nil, err
		}
		results = append(results, kf)
	}
	
	return results, rows.Err()
}

// GetUserWorldClickCount gets the number of times a user clicked on a specific world
// after searching with a similar prefix
func (r *SearchRepository) GetUserWorldClickCount(ctx context.Context, userID uuid.UUID, worldID uuid.UUID, prefix string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM search_clicks
		WHERE user_id = $1
		  AND world_id = $2
		  AND normalized_keyword LIKE $3 || '%'
		  AND created_at > NOW() - INTERVAL '30 days'
	`
	
	var count int
	err := r.pool.QueryRow(ctx, query, userID, worldID, prefix).Scan(&count)
	return count, err
}
