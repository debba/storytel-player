import React, {useState, useEffect, useRef} from 'react';
import {useParams, useLocation, useNavigate} from 'react-router-dom';
import api from '../services/api';

function PlayerView() {
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const audioRef = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [chapters, setChapters] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [showBookmarksModal, setShowBookmarksModal] = useState(false);

    const book = location.state?.book;
    const savedPosition = location.state?.position || 0;

    useEffect(() => {
        if (bookId) {
            loadAudioStream();
        }
    }, [bookId]);

    useEffect(() => {
        if (book) {
            loadChapters(book.consumableId);
            loadBookmarks(book.consumableId);
        }
    }, [book]);

    const loadAudioStream = async () => {
        try {
            setIsLoading(true);
            const response = await api.post('/stream', {
                bookId
            });

            if (audioRef.current) {
                audioRef.current.src = response.data.streamUrl;
                audioRef.current.load();

                // Set initial position if bookmark exists
                if (savedPosition > 0) {
                    const startTimeSeconds = Math.floor(savedPosition / 1000000);
                    audioRef.current.currentTime = startTimeSeconds;
                }
            }
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to load audio stream');
        } finally {
            setIsLoading(false);
        }
    };

    const loadChapters = async (
        consumableId
    ) => {
        try {
            const response = await api.get(`/bookmetadata/${consumableId}`);
            const {data} = response;

            if (data.formats && data.formats.length > 0) {
                setChapters(data.formats[0].chapters);
            }

        }catch (error) {
            setError(error.response?.data?.error || 'Failed to load chapters');
        }
    }

    const loadBookmarks = async (
        consumableId
    ) => {
        try {
            const response = await api.get(`/bookmarks/${consumableId}`);
            const {data} = response;

            setBookmarks(data.bookmarks);

        }catch (error) {
            setError(error.response?.data?.error || 'Failed to load bookmarks');
        }
    }

    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;

        const seekTime = parseFloat(e.target.value);
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
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

    const saveBookmark = async () => {
        if (!audioRef.current) return;

        try {
            await api.post('/bookmark', {
                bookId: bookId,
                position: Math.floor(audioRef.current.currentTime)
            });

            const button = document.getElementById('bookmark-btn');
            if (button) {
                button.classList.add('bg-green-600');
                setTimeout(() => {
                    button.classList.remove('bg-green-600');
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to save bookmark:', error);
        }
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatBookmarkTime = (position) => {
        const totalSeconds = Math.floor(position / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const goToBookmark = (position) => {
        if (audioRef.current) {
            const seconds = Math.floor(position / 1000);
            audioRef.current.currentTime = seconds;
            setShowBookmarksModal(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading audio...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">{error}</div>
                    <button
                        onClick={() => navigate('/bookshelf')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/bookshelf')}
                                className="text-gray-600 hover:text-gray-900 mr-4"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Now Playing</h1>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Book Info */}
                        <div className="p-6 flex items-center space-x-6">
                            {book?.cover && (
                                <img
                                    src={"https://www.storytel.com" + book.cover}
                                    alt={book.name}
                                    className="w-24 h-24 rounded-lg shadow-md"
                                />
                            )}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{book?.name}</h2>
                                <p className="text-lg text-gray-600">{book?.author}</p>
                            </div>
                        </div>

                        {/* Audio Element */}
                        <audio
                            ref={audioRef}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            className="hidden"
                        />

                        {/* Player Controls */}

                        <div className="p-6 bg-gray-50">
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-sm text-gray-600 mt-2">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Control Buttons */}
                            <div className="flex items-center justify-center space-x-6 mb-6">
                                <button
                                    onClick={skipBackward}
                                    className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8L12.066 11.2zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8L4.066 11.2z"/>
                                    </svg>
                                </button>

                                <button
                                    onClick={handlePlayPause}
                                    className="p-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                >
                                    {isPlaying ? (

                                        <svg className="w-8 h-8" fill="#fff" version="1.1" viewBox="0 0 124.5 124.5">
                                            <g strokeWidth="0"></g>
                                            <g strokeLinecap="round"
                                               strokeLinejoin="round"></g>
                                            <g>
                                                <g>
                                                    <path
                                                        d="M116.35,124.5c3.3,0,6-2.699,6-6V6c0-3.3-2.7-6-6-6h-36c-3.3,0-6,2.7-6,6v112.5c0,3.301,2.7,6,6,6H116.35z"></path>
                                                    <path
                                                        d="M44.15,124.5c3.3,0,6-2.699,6-6V6c0-3.3-2.7-6-6-6h-36c-3.3,0-6,2.7-6,6v112.5c0,3.301,2.7,6,6,6H44.15z"></path>
                                                </g>
                                            </g>
                                        </svg>
                                        ) : (
                                        <svg className="w-8 h-8" fill="#fff" version="1.1"
                                        viewBox="0 0 124.512 124.512">
                                        <g strokeWidth="0"></g>
                                        <g strokeLinecap="round" strokeLinejoin="round"></g>
                                        <g>
                                        <g>
                                        <path
                                        d="M113.956,57.006l-97.4-56.2c-4-2.3-9,0.6-9,5.2v112.5c0,4.6,5,7.5,9,5.2l97.4-56.2 C117.956,65.105,117.956,59.306,113.956,57.006z"></path>
                                        </g>
                                        </g>
                                        </svg>
                                        )}
                                </button>

                                <button
                                    onClick={skipForward}
                                    className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/>
                                    </svg>
                                </button>
                            </div>

                            {/* Volume and Bookmark */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
                                        <g fill="#000">
                                            <path d="M6 1h2v14H6l-4-4H0V5h2zM14 8a4 4 0 0 0-4-4V2a6 6 0 0 1 0 12v-2a4 4 0 0 0 4-4"></path>
                                            <path d="M12 8a2 2 0 0 1-2 2V6a2 2 0 0 1 2 2"></path>
                                        </g>
                                    </svg>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <button
                                    id="bookmark-btn"
                                    onClick={() => setShowBookmarksModal(true)}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                                >
                                    Bookmarks ({bookmarks.length})
                                </button>
                            </div>

                            {/* Bookmarks Modal */}
                            {showBookmarksModal && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 flex flex-col">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">I tuoi Bookmarks</h3>
                                            <button
                                                onClick={() => setShowBookmarksModal(false)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto">
                                            {bookmarks && bookmarks.length > 0 ? (
                                                <div className="space-y-3">
                                                    {bookmarks.map((bookmark) => (
                                                        <div
                                                            key={bookmark.id}
                                                            onClick={() => goToBookmark(bookmark.position)}
                                                            className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="text-sm font-medium text-blue-600">
                                                                        {formatBookmarkTime(bookmark.position)}
                                                                    </div>
                                                                    {bookmark.note && (
                                                                        <div className="text-sm text-gray-600 mt-1">
                                                                            {bookmark.note}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                        {new Date(bookmark.insertTime).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                                <div className="text-gray-400 ml-2">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500 py-8">
                                                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                    </svg>
                                                    <p>Nessun bookmark salvato</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={() => {
                                                    setShowBookmarksModal(false);
                                                }}
                                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                Crea Nuovo Bookmark
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Chapters List */}
                            {chapters && chapters.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Chapters</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {chapters.map((chapter, index) => {
                                            const chapterStartTime = chapters.slice(0, index).reduce((total, ch) => total + ch.durationInSeconds, 0);

                                            return (
                                                <div
                                                    key={chapter.number}
                                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => {
                                                        if (audioRef.current) {
                                                            audioRef.current.currentTime = chapterStartTime;
                                                        }
                                                    }}
                                                >
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                                                        <p className="text-sm text-gray-500">
                                                            {formatTime(chapterStartTime)} • {formatTime(chapter.durationInSeconds)}
                                                        </p>
                                                    </div>
                                                    <div className="text-gray-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default PlayerView;
