import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import BookmarkModals from "./BookmarkModals";
import PlaybackSpeedModal from "./PlaybackSpeedModal";
import GotoModal from "./GotoModal";
import ChaptersModal from "./ChaptersModal";
import {formatTime} from "../utils/helpers";
import { BookShelfEntity } from "../interfaces/books";
import { Bookmark } from "../interfaces/bookmarks";
import { Chapter } from "../interfaces/chapters";
import "../types/window.d.ts";

function PlayerView() {
    const { t } = useTranslation();
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingBookData, setIsLoadingBookData] = useState(true);
    const [error, setError] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(1);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [showBookmarksModal, setShowBookmarksModal] = useState(false);
    const [showCreateBookmarkModal, setShowCreateBookmarkModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showEditBookmarkModal, setShowEditBookmarkModal] = useState(false);
    const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
    const [bookmarkToEdit, setBookmarkToEdit] = useState<Bookmark | null>(null);
    const [newBookmarkNote, setNewBookmarkNote] = useState('');
    const [editBookmarkNote, setEditBookmarkNote] = useState('');
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [showPlaybackSpeedModal, setShowPlaybackSpeedModal] = useState(false);
    const [showGotoModal, setShowGotoModal] = useState(false);
    const [gotoHours, setGotoHours] = useState(0);
    const [gotoMinutes, setGotoMinutes] = useState(0);
    const [gotoSeconds, setGotoSeconds] = useState(0);
    const [showChaptersModal, setShowChaptersModal] = useState(false);

    // TODO: Add proper type definition for NodeJS namespace or use number for timeout
    const positionUpdateIntervalRef = useRef<any>(null);

    // TODO: Add proper type for location state
    const book: BookShelfEntity = location.state?.book;

    const loadAudioStream = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.post('/stream', { bookId });
            setAudioSrc(response.data.streamUrl);
        } catch (err: any) {
            setError(err.response?.data?.error || t('player.loadError'));
        } finally {
            setIsLoading(false);
        }
    }, [bookId]);

    const goToBookmark = useCallback((position: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.floor(position / 1000);
            setShowBookmarksModal(false);
        }
    }, [setShowBookmarksModal]);

    const goToPosition = useCallback(async (consumableId: string) => {
        try {
            const response = await api.get(`/bookmark-positional/${consumableId}`);
            const { data } = response;

            if (data.length === 1 && 'position' in data[0]) {
                goToBookmark(data[0].position);
            }
        } catch (error: any) {
            setError(error.response?.data?.error || t('player.loadBookmarksError'));
        }
    }, [goToBookmark, t]);

    const loadChapters = useCallback(async (consumableId: string) => {
        try {
            const response = await api.get(`/bookmetadata/${consumableId}`);
            const { data } = response;

            if (data.formats && data.formats.length > 0) {
                setChapters(data.formats[0].chapters);
            }
        } catch (error: any) {
            setError(error.response?.data?.error || t('player.loadChaptersError'));
        }
    }, [t]);

    const loadBookmarks = useCallback(async (consumableId: string) => {
        try {
            const response = await api.get(`/bookmarks/${consumableId}`);
            const { data } = response;

            setBookmarks(data.bookmarks);
        } catch (error: any) {
            setError(error.response?.data?.error || t('player.loadBookmarksError'));
        }
    }, [t]);

    useEffect(() => {
        if (bookId) {
            loadAudioStream();
        }
    }, [bookId, loadAudioStream]);

    useEffect(() => {
        const loadBookData = async () => {
            if (book) {
                setIsLoadingBookData(true);
                try {
                    await Promise.all([
                        loadChapters(book.book.consumableId),
                        loadBookmarks(book.book.consumableId),
                    ]);
                } finally {
                    setIsLoadingBookData(false);
                }
                document.title = book.book.name;
            }
        };

        loadBookData();

        return () => {
            if (positionUpdateIntervalRef.current) {
                clearInterval(positionUpdateIntervalRef.current);
            }
            document.title = 'Storytel Player';
            // Clear tray when leaving PlayerView
            if (window.trayControls && window.trayControls.updatePlayingState) {
                window.trayControls.updatePlayingState(false, null);
            }
        };
    }, [book, loadChapters, loadBookmarks]);

    const updatePosition = useCallback(async () => {
        if (!audioRef.current || !book?.book?.consumableId) return;

        try {
            const position = Math.floor(audioRef.current.currentTime * 1000);
            await api.put(`/bookmark-positional/${book.book.consumableId}`, {
                position: position
            });
        } catch (error) {
            console.error('Failed to update position:', error);
        }
    }, [book]);

    const handlePlayPause = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            updatePosition();
            if (positionUpdateIntervalRef.current) {
                clearInterval(positionUpdateIntervalRef.current);
                positionUpdateIntervalRef.current = null;
            }
        } else {
            audioRef.current.play();
            positionUpdateIntervalRef.current = setInterval(updatePosition, 30000);
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, updatePosition]);

    const handlePlaybackRateChange = useCallback((newRate: number) => {
        setPlaybackRate(newRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
        }
        setShowPlaybackSpeedModal(false);
    }, []);

    // Tray event listeners
    useEffect(() => {
        if (window.trayControls) {
            // TODO: Add proper type checking for trayControls methods
            window.trayControls.onPlayPause?.(() => {
                handlePlayPause();
            });

            window.trayControls.onSetSpeed?.((event: any, speed: number) => {
                handlePlaybackRateChange(speed);
            });
        }
    }, [handlePlayPause, handlePlaybackRateChange]);

    // Update tray with current playing state and book title
    useEffect(() => {
        if (window.trayControls && window.trayControls.updatePlayingState) {
            const bookTitle = book?.book?.name || null;
            window.trayControls.updatePlayingState(isPlaying, bookTitle);
        }
    }, [isPlaying, book]);

    const handleGotoTime = () => {
        if (!audioRef.current) return;

        const totalSeconds = (gotoHours * 3600) + (gotoMinutes * 60) + gotoSeconds;
        const adjustedSeconds = totalSeconds * playbackRate; // Adjust for playback speed

        if (adjustedSeconds >= 0 && adjustedSeconds <= duration) {
            audioRef.current.currentTime = adjustedSeconds;
            setCurrentTime(adjustedSeconds);
        }

        setShowGotoModal(false);
        setGotoHours(0);
        setGotoMinutes(0);
        setGotoSeconds(0);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = async() => {
        if (audioRef.current) {
            await goToPosition(book.book.consumableId);
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;

        const seekTime = parseFloat(e.target.value);
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        if (newVolume > 0) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        if (!audioRef.current) return;

        if (isMuted) {
            // Unmute: ripristina il volume precedente
            audioRef.current.volume = previousVolume;
            setVolume(previousVolume);
            setIsMuted(false);
        } else {
            // Mute: salva il volume attuale e imposta a 0
            setPreviousVolume(volume);
            audioRef.current.volume = 0;
            setVolume(0);
            setIsMuted(true);
        }
    };

    const skipForward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
        }
    };

    const skipBackward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
        }
    };

    const handleChapterClick = (chapterStartTime: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = chapterStartTime;
        }
    };

    const handleShowEditBookmarkModal = (bookmark: Bookmark) => {
        setBookmarkToEdit(bookmark);
        setEditBookmarkNote(bookmark.note || '');
        setShowEditBookmarkModal(true);
        setShowBookmarksModal(false);
    };

    const handleShowDeleteConfirmModal = (bookmark: Bookmark) => {
        setBookmarkToDelete(bookmark);
        setShowDeleteConfirmModal(true);
        setShowBookmarksModal(false);
    };

    const handleShowCreateBookmarkModal = () => {
        setShowBookmarksModal(false);
        setShowCreateBookmarkModal(true);
    };

    const handleCloseEditBookmarkModal = () => {
        setShowEditBookmarkModal(false);
        setBookmarkToEdit(null);
        setEditBookmarkNote('');
    };

    const handleCloseDeleteConfirmModal = () => {
        setShowDeleteConfirmModal(false);
        setBookmarkToDelete(null);
    };

    const createBookmark = async () => {
        if (!audioRef.current || !book) return;

        try {
            const positionInMilliseconds = Math.floor(audioRef.current.currentTime * 1000);

            await api.post(`/bookmarks/${book.book.consumableId}`, {
                position: positionInMilliseconds,
                note: newBookmarkNote
            });

            await loadBookmarks(book.book.consumableId);
            setNewBookmarkNote('');
            setShowCreateBookmarkModal(false);
        } catch (error) {
            console.error('Failed to create bookmark:', error);
        }
    };

    const deleteBookmark = async () => {
        if (!bookmarkToDelete || !book) return;

        try {
            await api.delete(`/bookmarks/${book.book.consumableId}/${bookmarkToDelete.id}`, {});
            await loadBookmarks(book.book.consumableId);
            setShowDeleteConfirmModal(false);
            setBookmarkToDelete(null);
        } catch (error) {
            console.error('Failed to delete bookmark:', error);
        }
    };

    const editBookmark = async () => {
        if (!bookmarkToEdit || !book) return;

        try {
            await api.put(`/bookmarks/${book.book.consumableId}/${bookmarkToEdit.id}`, {
                position: bookmarkToEdit.position,
                note: editBookmarkNote,
                type: 'abook'
            });

            await loadBookmarks(book.book.consumableId);
            setShowEditBookmarkModal(false);
            setBookmarkToEdit(null);
            setEditBookmarkNote('');
        } catch (error) {
            console.error('Failed to edit bookmark:', error);
        }
    };

    if (isLoading || isLoadingBookData) {
        return <LoadingState message={isLoading ? t('player.loadingAudio') : t('player.loadingBookData')} />;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => navigate('/')} />;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <nav className="bg-black border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center min-w-0 flex-1 gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="text-gray-400 hover:text-white flex-shrink-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                                </svg>
                            </button>
                            <div className="text-sm font-bold text-white flex items-baseline gap-2 min-w-0 flex-1">
                                <span className="flex-shrink-0 text-xl">{t('player.nowPlaying')}</span>
                                <div className="overflow-hidden relative flex-1">
                                    <div
                                        className={`whitespace-nowrap inline-flex animate-marquee`}
                                    >
                                        <span>{book.book.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-4xl mx-auto py-2 sm:px-6 lg:px-8 pb-2">
                <div className="px-4 py-2 sm:px-0">
                    <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-800">
                        {/* Book Info */}
                        <div className="p-4 flex flex-col items-center">
                            <div className="flex flex-col items-center mb-2">
                                {book.book.cover && (
                                    <img
                                        src={"https://www.storytel.com" + book.book.cover}
                                        alt={book.book.name}
                                        className="w-48 h-48 object-cover rounded-lg shadow-2xl mb-4"
                                    />
                                )}
                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-white mb-0.5">{book.book.name}</h2>
                                    <p className="text-sm text-gray-300 mb-0">
                                        {t('bookCard.author')} {book.book.authorsAsString} • {t('bookCard.narrator')} {book.abook.narratorAsString}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-0 flex flex-col">
                        {(() => {
                            let cumulativeTime = 0;
                            let currentChapterData = null;

                            for (let i = 0; i < chapters.length; i++) {
                                const chapter = chapters[i];
                                const chapterStart = cumulativeTime;
                                const chapterEnd = cumulativeTime + (chapter.durationInSeconds || 0);

                                if (currentTime >= chapterStart && currentTime < chapterEnd) {
                                    currentChapterData = {
                                        ...chapter,
                                        title: chapter.title || `Chapter ${chapter.number}`,
                                        start: chapterStart,
                                        end: chapterEnd
                                    };
                                    break;
                                }

                                cumulativeTime = chapterEnd;
                            }

                            return currentChapterData ? (
                                <div className="text-left mt-0">
                                    <p className="text-base text-white">{currentChapterData.title}</p>
                                    <p className="text-sm text-gray-400">
                                        {formatTime((currentChapterData.end - currentTime) / playbackRate)}
                                    </p>
                                </div>
                            ) : null;
                        })()}
                        </div>

                        {/* Audio Element */}
                        <audio
                            ref={audioRef}
                            src={audioSrc || undefined}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onPlay={() => {
                                setIsPlaying(true);
                                if (audioRef.current) {
                                    audioRef.current.playbackRate = playbackRate;
                                }
                                positionUpdateIntervalRef.current = setInterval(updatePosition, 30000);
                            }}
                            onPause={() => {
                                setIsPlaying(false);
                                updatePosition();
                                if (positionUpdateIntervalRef.current) {
                                    clearInterval(positionUpdateIntervalRef.current);
                                    positionUpdateIntervalRef.current = null;
                                }
                            }}
                            onRateChange={() => {
                                if (audioRef.current) {
                                    audioRef.current.playbackRate = playbackRate;
                                }
                            }}
                            className="hidden"
                        />

                        {/* Player Controls */}

                        <div className="p-6 bg-gray-900">
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((currentTime / (duration || 1)) * 100)}%, #374151 ${((currentTime / (duration || 1)) * 100)}%, #374151 100%)`
                                    }}
                                />
                                <div className="flex justify-between text-sm text-gray-400 mt-2">
                                    <span>{formatTime(currentTime / playbackRate)}</span>
                                    <span>{formatTime(duration / playbackRate)}</span>
                                </div>
                            </div>

                            {/* Control Buttons */}
                            <div className="flex items-center justify-center space-x-6 mb-6">
                                <button
                                    onClick={skipBackward}
                                    className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8L12.066 11.2zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8L4.066 11.2z"/>
                                    </svg>
                                </button>

                                <button
                                    onClick={handlePlayPause}
                                    className="p-4 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
                                >
                                    {isPlaying ? (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                        </svg>
                                        ) : (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                        )}
                                </button>

                                <button
                                    onClick={skipForward}
                                    className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Volume, Speed, Goto and Bookmark */}
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center space-x-4">
                                    {/* Volume Control */}
                                    <div className="flex items-center space-x-2">
                                        <button onClick={toggleMute} className="p-1 rounded hover:bg-gray-800 transition-colors">
                                            {isMuted || volume === 0 ? (
                                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                                </svg>
                                            )}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={volume}
                                            onChange={handleVolumeChange}
                                            className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    {/* Playback Speed */}
                                    <button
                                        onClick={() => setShowPlaybackSpeedModal(true)}
                                        className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        {playbackRate}x
                                    </button>

                                    {/* Goto Time */}
                                    <button
                                        onClick={() => setShowGotoModal(true)}
                                        className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        {t('player.goto')}
                                    </button>
                                </div>

                                <div className="flex items-center space-x-3">
                                    {chapters && chapters.length > 0 && (
                                        <button
                                            onClick={() => setShowChaptersModal(true)}
                                            className="px-2 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                                        >
                                            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                                <g>
                                                    <path fill="currentColor"></path>
                                                    <g>
                                                        <path fill="currentColor" d="M16.002 22.002h25.997v4H16.002zM16.002 11.995h25.997v4H16.002zM16.002 32.008h25.997v4H16.002zM6 12h4v4H6zM6 22.006h4v4H6zM6 32.013h4v4H6z"></path>
                                                    </g>
                                                </g>
                                            </svg>
                                        </button>
                                    )}

                                    <button
                                        id="bookmark-btn"
                                        onClick={() => setShowBookmarksModal(true)}
                                        className="px-2 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg"                        className="w-6 h-6"
                                             fill="currentColor" viewBox="0 0 16 16">
                                            <path
                                                fill="currentColor"
                                                d="M2 0h12v16h-2l-4-4-4 4H2z"
                                            ></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <PlaybackSpeedModal
                                isOpen={showPlaybackSpeedModal}
                                playbackRate={playbackRate}
                                onClose={() => setShowPlaybackSpeedModal(false)}
                                onRateChange={handlePlaybackRateChange}
                            />

                            <GotoModal
                                isOpen={showGotoModal}
                                playbackRate={playbackRate}
                                gotoHours={gotoHours}
                                gotoMinutes={gotoMinutes}
                                gotoSeconds={gotoSeconds}
                                onClose={() => setShowGotoModal(false)}
                                onHoursChange={setGotoHours}
                                onMinutesChange={setGotoMinutes}
                                onSecondsChange={setGotoSeconds}
                                onGoto={handleGotoTime}
                            />

                            <ChaptersModal
                                isOpen={showChaptersModal}
                                chapters={chapters}
                                currentTime={currentTime}
                                playbackRate={playbackRate}
                                onClose={() => setShowChaptersModal(false)}
                                onChapterClick={handleChapterClick}
                            />

                        </div>

                        <BookmarkModals
                            showBookmarksModal={showBookmarksModal}
                            bookmarks={bookmarks}
                            onCloseBookmarksModal={() => setShowBookmarksModal(false)}
                            onShowCreateBookmarkModal={handleShowCreateBookmarkModal}
                            onGoToBookmark={goToBookmark}
                            onShowEditBookmarkModal={handleShowEditBookmarkModal}
                            onShowDeleteConfirmModal={handleShowDeleteConfirmModal}
                            showCreateBookmarkModal={showCreateBookmarkModal}
                            newBookmarkNote={newBookmarkNote}
                            currentTime={currentTime}
                            playbackRate={playbackRate}
                            onCloseCreateBookmarkModal={() => setShowCreateBookmarkModal(false)}
                            onNewBookmarkNoteChange={setNewBookmarkNote}
                            onCreateBookmark={createBookmark}
                            showEditBookmarkModal={showEditBookmarkModal}
                            bookmarkToEdit={bookmarkToEdit}
                            editBookmarkNote={editBookmarkNote}
                            onCloseEditBookmarkModal={handleCloseEditBookmarkModal}
                            onEditBookmarkNoteChange={setEditBookmarkNote}
                            onEditBookmark={editBookmark}
                            showDeleteConfirmModal={showDeleteConfirmModal}
                            bookmarkToDelete={bookmarkToDelete}
                            onCloseDeleteConfirmModal={handleCloseDeleteConfirmModal}
                            onDeleteBookmark={deleteBookmark}
                        />

                    </div>
                </div>
            </main>
        </div>
    );
}

export default PlayerView;
