import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchSearchCompare } from '../api/searchApi';
import type { SearchMode, CompareWorldResult } from '../types';

// Result card component for lab page
function LabWorldCard({ world, index, mode }: { world: CompareWorldResult; index: number; mode: 'trgm' | 'bigram' }) {
  const modeColors = {
    trgm: {
      badge: 'bg-cosmos-500/20 text-cosmos-300 border-cosmos-500/30',
      score: 'text-cosmos-400',
      accent: 'hover:border-cosmos-500/40',
    },
    bigram: {
      badge: 'bg-nebula-500/20 text-nebula-300 border-nebula-500/30',
      score: 'text-nebula-400',
      accent: 'hover:border-nebula-500/40',
    },
  };

  const colors = modeColors[mode];

  return (
    <Link
      to={`/worlds/${world.id}`}
      className={`group block animate-fade-in`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`p-4 rounded-xl bg-void-900/60 border border-void-800/60 ${colors.accent} transition-all duration-300`}>
        {/* Header with badge and score */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.badge}`}>
            {mode}
          </span>
          <span className={`text-xs font-mono ${colors.score}`}>
            score: {world.score.toFixed(3)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-void-100 group-hover:text-white transition-colors line-clamp-1 mb-1">
          {world.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-void-400 line-clamp-2">
          {world.description}
        </p>
      </div>
    </Link>
  );
}

// Results column component
function ResultsColumn({ 
  title, 
  results, 
  mode, 
  isLoading 
}: { 
  title: string; 
  results: CompareWorldResult[]; 
  mode: 'trgm' | 'bigram';
  isLoading: boolean;
}) {
  const modeStyles = {
    trgm: {
      title: 'text-cosmos-300',
      border: 'border-cosmos-500/20',
      glow: 'from-cosmos-500/10',
    },
    bigram: {
      title: 'text-nebula-300',
      border: 'border-nebula-500/20',
      glow: 'from-nebula-500/10',
    },
  };

  const styles = modeStyles[mode];

  return (
    <div className={`flex-1 min-w-0 rounded-2xl border ${styles.border} bg-gradient-to-b ${styles.glow} to-transparent p-4`}>
      <h2 className={`text-lg font-display font-semibold ${styles.title} mb-4 flex items-center gap-2`}>
        <span className="w-2 h-2 rounded-full bg-current" />
        {title}
        {!isLoading && (
          <span className="text-sm font-normal text-void-500">
            ({results.length} 筆)
          </span>
        )}
      </h2>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-void-900/50 border border-void-800/50 animate-pulse"
            >
              <div className="flex justify-between mb-2">
                <div className="h-4 w-16 bg-void-800 rounded" />
                <div className="h-4 w-20 bg-void-800 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-void-800 rounded mb-2" />
              <div className="h-4 w-full bg-void-800/70 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && results.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-void-800/50 mb-3">
            <svg className="w-6 h-6 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm text-void-500">無結果</p>
        </div>
      )}

      {/* Results list */}
      {!isLoading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((world, index) => (
            <LabWorldCard key={world.id} world={world} index={index} mode={mode} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchModesLabPage() {
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<SearchMode>('both');
  const [trgmResults, setTrgmResults] = useState<CompareWorldResult[]>([]);
  const [bigramResults, setBigramResults] = useState<CompareWorldResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetchSearchCompare(keyword, mode);
      setTrgmResults(response.trgmResults);
      setBigramResults(response.bigramResults);
    } catch (err) {
      console.error('Search compare failed:', err);
      setError('搜尋比較時發生錯誤，請稍後再試');
      setTrgmResults([]);
      setBigramResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [keyword, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-void-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-void-950/80 backdrop-blur-xl border-b border-void-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo / Back link */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cosmos-500 via-nebula-500 to-cosmos-600 flex items-center justify-center shadow-lg shadow-cosmos-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <span className="font-display font-bold text-lg text-white group-hover:text-cosmos-300 transition-colors">
                  Search Modes Lab
                </span>
                <span className="block text-xs text-void-500">TRGM vs BIGRAM 比較實驗</span>
              </div>
            </Link>

            {/* Back to main */}
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-void-400 hover:text-white hover:bg-void-800/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回首頁
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search controls */}
        <div className="mb-8 space-y-4">
          {/* Search input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入關鍵字進行搜尋比較..."
                className="w-full px-5 py-3.5 rounded-xl bg-void-900/80 border border-void-700/50 text-white placeholder-void-500 focus:outline-none focus:border-cosmos-500/50 focus:ring-2 focus:ring-cosmos-500/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-void-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={!keyword.trim() || isLoading}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cosmos-500 to-nebula-500 text-white font-medium hover:from-cosmos-400 hover:to-nebula-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cosmos-500/20"
            >
              搜尋
            </button>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-void-400">搜尋模式：</span>
            <div className="flex gap-2">
              {(['trgm', 'bigram', 'both'] as const).map((m) => {
                const isActive = mode === m;
                const labels = {
                  trgm: 'TRGM 模式',
                  bigram: 'BIGRAM 模式',
                  both: '並排比較',
                };
                const activeStyles = {
                  trgm: 'bg-cosmos-500/20 border-cosmos-500/50 text-cosmos-300',
                  bigram: 'bg-nebula-500/20 border-nebula-500/50 text-nebula-300',
                  both: 'bg-gradient-to-r from-cosmos-500/20 to-nebula-500/20 border-cosmos-500/30 text-white',
                };
                
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      isActive
                        ? activeStyles[m]
                        : 'border-void-700/50 text-void-400 hover:border-void-600 hover:text-void-300'
                    }`}
                  >
                    {labels[m]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Initial state */}
        {!hasSearched && !isLoading && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cosmos-500/10 to-nebula-500/10 mb-6">
              <svg className="w-10 h-10 text-cosmos-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl font-display font-semibold text-white mb-2">
              搜尋演算法比較實驗室
            </h2>
            <p className="text-void-400 max-w-md mx-auto">
              輸入關鍵字，選擇搜尋模式，比較 pg_trgm（TRGM）與 pg_bigm（BIGRAM）的搜尋結果差異。
            </p>
            <div className="mt-8 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cosmos-500" />
                <span className="text-void-400">TRGM = 3-gram 相似度</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-nebula-500" />
                <span className="text-void-400">BIGRAM = 2-gram 相似度</span>
              </div>
            </div>
          </div>
        )}

        {/* Results display */}
        {hasSearched && (
          <>
            {/* Single column for trgm or bigram mode */}
            {mode === 'trgm' && (
              <div className="max-w-2xl mx-auto">
                <ResultsColumn
                  title="TRGM 搜尋結果"
                  results={trgmResults}
                  mode="trgm"
                  isLoading={isLoading}
                />
              </div>
            )}

            {mode === 'bigram' && (
              <div className="max-w-2xl mx-auto">
                <ResultsColumn
                  title="BIGRAM 搜尋結果"
                  results={bigramResults}
                  mode="bigram"
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Two columns for both mode */}
            {mode === 'both' && (
              <div className="flex gap-6">
                <ResultsColumn
                  title="TRGM 搜尋結果"
                  results={trgmResults}
                  mode="trgm"
                  isLoading={isLoading}
                />
                <ResultsColumn
                  title="BIGRAM 搜尋結果"
                  results={bigramResults}
                  mode="bigram"
                  isLoading={isLoading}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

