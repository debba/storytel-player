import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmLogoutModal from './ConfirmLogoutModal';
import SettingsModal from './SettingsModal';

interface DashboardHeaderProps {
  onLogout: () => void;
  triggerLogout?: boolean;
  setTriggerLogout?: (value: boolean) => void;
}

function DashboardHeader({ onLogout, triggerLogout, setTriggerLogout }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (triggerLogout) {
      setShowConfirmModal(true);
      if (setTriggerLogout) {
        setTriggerLogout(false);
      }
    }
  }, [triggerLogout, setTriggerLogout]);

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleLogoutClick = () => {
    setShowSettingsModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <nav className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
                <img src={'assets/icon.png'} alt={"Storytel"} className="w-12 h-12"/>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSettingsClick}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('dashboard.settings')}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onLogout={handleLogoutClick}
      />
      <ConfirmLogoutModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}

export default DashboardHeader;
