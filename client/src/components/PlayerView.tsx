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
import {BookShelfEntity} from "../interfaces/books";
import {useAudioPlayer} from "../hooks/useAudioPlayer";
import {useBookmarks} from "../hooks/useBookmarks";
import {useChapters} from "../hooks/useChapters";
import {useGotoModal} from "../hooks/useGotoModal";
import {truncateTitle} from '../utils/helpers';
import "../types/window.d.ts";

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


    if (audioPlayer.isLoading || isLoadingBookData) {
        return <LoadingState message={audioPlayer.isLoading ? t('player.loadingAudio') : t('player.loadingBookData')}/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => navigate('/')}/>;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar barTitle={t('player.nowPlaying')} onBackClick={() => navigate(`/book/${bookId}`, {state: {book}})}>
                <span>{book.book.name}</span>
            </Navbar>
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
                    </div>
                </div>
            </main>
        </div>
    );
}

export default PlayerView;
