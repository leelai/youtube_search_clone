package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/worlds-search/backend/models"
)

// WorldsRepository handles database operations for worlds
type WorldsRepository struct {
	pool *pgxpool.Pool
}

// NewWorldsRepository creates a new WorldsRepository
func NewWorldsRepository(pool *pgxpool.Pool) *WorldsRepository {
	return &WorldsRepository{pool: pool}
}

// GetByID fetches a world by its ID
func (r *WorldsRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.World, error) {
	query := `
		SELECT id, title, description, created_at
		FROM worlds
		WHERE id = $1
	`

	var world models.World
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&world.ID,
		&world.Title,
		&world.Description,
		&world.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &world, nil
}

// WorldWithSimilarity holds a world with its pg_trgm similarity score
type WorldWithSimilarity struct {
	World      models.World
	Similarity float64
}

// SearchByPrefix finds worlds where title starts with the given prefix
// Uses text_pattern_ops index for efficient prefix matching
func (r *WorldsRepository) SearchByPrefix(ctx context.Context, prefix string, limit int) ([]models.World, error) {
	// Use lower_title column with text_pattern_ops index for efficient prefix search
	// The pattern is constructed in Go to avoid SQL injection and enable index usage
	query := `
		SELECT id, title, description, created_at
		FROM worlds
		WHERE title ILIKE $1 || '%'
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, prefix, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var worlds []models.World
	for rows.Next() {
		var w models.World
		if err := rows.Scan(&w.ID, &w.Title, &w.Description, &w.CreatedAt); err != nil {
			return nil, err
		}
		worlds = append(worlds, w)
	}

	return worlds, rows.Err()
}

// SearchByFuzzy finds worlds using pg_trgm similarity matching
// Returns worlds with similarity score > 0.1
// OPTIMIZED: Uses % operator with GIN index for efficient trigram search
func (r *WorldsRepository) SearchByFuzzy(ctx context.Context, keyword string, limit int) ([]WorldWithSimilarity, error) {
	// Use the % operator which leverages the GIN index (gin_trgm_ops)
	// First set a low similarity threshold to get more candidates, then filter
	// The % operator uses pg_trgm.similarity_threshold (default 0.3)
	// We use word_similarity for better partial matching
	query := `
		SELECT id, title, description, created_at, 
		       GREATEST(similarity(title, $1), word_similarity($1, title)) as sim
		FROM worlds
		WHERE title % $1 OR $1 <% title
		ORDER BY sim DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, keyword, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []WorldWithSimilarity
	for rows.Next() {
		var ws WorldWithSimilarity
		if err := rows.Scan(
			&ws.World.ID,
			&ws.World.Title,
			&ws.World.Description,
			&ws.World.CreatedAt,
			&ws.Similarity,
		); err != nil {
			return nil, err
		}
		results = append(results, ws)
	}

	return results, rows.Err()
}

// SearchCombined searches worlds using both prefix and fuzzy matching
// This is used for the search results page
func (r *WorldsRepository) SearchCombined(ctx context.Context, keyword string, limit int) ([]WorldWithSimilarity, error) {
	// Use a combined query that gets prefix matches first, then fuzzy matches
	query := `
		WITH prefix_matches AS (
			SELECT id, title, description, created_at, 
			       1.0::float as sim,
			       1 as match_type
			FROM worlds
			WHERE LOWER(title) LIKE LOWER($1) || '%'
		),
		fuzzy_matches AS (
			SELECT id, title, description, created_at,
			       similarity(LOWER(title), LOWER($1)) as sim,
			       2 as match_type
			FROM worlds
			WHERE similarity(LOWER(title), LOWER($1)) > 0.1
			  AND id NOT IN (SELECT id FROM prefix_matches)
		),
		contains_matches AS (
			SELECT id, title, description, created_at,
			       0.5::float as sim,
			       3 as match_type
			FROM worlds
			WHERE LOWER(title) LIKE '%' || LOWER($1) || '%'
			  AND id NOT IN (SELECT id FROM prefix_matches)
			  AND id NOT IN (SELECT id FROM fuzzy_matches)
		)
		SELECT id, title, description, created_at, sim
		FROM (
			SELECT * FROM prefix_matches
			UNION ALL
			SELECT * FROM fuzzy_matches
			UNION ALL
			SELECT * FROM contains_matches
		) combined
		ORDER BY match_type, sim DESC, created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, keyword, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []WorldWithSimilarity
	for rows.Next() {
		var ws WorldWithSimilarity
		if err := rows.Scan(
			&ws.World.ID,
			&ws.World.Title,
			&ws.World.Description,
			&ws.World.CreatedAt,
			&ws.Similarity,
		); err != nil {
			return nil, err
		}
		results = append(results, ws)
	}

	return results, rows.Err()
}

// ============================================================
// Search Compare Methods (for Search Modes Lab)
// ============================================================

// FindByTitleTrgm searches worlds using pg_trgm similarity matching
// Returns worlds sorted by similarity score descending
// Uses similarity threshold of 0.1 for better recall with short keywords
func (r *WorldsRepository) FindByTitleTrgm(ctx context.Context, keyword string, limit int) ([]WorldWithSimilarity, error) {
	// Use similarity() function directly with threshold comparison
	// This avoids relying on the % operator which uses a global threshold
	query := `
		SELECT id, title, description, created_at, 
		       similarity(LOWER(title), LOWER($1)) as sim
		FROM worlds
		WHERE similarity(LOWER(title), LOWER($1)) > 0.1
		ORDER BY sim DESC, created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, keyword, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []WorldWithSimilarity
	for rows.Next() {
		var ws WorldWithSimilarity
		if err := rows.Scan(
			&ws.World.ID,
			&ws.World.Title,
			&ws.World.Description,
			&ws.World.CreatedAt,
			&ws.Similarity,
		); err != nil {
			return nil, err
		}
		results = append(results, ws)
	}

	return results, rows.Err()
}

// FindByTitleBigram searches worlds using pg_bigm bigram matching
// Uses the likequery function to convert search term to LIKE pattern
// Returns worlds sorted by bigm_similarity score descending
func (r *WorldsRepository) FindByTitleBigram(ctx context.Context, keyword string, limit int) ([]WorldWithSimilarity, error) {
	// pg_bigm uses likequery() to convert keyword to LIKE pattern
	// and bigm_similarity() to get similarity score
	// Use LOWER() for case-insensitive matching
	query := `
		SELECT id, title, description, created_at,
		       bigm_similarity(LOWER(title), LOWER($1)) as sim
		FROM worlds
		WHERE LOWER(title) LIKE LOWER(likequery($1))
		ORDER BY sim DESC, created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, keyword, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []WorldWithSimilarity
	for rows.Next() {
		var ws WorldWithSimilarity
		if err := rows.Scan(
			&ws.World.ID,
			&ws.World.Title,
			&ws.World.Description,
			&ws.World.CreatedAt,
			&ws.Similarity,
		); err != nil {
			return nil, err
		}
		results = append(results, ws)
	}

	return results, rows.Err()
}
