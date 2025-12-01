package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// DB holds database connections
type DB struct {
	Pool  *pgxpool.Pool
	Redis *redis.Client
}

// New creates a new DB instance with connections to PostgreSQL and Redis
func New(ctx context.Context, postgresDSN, redisAddr string) (*DB, error) {
	// Connect to PostgreSQL
	poolConfig, err := pgxpool.ParseConfig(postgresDSN)
	if err != nil {
		return nil, err
	}
	
	poolConfig.MaxConns = 20
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute
	
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, err
	}
	
	// Test PostgreSQL connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	log.Println("✓ Connected to PostgreSQL")
	
	// Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:         redisAddr,
		Password:     "",
		DB:           0,
		PoolSize:     10,
		MinIdleConns: 5,
	})
	
	// Test Redis connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		pool.Close()
		return nil, err
	}
	log.Println("✓ Connected to Redis")
	
	return &DB{
		Pool:  pool,
		Redis: rdb,
	}, nil
}

// Close closes all database connections
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
	if db.Redis != nil {
		db.Redis.Close()
	}
}
