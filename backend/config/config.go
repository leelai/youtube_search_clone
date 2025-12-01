package config

import (
	"os"
)

// Config holds all configuration for the application
type Config struct {
	PostgresDSN string
	RedisAddr   string
	ServerPort  string
}

// Load reads configuration from environment variables
func Load() *Config {
	return &Config{
		PostgresDSN: getEnv("POSTGRES_DSN", "postgres://worlds_user:worlds_password@localhost:5432/worlds_db?sslmode=disable"),
		RedisAddr:   getEnv("REDIS_ADDR", "localhost:6379"),
		ServerPort:  getEnv("SERVER_PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
