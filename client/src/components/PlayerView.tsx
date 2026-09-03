import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import Navbar from './Navbar';
import BookmarkModals from "./BookmarkModals";
import PlaybackSpeedModal from "./PlaybackSpeedModal";
import GotoModal from "./GotoModal";
import ChaptersModal from "./ChaptersModal";
import PlayerControls from "./PlayerControls";
import BookInfo from "./BookInfo";
import DownloadCancelModal from "./DownloadCancelModal";
import {BookShelfEntity} from "../interfaces/books";
import {useAudioContext} from "../contexts/AudioContext";
import {useBookmarks} from "../hooks/useBookmarks";
import {useChapters} from "../hooks/useChapters";
import {useGotoModal} from "../hooks/useGotoModal";
import {truncateTitle} from '../utils/helpers';
import "../types/window.d.ts";
import api, { trackAction } from "../utils/api";

function PlayerView() {
    const {t} = useTranslation();
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const audio = useAudioContext();

    const [fetchedBook, setFetchedBook] = useState<BookShelfEntity | null>(null);

    // Reset fetched book details when switching to a different book
    useEffect(() => {
        setFetchedBook(null);
    }, [bookId]);

    // Check if the central active book matches this route's bookId
    const isCurrentActiveBook =
        audio.activeBook &&
        (String(audio.activeBookId) === String(bookId) ||
         String(audio.activeBook.id) === String(bookId) ||
         String(audio.activeBook.book?.consumableId) === String(bookId) ||
         String(audio.activeBook.abook?.id) === String(bookId));

    // Check if navigation state book matches this route's bookId
    const stateBookMatches =
        location.state?.book &&
        (String(location.state.book.id) === String(bookId) ||
         String(location.state.book.book?.consumableId) === String(bookId) ||
         String(location.state.book.abook?.id) === String(bookId));

    // Check if fetched fallback book matches this route's bookId
    const fetchedBookMatches =
        fetchedBook &&
        (String(fetchedBook.id) === String(bookId) ||
         String(fetchedBook.book?.consumableId) === String(bookId) ||
         String(fetchedBook.abook?.id) === String(bookId));

    const book: BookShelfEntity | null =
        (stateBookMatches ? location.state.book : null) ||
        (fetchedBookMatches ? fetchedBook : null) ||
        (isCurrentActiveBook ? audio.activeBook : null);

    // The play buttons navigate here with `autoPlay` in the router state; opening
    // the player any other way (mini player, deep link) only loads the book.
    const autoPlayRequested = location.state?.autoPlay === true;
    const activeConsumableId = book?.book?.consumableId || bookId || '';

    const [error, setError] = useState('');
    const [isLoadingBookData, setIsLoadingBookData] = useState(true);
    const [showPlaybackSpeedModal, setShowPlaybackSpeedModal] = useState(false);
    const [showKeyOverlay, setShowKeyOverlay] = useState<'play' | 'pause' | 'forward' | 'backward' | null>(null);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showDownloadCancelModal, setShowDownloadCancelModal] = useState(false);

    // Fetch fallback book details if not available
    useEffect(() => {
        const hasBookDetails = stateBookMatches || isCurrentActiveBook;
        if (!hasBookDetails && bookId) {
            let cancelled = false;
            api.get(`/book-details/${bookId}`)
                .then((res) => {
                    if (cancelled) return;
                    const data = res.data || {};
                    const formats = data.formats || [];
                    const abook = formats.find((f: any) => f.type === 'abook');
                    const ebook = formats.find((f: any) => f.type === 'ebook');
                    const cover = abook?.cover?.url || ebook?.cover?.url || data.cover?.url || '';
                    const authors = (data.authors || []).map((a: any) => a.name).join(', ');
                    const narrators = (data.narrators || []).map((n: any) => n.name).join(', ');
                    const entity: any = {
                        id: bookId,
                        status: 2,
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
                })
                .catch((e) => {
                    if (!cancelled) {
                        console.error("Failed to fetch fallback book details:", e);
                    }
                });

            return () => {
                cancelled = true;
            };
        }
    }, [bookId, stateBookMatches, isCurrentActiveBook]);

    // Load book into central audio player. The play intent belongs to the
    // navigation, so it is honoured on the first run - which also resumes a book
    // that is loaded but paused - and afterwards only while the stream is still
    // missing. A re-run (the book details arriving, say, or React invoking the
    // effect twice in development) can therefore neither swallow the intent nor
    // resume playback the user has just paused.
    const lastBookIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (bookId) {
            const isNewBook = lastBookIdRef.current !== bookId;
            lastBookIdRef.current = bookId;
            const isAlreadyLoaded = audio.activeBookId === bookId && !isNewBook && !!audio.audioSrc;
            const autoPlay = autoPlayRequested && (isNewBook || !isAlreadyLoaded);
            audio.loadBook(book, bookId, autoPlay);
        }
    }, [bookId, book, autoPlayRequested, audio.loadBook]);

    // Bookmarks hook
    const bookmarks = useBookmarks({
        consumableId: activeConsumableId,
        onError: setError,
    });

    // Chapters hook
    const chapters = useChapters({
        consumableId: activeConsumableId,
        currentTime: audio.currentTime,
        onError: setError,
    });

    // Goto modal hook
    const gotoModal = useGotoModal({
        onSeek: audio.seek,
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        currentTime: audio.currentTime,
    });

    // Load book data (chapters and bookmarks)
    useEffect(() => {
        const loadBookData = async () => {
            if (activeConsumableId) {
                setIsLoadingBookData(true);
                try {
                    await Promise.all([
                        chapters.loadChapters(),
                        bookmarks.loadBookmarks(),
                    ]);
                } finally {
                    setIsLoadingBookData(false);
                }
                if (book) {
                    document.title = truncateTitle(book.book.name);
                }
            }
        };

        void loadBookData();

        return () => {
            document.title = 'Storytel Player';
        };
    }, [activeConsumableId, book]);

    // Check download status on mount
    useEffect(() => {
        const checkDownloadStatus = async () => {
            if (bookId) {
                try {
                    const {data: statusData} = await api.get(`/download-status/${bookId}`);
                    setIsDownloaded(statusData.downloaded);
                } catch (err) {
                    console.error('Failed to check download status', err);
                }
            }
        };

        void checkDownloadStatus();
    }, [bookId]);

    // Handle download button click
    const handleDownloadClick = async () => {
        if (isDownloading || isDownloaded) {
            setShowDownloadCancelModal(true);
        } else {
            await handleDownload();
        }
    };

    // Handle download
    const handleDownload = async () => {
        if (!bookId || isDownloading) return;

        setIsDownloading(true);
        try {
            trackAction('User initiated download', { bookId: book?.id, bookName: book?.book?.name || "Unknown" });

            const response = await api.post('/download', {
                bookId,
                consumableId: activeConsumableId,
                book,
            });

            if (response && (response as any).data?.success) {
                setIsDownloaded(true);
            } else {
                if ((response as any)?.data?.error !== 'Download cancelled') {
                    setError((response as any)?.data?.error || 'Download failed');
                }
            }
        } catch (err: any) {
            const errorMsg = err?.data?.error || err?.response?.data?.error;
            if (errorMsg !== 'Download cancelled' && errorMsg !== 'canceled') {
                setError(errorMsg || err.message || 'Download failed');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle cancel download or delete file
    const handleCancelOrDelete = async () => {
        if (!bookId) return;

        try {
            setShowDownloadCancelModal(false);

            if (isDownloading) {
                trackAction('User cancelled download', { bookId });
                await api.delete(`/download/${bookId}`);
                setIsDownloading(false);
            } else if (isDownloaded) {
                trackAction('User deleted downloaded book', { bookId });
                await api.delete(`/downloaded-file/${bookId}`);
                setIsDownloaded(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Operation failed');
            setShowDownloadCancelModal(false);
        }
    };

    // Playback rate change handler
    const handlePlaybackRateChange = (newRate: number) => {
        audio.setRate(newRate);
        setShowPlaybackSpeedModal(false);
    };

    // Keyboard shortcuts handler
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    setShowKeyOverlay(audio.isPlaying ? 'pause' : 'play');
                    audio.togglePlayPause();
                    setTimeout(() => setShowKeyOverlay(null), 1000);
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    audio.skipBackward(15);
                    setShowKeyOverlay('backward');
                    setTimeout(() => setShowKeyOverlay(null), 1000);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    audio.skipForward(15);
                    setShowKeyOverlay('forward');
                    setTimeout(() => setShowKeyOverlay(null), 1000);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [audio.togglePlayPause, audio.skipForward, audio.skipBackward, audio.isPlaying]);

    if (audio.isLoading || isLoadingBookData || !book) {
        return <LoadingState message={audio.isLoading ? t('player.loadingAudio') : t('player.loadingBookData')}/>;
    }

    if (error || audio.error) {
        return <ErrorState error={error || audio.error || ''} onRetry={() => navigate('/')}/>;
    }

    return (
        <div className="min-h-screen bg-black text-white relative">
            <Navbar barTitle={t('player.nowPlaying')} onBackClick={() => navigate(`/book/${bookId}`, {state: {book}})}>
                <span>{book.book.name}</span>
            </Navbar>

            {/* Keyboard Overlay */}
            {showKeyOverlay && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div className="bg-black bg-opacity-70 rounded-full p-8">
                        <svg
                            className="w-16 h-16 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {showKeyOverlay === 'play' && (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                            )}
                            {showKeyOverlay === 'pause' && (
                                <>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M10 9v6M14 9v6"/>
                                </>
                            )}
                            {showKeyOverlay === 'backward' && (
                                <>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"/>
                                </>
                            )}
                            {showKeyOverlay === 'forward' && (
                                <>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/>
                                </>
                            )}
                        </svg>
                    </div>
                </div>
            )}

            <main className="max-w-4xl mx-auto py-2 sm:px-6 lg:px-8 pb-32">
                <div className="px-2">
                    <div className="rounded-lg shadow-lg overflow-hidden">
                        {/* Book Info */}
                        <BookInfo
                            book={book}
                            currentChapter={chapters.currentChapter || audio.currentChapter}
                            chapters={chapters.chapters.length > 0 ? chapters.chapters : audio.chapters}
                            currentTime={audio.currentTime}
                            playbackRate={audio.playbackRate}
                            onShowChaptersModal={() => chapters.setShowChaptersModal(true)}
                            onShowBookmarksModal={() => bookmarks.setShowBookmarksModal(true)}
                            onDownload={handleDownloadClick}
                            onCancelDownload={handleDownloadClick}
                            isDownloaded={isDownloaded}
                            isDownloading={isDownloading}
                        />

                        {/* Player Controls */}
                        <PlayerControls
                            isPlaying={audio.isPlaying}
                            currentTime={audio.currentTime}
                            duration={audio.duration}
                            volume={audio.volume}
                            isMuted={audio.isMuted}
                            playbackRate={audio.playbackRate}
                            onPlayPause={audio.togglePlayPause}
                            onSeek={audio.seek}
                            onVolumeChange={audio.setVolume}
                            onToggleMute={audio.toggleMute}
                            onSkipForward={() => audio.skipForward(15)}
                            onSkipBackward={() => audio.skipBackward(15)}
                            onShowGotoModal={gotoModal.openModal}
                            onShowPlaybackSpeedModal={() => setShowPlaybackSpeedModal(true)}
                        />

                        {/* Modals */}
                        <PlaybackSpeedModal
                            isOpen={showPlaybackSpeedModal}
                            playbackRate={audio.playbackRate}
                            onClose={() => setShowPlaybackSpeedModal(false)}
                            onRateChange={handlePlaybackRateChange}
                        />

                        <GotoModal
                            isOpen={gotoModal.showGotoModal}
                            playbackRate={audio.playbackRate}
                            gotoHours={gotoModal.gotoHours}
                            gotoMinutes={gotoModal.gotoMinutes}
                            gotoSeconds={gotoModal.gotoSeconds}
                            onClose={() => gotoModal.setShowGotoModal(false)}
                            onHoursChange={gotoModal.setGotoHours}
                            onMinutesChange={gotoModal.setGotoMinutes}
                            onSecondsChange={gotoModal.setGotoSeconds}
                            onGoto={gotoModal.handleGotoTime}
                        />

                        <ChaptersModal
                            isOpen={chapters.showChaptersModal}
                            chapters={chapters.chapters.length > 0 ? chapters.chapters : audio.chapters}
                            currentTime={audio.currentTime}
                            playbackRate={audio.playbackRate}
                            onClose={() => chapters.setShowChaptersModal(false)}
                            onChapterClick={(time) => {
                                audio.seek(time);
                                chapters.setShowChaptersModal(false);
                            }}
                        />

                        <BookmarkModals
                            showBookmarksModal={bookmarks.showBookmarksModal}
                            bookmarks={bookmarks.bookmarks}
                            onCloseBookmarksModal={() => bookmarks.setShowBookmarksModal(false)}
                            onShowCreateBookmarkModal={bookmarks.handleShowCreateBookmarkModal}
                            onGoToBookmark={(position) => bookmarks.goToBookmark(position, audio.audioRef)}
                            onShowEditBookmarkModal={bookmarks.handleShowEditBookmarkModal}
                            onShowDeleteConfirmModal={bookmarks.handleShowDeleteConfirmModal}
                            showCreateBookmarkModal={bookmarks.showCreateBookmarkModal}
                            newBookmarkNote={bookmarks.newBookmarkNote}
                            currentTime={audio.currentTime}
                            playbackRate={audio.playbackRate}
                            onCloseCreateBookmarkModal={bookmarks.handleCloseCreateBookmarkModal}
                            onNewBookmarkNoteChange={bookmarks.setNewBookmarkNote}
                            onCreateBookmark={() => bookmarks.createBookmark(audio.currentTime)}
                            showEditBookmarkModal={bookmarks.showEditBookmarkModal}
                            bookmarkToEdit={bookmarks.bookmarkToEdit}
                            editBookmarkNote={bookmarks.editBookmarkNote}
                            onCloseEditBookmarkModal={bookmarks.handleCloseEditBookmarkModal}
                            onEditBookmarkNoteChange={bookmarks.setEditBookmarkNote}
                            onEditBookmark={bookmarks.editBookmark}
                            showDeleteConfirmModal={bookmarks.showDeleteConfirmModal}
                            bookmarkToDelete={bookmarks.bookmarkToDelete}
                            onCloseDeleteConfirmModal={bookmarks.handleCloseDeleteConfirmModal}
                            onDeleteBookmark={bookmarks.deleteBookmark}
                        />

                        {/* Download Cancel/Delete Modal */}
                        <DownloadCancelModal
                            isOpen={showDownloadCancelModal}
                            isDownloading={isDownloading}
                            onConfirm={handleCancelOrDelete}
                            onCancel={() => setShowDownloadCancelModal(false)}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default PlayerView;
