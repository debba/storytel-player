import React from 'react';
import {formatTime} from "../utils/helpers";

function BookmarkModals({
  // Bookmarks Modal
  showBookmarksModal,
  bookmarks,
  onCloseBookmarksModal,
  onShowCreateBookmarkModal,
  onGoToBookmark,
  onShowEditBookmarkModal,
  onShowDeleteConfirmModal,

  // Create Bookmark Modal
  showCreateBookmarkModal,
  newBookmarkNote,
  currentTime,
  playbackRate,
  onCloseCreateBookmarkModal,
  onNewBookmarkNoteChange,
  onCreateBookmark,

  // Edit Bookmark Modal
  showEditBookmarkModal,
  bookmarkToEdit,
  editBookmarkNote,
  onCloseEditBookmarkModal,
  onEditBookmarkNoteChange,
  onEditBookmark,

  // Delete Confirmation Modal
  showDeleteConfirmModal,
  bookmarkToDelete,
  onCloseDeleteConfirmModal,
  onDeleteBookmark
}) {


  return (
    <>
      {/* Bookmarks Modal */}
      {showBookmarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 flex flex-col border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">I tuoi Bookmarks</h3>
              <button
                onClick={onCloseBookmarksModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {bookmarks && bookmarks.length > 0 ? (
                <div className="space-y-3">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      onClick={() => onGoToBookmark(bookmark.position)}
                      className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors border border-gray-600"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-orange-400">
                            {formatTime(bookmark.position)}
                          </div>
                          {bookmark.note && (
                            <div className="text-sm text-gray-300 mt-1">
                              {bookmark.note}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(bookmark.insertTime).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowEditBookmarkModal(bookmark);
                            }}
                            className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                            title="Modifica bookmark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowDeleteConfirmModal(bookmark);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Elimina bookmark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="text-gray-400">Nessun bookmark salvato</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={onShowCreateBookmarkModal}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Crea Nuovo Bookmark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bookmark Modal */}
      {showCreateBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Crea Nuovo Bookmark</h3>
              <button
                onClick={onCloseCreateBookmarkModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Posizione attuale: {formatTime(currentTime / playbackRate)}
              </p>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nota (opzionale)
              </label>
              <textarea
                value={newBookmarkNote}
                onChange={(e) => onNewBookmarkNoteChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                rows="3"
                placeholder="Aggiungi una nota a questo bookmark..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onCloseCreateBookmarkModal}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={onCreateBookmark}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Salva Bookmark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bookmark Modal */}
      {showEditBookmarkModal && bookmarkToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Modifica Bookmark</h3>
              <button
                onClick={onCloseEditBookmarkModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-4">
                Posizione: <span className="font-medium text-orange-400">{formatTime(bookmarkToEdit.position)}</span>
              </p>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nota
              </label>
              <textarea
                value={editBookmarkNote}
                onChange={(e) => onEditBookmarkNoteChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                rows="3"
                placeholder="Modifica la nota per questo bookmark..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onCloseEditBookmarkModal}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={onEditBookmark}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && bookmarkToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-900 rounded-full">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Elimina Bookmark</h3>
              <p className="text-gray-400 mb-2">
                Sei sicuro di voler eliminare questo bookmark?
              </p>
              <div className="bg-gray-800 rounded-lg p-3 mb-4 border border-gray-600">
                <div className="text-sm font-medium text-orange-400">
                  {formatTime(bookmarkToDelete.position)}
                </div>
                {bookmarkToDelete.note && (
                  <div className="text-sm text-gray-300 mt-1">
                    "{bookmarkToDelete.note}"
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Questa azione non può essere annullata.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onCloseDeleteConfirmModal}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={onDeleteBookmark}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BookmarkModals;
