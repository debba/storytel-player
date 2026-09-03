import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAudioContext } from '../contexts/AudioContext';
import { buildCoverUrl, formatTime } from '../utils/helpers';
import ChaptersPopover from './ChaptersPopover';

export function PlayerBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    activeBook,
    activeBookId,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    chapters,
    currentChapter,
    togglePlayPause,
    seek,
    skipForward,
    skipBackward,
    setRate,
    setVolume,
    toggleMute,
    jumpToChapter,
    sleepTimerRemaining,
    sleepTimerMode,
    setSleepTimer,
  } = useAudioContext();

  const [showSpeedPopover, setShowSpeedPopover] = useState(false);
  const [showChapterPopover, setShowChapterPopover] = useState(false);
  const [showSleepPopover, setShowSleepPopover] = useState(false);

  const speedRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const sleepRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (speedRef.current && !speedRef.current.contains(target)) {
        setShowSpeedPopover(false);
      }
      if (chapterRef.current && !chapterRef.current.contains(target)) {
        setShowChapterPopover(false);
      }
      if (sleepRef.current && !sleepRef.current.contains(target)) {
        setShowSleepPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeBook && !activeBookId) {
    return null;
  }

  const bookTitle = activeBook?.book?.name || 'Storytel Audiobook';
  const authorName = activeBook?.book?.authorsAsString || activeBook?.abook?.narratorAsString || '';
  const coverUrl = activeBook?.book?.largeCover || activeBook?.book?.largeCoverE || '';
  const progressPercent = duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;
  const remainingSeconds = Math.max(0, duration - currentTime);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const handleOpenFullPlayer = () => {
    if (activeBookId) {
      navigate(`/player/${activeBookId}`);
    }
  };

  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const sleepOptions: { label: string; value: number | 'chapter' | null }[] = [
    { label: t('player.off', 'Off'), value: null },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: t('player.endOfChapter', 'End of chapter'), value: 'chapter' },
  ];

  return (
    <div className="h-[76px] px-5 gap-5 bg-[#121214]/90 backdrop-blur-[24px] border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] flex items-center justify-between z-40 select-none flex-shrink-0 relative">
      {/* 1. Left (290px fixed) */}
      <div className="w-[290px] flex items-center gap-3 min-w-0 flex-shrink-0">
        <div
          onClick={handleOpenFullPlayer}
          className="w-[52px] h-[52px] rounded-[10px] bg-gray-900 overflow-hidden flex-shrink-0 cursor-pointer group relative shadow-md"
        >
          {coverUrl ? (
            <img
              src={buildCoverUrl(coverUrl)}
              alt={bookTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h4
            onClick={handleOpenFullPlayer}
            className="text-[14px] font-semibold text-white truncate cursor-pointer hover:text-[#FF5100] transition-colors"
            title={bookTitle}
          >
            {bookTitle}
          </h4>
          <div className="text-[12px] text-[#9ca3af] truncate flex items-center gap-1.5 mt-0.5">
            {authorName && <span className="truncate max-w-[130px]">{authorName}</span>}
            {currentChapter && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-[#9ca3af] truncate font-medium" title={currentChapter.title}>
                  {currentChapter.title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Centre (flex-grow, stacked rows) */}
      <div className="flex-1 max-w-xl mx-2 flex flex-col items-center justify-center gap-1">
        {/* Transport Row (gap 18px) */}
        <div className="flex items-center gap-[18px]">
          {/* Skip -15s */}
          <button
            type="button"
            onClick={() => skipBackward(15)}
            title={t('player.skipBackward', { seconds: 15 })}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
            <span className="text-[9px] font-bold absolute -bottom-1">15</span>
          </button>

          {/* Play/Pause 40px Accent Circle */}
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-[#FF5100] hover:bg-[#ff641a] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(255,81,0,0.35)] transition-transform active:scale-95 hover:scale-105"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isPlaying ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip +30s */}
          <button
            type="button"
            onClick={() => skipForward(30)}
            title={t('player.skipForward', { seconds: 30 })}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
            <span className="text-[9px] font-bold absolute -bottom-1">30</span>
          </button>
        </div>

        {/* Scrubber Row */}
        <div className="w-full flex items-center gap-2.5">
          <span className="w-[46px] text-right font-mono text-[11px] text-gray-400 tabular-nums">
            {formatTime(currentTime)}
          </span>

          <div className="flex-1 relative flex items-center group py-1">
            {/* Background 4px Track */}
            <div className="w-full h-1 group-hover:h-1.5 bg-white/[0.12] rounded-full overflow-hidden transition-all">
              <div
                className="h-full bg-[#FF5100] transition-all rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Native Slider input */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleScrubberChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <span className="w-[52px] text-left font-mono text-[11px] text-gray-400 tabular-nums">
            −{formatTime(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* 3. Right (auto width, tool buttons) */}
      <div className="flex items-center justify-end gap-2 flex-shrink-0">
        {/* Speed Popover Trigger */}
        <div className="relative" ref={speedRef}>
          <button
            type="button"
            onClick={() => setShowSpeedPopover((prev) => !prev)}
            title={t('player.speed', 'Speed')}
            className={`h-9 px-2.5 rounded-[10px] text-xs font-bold transition-all flex items-center justify-center ${
              playbackRate !== 1.0
                ? 'bg-[#FF5100]/20 text-[#FF5100] border border-[#FF5100]/40'
                : 'bg-white/[0.05] hover:bg-white/[0.10] text-gray-300 hover:text-white border border-white/[0.10]'
            }`}
          >
            {playbackRate}×
          </button>

          {showSpeedPopover && (
            <div className="absolute bottom-[88px] right-0 w-36 bg-[#17171A] border border-white/[0.12] rounded-[14px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none">
              <div className="text-[11px] font-bold text-[#6b7280] px-2 py-1 uppercase tracking-wider">
                {t('player.speed', 'Speed')}
              </div>
              {speeds.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setRate(rate);
                    setShowSpeedPopover(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-[8px] text-xs font-semibold flex items-center justify-between transition-colors ${
                    playbackRate === rate
                      ? 'bg-[#FF5100] text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{rate}×</span>
                  {playbackRate === rate && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chapters Popover Trigger */}
        <div className="relative" ref={chapterRef}>
          <button
            type="button"
            onClick={() => setShowChapterPopover((prev) => !prev)}
            title={t('player.chapters', 'Chapters')}
            className={`h-9 px-2.5 rounded-[10px] transition-colors flex items-center gap-1.5 text-xs font-medium ${
              showChapterPopover
                ? 'bg-white/[0.15] text-white border border-white/20'
                : 'bg-white/[0.05] hover:bg-white/[0.10] text-gray-300 hover:text-white border border-white/[0.10]'
            }`}
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">{t('player.chapters', 'Chapters')}</span>
          </button>

          {showChapterPopover && (
            <ChaptersPopover
              chapters={chapters}
              currentChapter={currentChapter}
              onSelectChapter={jumpToChapter}
              onClose={() => setShowChapterPopover(false)}
            />
          )}
        </div>

        {/* Sleep Timer Popover Trigger */}
        <div className="relative" ref={sleepRef}>
          <button
            type="button"
            onClick={() => setShowSleepPopover((prev) => !prev)}
            title={t('player.sleepTimer', 'Sleep Timer')}
            className={`w-9 h-9 rounded-[10px] transition-colors flex items-center justify-center relative ${
              sleepTimerMode !== null
                ? 'bg-[#FF5100]/20 text-[#FF5100] border border-[#FF5100]/40'
                : 'bg-white/[0.05] hover:bg-white/[0.10] text-gray-300 hover:text-white border border-white/[0.10]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            {sleepTimerRemaining !== null && (
              <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-[#FF5100] text-white text-[8px] font-bold">
                {Math.ceil(sleepTimerRemaining / 60)}m
              </span>
            )}
          </button>

          {showSleepPopover && (
            <div className="absolute bottom-[88px] right-0 w-48 bg-[#17171A] border border-white/[0.12] rounded-[14px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none">
              <div className="text-[11px] font-bold text-[#6b7280] px-2.5 py-1 uppercase tracking-wider">
                {t('player.sleepTimer', 'Sleep Timer')}
              </div>
              {sleepOptions.map((opt, idx) => {
                const isSelected = sleepTimerMode === opt.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSleepTimer(opt.value);
                      setShowSleepPopover(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#FF5100] text-white font-bold'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Volume Slider */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            title={t('player.volume', 'Volume')}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            {isMuted || volume === 0 ? (
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF5100]"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/[0.10] mx-0.5" />

        {/* Expand Arrow: Open Full Player View */}
        <button
          type="button"
          onClick={handleOpenFullPlayer}
          title={t('player.expand', 'Open full player')}
          className="w-9 h-9 rounded-[10px] bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-gray-300 hover:text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PlayerBar;
