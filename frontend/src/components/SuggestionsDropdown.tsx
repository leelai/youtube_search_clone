import type { Suggestion } from '../types';

interface SuggestionsDropdownProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onHover: (index: number) => void;
}

// Source badge colors and labels
const sourceConfig: Record<string, { label: string; className: string }> = {
  user_history: {
    label: '歷史',
    className: 'bg-cosmos-500/20 text-cosmos-300 border-cosmos-500/30',
  },
  trending: {
    label: '熱門',
    className: 'bg-nebula-500/20 text-nebula-300 border-nebula-500/30',
  },
  world_title: {
    label: 'World',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  fuzzy: {
    label: '相似',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export function SuggestionsDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
}: SuggestionsDropdownProps) {
  return (
    <div className="absolute z-50 w-full mt-2 py-2 bg-void-900/95 backdrop-blur-xl rounded-xl border border-void-700/50 shadow-2xl shadow-black/50 animate-slide-down overflow-hidden">
      {suggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        const source = sourceConfig[suggestion.source] || sourceConfig.fuzzy;

        return (
          <button
            key={`${suggestion.type}-${suggestion.text}-${index}`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHover(index)}
            className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 ${
              isSelected
                ? 'bg-cosmos-500/20 border-l-2 border-cosmos-500'
                : 'hover:bg-void-800/50 border-l-2 border-transparent'
            }`}
          >
            {/* Icon based on type */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              suggestion.type === 'world' 
                ? 'bg-gradient-to-br from-cosmos-500/30 to-nebula-500/30' 
                : 'bg-void-700/50'
            }`}>
              {suggestion.type === 'world' ? (
                <svg className="w-4 h-4 text-cosmos-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-void-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`truncate font-medium ${
                  isSelected ? 'text-white' : 'text-void-200'
                }`}>
                  {suggestion.text}
                </span>
                
                {/* Source badge */}
                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full border ${source.className}`}>
                  {source.label}
                </span>
              </div>

              {/* Score breakdown (for debugging) */}
              {suggestion.scores && (
                <div className="mt-1 flex items-center gap-2 text-xs text-void-500 font-mono">
                  <span>分數: {suggestion.scores.finalScore.toFixed(1)}</span>
                  <span className="text-void-600">|</span>
                  <span>前綴: {suggestion.scores.prefixScore.toFixed(0)}</span>
                  <span>個人: {suggestion.scores.personalScore.toFixed(0)}</span>
                  <span>熱門: {suggestion.scores.trendingScore.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Arrow indicator for world suggestions */}
            {suggestion.type === 'world' && (
              <div className="flex-shrink-0 text-void-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}

      {/* Footer hint */}
      <div className="px-4 py-2 mt-1 border-t border-void-700/50 text-xs text-void-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-void-800 rounded text-void-400 font-mono">↑↓</kbd>
          選擇
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-void-800 rounded text-void-400 font-mono">Enter</kbd>
          確認
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-void-800 rounded text-void-400 font-mono">Esc</kbd>
          關閉
        </span>
      </div>
    </div>
  );
}
