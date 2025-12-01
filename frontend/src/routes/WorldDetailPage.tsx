import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { getWorld } from '../api/worldsApi';
import type { World } from '../types';

export function WorldDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [world, setWorld] = useState<World | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorld = async () => {
      if (!id) {
        setError('無效的 World ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await getWorld(id);
        setWorld(data);
      } catch (err) {
        console.error('Failed to fetch world:', err);
        setError(err instanceof Error ? err.message : '載入 World 時發生錯誤');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorld();
  }, [id]);

  // Format date
  const formattedDate = world
    ? new Date(world.createdAt).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="min-h-screen bg-void-950">
      <Navbar showSearch />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-void-400 hover:text-cosmos-300 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回首頁
        </Link>

        {/* Loading state */}
        {isLoading && (
          <div className="animate-pulse">
            {/* Hero placeholder */}
            <div className="aspect-video w-full rounded-2xl bg-void-800/50 mb-8" />
            
            {/* Title placeholder */}
            <div className="h-10 w-3/4 bg-void-800 rounded-lg mb-4" />
            
            {/* Meta placeholder */}
            <div className="h-4 w-48 bg-void-800/70 rounded mb-8" />
            
            {/* Description placeholder */}
            <div className="space-y-3">
              <div className="h-4 w-full bg-void-800/50 rounded" />
              <div className="h-4 w-full bg-void-800/50 rounded" />
              <div className="h-4 w-2/3 bg-void-800/50 rounded" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">無法載入 World</h2>
            <p className="text-void-400 mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cosmos-500/20 text-cosmos-300 hover:bg-cosmos-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              返回首頁
            </Link>
          </div>
        )}

        {/* World content */}
        {world && !isLoading && (
          <article className="animate-fade-in">
            {/* Hero section */}
            <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-cosmos-600/30 via-nebula-600/20 to-cosmos-500/30 mb-8 overflow-hidden relative">
              {/* Decorative elements */}
              <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cosmos-400/20 rounded-full blur-2xl" />
                <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-nebula-400/20 rounded-full blur-2xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/5 rounded-full blur-xl" />
              </div>
              
              {/* World icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-void-900/50 backdrop-blur-sm flex items-center justify-center border border-void-700/50">
                  <svg className="w-12 h-12 text-cosmos-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              {world.title}
            </h1>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-void-400 mb-8">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                World
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-void-700 to-transparent mb-8" />

            {/* Description */}
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-void-300 leading-relaxed whitespace-pre-wrap">
                {world.description}
              </p>
            </div>

            {/* Related section placeholder */}
            <div className="mt-16 pt-8 border-t border-void-800/50">
              <h2 className="text-xl font-display font-semibold text-white mb-4">
                相關 Worlds
              </h2>
              <p className="text-void-500 text-sm">
                相關內容功能開發中...
              </p>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
