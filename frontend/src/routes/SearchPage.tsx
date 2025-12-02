import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { WorldCard } from '../components/WorldCard';
import { getSearchResults } from '../api/searchApi';
import type { WorldCard as WorldCardType } from '../types';
import { DEMO_USER_ID } from '../types';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') || '';
  
  const [results, setResults] = useState<WorldCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendElapsedMs, setBackendElapsedMs] = useState<number | null>(null);
  const [totalElapsedMs, setTotalElapsedMs] = useState<number | null>(null);

  // Fetch search results
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setBackendElapsedMs(null);
      setTotalElapsedMs(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      const response = await getSearchResults(searchQuery, DEMO_USER_ID);
      const endTime = performance.now();
      
      setResults(response.worlds);
      setBackendElapsedMs(response.elapsedMs);
      setTotalElapsedMs(Math.round(endTime - startTime));
    } catch (err) {
      console.error('Failed to fetch search results:', err);
      setError('搜尋時發生錯誤，請稍後再試');
      setResults([]);
      setBackendElapsedMs(null);
      setTotalElapsedMs(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch results when query changes
  useEffect(() => {
    fetchResults(query);
  }, [query, fetchResults]);

  // Handle search from navbar
  const handleSearch = (newQuery: string) => {
    setSearchParams({ query: newQuery });
  };

  return (
    <div className="min-h-screen bg-void-950">
      {/* Navbar with search */}
      <Navbar initialQuery={query} onSearch={handleSearch} />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search info */}
        {query && (
          <div className="mb-6">
            <h1 className="text-lg text-void-300">
              搜尋結果：
              <span className="ml-2 text-white font-medium">「{query}」</span>
            </h1>
            {!isLoading && (
              <p className="mt-1 text-sm text-void-500">
                找到 {results.length} 個 World
                {backendElapsedMs !== null && totalElapsedMs !== null && (
                  <span className="ml-2 text-void-600">
                    （後端: {backendElapsedMs}ms / 總計: {totalElapsedMs}ms）
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-xl bg-void-900/50 border border-void-800/50 animate-pulse"
              >
                <div className="w-40 h-24 rounded-lg bg-void-800" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 bg-void-800 rounded" />
                  <div className="h-4 w-full bg-void-800/70 rounded" />
                  <div className="h-4 w-1/2 bg-void-800/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-void-400">{error}</p>
            <button
              onClick={() => fetchResults(query)}
              className="mt-4 px-4 py-2 rounded-lg bg-cosmos-500/20 text-cosmos-300 hover:bg-cosmos-500/30 transition-colors"
            >
              重試
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && query && results.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-void-800/50 mb-4">
              <svg className="w-8 h-8 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-void-400">找不到符合「{query}」的 World</p>
            <p className="mt-2 text-sm text-void-600">試試其他關鍵字，或檢查拼寫是否正確</p>
          </div>
        )}

        {/* No query state */}
        {!query && !isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cosmos-500/10 mb-4">
              <svg className="w-8 h-8 text-cosmos-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-void-400">在上方輸入關鍵字開始搜尋</p>
          </div>
        )}

        {/* Results list */}
        {!isLoading && !error && results.length > 0 && (
          <div className="space-y-3">
            {results.map((world, index) => (
              <WorldCard key={world.id} world={world} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
