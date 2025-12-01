import { Link } from 'react-router-dom';
import { SearchBar } from './SearchBar';

interface NavbarProps {
  showSearch?: boolean;
  initialQuery?: string;
  onSearch?: (query: string) => void;
}

export function Navbar({ showSearch = true, initialQuery = '', onSearch }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 bg-void-950/80 backdrop-blur-xl border-b border-void-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cosmos-500 to-nebula-500 flex items-center justify-center transform group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">
              Worlds
            </span>
          </Link>

          {/* Search bar */}
          {showSearch && (
            <div className="flex-1 max-w-2xl">
              <SearchBar initialQuery={initialQuery} onSearch={onSearch} />
            </div>
          )}

          {/* Right side placeholder */}
          <div className="flex-shrink-0 w-20" />
        </div>
      </div>
    </nav>
  );
}
