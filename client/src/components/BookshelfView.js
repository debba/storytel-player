import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function BookshelfView() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadBookshelf();
  }, []);

  const loadBookshelf = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/bookshelf');
      setBooks(response.data.books);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load bookshelf');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSelect = (book) => {
    navigate(`/player/${book.abook.id}`, {
      state: {
        book: book
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading your library...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="px-4 py-6 sm:px-0">
          {books.length === 0 ? (
              <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
                  <p className="mt-1 text-sm text-gray-500">Your library appears to be empty.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {books.map((book) => (
                      <div
                          key={book.abook.id}
                          onClick={() => handleBookSelect(book)}
                          className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                      >
                          <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                              {book.cover ? (
                                  <img
                                      src={"https://www.storytel.com"+book.cover}
                                      alt={book.name}
                                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                              ) : (
                                  <div className="flex items-center justify-center h-48 bg-gray-300">
                                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                      </svg>
                                  </div>
                              )}
                          </div>
                          <div className="p-4">
                              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{book.name}</h3>
                              <p className="text-xs text-gray-600 mb-2">{book.author}</p>
                              {book.data.position > 0 && (
                                  <div className="flex items-center text-xs text-green-600">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-6 0a4 4 0 11-7.87 1H5a4 4 0 014-4z" />
                                      </svg>
                                      In Progress
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );
}

export default BookshelfView;
