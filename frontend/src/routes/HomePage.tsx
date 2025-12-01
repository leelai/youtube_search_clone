import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { getTrending } from '../api/searchApi';

export function HomePage() {
  const [trending, setTrending] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await getTrending();
        setTrending(response.keywords);
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const handleTrendingClick = (keyword: string) => {
    navigate(`/search?query=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="min-h-screen bg-void-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cosmos-500/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-nebula-500/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cosmos-600/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo and title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cosmos-500 to-nebula-500 mb-6 shadow-lg shadow-cosmos-500/25">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-white tracking-tight mb-4">
            Worlds Search
          </h1>
          
          <p className="text-lg text-void-400 max-w-md mx-auto">
            探索無限可能的世界，發現屬於你的精彩內容
          </p>
        </div>

        {/* Search bar */}
        <div className="w-full max-w-2xl mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <SearchBar centered />
        </div>

        {/* Trending section */}
        <div className="w-full max-w-2xl animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-nebula-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium text-void-300">熱門搜尋</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-24 rounded-full bg-void-800/50 animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))
            ) : trending.length > 0 ? (
              trending.map((keyword, index) => (
                <button
                  key={keyword}
                  onClick={() => handleTrendingClick(keyword)}
                  className="px-4 py-2 rounded-full bg-void-800/50 border border-void-700/50 text-void-300 text-sm font-medium hover:bg-cosmos-500/20 hover:border-cosmos-500/30 hover:text-cosmos-300 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {keyword}
                </button>
              ))
            ) : (
              // Default trending keywords if none from API
              ['Garmin', 'Giant', 'PostgreSQL', 'React', 'Docker', 'Redis'].map((keyword, index) => (
                <button
                  key={keyword}
                  onClick={() => handleTrendingClick(keyword)}
                  className="px-4 py-2 rounded-full bg-void-800/50 border border-void-700/50 text-void-300 text-sm font-medium hover:bg-cosmos-500/20 hover:border-cosmos-500/30 hover:text-cosmos-300 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {keyword}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-8 text-center text-void-600 text-sm">
          <p>輸入關鍵字開始搜尋，或點擊熱門搜尋快速探索</p>
        </div>
      </div>
    </div>
  );
}
