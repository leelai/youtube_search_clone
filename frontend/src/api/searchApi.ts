import type {
  SuggestionsResponse,
  SearchResultsResponse,
  TrendingResponse,
  SearchInputRequest,
  ClickRequest,
  SearchMode,
  SearchCompareResponse,
} from '../types';

// API base URL - uses Vite proxy in development, direct URL in production
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetch autocomplete suggestions for a keyword
 */
export async function getSuggestions(
  keyword: string,
  userId?: string
): Promise<SuggestionsResponse> {
  const params = new URLSearchParams({ keyword });
  if (userId) {
    params.append('userId', userId);
  }

  const response = await fetch(`${API_BASE}/api/search/suggestions?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch search results for a keyword
 */
export async function getSearchResults(
  keyword: string,
  userId?: string
): Promise<SearchResultsResponse> {
  const params = new URLSearchParams({ keyword });
  if (userId) {
    params.append('userId', userId);
  }

  const response = await fetch(`${API_BASE}/api/search/results?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch search results: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch trending keywords
 */
export async function getTrending(): Promise<TrendingResponse> {
  const response = await fetch(`${API_BASE}/api/search/trending`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trending: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Log a search input (when user commits a search)
 */
export async function logSearchInput(input: SearchInputRequest): Promise<void> {
  const response = await fetch(`${API_BASE}/api/search/input`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to log search input: ${response.statusText}`);
  }
}

/**
 * Log a click on a suggestion
 */
export async function logClick(click: ClickRequest): Promise<void> {
  const response = await fetch(`${API_BASE}/api/search/click`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(click),
  });

  if (!response.ok) {
    throw new Error(`Failed to log click: ${response.statusText}`);
  }
}

/**
 * Fetch search compare results for TRGM vs BIGRAM comparison
 * Used by the Search Modes Lab page
 */
export async function fetchSearchCompare(
  keyword: string,
  mode: SearchMode
): Promise<SearchCompareResponse> {
  const params = new URLSearchParams({ keyword, mode });
  const response = await fetch(`${API_BASE}/api/search/compare?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch search compare results: ${response.statusText}`);
  }
  
  return response.json();
}

