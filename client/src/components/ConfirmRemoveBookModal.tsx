import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface ConfirmRemoveBookModalProps {
    isOpen: boolean;
    /** Title of the book about to be removed, shown in the message. */
    bookTitle: string;
    isRemoving?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/** Confirmation for taking a book off the Storytel bookshelf. */
function ConfirmRemoveBookModal({
    isOpen,
    bookTitle,
    isRemoving = false,
    onConfirm,
    onCancel,
}: ConfirmRemoveBookModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={t('bookshelf.removeTitle')} zIndex={60}>
            <div className="flex flex-col">
                <p className="text-gray-300 mb-6">
                    {t('bookshelf.removeMessage', { title: bookTitle })}
                </p>
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isRemoving}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white rounded-md transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isRemoving}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-md transition-colors"
                    >
                        {t('bookshelf.removeConfirm')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmRemoveBookModal;
