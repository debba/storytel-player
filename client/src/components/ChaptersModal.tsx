import React from 'react';
import { Chapter } from '../interfaces/chapters';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../utils/helpers';

interface ChaptersModalProps {
  isOpen: boolean;
  chapters: Chapter[];
  currentTime: number;
  playbackRate: number;
  onClose: () => void;
  onChapterClick: (chapterStartTime: number) => void;
}

function ChaptersModal({
  isOpen,
  chapters,
  currentTime,
  playbackRate,
  onClose,
  onChapterClick,
}: ChaptersModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
      <div className="bg-[#17171A] rounded-[16px] p-6 max-w-md w-full mx-4 max-h-[500px] flex flex-col border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.08]">
          <h3 className="text-base font-semibold text-white tracking-wide">
            {t('chapters.title', 'Chapters')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {chapters && chapters.length > 0 ? (
            chapters.map((chapter, index) => {
              const chapterStartTime = typeof chapter.start === 'number' && !isNaN(chapter.start)
                ? chapter.start
                : chapters.slice(0, index).reduce((total, ch) => total + (ch.durationInSeconds || 0), 0);
              const chapterDuration = chapter.durationInSeconds || 0;
              const chapterEndTime = typeof chapter.end === 'number' && !isNaN(chapter.end)
                ? chapter.end
                : chapterStartTime + chapterDuration;

              const isCurrentChapter = currentTime >= chapterStartTime && currentTime < chapterEndTime;
              const chapterProgress = isCurrentChapter && chapterDuration > 0
                ? ((currentTime - chapterStartTime) / chapterDuration) * 100
                : 0;

              return (
                <div
                  key={chapter.number || index}
                  className={`rounded-[12px] border transition-all cursor-pointer overflow-hidden ${
                    isCurrentChapter
                      ? 'bg-[#FF5100]/15 border-[#FF5100]/40 shadow-sm'
                      : 'bg-[#202024] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
                  }`}
                  onClick={() => {
                    onChapterClick(chapterStartTime);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between p-3.5">
                    <div className="flex-1 min-w-0 mr-3">
                      <h4 className="font-medium text-white text-sm truncate">
                        {chapter.title || `${t('chapters.chapter', 'Kapitel')} ${chapter.number || index + 1}`}
                      </h4>
                      {isCurrentChapter ? (
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-[#FF5100] font-mono">
                            {formatTime((currentTime - chapterStartTime) / playbackRate)}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            -{formatTime(Math.max(0, chapterDuration - (currentTime - chapterStartTime)) / playbackRate)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {formatTime(chapterStartTime / playbackRate)} • {formatTime(chapterDuration / playbackRate)}
                        </p>
                      )}
                    </div>
                    {isCurrentChapter && (
                      <div className="text-[#FF5100] flex-shrink-0">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Chapter Progress Bar */}
                  {isCurrentChapter && (
                    <div className="relative h-1 bg-white/10 w-full">
                      <div
                        className="absolute top-0 left-0 h-full bg-[#FF5100] transition-all duration-300"
                        style={{ width: `${Math.min(Math.max(chapterProgress, 0), 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-12">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm text-gray-400">{t('chapters.noChapters', 'No chapters available')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChaptersModal;
