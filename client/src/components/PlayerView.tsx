import React, {useEffect, useState} from 'react';
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
import {useAudioPlayer} from "../hooks/useAudioPlayer";
import {useBookmarks} from "../hooks/useBookmarks";
import {useChapters} from "../hooks/useChapters";
import {useGotoModal} from "../hooks/useGotoModal";
import {truncateTitle} from '../utils/helpers';
import "../types/window.d.ts";
import api from "../utils/api";

function PlayerView() {
    const {t} = useTranslation();
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const book: BookShelfEntity = location.state?.book;

    const [error, setError] = useState('');
    const [isLoadingBookData, setIsLoadingBookData] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [showPlaybackSpeedModal, setShowPlaybackSpeedModal] = useState(false);
    const [showKeyOverlay, setShowKeyOverlay] = useState<'play' | 'pause' | 'forward' | 'backward' | null>(null);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showDownloadCancelModal, setShowDownloadCancelModal] = useState(false);

    // Audio player hook
    const audioPlayer = useAudioPlayer({
        bookId,
        consumableId: book?.book?.consumableId,
        playbackRate,
        onLoadError: setError,
    });

    // Bookmarks hook
    const bookmarks = useBookmarks({
        consumableId: book?.book?.consumableId,
        onError: setError,
    });

    // Chapters hook
    const chapters = useChapters({
        consumableId: book?.book?.consumableId,
        currentTime: audioPlayer.currentTime,
        onError: setError,
    });

    // Goto modal hook
    const gotoModal = useGotoModal({
        onSeek: audioPlayer.handleSeek,
        duration: audioPlayer.duration,
        playbackRate,
        currentTime: audioPlayer.currentTime,
    });

    // Load book data (chapters and bookmarks)
    useEffect(() => {
        const loadBookData = async () => {
            if (book) {
                setIsLoadingBookData(true);
                try {
                    await Promise.all([
                        chapters.loadChapters(),
                        bookmarks.loadBookmarks(),
                    ]);
                } finally {
                    setIsLoadingBookData(false);
                }
                document.title = truncateTitle(book.book.name);
            }
        };

        void loadBookData();

        return () => {
            document.title = 'Storytel Player';
            // Clear tray when leaving PlayerView
            if (window.trayControls && window.trayControls.updatePlayingState) {
                window.trayControls.updatePlayingState(false, null);
            }
        };
    }, [book]);

    // Check download status on mount
    useEffect(() => {
        const checkDownloadStatus = async () => {
            if (bookId) {
                try {
                    const {data} = await api.get(`/download-status/${bookId}`);
                    setIsDownloaded(data.downloaded);
                } catch (error) {
                    console.error('Failed to check download status', error);
                }
            }
        };

        void checkDownloadStatus();
    }, [bookId]);

    // Handle download button click
    const handleDownloadClick = async () => {
        if (isDownloading || isDownloaded) {
            // Show confirmation modal for cancel or delete
            setShowDownloadCancelModal(true);
        } else {
            // Start download directly
            await handleDownload();
        }
    };

    // Handle download
    const handleDownload = async () => {
        if (!bookId || isDownloading) return;

        const isElectron = !!window.electronStore
        setIsDownloading(true);
        try {
            const {data} = await api.post('/download', {
                bookId
            });

            if (data.success) {
                setIsDownloaded(true);
            } else {
                if (data.error !== 'Download cancelled') {
                    setError(data.error || 'Download failed');
                }
            }
        } catch (error: any) {
            if (!isElectron && error?.response?.data?.error !== 'Download cancelled' && error?.response?.data?.error != 'canceled'){
                setError(error.message || 'Download failed');
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
                await api.delete(`/download/${bookId}`);
                setIsDownloading(false);
            } else if (isDownloaded) {
                // Delete downloaded file
                await api.delete(`/downloaded-file/${bookId}`);
                setIsDownloaded(false);
            }
        } catch (error: any) {
            setError(error.response?.data?.error || error.message || 'Operation failed');
            setShowDownloadCancelModal(false);
        }
    };

    // Playback rate change handler
    const handlePlaybackRateChange = (newRate: number) => {
        setPlaybackRate(newRate);
        if (audioPlayer.audioRef.current) {
            audioPlayer.audioRef.current.playbackRate = newRate;
        }
        setShowPlaybackSpeedModal(false);
    };

    // Tray event listeners
    useEffect(() => {
        if (window.trayControls) {
            window.trayControls.onPlayPause?.(() => {
                audioPlayer.handlePlayPause();
            });

            window.trayControls.onSetSpeed?.((_event: any, speed: number) => {
                handlePlaybackRateChange(speed);
            });
        }
    }, [audioPlayer.handlePlayPause]);

    // Update tray with current playing state and book title
    useEffect(() => {
        if (window.trayControls && window.trayControls.updatePlayingState) {
            const bookTitle = book?.book?.name || null;
            window.trayControls.updatePlayingState(audioPlayer.isPlaying, bookTitle);
        }
    }, [audioPlayer.isPlaying, book]);

    // Keyboard shortcuts handler
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.target !== document.body) return;

            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    setShowKeyOverlay(audioPlayer.isPlaying ? 'pause' : 'play');
                    audioPlayer.handlePlayPause();
                    setTimeout(() => setShowKeyOverlay(null), 1000);
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    audioPlayer.skipBackward();
                    setShowKeyOverlay('backward');
                    setTimeout(() => setShowKeyOverlay(null), 1000);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    audioPlayer.skipForward();
                    setShowKeyOverlay('forward');
                    setTimeout(() => setShowKeyOverlay(null), 1000);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [audioPlayer.handlePlayPause, audioPlayer.skipForward, audioPlayer.skipBackward, audioPlayer.isPlaying]);


    if (audioPlayer.isLoading || isLoadingBookData) {
        return <LoadingState message={audioPlayer.isLoading ? t('player.loadingAudio') : t('player.loadingBookData')}/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => navigate('/')}/>;
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

            <main className="max-w-4xl mx-auto py-2 sm:px-6 lg:px-8 pb-2">
                <div className="px-2">
                    <div className="rounded-lg shadow-lg overflow-hidden">
                        {/* Book Info */}
                        <BookInfo
                            book={book}
                            currentChapter={chapters.currentChapter}
                            chapters={chapters.chapters}
                            currentTime={audioPlayer.currentTime}
                            playbackRate={playbackRate}
                            onShowChaptersModal={() => chapters.setShowChaptersModal(true)}
                            onShowBookmarksModal={() => bookmarks.setShowBookmarksModal(true)}
                            onDownload={handleDownloadClick}
                            onCancelDownload={handleDownloadClick}
                            isDownloaded={isDownloaded}
                            isDownloading={isDownloading}
                        />

                        {/* Audio Element */}
                        <audio
                            ref={audioPlayer.audioRef}
                            src={audioPlayer.audioSrc || undefined}
                            onTimeUpdate={audioPlayer.handleTimeUpdate}
                            onLoadedMetadata={audioPlayer.handleLoadedMetadata}
                            onPlay={audioPlayer.handlePlay}
                            onPause={audioPlayer.handlePause}
                            onRateChange={audioPlayer.handleRateChange}
                            className="hidden"
                        />

                        {/* Player Controls */}
                        <PlayerControls
                            isPlaying={audioPlayer.isPlaying}
                            currentTime={audioPlayer.currentTime}
                            duration={audioPlayer.duration}
                            volume={audioPlayer.volume}
                            isMuted={audioPlayer.isMuted}
                            playbackRate={playbackRate}
                            onPlayPause={audioPlayer.handlePlayPause}
                            onSeek={audioPlayer.handleSeek}
                            onVolumeChange={audioPlayer.handleVolumeChange}
                            onToggleMute={audioPlayer.toggleMute}
                            onSkipForward={audioPlayer.skipForward}
                            onSkipBackward={audioPlayer.skipBackward}
                            onShowGotoModal={gotoModal.openModal}
                            onShowPlaybackSpeedModal={() => setShowPlaybackSpeedModal(true)}
                        />

                        {/* Modals */}
                        <PlaybackSpeedModal
                            isOpen={showPlaybackSpeedModal}
                            playbackRate={playbackRate}
                            onClose={() => setShowPlaybackSpeedModal(false)}
                            onRateChange={handlePlaybackRateChange}
                        />

                        <GotoModal
                            isOpen={gotoModal.showGotoModal}
                            playbackRate={playbackRate}
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
                            chapters={chapters.chapters}
                            currentTime={audioPlayer.currentTime}
                            playbackRate={playbackRate}
                            onClose={() => chapters.setShowChaptersModal(false)}
                            onChapterClick={(time) => chapters.handleChapterClick(time, audioPlayer.audioRef)}
                        />

                        <BookmarkModals
                            showBookmarksModal={bookmarks.showBookmarksModal}
                            bookmarks={bookmarks.bookmarks}
                            onCloseBookmarksModal={() => bookmarks.setShowBookmarksModal(false)}
                            onShowCreateBookmarkModal={bookmarks.handleShowCreateBookmarkModal}
                            onGoToBookmark={(position) => bookmarks.goToBookmark(position, audioPlayer.audioRef)}
                            onShowEditBookmarkModal={bookmarks.handleShowEditBookmarkModal}
                            onShowDeleteConfirmModal={bookmarks.handleShowDeleteConfirmModal}
                            showCreateBookmarkModal={bookmarks.showCreateBookmarkModal}
                            newBookmarkNote={bookmarks.newBookmarkNote}
                            currentTime={audioPlayer.currentTime}
                            playbackRate={playbackRate}
                            onCloseCreateBookmarkModal={() => bookmarks.setShowBookmarksModal(false)}
                            onNewBookmarkNoteChange={bookmarks.setNewBookmarkNote}
                            onCreateBookmark={() => bookmarks.createBookmark(audioPlayer.currentTime)}
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
