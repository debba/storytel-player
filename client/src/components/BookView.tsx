import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {BookShelfEntity} from "../interfaces/books";
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import Navbar from './Navbar';
import {addToBookshelfErrorKey, buildCoverUrl, localizedLanguageName, removeFromBookshelfErrorKey, truncateTitle} from '../utils/helpers';
import ConfirmRemoveBookModal from './ConfirmRemoveBookModal';
import api from '../utils/api';
import "../types/window.d.ts";

function BookView() {
    const {t, i18n} = useTranslation();
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [fetchedBook, setFetchedBook] = useState<BookShelfEntity | null>(null);

    const book: BookShelfEntity | null = location.state?.book || fetchedBook;

    // description and language are not part of the bookshelf payload; they come
    // from the per-book book-details endpoint, fetched lazily below.
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState('');

    useEffect(() => {
        if (!location.state?.book && bookId) {
            setIsLoading(true);
            api.get(`/book-details/${bookId}`)
                .then((res) => {
                    const data = res.data || {};
                    const formats = data.formats || [];
                    const abook = formats.find((f: any) => f.type === 'abook');
                    const ebook = formats.find((f: any) => f.type === 'ebook');
                    const cover = abook?.cover?.url || ebook?.cover?.url || data.cover?.url || '';
                    const authors = (data.authors || []).map((a: any) => a.name).join(', ');
                    const narrators = (data.narrators || []).map((n: any) => n.name).join(', ');
                    const entity: any = {
                        id: bookId,
                        status: 1,
                        book: {
                            name: data.title || '',
                            authorsAsString: authors,
                            consumableId: String(bookId),
                            largeCover: cover,
                            largeCoverE: '',
                            category: { title: data.category?.name || '' },
                            language: { localizedName: '' }
                        },
                        abook: abook ? {
                            id: abook.id || bookId,
                            narratorAsString: narrators,
                            time: (abook.durationInMilliseconds || 0) * 1000,
                            description: data.description || ''
                        } : null,
                        abookMark: null,
                        ebook: ebook || null
                    };
                    setFetchedBook(entity);
                    setDescription(data.description || '');
                    setLanguage(localizedLanguageName(data.language, i18n.language));
                })
                .catch((err) => {
                    console.error('Failed to fetch book details:', err);
                    setError(t('bookView.loadError', 'Failed to load book details'));
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [bookId, location.state, i18n.language, t]);

    useEffect(() => {
        if (book) {
            document.title = truncateTitle(book.book.name);
        }

        return () => {
            document.title = 'Storytel Player';
        };
    }, [book]);

    // Fetch description and language from the book-details endpoint if book was passed via state.
    useEffect(() => {
        const consumableId = book?.book?.consumableId;
        if (!consumableId || fetchedBook) return;
        let cancelled = false;
        api.get(`/book-details/${consumableId}`)
            .then((res) => {
                if (cancelled) return;
                const data = res.data || {};
                setDescription(data.description || '');
                setLanguage(localizedLanguageName(data.language, i18n.language));
            })
            .catch(() => {
                /* keep empty fallbacks on failure */
            });
        return () => {
            cancelled = true;
        };
    }, [book, fetchedBook, i18n.language]);

    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(!!location.state?.book);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [saveToast, setSaveToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSaveToLibrary = async () => {
        if (isSaved || isSaving) return;
        const consumableId = book?.book?.consumableId || bookId;
        if (!consumableId) return;

        try {
            setIsSaving(true);
            await api.post('/bookshelf/add', { consumableId: String(consumableId) });
            setIsSaved(true);
            window.dispatchEvent(new Event('bookshelfUpdated'));
            setSaveToast({
                type: 'success',
                text: t('bookView.savedToLibrary', 'Book added to your library!'),
            });
            setTimeout(() => setSaveToast(null), 3000);
        } catch (err: any) {
            console.error('Failed to add book to bookshelf:', err);
            setSaveToast({
                type: 'error',
                text: t(addToBookshelfErrorKey(err)),
            });
            setTimeout(() => setSaveToast(null), 4500);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveFromLibrary = async () => {
        const consumableId = book?.book?.consumableId || bookId;
        if (!consumableId || isSaving) return;

        try {
            setIsSaving(true);
            await api.post('/bookshelf/remove', { consumableId: String(consumableId) });
            setIsSaved(false);
            setShowRemoveConfirm(false);
            window.dispatchEvent(new Event('bookshelfUpdated'));
            setSaveToast({ type: 'success', text: t('bookshelf.removed') });
            setTimeout(() => setSaveToast(null), 3000);
        } catch (err: any) {
            console.error('Failed to remove book from bookshelf:', err);
            setShowRemoveConfirm(false);
            setSaveToast({ type: 'error', text: t(removeFromBookshelfErrorKey(err)) });
            setTimeout(() => setSaveToast(null), 4500);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePlayBook = () => {
        navigate(`/player/${bookId}`, {state: {book, autoPlay: true}});
    };

    if (isLoading) {
        return <LoadingState message={t('common.loading')}/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => navigate('/')}/>;
    }

    if (!book) {
        return <ErrorState error={t('common.error')} onRetry={() => navigate('/')}/>;
    }

    const formatDuration = (microseconds: number) => {
        const hours = Math.floor(microseconds / 3600000000);
        const minutes = Math.floor((microseconds % 3600000000) / 60000000);
        return `${hours} h ${minutes} min`;
    };

    const getTruncatedDescription = () => {
        if (!description) return t('bookView.noDescription');

        if (description.length <= 250 || showFullDescription) {
            return description;
        }

        return description.substring(0, 250) + '...';
    };

    const shouldShowMoreButton = () => {
        return description.length > 250;
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#FF5100] selection:text-white pb-32">
            <Navbar barTitle={t('bookView.details')} onBackClick={() => navigate('/')}>
                <span>{book.book.name}</span>
            </Navbar>

            {/* Toast Notification */}
            {saveToast && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 bg-green-950/90 text-green-300 border border-green-700/50">
                    <span>{saveToast.text}</span>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center">
                    {/* Book Cover */}
                    <div className="mb-6">
                        <img
                            src={buildCoverUrl(book.book.largeCover || book.book.largeCoverE)}
                            alt={book.book.name}
                            className="w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-2xl shadow-2xl border border-white/10"
                        />
                    </div>

                    {/* Book Title */}
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center break-words max-w-full px-4">
                        {book.book.name}
                    </h1>

                    {/* Author and Narrator */}
                    <div className="text-sm text-gray-300 mb-6 text-center space-y-1">
                        {book.book.authorsAsString && (
                            <p>
                                <span className="text-gray-400">{t('bookCard.author')}</span>{' '}
                                <span className="font-semibold text-white">{book.book.authorsAsString}</span>
                            </p>
                        )}
                        {book.abook?.narratorAsString && (
                            <p>
                                <span className="text-gray-400">{t('bookCard.narrator')}</span>{' '}
                                <span className="font-semibold text-white">{book.abook.narratorAsString}</span>
                            </p>
                        )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-3 mb-8 flex-wrap justify-center">
                        {/* Play Button */}
                        <button
                            onClick={handlePlayBook}
                            className="px-7 py-3.5 bg-[#FF5100] hover:bg-[#ff641a] text-white rounded-full transition-all flex items-center gap-2 text-base font-bold shadow-lg shadow-[#FF5100]/30 hover:scale-105 active:scale-95"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span>{t('bookView.listen', 'Listen')}</span>
                        </button>

                        {/* Save to Bookshelf Button */}
                        <button
                            onClick={isSaved ? () => setShowRemoveConfirm(true) : handleSaveToLibrary}
                            disabled={isSaving}
                            title={isSaved ? t('bookshelf.remove') : undefined}
                            className={`px-5 py-3.5 rounded-full transition-all flex items-center gap-2 text-sm font-semibold border group/save ${
                                isSaved
                                    ? 'bg-green-600/20 text-green-300 border-green-500/40 hover:bg-red-600/20 hover:text-red-300 hover:border-red-500/40'
                                    : 'bg-[#1A1A1A] hover:bg-[#2C2C2E] text-white border-white/10 hover:border-white/20 active:scale-95'
                            }`}
                        >
                            {isSaving ? (
                                <div className="animate-spin w-4 h-4 text-[#FF5100]">
                                    <svg fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                </div>
                            ) : isSaved ? (
                                <>
                                    <svg className="w-4 h-4 text-green-400 group-hover/save:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <svg className="w-4 h-4 hidden group-hover/save:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            )}
                            <span className={isSaved ? 'group-hover/save:hidden' : undefined}>
                                {isSaved ? t('bookView.inLibrary') : t('bookView.addToLibrary')}
                            </span>
                            {isSaved && (
                                <span className="hidden group-hover/save:inline">{t('bookshelf.remove')}</span>
                            )}
                        </button>
                    </div>

                    {/* Book Info */}
                    <div className="w-full max-w-md space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">{t('bookView.language')}</span>
                            <span className="text-white">{language}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">{t('bookView.duration')}</span>
                            <span className="text-white">{formatDuration(book.abook.time)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">{t('bookView.category')}</span>
                            <span className="text-white flex items-center">
                                {book.book.category.title}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="w-full max-w-md mt-8">
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {getTruncatedDescription()}
                        </p>
                        {shouldShowMoreButton() && (
                            <button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="text-white mt-2 text-sm font-semibold hover:text-gray-300 transition-colors"
                            >
                                ...{showFullDescription ? t('bookView.showLess') : t('bookView.showMore')}
                            </button>
                        )}
                    </div>
                </div>
            </main>

            <ConfirmRemoveBookModal
                isOpen={showRemoveConfirm}
                bookTitle={book?.book?.name || ''}
                isRemoving={isSaving}
                onConfirm={handleRemoveFromLibrary}
                onCancel={() => setShowRemoveConfirm(false)}
            />
        </div>
    );
}

export default BookView;
