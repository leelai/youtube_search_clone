import { Link } from 'react-router-dom';
import type { WorldCard as WorldCardType } from '../types';

interface WorldCardProps {
  world: WorldCardType;
  index?: number;
}

export function WorldCard({ world, index = 0 }: WorldCardProps) {
  // Format date
  const formattedDate = new Date(world.createdAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      to={`/worlds/${world.id}`}
      className="group block animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-4 p-4 rounded-xl bg-void-900/50 border border-void-800/50 hover:border-cosmos-500/30 hover:bg-void-800/50 transition-all duration-300">
        {/* Thumbnail placeholder */}
        <div className="flex-shrink-0 w-40 h-24 rounded-lg bg-gradient-to-br from-cosmos-600/30 via-nebula-600/20 to-cosmos-500/30 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-cosmos-400/30 blur-lg" />
              <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-nebula-400/30 blur-lg" />
            </div>
            
            {/* World icon */}
            <svg className="w-10 h-10 text-cosmos-300/70 group-hover:text-cosmos-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Title */}
            <h3 className="text-lg font-semibold text-void-100 group-hover:text-cosmos-300 transition-colors line-clamp-1">
              {world.title}
            </h3>

            {/* Description */}
            <p className="mt-1 text-sm text-void-400 line-clamp-2">
              {world.description}
            </p>
          </div>

          {/* Meta info */}
          <div className="mt-2 flex items-center gap-3 text-xs text-void-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 self-center text-void-600 group-hover:text-cosmos-400 transition-colors">
          <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
