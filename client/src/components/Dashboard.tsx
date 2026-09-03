import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import BookCard from './BookCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import ConfirmRemoveBookModal from './ConfirmRemoveBookModal';
import { BookShelfEntity, BookShelfResponse } from '../interfaces/books';
import { removeFromBookshelfErrorKey } from '../utils/helpers';

interface DashboardProps {
  onLogout: () => void;
  triggerLogout?: boolean;
  setTriggerLogout?: (value: boolean) => void;
}

export function Dashboard({ onLogout, triggerLogout, setTriggerLogout }: DashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookShelfEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookToRemove, setBookToRemove] = useState<BookShelfEntity | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBookshelf();
    const handleUpdate = () => {
      setFilterStatus(null);
      setSearchQuery('');
      loadBookshelf();
    };
    window.addEventListener('bookshelfUpdated', handleUpdate);
    return () => {
      window.removeEventListener('bookshelfUpdated', handleUpdate);
    };
  }, []);

  const loadBookshelf = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<BookShelfResponse>('/bookshelf');
      setBooks(response.data.books || []);
    } catch (err: any) {
      try {
        const offline = await api.get<BookShelfResponse>('/offline/bookshelf');
        setBooks(offline.data?.books || []);
      } catch {
        setError(err.response?.data?.error || t('dashboard.loadError', 'Failed to load bookshelf'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Status counts
  const counts = useMemo(() => {
    let notStarted = 0;
    let started = 0;
    let concluded = 0;

    for (const b of books) {
      const s = +b.status;
      const pos = b.abookMark?.pos || 0;
      if (s === 3) {
        concluded += 1;
      } else if (s === 2 || (pos > 0 && s !== 3)) {
        started += 1;
      } else {
        notStarted += 1;
      }
    }

    return {
      all: books.length,
      notStarted,
      started,
      concluded,
    };
  }, [books]);

  // Filtered and sorted books
  const filteredBooks = useMemo(() => {
    if (books.length === 0) return [];

    let result = [...books];

    // Filter by status if selected
    if (filterStatus !== null) {
      result = result.filter((book) => {
        const s = +book.status;
        const pos = book.abookMark?.pos || 0;
        if (filterStatus === 1) {
          return s === 1 && pos === 0;
        }
        if (filterStatus === 2) {
          return s === 2 || (pos > 0 && s !== 3);
        }
        if (filterStatus === 3) {
          return s === 3;
        }
        return s === filterStatus;
      });
    }

    // Filter by local search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.book?.name?.toLowerCase().includes(q) ||
          book.book?.authorsAsString?.toLowerCase().includes(q) ||
          book.abook?.narratorAsString?.toLowerCase().includes(q)
      );
    }

    // Sort by most recently updated
    result.sort((a, b) => {
      const getTimestamp = (book: BookShelfEntity): number => {
        if (book.positionUpdatedTime) return new Date(book.positionUpdatedTime).getTime();
        if (book.stateUpdateTime) return new Date(book.stateUpdateTime).getTime();
        return 0;
      };
      return getTimestamp(b) - getTimestamp(a);
    });

    return result;
  }, [books, filterStatus, searchQuery]);

  const handleBookSelect = (book: BookShelfEntity) => {
    const bookId = book.abook?.id || book.id;
    navigate(`/book/${bookId}`, {
      state: { book },
    });
  };

  const handleQuickPlay = (e: React.MouseEvent, book: BookShelfEntity) => {
    e.stopPropagation();
    const bookId = book.abook?.id || book.id;
    navigate(`/player/${bookId}`, {
      state: { book, autoPlay: true },
    });
  };

  const handleRemoveBook = async () => {
    if (!bookToRemove || isRemoving) return;
    const consumableId = bookToRemove.book?.consumableId || bookToRemove.id;
    if (!consumableId) return;

    try {
      setIsRemoving(true);
      await api.post('/bookshelf/remove', { consumableId: String(consumableId) });
      setBookToRemove(null);
      setBooks((prev) => prev.filter((b) => b !== bookToRemove));
      setToastMessage({ type: 'success', text: t('bookshelf.removed', 'Removed from your library') });
      loadBookshelf();
    } catch (err: any) {
      console.error('Failed to remove book from bookshelf:', err);
      setBookToRemove(null);
      setToastMessage({ type: 'error', text: t(removeFromBookshelfErrorKey(err)) });
    } finally {
      setIsRemoving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (isLoading) {
    return <LoadingState message={t('dashboard.loading', 'Loading your library...')} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <ErrorState error={error} onRetry={() => window.location.reload()} onLogout={onLogout} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0A0A0A] text-white selection:bg-[#FF5100] selection:text-white overflow-y-auto custom-scrollbar">
      <main className="max-w-7xl mx-auto py-7 px-6 pb-28">
        {/* Top Header & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{t('dashboard.title', 'My Library')}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-white/10 text-gray-400">
                {t('dashboard.bookCount', { count: books.length })}
              </span>
            </h1>
          </div>

          {/* Quick filter in library */}
          <div className="relative w-full md:w-72">
            <div className="relative flex items-center bg-[#1A1A1A] border border-white/[0.08] focus-within:border-[#FF5100]/60 focus-within:ring-1 focus-within:ring-[#FF5100]/30 rounded-xl px-3.5 h-10 transition-all shadow-inner">
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0 mr-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('dashboard.search', 'Search my library...')}
                className="w-full bg-transparent text-white placeholder-gray-500 text-xs focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white ml-1.5 p-1 rounded-full hover:bg-white/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Status Tabs */}
        <div className="flex items-center gap-2 mb-7 overflow-x-auto pb-1 no-scrollbar border-b border-white/[0.06] pt-1">
          {[
            { status: null, label: 'Alla', count: counts.all },
            { status: 2, label: t('dashboard.filters.started', 'Started'), count: counts.started },
            { status: 1, label: t('dashboard.filters.notStarted', 'Not started'), count: counts.notStarted },
            { status: 3, label: t('dashboard.filters.concluded', 'Concluded'), count: counts.concluded },
          ].map(({ status, label, count }) => {
            const isActive = filterStatus === status;
            return (
              <button
                key={String(status)}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                  isActive
                    ? 'bg-[#FF5100]/15 text-[#FF5100] border border-[#FF5100]/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[#FF5100] text-white' : 'bg-[#222225] text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Book Grid */}
        {books.length === 0 ? (
          <div className="text-center py-20 bg-[#141414] border border-white/[0.06] rounded-3xl p-8 max-w-lg mx-auto shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center text-gray-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mb-1">
              {t('dashboard.noBooks', 'No books found')}
            </h3>
            <p className="text-gray-400 text-xs max-w-sm mx-auto mb-5">
              {t('dashboard.emptyLibrary', 'Your library appears to be empty.')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="px-5 py-2.5 rounded-xl bg-[#FF5100] text-white text-xs font-bold shadow-lg shadow-[#FF5100]/30 hover:brightness-110 active:scale-95 transition-all"
            >
              {t('dashboard.exploreCatalog', 'Explore the catalog (⌘K)')}
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-[#141414] border border-white/[0.06] rounded-3xl p-8 space-y-3 max-w-lg mx-auto shadow-xl">
            <p className="text-gray-300 text-sm font-medium">{t('dashboard.noFilterMatch', 'No books matched your filter.')}</p>
            <button
              type="button"
              onClick={() => {
                setFilterStatus(null);
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold transition-all"
            >
              {t('dashboard.resetFilters', 'Reset filters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {filteredBooks
              .filter((book) => !!book?.abook || !!book?.book)
              .map((book) => (
                <BookCard
                  key={book.abook?.id || book.id || book.book?.consumableId}
                  book={book}
                  onBookSelect={handleBookSelect}
                  onRemove={setBookToRemove}
                  onQuickPlay={handleQuickPlay}
                />
              ))}
          </div>
        )}
      </main>

      <ConfirmRemoveBookModal
        isOpen={!!bookToRemove}
        bookTitle={bookToRemove?.book?.name || ''}
        isRemoving={isRemoving}
        onConfirm={handleRemoveBook}
        onCancel={() => setBookToRemove(null)}
      />

      {toastMessage && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xl backdrop-blur-md border animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-green-950/90 text-green-300 border-green-700/50'
              : 'bg-red-950/90 text-red-300 border-red-700/50'
          }`}
        >
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
