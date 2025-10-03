import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmLogoutModal({ isOpen, onConfirm, onCancel }: ConfirmLogoutModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          {t('logout.confirmTitle')}
        </h2>
        <p className="text-gray-300 mb-6">
          {t('logout.confirmMessage')}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            {t('logout.cancelButton')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            {t('logout.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmLogoutModal;
