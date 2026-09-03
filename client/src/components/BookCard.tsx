import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildCoverUrl, formatMicrosecondsTime } from '../utils/helpers';
import { BookShelfEntity } from '../interfaces/books';

interface BookCardProps {
  book: BookShelfEntity;
  onBookSelect: (book: BookShelfEntity) => void;
  onRemove?: (book: BookShelfEntity) => void;
  onQuickPlay?: (e: React.MouseEvent, book: BookShelfEntity) => void;
}

export function BookCard({ book, onBookSelect, onRemove, onQuickPlay }: BookCardProps) {
  const { t } = useTranslation();

  const position = book.abookMark ? book.abookMark.pos : 0;
  const totalDuration = book.abook?.time || 0;
  const remainingTime = Math.max(totalDuration - position, 0);

  const progressPercent =
    totalDuration > 0 ? Math.min(Math.max((position / totalDuration) * 100, 0), 100) : 0;

  const isFinished = book.status === 3 || (totalDuration > 0 && position >= totalDuration * 0.98);
  const isStarted = position > 0 && !isFinished;

  const coverUrl =
    book?.book?.largeCover ||
    book?.book?.largeCoverE ||
    book?.book?.cover ||
    book?.book?.coverE ||
    book?.book?.smallCover;

  return (
    <div
      onClick={() => onBookSelect(book)}
      className="group flex flex-col bg-[#141414] hover:bg-[#1A1A1A] border border-white/[0.06] hover:border-white/15 rounded-2xl p-3 transition-all duration-200 shadow-md hover:shadow-xl cursor-pointer select-none relative overflow-hidden"
    >
      {/* Remove Button (Hover top-right) */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(book);
          }}
          title={t('bookshelf.remove', 'Remove from library')}
          aria-label={t('bookshelf.remove', 'Remove from library')}
          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-white hover:bg-red-600/90 focus:outline-none transition-all flex items-center justify-center shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}

      {/* Book Cover Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-md bg-gray-900 flex items-center justify-center flex-shrink-0">
        {coverUrl ? (
          <img
            src={buildCoverUrl(coverUrl)}
            alt={book?.book?.name || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}

        {/* Quick Play Overlay Button */}
        <div
          onClick={(e) => {
            if (onQuickPlay) {
              onQuickPlay(e, book);
            }
          }}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-[#FF5100] text-white flex items-center justify-center shadow-xl shadow-[#FF5100]/40 transform scale-90 group-hover:scale-100 transition-transform active:scale-95">
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Format Badge (Audio / Ebook) */}
        {book.abook && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white/90 uppercase tracking-wider">
            {t('search.audiobook', 'Audiobook')}
          </span>
        )}
      </div>

      {/* Book Metadata */}
      <div className="flex-1 flex flex-col justify-between mt-2.5 min-w-0">
        <div>
          <h3
            className="text-white font-bold text-sm line-clamp-2 leading-snug group-hover:text-[#FF5100] transition-colors"
            title={book?.book?.name || ''}
          >
            {book?.book?.name || '—'}
          </h3>
          <p className="text-xs text-[#9ca3af] mt-1 truncate">
            {book?.book?.authorsAsString || '—'}
          </p>
        </div>

        {/* Progress bar / Duration readout */}
        <div className="mt-3 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
            <span className="truncate">
              {isFinished
                ? t('dashboard.filters.concluded', 'Concluded')
                : isStarted
                ? `${formatMicrosecondsTime(remainingTime)} ${t('bookCard.remaining', 'remaining')}`
                : totalDuration > 0
                ? formatMicrosecondsTime(totalDuration)
                : t('dashboard.filters.notStarted', 'Not started')}
            </span>
            {isStarted && (
              <span className="font-mono font-semibold text-gray-500 tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            )}
          </div>

          <div className="w-full h-1 bg-[#222225] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isFinished ? 'bg-green-500' : 'bg-[#FF5100]'
              }`}
              style={{
                width: `${isFinished ? 100 : isStarted ? progressPercent : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookCard;
