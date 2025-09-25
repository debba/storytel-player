import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import api from '../services/api';
import BookCard from './BookCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import DashboardHeader from './DashboardHeader';

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentBook, setCurrentBook] = useState(null);

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
    setCurrentBook(book);
    navigate(`/player/${book.abook.id}`, {
      state: {
        book: book
      }
    });
  };

  const handlePlayerPlayPause = (isPlaying) => {
    // Handle play/pause logic for persistent player
    console.log('Player state:', isPlaying);
  };

  if (isLoading) {
    return <LoadingState message="Loading your library..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader onLogout={onLogout} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4 pb-32">
        {books.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-xl mb-4">No books found</div>
            <p className="text-gray-500">Your library appears to be empty.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {books.map((book) => (
              <BookCard
                key={book.abook.id}
                book={book}
                onBookSelect={handleBookSelect}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
