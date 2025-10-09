import React from 'react';
import {useTranslation} from 'react-i18next';

interface DownloadCancelModalProps {
    isOpen: boolean;
    isDownloading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const DownloadCancelModal: React.FC<DownloadCancelModalProps> = ({isOpen, isDownloading, onConfirm, onCancel}) => {
    const {t} = useTranslation();

    if (!isOpen) return null;

    const title = isDownloading ? t('download.cancelTitle') : t('download.deleteTitle');
    const message = isDownloading ? t('download.cancelMessage') : t('download.deleteMessage');
    const warning = isDownloading ? t('download.cancelWarning') : t('download.deleteWarning');
    const confirmButton = isDownloading ? t('download.cancelButton') : t('download.deleteButton');
    const cancelButton = isDownloading ? t('download.continueButton') : t('download.keepButton');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-80 max-w-md border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
                <p className="text-gray-300 mb-2">{message}</p>
                <p className="text-gray-400 text-sm mb-6">{warning}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                        {cancelButton}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        {confirmButton}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadCancelModal;