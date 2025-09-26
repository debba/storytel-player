import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import api from '../services/api';
import BookCard from './BookCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import DashboardHeader from './DashboardHeader';

function Dashboard({onLogout}) {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentBook, setCurrentBook] = useState(null);
    const [filterStatus, setFilterStatus] = useState(-1)
    const [filteredBooks, setFilteredBooks] = useState([]);

    useEffect(() => {
        loadBookshelf();
    }, []);

    useEffect(() => {
        if (books.length === 0) return;
        let _filterStatus = filterStatus === -1 ? [1,2] : [filterStatus];
        setFilteredBooks(
            books.filter(book => _filterStatus.includes(+book.status))
        );
    }, [filterStatus, books])

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

    const handleBookShelfStatus = (
        status
    ) => {
        setFilterStatus(status);
    };

    if (isLoading) {
        return <LoadingState message="Loading your library..."/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => window.location.reload()}/>;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <DashboardHeader onLogout={onLogout}/>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-6 px-4 pb-32">
                {books.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-gray-400 text-xl mb-4">No books found</div>
                        <p className="text-gray-500">Your library appears to be empty.</p>
                    </div>
                ) : (
                    <>

                        <div className="flex flex-wrap gap-3 mb-6">
                            { filterStatus !== -1 && (
                                <button
                                    onClick={() => handleBookShelfStatus(-1)}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-full transition-colors duration-200 flex items-center justify-center w-12 h-12"
                                >
                                    ×
                                </button>
                            )}
                            <button
                                onClick={() => handleBookShelfStatus(1)}
                                className={`px-6 py-3 rounded-full transition-colors duration-200 ${
                                    filterStatus === 1
                                        ? 'bg-white text-black'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                                }`}
                            >
                                Not started
                            </button>
                            <button
                                onClick={() => handleBookShelfStatus(2)}
                                className={`px-6 py-3 rounded-full transition-colors duration-200 ${
                                    filterStatus === 2
                                        ? 'bg-white text-black'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                                }`}
                            >
                                Started
                            </button>
                            <button
                                onClick={() => handleBookShelfStatus(3)}
                                className={`px-6 py-3 rounded-full transition-colors duration-200 ${
                                    filterStatus === 3
                                        ? 'bg-white text-black'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                                }`}
                            >
                                Conclused
                            </button>
                        </div>
                        <div className="space-y-8">
                            {filteredBooks.map((book) => (
                                <BookCard
                                    key={book.abook.id}
                                    book={book}
                                    onBookSelect={handleBookSelect}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default Dashboard;
