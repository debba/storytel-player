import React from 'react';
import { Chapter } from '../interfaces/chapters';

interface ChaptersListProps {
  chapters: Chapter[];
  currentTime: number;
  playbackRate: number;
  onChapterClick: (chapterStartTime: number) => void;
}

function ChaptersList({ chapters, currentTime, playbackRate, onChapterClick }: ChaptersListProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!chapters || chapters.length === 0) return null;

  return (
    <div className="mt-6 border-t border-gray-800 pt-6">
      <h3 className="text-lg font-semibold text-white mb-4">Capitoli</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
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
              onClick={() => onChapterClick(chapterStartTime)}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex-1">
                  <h4 className="font-medium text-white">{chapter.title}</h4>
                  {isCurrentChapter ? (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-400">
                        {formatTime((currentTime - chapterStartTime) / playbackRate)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatTime((chapterDuration - (currentTime - chapterStartTime)) / playbackRate)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
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
    </div>
  );
}

export default ChaptersList;