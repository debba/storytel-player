import React from 'react';
import { Chapter } from '../interfaces/chapters';

interface ChaptersModalProps {
  isOpen: boolean;
  chapters: Chapter[];
  currentTime: number;
  playbackRate: number;
  onClose: () => void;
  onChapterClick: (chapterStartTime: number) => void;
}

function ChaptersModal({ isOpen, chapters, currentTime, playbackRate, onClose, onChapterClick }: ChaptersModalProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 flex flex-col border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Capitoli</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chapters && chapters.length > 0 ? (
            <div className="space-y-2">
              {chapters.map((chapter, index) => {
                const chapterStartTime = chapters.slice(0, index).reduce((total, ch) => total + (ch.durationInSeconds || 0), 0);
                const chapterDuration = chapter.durationInSeconds || 0;
                const chapterEndTime = chapterStartTime + chapterDuration;

                // Calcola il progresso del capitolo corrente
                const isCurrentChapter = currentTime >= chapterStartTime && currentTime < chapterEndTime;
                const chapterProgress = isCurrentChapter && chapterDuration > 0
                  ? ((currentTime - chapterStartTime) / chapterDuration) * 100
                  : 0;

                return (
                  <div
                    key={chapter.number || index}
                    className="bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 cursor-pointer overflow-hidden transition-colors"
                    onClick={() => {
                      onChapterClick(chapterStartTime);
                      onClose();
                    }}
                  >
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm">{chapter.title}</h4>
                        {isCurrentChapter ? (
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-400">
                              {formatTime((currentTime - chapterStartTime) / playbackRate)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTime((chapterDuration - (currentTime - chapterStartTime)) / playbackRate)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">
                            {formatTime(chapterStartTime / playbackRate)} • {formatTime(chapterDuration / playbackRate)}
                          </p>
                        )}
                      </div>
                      {isCurrentChapter && (
                        <div className="ml-3 text-orange-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Barra di avanzamento del capitolo */}
                    {isCurrentChapter && (
                      <div className="relative h-1 bg-gray-700">
                        <div
                          className="absolute top-0 left-0 h-full bg-orange-600 transition-all duration-300"
                          style={{ width: `${Math.max(chapterProgress, 0)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-400">Nessun capitolo disponibile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChaptersModal;