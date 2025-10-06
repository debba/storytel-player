import React from 'react';
import {formatTime} from '../utils/helpers';
import {t} from "i18next";

interface PlayerControlsProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    onSkipForward: () => void;
    onSkipBackward: () => void;
    onShowGotoModal: () => void;
    onShowPlaybackSpeedModal: () => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    onPlayPause,
    onSeek,
    onVolumeChange,
    onToggleMute,
    onSkipForward,
    onSkipBackward,
    onShowGotoModal,
    onShowPlaybackSpeedModal,
}) => {
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(parseFloat(e.target.value));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onVolumeChange(parseFloat(e.target.value));
    };

    return (
        <div className="p-6">
            {/* Progress Bar */}
            <div className="mb-6 relative">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((currentTime / (duration || 1)) * 100)}%, #374151 ${((currentTime / (duration || 1)) * 100)}%, #374151 100%)`
                    }}
                />
                <div className="flex justify-between items-center text-sm text-gray-400 mt-2">
                    <span>{formatTime(currentTime / playbackRate)}</span>

                    {/* Goto - Center */}
                    <div className="absolute left-1/2 transform -translate-x-1/2">
                        <button
                            onClick={onShowGotoModal}
                            className="px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-xs"
                        >
                            {t("gotoModal.go")}
                        </button>
                    </div>

                    <span>{formatTime(duration / playbackRate)}</span>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between mb-6 w-full">
                {/* Left side - Playback speed */}
                <div className="flex-1 flex justify-start">
                    <button
                        onClick={onShowPlaybackSpeedModal}
                        className="px-3 py-1 text-white rounded-md hover:bg-gray-700 transition-colors text-xs"
                    >
                        {playbackRate}x
                    </button>
                </div>

                {/* Center controls */}
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={onSkipBackward}
                        className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8L12.066 11.2zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8L4.066 11.2z"/>
                        </svg>
                    </button>

                    <button
                        onClick={onPlayPause}
                        className="p-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
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
                        onClick={onSkipForward}
                        className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/>
                        </svg>
                    </button>
                </div>

                {/* Right side - Volume */}
                <div className="flex-1 flex justify-end">
                    <div className="relative group">
                        <button
                            onClick={onToggleMute}
                            className="p-1 rounded hover:bg-gray-800 transition-colors"
                        >
                            {isMuted || volume === 0 ? (
                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                </svg>
                            )}
                        </button>
                        {/* Vertical volume slider on hover */}
                        <div
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto pb-2">
                            <div className="bg-gray-800 rounded-lg p-2 shadow-lg">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="h-24 w-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        WebkitAppearance: 'slider-vertical'
                                    } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerControls;
