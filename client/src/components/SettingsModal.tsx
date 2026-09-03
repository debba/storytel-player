import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import LogsModal from './LogsModal';
import LanguageModal from './LanguageModal';
import Modal from './Modal';
import { getLanguageState, LanguageState } from '../i18n';
import { AUTO_LANGUAGE, findLanguage } from '../config/languages';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

function SettingsModal({ isOpen, onClose, onLogout }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [languageState, setLanguageState] = useState<LanguageState | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAccountInfo();
      fetchAlwaysOnTopSetting();
    }
  }, [isOpen]);

  // Also refresh after the picker closes, so the summary line stays accurate.
  useEffect(() => {
    if (isOpen && !showLanguageModal) {
      fetchAppLanguage();
    }
  }, [isOpen, showLanguageModal, i18n.language]);

  // "Svenska" for an explicit choice, "Follows the system · Svenska" otherwise.
  const activeLanguage = findLanguage(languageState?.resolved ?? i18n.language);
  const activeName = activeLanguage?.nativeName ?? languageState?.resolved ?? i18n.language;
  const languageSummary =
    languageState?.mode === AUTO_LANGUAGE
      ? t('language.autoResolved', { language: activeName })
      : activeName;

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

  const fetchAlwaysOnTopSetting = async () => {
    try {
      if (window.electronWindow) {
        const isOnTop = await window.electronWindow.isAlwaysOnTop();
        setAlwaysOnTop(isOnTop);
      }
    } catch (error) {
      console.error('Failed to fetch always on top setting:', error);
    }
  };
  
  const fetchAppLanguage = async () => {
    try {
      setLanguageState(await getLanguageState());
    } catch (error) {
      console.error('Failed to fetch app language setting:', error);
    }
  };

  const handleAlwaysOnTopToggle = async () => {
    try {
      if (window.electronWindow) {
        const newValue = !alwaysOnTop;
        await window.electronWindow.setAlwaysOnTop(newValue);
        setAlwaysOnTop(newValue);
      }
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
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
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <div className="flex flex-col">

        {/* Appearance Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {t('settings.appearance')}
          </h3>
          <div className="border-t border-gray-700 mb-3"></div>
          <div className="bg-gray-800 rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white font-medium mb-1">
                  {t('settings.alwaysOnTop')}
                </div>
                <div className="text-sm text-gray-400">
                  {t('settings.alwaysOnTopDescription')}
                </div>
              </div>
              <button
                onClick={handleAlwaysOnTopToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  alwaysOnTop ? 'bg-orange-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    alwaysOnTop ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <button
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center justify-between gap-4 pt-4 border-t border-gray-700 text-left group"
            >
              <div className="min-w-0">
                <div className="text-white font-medium mb-1">
                  {t('settings.language')}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {languageSummary}
                </div>
              </div>
              <svg
                className="w-5 h-5 shrink-0 text-gray-500 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
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

        {/* Developer Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            {t('settings.developer', 'Developer')}
          </h3>
          <div className="border-t border-gray-700 mb-3"></div>
          <div className="space-y-2">
            <button
              onClick={() => setShowLogsModal(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              <span>{t('settings.viewLogs', 'View Session Logs')}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
    </Modal>
      
    <LogsModal
      isOpen={showLogsModal}
      onClose={() => setShowLogsModal(false)}
    />

    <LanguageModal
      isOpen={showLanguageModal}
      onClose={() => setShowLanguageModal(false)}
    />
    </>
  );
}

export default SettingsModal;
