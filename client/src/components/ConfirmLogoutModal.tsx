import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmLogoutModal({ isOpen, onConfirm, onCancel }: ConfirmLogoutModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={t('logout.confirmTitle')}>
      <div className="flex flex-col">
        <p className="text-gray-300 mb-6">
          {t('logout.confirmMessage')}
        </p>
        <div className="flex justify-end space-x-3 mt-4">
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
    </Modal>
  );
}

export default ConfirmLogoutModal;
