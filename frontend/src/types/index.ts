// ============================================================
// API Response Types
// ============================================================

export interface SuggestionScores {
  prefixScore: number;
  personalScore: number;
  trendingScore: number;
  fuzzyScore: number;
  ctrScore: number;
  finalScore: number;
}

export interface Suggestion {
  type: 'keyword' | 'world';
  text: string;
  source: 'user_history' | 'trending' | 'world_title' | 'fuzzy';
  worldId: string | null;
  position: number;
  scores: SuggestionScores | null;
}

export interface SuggestionsResponse {
  keyword: string;
  suggestions: Suggestion[];
}

export interface WorldCard {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface World {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface SearchResultsResponse {
  keyword: string;
  worlds: WorldCard[];
}

export interface TrendingResponse {
  keywords: string[];
}

// ============================================================
// Request Types
// ============================================================

export interface SearchInputRequest {
  userId: string;
  keyword: string;
  device: string;
  clientAppVersion: string;
}

export interface ClickRequest {
  userId: string;
  keyword: string;
  suggestion: string;
  suggestionType: 'keyword' | 'world';
  worldId: string | null;
  position: number;
}

// ============================================================
// UI State Types
// ============================================================

export interface SearchState {
  query: string;
  isLoading: boolean;
  suggestions: Suggestion[];
  showSuggestions: boolean;
}

// Demo user ID for testing
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================
// Search Compare Types (Search Modes Lab)
// ============================================================

export type SearchMode = 'trgm' | 'bigram' | 'both';

export interface CompareWorldResult {
  id: string;
  title: string;
  description: string;
  score: number;
}

export interface SearchCompareResponse {
  keyword: string;
  mode: SearchMode;
  trgmResults: CompareWorldResult[];
  bigramResults: CompareWorldResult[];
}
