import React from 'react';
import { useTranslation } from 'react-i18next';
import storage from '../utils/storage';
import Modal from './Modal';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleGithubClick = () => {
    window.open('https://github.com/debba/storytel-player', '_blank', 'noopener,noreferrer');
  };

  const handleDiscordClick = () => {
    window.open('https://discord.gg/YrZPHAwMSG', '_blank', 'noopener,noreferrer');
  };

  const handleGetStarted = async () => {
    await storage.set('hasSeenWelcome', 'true');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleGetStarted} title={t('welcome.title')}>
      <div className="flex flex-col gap-6">

        <p className="text-gray-300 mb-6">
          {t('welcome.message')}
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={handleGithubClick}
            className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {t('welcome.starGithub')}
          </button>

          <button
            onClick={handleDiscordClick}
            className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            {t('welcome.joinDiscord')}
          </button>
        </div>

        <button
          onClick={handleGetStarted}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
        >
          {t('welcome.getStarted')}
        </button>
      </div>
    </Modal>
  );
}

export default WelcomeModal;
