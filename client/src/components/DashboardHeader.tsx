import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmLogoutModal from './ConfirmLogoutModal';

interface DashboardHeaderProps {
  onLogout: () => void;
  triggerLogout?: boolean;
  setTriggerLogout?: (value: boolean) => void;
}

function DashboardHeader({ onLogout, triggerLogout, setTriggerLogout }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (triggerLogout) {
      setShowConfirmModal(true);
      if (setTriggerLogout) {
        setTriggerLogout(false);
      }
    }
  }, [triggerLogout, setTriggerLogout]);

  const handleLogoutClick = () => {
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
                onClick={handleLogoutClick}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('dashboard.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <ConfirmLogoutModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}

export default DashboardHeader;
