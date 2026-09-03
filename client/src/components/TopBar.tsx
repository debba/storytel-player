import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageButton from './LanguageButton';

interface TopBarProps {
  onOpenSettings: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function TopBar({ onOpenSettings, searchQuery = '', onSearchChange }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isSearchPage = location.pathname === '/search';
  const isBookshelfPage = location.pathname === '/' || location.pathname.startsWith('/book/');

  // Global Cmd+K / Ctrl+K focus shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        if (!isSearchPage) {
          navigate('/search');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchPage, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    }
    if (!isSearchPage) {
      navigate(`/search?q=${encodeURIComponent(val)}`);
    } else {
      if (val) {
        setSearchParams({ q: val }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }
  };

  const handleInputFocus = () => {
    if (!isSearchPage) {
      const q = searchQuery || searchParams.get('q') || '';
      navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    }
  };

  const handleClear = () => {
    if (onSearchChange) onSearchChange('');
    if (isSearchPage) {
      setSearchParams({}, { replace: true });
    }
    searchInputRef.current?.focus();
  };

  return (
    <header className="h-16 px-5 gap-3.5 bg-[#0A0A0A] border-b border-white/[0.05] flex items-center justify-between z-40 select-none flex-shrink-0">
      {/* 1. Logo */}
      <button
        onClick={() => navigate('/')}
        className="w-10 h-10 rounded-2xl bg-[#FF5100] flex items-center justify-center shadow-lg shadow-[#FF5100]/20 hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
        title="Storytel"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
        </svg>
      </button>

      {/* 2. Bookshelf Button */}
      <button
        onClick={() => navigate('/')}
        className={`h-[38px] px-3.5 rounded-[10px] flex items-center gap-2 text-sm font-medium transition-all flex-shrink-0 ${
          isBookshelfPage
            ? 'bg-[#1A1A1A] text-white border border-white/10 shadow-sm'
            : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]/60'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>{t('dashboard.title', 'My Library')}</span>
      </button>

      {/* 3. Search Field */}
      <div className="flex-grow max-w-2xl mx-1 relative">
        <div className="relative flex items-center h-11 rounded-[12px] bg-[#1A1A1A] border border-white/[0.08] focus-within:border-[#FF5100]/60 focus-within:ring-1 focus-within:ring-[#FF5100]/30 transition-all px-3.5 shadow-inner">
          <svg className="w-4 h-4 text-gray-400 mr-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={t('search.placeholder', 'Search by title, author, or narrator...')}
            className="w-full bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
          />
          {searchQuery ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 ml-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center text-[11px] font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 ml-1.5">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* 4. Language Button */}
      <LanguageButton variant="topbar" className="flex-shrink-0" />

      {/* 5. Settings Button */}
      <button
        onClick={onOpenSettings}
        title={t('settings.title', 'Settings')}
        className="w-[38px] h-[38px] rounded-[10px] bg-[#1A1A1A] hover:bg-[#2C2C2E] border border-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
}

export default TopBar;
