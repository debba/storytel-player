import {useCallback, useState} from 'react';
import api from '../utils/api';
import {Bookmark} from '../interfaces/bookmarks';

interface UseBookmarksProps {
    consumableId: string;
    onError: (error: string) => void;
}

export const useBookmarks = ({consumableId, onError}: UseBookmarksProps) => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [showBookmarksModal, setShowBookmarksModal] = useState(false);
    const [showCreateBookmarkModal, setShowCreateBookmarkModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showEditBookmarkModal, setShowEditBookmarkModal] = useState(false);
    const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
    const [bookmarkToEdit, setBookmarkToEdit] = useState<Bookmark | null>(null);
    const [newBookmarkNote, setNewBookmarkNote] = useState('');
    const [editBookmarkNote, setEditBookmarkNote] = useState('');

    const loadBookmarks = useCallback(async () => {
        try {
            const response = await api.get(`/bookmarks/${consumableId}`);
            const {data} = response;
            setBookmarks(data.bookmarks);
        } catch (error: any) {
            onError(error.response?.data?.error || 'Failed to load bookmarks');
        }
    }, [consumableId, onError]);

    const goToBookmark = useCallback((position: number, audioRef: React.RefObject<HTMLAudioElement | null>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.floor(position / 1000);
            audioRef.current.play();
            setShowBookmarksModal(false);
        }
    }, []);

    const handleShowEditBookmarkModal = (bookmark: Bookmark) => {
        setBookmarkToEdit(bookmark);
        setEditBookmarkNote(bookmark.note || '');
        setShowEditBookmarkModal(true);
        setShowBookmarksModal(false);
    };

    const handleShowDeleteConfirmModal = (bookmark: Bookmark) => {
        setBookmarkToDelete(bookmark);
        setShowDeleteConfirmModal(true);
        setShowBookmarksModal(false);
    };

    const handleShowCreateBookmarkModal = () => {
        setShowBookmarksModal(false);
        setShowCreateBookmarkModal(true);
    };

    const handleCloseEditBookmarkModal = () => {
        setShowEditBookmarkModal(false);
        setBookmarkToEdit(null);
        setEditBookmarkNote('');
    };

    const handleCloseDeleteConfirmModal = () => {
        setShowDeleteConfirmModal(false);
        setBookmarkToDelete(null);
    };

    const createBookmark = async (currentTime: number) => {
        try {
            const positionInMilliseconds = Math.floor(currentTime * 1000);

            await api.post(`/bookmarks/${consumableId}`, {
                position: positionInMilliseconds,
                note: newBookmarkNote
            });

            await loadBookmarks();
            setNewBookmarkNote('');
            setShowCreateBookmarkModal(false);
        } catch (error) {
            console.error('Failed to create bookmark:', error);
        }
    };

    const deleteBookmark = async () => {
        if (!bookmarkToDelete) return;

        try {
            await api.delete(`/bookmarks/${consumableId}/${bookmarkToDelete.id}`, {});
            await loadBookmarks();
            setShowDeleteConfirmModal(false);
            setBookmarkToDelete(null);
        } catch (error) {
            console.error('Failed to delete bookmark:', error);
        }
    };

    const editBookmark = async () => {
        if (!bookmarkToEdit) return;

        try {
            await api.put(`/bookmarks/${consumableId}/${bookmarkToEdit.id}`, {
                position: bookmarkToEdit.position,
                note: editBookmarkNote,
                type: 'abook'
            });

            await loadBookmarks();
            setShowEditBookmarkModal(false);
            setBookmarkToEdit(null);
            setEditBookmarkNote('');
        } catch (error) {
            console.error('Failed to edit bookmark:', error);
        }
    };

    return {
        bookmarks,
        showBookmarksModal,
        showCreateBookmarkModal,
        showDeleteConfirmModal,
        showEditBookmarkModal,
        bookmarkToDelete,
        bookmarkToEdit,
        newBookmarkNote,
        editBookmarkNote,
        setShowBookmarksModal,
        setNewBookmarkNote,
        setEditBookmarkNote,
        loadBookmarks,
        goToBookmark,
        handleShowEditBookmarkModal,
        handleShowDeleteConfirmModal,
        handleShowCreateBookmarkModal,
        handleCloseEditBookmarkModal,
        handleCloseDeleteConfirmModal,
        createBookmark,
        deleteBookmark,
        editBookmark,
    };
};
