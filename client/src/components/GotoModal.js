import React from 'react';

function GotoModal({
  isOpen,
  playbackRate,
  gotoHours,
  gotoMinutes,
  gotoSeconds,
  onClose,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
  onGoto
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Vai al Tempo</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-4">
            Inserisci il tempo desiderato (considerando la velocità {playbackRate}x)
          </p>

          <div className="flex items-center space-x-4 justify-center">
            {/* Hours */}
            <div className="text-center">
              <label className="block text-sm text-gray-300 mb-2">Ore</label>
              <input
                type="number"
                min="0"
                max="23"
                value={gotoHours}
                onChange={(e) => onHoursChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <span className="text-white text-xl mt-6">:</span>

            {/* Minutes */}
            <div className="text-center">
              <label className="block text-sm text-gray-300 mb-2">Min</label>
              <input
                type="number"
                min="0"
                max="59"
                value={gotoMinutes}
                onChange={(e) => onMinutesChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <span className="text-white text-xl mt-6">:</span>

            {/* Seconds */}
            <div className="text-center">
              <label className="block text-sm text-gray-300 mb-2">Sec</label>
              <input
                type="number"
                min="0"
                max="59"
                value={gotoSeconds}
                onChange={(e) => onSecondsChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onGoto}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            Vai
          </button>
        </div>
      </div>
    </div>
  );
}

export default GotoModal;