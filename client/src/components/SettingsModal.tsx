import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

function SettingsModal({ isOpen, onClose, onLogout }: SettingsModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchAccountInfo();
    }
  }, [isOpen]);

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account');
      setEmail(response.data.email);
    } catch (error) {
      console.error('Failed to fetch account info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubClick = () => {
    window.open('https://github.com/debba/storytel-player', '_blank', 'noopener,noreferrer');
  };

  const handleDiscordClick = () => {
    window.open('https://discord.gg/YrZPHAwMSG', '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Community Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {t('settings.community')}
          </h3>
          <div className="border-t border-gray-700 mb-3"></div>
          <div className="space-y-2">
            <button
              onClick={handleGithubClick}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              <span>{t('settings.githubRepo')}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            <button
              onClick={handleDiscordClick}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              <span>{t('settings.discordCommunity')}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {t('settings.account')}
          </h3>
          <div className="border-t border-gray-700 mb-3"></div>
          
          {/* Account Info */}
          <div className="bg-gray-800 rounded-md p-4 mb-3">
            <div className="flex flex-col">
              <span className="text-sm text-gray-400 mb-1">{t('settings.email')}</span>
              <span className="text-white font-medium">
                {loading ? t('common.loading') : email || '-'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            {t('settings.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
