import React from 'react';

interface PlaybackSpeedModalProps {
  isOpen: boolean;
  playbackRate: number;
  onClose: () => void;
  onRateChange: (rate: number) => void;
}

function PlaybackSpeedModal({ isOpen, playbackRate, onClose, onRateChange }: PlaybackSpeedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Velocità di Riproduzione</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preset Speeds */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Velocità Predefinite</h4>
          <div className="grid grid-cols-3 gap-2">
            {[1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => onRateChange(speed)}
                className={`p-3 rounded-md text-sm font-medium transition-colors ${
                  playbackRate === speed
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Custom Speed Slider */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Velocità Personalizzata</h4>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-400">2.0x</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-orange-400 font-medium">{playbackRate}x</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          Conferma
        </button>
      </div>
    </div>
  );
}

export default PlaybackSpeedModal;