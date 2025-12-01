import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { getSuggestions, logClick, logSearchInput } from '../api/searchApi';
import { SuggestionsDropdown } from './SuggestionsDropdown';
import type { Suggestion } from '../types';
import { DEMO_USER_ID } from '../types';

interface SearchBarProps {
  initialQuery?: string;
  centered?: boolean;
  onSearch?: (query: string) => void;
}

export function SearchBar({ initialQuery = '', centered = false, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 200);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim() === '') {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await getSuggestions(debouncedQuery, DEMO_USER_ID);
        setSuggestions(response.suggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim() === '') return;

    // Log the search input
    try {
      await logSearchInput({
        userId: DEMO_USER_ID,
        keyword: searchQuery,
        device: 'web',
        clientAppVersion: '1.0.0',
      });
    } catch (error) {
      console.error('Failed to log search input:', error);
    }

    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    }
  }, [navigate, onSearch]);

  const handleSuggestionClick = useCallback(async (suggestion: Suggestion) => {
    // Log the click
    try {
      await logClick({
        userId: DEMO_USER_ID,
        keyword: query,
        suggestion: suggestion.text,
        suggestionType: suggestion.type,
        worldId: suggestion.worldId,
        position: suggestion.position,
      });
    } catch (error) {
      console.error('Failed to log click:', error);
    }

    setShowSuggestions(false);

    if (suggestion.type === 'keyword') {
      // Navigate to search results page
      setQuery(suggestion.text);
      if (onSearch) {
        onSearch(suggestion.text);
      } else {
        navigate(`/search?query=${encodeURIComponent(suggestion.text)}`);
      }
    } else if (suggestion.type === 'world' && suggestion.worldId) {
      // Navigate directly to world detail page
      navigate(`/worlds/${suggestion.worldId}`);
    }
  }, [query, navigate, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(query);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full ${centered ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}
    >
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cosmos-500 via-nebula-500 to-cosmos-500 rounded-2xl opacity-0 group-focus-within:opacity-75 blur transition-all duration-300" />
        
        {/* Search input container */}
        <div className="relative flex items-center bg-void-900/90 backdrop-blur-md rounded-2xl border border-void-700/50 overflow-hidden transition-all duration-200 group-focus-within:border-cosmos-500/50">
          {/* Search icon */}
          <div className="pl-4 pr-2 text-void-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="搜尋 Worlds..."
            className="flex-1 py-3.5 pr-4 bg-transparent text-void-100 placeholder-void-500 focus:outline-none font-sans text-base"
          />

          {/* Loading indicator */}
          {isLoading && (
            <div className="pr-4">
              <div className="w-5 h-5 border-2 border-cosmos-500/30 border-t-cosmos-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Clear button */}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="pr-4 text-void-400 hover:text-void-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Search button */}
          <button
            onClick={() => handleSearch(query)}
            className="px-5 py-3.5 bg-gradient-to-r from-cosmos-600 to-cosmos-500 text-white font-medium hover:from-cosmos-500 hover:to-cosmos-400 transition-all duration-200"
          >
            搜尋
          </button>
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <SuggestionsDropdown
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSuggestionClick}
          onHover={setSelectedIndex}
        />
      )}
    </div>
  );
}
