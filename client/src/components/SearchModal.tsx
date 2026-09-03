import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { SearchResultBook, SearchResponse } from '../interfaces/books';
import { addToBookshelfErrorKey, buildCoverUrl, formatMicrosecondsTime, localizedLanguageName, searchResultToBookEntity } from '../utils/helpers';
import { FALLBACK_LANGUAGE } from '../config/languages';
import { preferredCatalogLanguages } from '../config/regions';
import { getLanguageState } from '../i18n';
import storage from '../utils/storage';

/** Remembers the user's catalog-search language filter across sessions. */
const SEARCH_LANGUAGES_KEY = 'searchLanguageFilter';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [addedBooks, setAddedBooks] = useState<Record<string, boolean>>({});
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  // null = follow the suggestion below; [] = explicitly show every language.
  const [manualLanguages, setManualLanguages] = useState<string[] | null>(null);
  // Languages this user is likely to read, from their OS languages and country.
  const [suggestedLanguages, setSuggestedLanguages] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setResults([]);
      setIsLoading(false);
      setSearchedQuery('');
      setToastMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Storytel localises `languageName` for the *account's market*, not for the
  // app UI: a Swedish-market account gets "Svenska"/"Engelska" back even while
  // the app is running in Italian. So name the language ourselves in the
  // current UI language, and only fall back to Storytel's own label when the
  // result carries no ISO code we can translate.
  const getLanguageLabel = (isoCode: string, apiName?: string): string => {
    return localizedLanguageName(isoCode, i18n.language || FALLBACK_LANGUAGE, apiName);
  };

  const languageStats = useMemo(() => {
    const counts: Record<string, { iso: string; name: string; count: number }> = {};
    for (const book of results) {
      if (!book.language) continue;
      const iso = book.language.toLowerCase();
      const name = getLanguageLabel(iso, book.languageName);
      if (!counts[iso]) {
        counts[iso] = { iso, name, count: 0 };
      }
      counts[iso].count += 1;
    }
    return Object.values(counts);
  }, [results, i18n.language]);

  const availableLanguages = useMemo(
    () => languageStats.map((stat) => stat.iso),
    [languageStats]
  );

  // Load the remembered filter, and work out which languages to suggest from
  // the user's OS languages and the country they are in. Storytel gives us no
  // country of its own - the account's market only shows up indirectly, in
  // which languages the catalog actually returns - so the suggestion is
  // intersected with `availableLanguages` below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stored, languageState] = await Promise.all([
          storage.get(SEARCH_LANGUAGES_KEY),
          getLanguageState(),
        ]);
        if (cancelled) return;

        setSuggestedLanguages(
          preferredCatalogLanguages({
            region: languageState.region,
            systemLanguages: languageState.systemLanguages,
            uiLanguage: languageState.resolved,
          })
        );

        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (Array.isArray(parsed)) {
          setManualLanguages(parsed.map(String));
        }
      } catch {
        // No stored filter, or storage unavailable: fall back to showing all.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A choice the user made wins. Otherwise pre-select the languages they are
  // likely to read - but only when that actually narrows anything down, so we
  // never hide results for no reason.
  const activeLanguages = useMemo(() => {
    if (manualLanguages) return manualLanguages;
    const suggested = suggestedLanguages.filter((iso) => availableLanguages.includes(iso));
    return suggested.length > 0 && suggested.length < availableLanguages.length
      ? suggested
      : [];
  }, [manualLanguages, suggestedLanguages, availableLanguages]);

  // Always render a pill for a selected language, even when this search
  // returned nothing in it - otherwise a sticky filter would silently empty
  // the list with no visible cause and no way back.
  const languageOptions = useMemo(() => {
    const options = [...languageStats];
    for (const iso of activeLanguages) {
      if (!options.some((option) => option.iso === iso)) {
        options.push({ iso, name: getLanguageLabel(iso), count: 0 });
      }
    }
    return options;
  }, [languageStats, activeLanguages, i18n.language]);

  const isAutoFiltered = manualLanguages === null && activeLanguages.length > 0;

  // Selecting every language means the same thing as selecting none, so let
  // "All" stay lit rather than showing two different-looking identical states.
  const showingEverything =
    activeLanguages.length === 0 ||
    (availableLanguages.length > 0 &&
      availableLanguages.every((iso) => activeLanguages.includes(iso)));

  const persistLanguages = (next: string[]) => {
    setManualLanguages(next);
    Promise.resolve(storage.set(SEARCH_LANGUAGES_KEY, JSON.stringify(next))).catch(() => {
      // Filtering still works this session even if it cannot be remembered.
    });
  };

  const toggleLanguage = (iso: string) => {
    persistLanguages(
      activeLanguages.includes(iso)
        ? activeLanguages.filter((code) => code !== iso)
        : [...activeLanguages, iso]
    );
  };

  const filteredResults = useMemo(() => {
    if (activeLanguages.length === 0) return results;
    return results.filter((b) => activeLanguages.includes((b.language || '').toLowerCase()));
  }, [results, activeLanguages]);

  // Desktop-sized target: 36px tall with real hover and focus states, rather
  // than a row of tap-sized chips that scroll out of view.
  const pillClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5100] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161618] ${
      isActive
        ? 'bg-[#FF5100] text-white shadow-md shadow-[#FF5100]/25'
        : 'bg-[#222225] hover:bg-[#33333A] text-gray-200 hover:text-white border border-white/10'
    }`;

  const countClass = (isActive: boolean) =>
    `px-1.5 min-w-[1.5rem] text-center rounded-full text-[11px] font-bold leading-5 ${
      isActive ? 'bg-black/25 text-white' : 'bg-white/10 text-gray-400'
    }`;

  const performSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) {
      setResults([]);
      setIsLoading(false);
      setSearchedQuery('');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get<SearchResponse>(`/search?q=${encodeURIComponent(q)}`);
      const searchResults = res.data?.results || [];
      setResults(searchResults);
      setSearchedQuery(q);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setSearchedQuery(q);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setSearchedQuery('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  const handlePlayBook = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    onClose();
    const targetBook = results.find((b) => b.id === bookId) || null;
    const entity = targetBook ? searchResultToBookEntity(targetBook) : null;
    navigate(`/player/${bookId}`, { state: { book: entity, autoPlay: true } });
  };

  const handleViewDetails = (bookId: string) => {
    onClose();
    navigate(`/book/${bookId}`);
  };

  const handleAddToBookshelf = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (addedBooks[bookId] || addingBookId === bookId) return;

    try {
      setAddingBookId(bookId);
      await api.post('/bookshelf/add', { consumableId: bookId });
      setAddedBooks((prev) => ({ ...prev, [bookId]: true }));
      window.dispatchEvent(new Event('bookshelfUpdated'));
      setToastMessage({
        type: 'success',
        text: t('search.addedToBookshelf', 'Added to Library'),
      });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to add book to library:', err);
      setToastMessage({
        type: 'error',
        text: t(addToBookshelfErrorKey(err)),
      });
      setTimeout(() => setToastMessage(null), 4500);
    } finally {
      setAddingBookId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4 pb-24 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative bg-[#141414] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[82vh] transition-all transform animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Search Bar */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-[#1A1A1A]">
          <div className="text-gray-400 pl-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-base focus:outline-none"
            placeholder={t('search.placeholder', 'Search by title, author, or narrator...')}
            value={query}
            onChange={handleInputChange}
          />
          {isLoading && (
            <div className="animate-spin text-[#FF5100] pr-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setSearchedQuery('');
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2.5 py-1 text-xs bg-[#2C2C2E] hover:bg-gray-700 rounded-lg transition-colors border border-white/5"
          >
            Esc
          </button>
        </div>

        {/* Language filter. Multi-select: in Finland you may want Swedish and
            Finnish at once, in Italy Italian and German. */}
        {results.length > 0 && languageOptions.length > 1 && (
          <div className="px-4 py-3 border-b border-white/10 bg-[#161618]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
                {t('search.filterByLanguage')}
              </span>

              <button
                type="button"
                onClick={() => persistLanguages([])}
                aria-pressed={showingEverything}
                className={pillClass(showingEverything)}
              >
                <span>{t('search.allLanguages')}</span>
                <span className={countClass(showingEverything)}>{results.length}</span>
              </button>

              {languageOptions.map((stat) => {
                const isSelected = activeLanguages.includes(stat.iso);
                return (
                  <button
                    key={stat.iso}
                    type="button"
                    onClick={() => toggleLanguage(stat.iso)}
                    aria-pressed={isSelected}
                    className={pillClass(isSelected)}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>{stat.name}</span>
                    <span className={countClass(isSelected)}>{stat.count}</span>
                  </button>
                );
              })}
            </div>

            {isAutoFiltered && (
              <p className="mt-2.5 text-xs text-gray-500">
                {t('search.autoFilterHint')}
              </p>
            )}
          </div>
        )}

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`sticky top-0 z-20 mb-3 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 ${
                toastMessage.type === 'success'
                  ? 'bg-green-950/90 text-green-300 border border-green-700/50'
                  : 'bg-red-950/90 text-red-300 border border-red-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-white p-0.5 rounded"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Initial state */}
          {!query && (
            <div className="text-center py-16 text-gray-500 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1A1A1A] border border-white/5 flex items-center justify-center text-gray-400 shadow-inner">
                <svg className="w-7 h-7 text-[#FF5100]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-white">
                {t('search.initialPrompt', "Type to search Storytel's vast catalog of audiobooks")}
              </p>
              <p className="text-xs text-gray-400">
                {t('search.shortcut', 'Press ⌘K / Ctrl+K anytime')}
              </p>
            </div>
          )}

          {/* No results */}
          {searchedQuery && !isLoading && results.length === 0 && (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <p className="text-base">
                {t('search.noResults', 'No books found for')} &quot;<span className="text-white font-medium">{searchedQuery}</span>&quot;
              </p>
              <p className="text-xs text-gray-500">{t('search.noResultsHint')}</p>
            </div>
          )}

          {/* Filtered empty state */}
          {searchedQuery && !isLoading && results.length > 0 && filteredResults.length === 0 && (
            <div className="text-center py-12 text-gray-400 space-y-3">
              <p className="text-sm">
                {t('search.noResultsInLanguages', {
                  languages: activeLanguages.map((iso) => getLanguageLabel(iso)).join(', '),
                })}
              </p>
              <button
                type="button"
                onClick={() => persistLanguages([])}
                className="text-sm text-[#FF5100] hover:underline font-medium"
              >
                {t('search.showAllLanguages', { total: results.length })}
              </button>
            </div>
          )}

          {/* Book Cards */}
          {filteredResults.map((book) => {
            const isAdded = addedBooks[book.id];
            const isAdding = addingBookId === book.id;
            const durationText =
              book.durationMs > 0 ? formatMicrosecondsTime(book.durationMs * 1000) : '';

            return (
              <div
                key={book.id}
                onClick={() => handleViewDetails(book.id)}
                className="group flex items-center gap-4 p-3.5 rounded-2xl bg-[#1A1A1A] hover:bg-[#242426] border border-white/5 hover:border-white/10 cursor-pointer transition-all duration-150 shadow-md"
              >
                {/* Book Cover */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-900 rounded-xl overflow-hidden relative shadow-md">
                  {book.coverUrl ? (
                    <img
                      src={buildCoverUrl(book.coverUrl)}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {book.hasAbook && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#FF5100]/20 text-[#FF5100] border border-[#FF5100]/30">
                        {t('search.audiobook', 'Audiobook')}
                      </span>
                    )}
                    {book.hasEbook && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {t('search.ebook', 'E-book')}
                      </span>
                    )}
                    {book.language && (
                      <span
                        className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10"
                        title={book.languageName || book.language}
                      >
                        {book.language.toUpperCase()}
                      </span>
                    )}
                    {durationText && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                        {durationText}
                      </span>
                    )}
                    {book.category && (
                      <span className="text-xs text-gray-500 hidden sm:inline truncate max-w-[120px]">
                        • {book.category}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#FF5100] transition-colors">
                    {book.title}
                  </h3>

                  {book.authors && (
                    <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5">
                      <span className="text-gray-500">{t('bookCard.author', 'Author:')}</span> {book.authors}
                    </p>
                  )}

                  {book.narrators && (
                    <p className="text-xs text-gray-400 truncate mt-0.5 hidden sm:block">
                      <span className="text-gray-500">{t('bookCard.narrator', 'Narrator:')}</span> {book.narrators}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Add to Library Button */}
                  <button
                    onClick={(e) => handleAddToBookshelf(e, book.id)}
                    title={isAdded ? t('search.addedToBookshelf', 'Added to Library') : t('search.addToBookshelf', 'Add to Library')}
                    disabled={isAdded || isAdding}
                    className={`p-2.5 rounded-xl text-xs font-medium transition-all ${
                      isAdded
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                        : 'bg-[#2C2C2E] hover:bg-[#38383a] text-gray-300 hover:text-white border border-white/5'
                    }`}
                  >
                    {isAdding ? (
                      <div className="animate-spin w-4 h-4 text-[#FF5100]">
                        <svg fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : isAdded ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>

                  {/* Play Button */}
                  <button
                    onClick={(e) => handlePlayBook(e, book.id)}
                    title={t('search.play', 'Play')}
                    className="px-3.5 py-2 rounded-xl bg-[#FF5100] hover:bg-[#ff641a] text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-[#FF5100]/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="hidden sm:inline">{t('search.play', 'Play')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
