import React from 'react';
import { useTranslation } from 'react-i18next';
import { SearchResultBook } from '../interfaces/books';
import { buildCoverUrl, formatMicrosecondsTime } from '../utils/helpers';

export type SortOption = 'relevance' | 'title' | 'duration';

interface SearchResultListProps {
  results: SearchResultBook[];
  totalRawHits: number;
  selectedBookId: string | null;
  onSelectBook: (book: SearchResultBook) => void;
  onPlayBook: (e: React.MouseEvent, bookId: string) => void;
  onAddToLibrary: (e: React.MouseEvent, bookId: string) => void;
  addedBooks: Record<string, boolean>;
  addingBookId: string | null;
  sortBy: SortOption;
  onChangeSort: (sort: SortOption) => void;
}

export function SearchResultList({
  results,
  totalRawHits,
  selectedBookId,
  onSelectBook,
  onPlayBook,
  onAddToLibrary,
  addedBooks,
  addingBookId,
  sortBy,
  onChangeSort,
}: SearchResultListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A] overflow-hidden">
      {/* 1. Header Row (46px) */}
      <div className="h-[46px] px-6 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0 select-none">
        <span className="text-xs font-semibold text-gray-400">
          {results.length === totalRawHits
            ? t('search.hitCount', { count: results.length })
            : t('search.hitCountFiltered', { count: results.length, total: totalRawHits })}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 font-medium">{t('search.sortLabel', 'Sort:')}</span>
          <select
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value as SortOption)}
            className="h-7 px-2.5 rounded-[8px] bg-[#1A1A1A] border border-white/10 text-xs text-gray-200 outline-none focus:border-[#FF5100]"
          >
            <option value="relevance">{t('search.sortRelevance', 'Most relevant')}</option>
            <option value="title">{t('search.sortTitle', 'Title (A–Z)')}</option>
            <option value="duration">{t('search.sortDuration', 'Longest first')}</option>
          </select>
        </div>
      </div>

      {/* 2. Scrollable Cards Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar">
        {results.map((book) => {
          const isSelected = selectedBookId === book.id;
          const isAdded = addedBooks[book.id];
          const isAdding = addingBookId === book.id;
          const durationText =
            book.durationMs > 0 ? formatMicrosecondsTime(book.durationMs * 1000) : '';

          return (
            <div
              key={book.id}
              onClick={() => onSelectBook(book)}
              className={`group flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#FF5100]/10 border-[#FF5100]/45 shadow-md shadow-[#FF5100]/10'
                  : 'bg-[#141414] hover:bg-[#242426] border-white/[0.06] hover:border-white/15 shadow-sm'
              }`}
            >
              {/* Cover Art (64x64) */}
              <div className="w-16 h-16 rounded-[10px] bg-gray-900 overflow-hidden flex-shrink-0 relative shadow">
                {book.coverUrl ? (
                  <img
                    src={buildCoverUrl(book.coverUrl)}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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

              {/* Details & Badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  {book.hasAbook && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#FF5100]/20 text-[#FF5100] border border-[#FF5100]/30">
                      {t('search.audiobook', 'Audiobook')}
                    </span>
                  )}
                  {book.hasEbook && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[#60a5fa] border border-blue-500/30">
                      {t('search.ebook', 'E-book')}
                    </span>
                  )}
                  {book.language && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10">
                      {book.language.toUpperCase()}
                    </span>
                  )}
                  {durationText && (
                    <span className="text-xs text-gray-400 font-medium ml-1">
                      {durationText}
                    </span>
                  )}
                  {book.category && (
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">
                      • {book.category}
                    </span>
                  )}
                </div>

                <h3 className="text-[15px] font-bold text-white truncate group-hover:text-[#FF5100] transition-colors">
                  {book.title}
                </h3>

                <p className="text-[13px] text-[#9ca3af] truncate mt-0.5">
                  {book.authors}
                  {book.narrators && ` · ${book.narrators}`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Add / In Library Button */}
                <button
                  type="button"
                  onClick={(e) => onAddToLibrary(e, book.id)}
                  title={isAdded ? t('search.addedToBookshelf', 'Added to Library') : t('search.addToBookshelf', 'Add to Library')}
                  disabled={isAdded || isAdding}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                    isAdded
                      ? 'bg-green-600/20 text-green-400 border border-green-500/40 cursor-default'
                      : isAdding
                      ? 'bg-white/10 text-white animate-pulse'
                      : 'bg-[#1A1A1A] hover:bg-[#2C2C2E] text-gray-300 hover:text-white border border-white/10'
                  }`}
                >
                  {isAdded ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isAdding ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>

                {/* Play Button */}
                <button
                  type="button"
                  onClick={(e) => onPlayBook(e, book.id)}
                  title={t('search.play', 'Play')}
                  className={`h-9 px-3.5 rounded-full font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    isSelected
                      ? 'bg-[#FF5100] hover:bg-[#ff641a] text-white shadow-[#FF5100]/30'
                      : 'bg-white/10 hover:bg-[#FF5100] text-white hover:shadow-[#FF5100]/25'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>{t('search.play', 'Play')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SearchResultList;
