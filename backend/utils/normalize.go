package utils

import (
	"regexp"
	"strings"
	"unicode"
)

var multiSpaceRegex = regexp.MustCompile(`\s+`)

// NormalizeKeyword normalizes a search keyword:
// - Trims leading/trailing whitespace
// - Converts to lowercase
// - Collapses multiple spaces into single space
// - Removes control characters
func NormalizeKeyword(keyword string) string {
	// Trim whitespace
	result := strings.TrimSpace(keyword)
	
	// Convert to lowercase
	result = strings.ToLower(result)
	
	// Remove control characters
	result = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, result)
	
	// Collapse multiple spaces
	result = multiSpaceRegex.ReplaceAllString(result, " ")
	
	return result
}

// TruncateString truncates a string to maxLen characters, adding "..." if truncated
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}
