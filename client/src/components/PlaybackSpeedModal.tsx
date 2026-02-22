import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface PlaybackSpeedModalProps {
  isOpen: boolean;
  playbackRate: number;
  onClose: () => void;
  onRateChange: (rate: number) => void;
}

function PlaybackSpeedModal({ isOpen, playbackRate, onClose, onRateChange }: PlaybackSpeedModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('playbackSpeed.title')}>
      <div className="flex flex-col">

        {/* Preset Speeds */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">{t('playbackSpeed.presets')}</h4>
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
          <h4 className="text-sm font-medium text-gray-300 mb-3">{t('playbackSpeed.custom')}</h4>
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
          className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium mt-4"
        >
          {t('playbackSpeed.confirm')}
        </button>
      </div>
    </Modal>
  );
}

export default PlaybackSpeedModal;