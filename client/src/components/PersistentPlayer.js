import React, { useState } from 'react';

function PersistentPlayer({ currentBook, onPlayPause }) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!currentBook) return null;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (onPlayPause) {
      onPlayPause(!isPlaying);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center space-x-4">
        <img
          src={currentBook.cover ? "https://www.storytel.com" + currentBook.cover : '/placeholder-book.jpg'}
          alt={currentBook.name}
          className="w-12 h-16 object-cover rounded"
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{currentBook.name}</h3>
          <p className="text-gray-400 text-sm truncate">16:01:30</p>
        </div>

        <button
          onClick={handlePlayPause}
          className="p-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default PersistentPlayer;