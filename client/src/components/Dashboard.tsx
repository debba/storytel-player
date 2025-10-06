import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import BookCard from './BookCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import DashboardHeader from './DashboardHeader';
import {BookShelfEntity, BookShelfResponse} from "../interfaces/books";

interface DashboardProps {
    onLogout: () => void;
    triggerLogout?: boolean;
    setTriggerLogout?: (value: boolean) => void;
}

function Dashboard({onLogout, triggerLogout, setTriggerLogout}: DashboardProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [books, setBooks] = useState<BookShelfEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [, setCurrentBook] = useState<BookShelfEntity | null>(null);
    const [filterStatus, setFilterStatus] = useState(-1)
    const [filteredBooks, setFilteredBooks] = useState<BookShelfEntity[]>([]);

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
            const response = await api.get<BookShelfResponse>('/bookshelf');
            setBooks(response.data.books);
        } catch (error: any) {
            setError(error.response?.data?.error || t('dashboard.loadError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookSelect = (book: BookShelfEntity) => {
        setCurrentBook(book);
        navigate(`/player/${book.abook.id}`, {
            state: {
                book: book
            }
        });
    };

    const handleBookShelfStatus = (
        status: BookShelfEntity['status']
    ) => {
        setFilterStatus(status);
    };

    if (isLoading) {
        return <LoadingState message={t('dashboard.loading')}/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => window.location.reload()}/>;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <DashboardHeader
                onLogout={onLogout}
                triggerLogout={triggerLogout}
                setTriggerLogout={setTriggerLogout}
            />

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-6 px-4 pb-32">
                {books.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-gray-400 text-xl mb-4">{t('dashboard.noBooks')}</div>
                        <p className="text-gray-500">{t('dashboard.emptyLibrary')}</p>
                    </div>
                ) : (
                    <>

                        <div className="flex flex-wrap gap-3 mb-6">
                            { filterStatus !== -1 && (
                                <button
                                    onClick={() => handleBookShelfStatus(-1)}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-full transition-colors duration-200 flex items-center justify-center w-10 h-10"
                                >
                                    ×
                                </button>
                            )}
                            {[
                                { status: 1, label: 'dashboard.filters.notStarted' },
                                { status: 2, label: 'dashboard.filters.started' },
                                { status: 3, label: 'dashboard.filters.concluded' }
                            ].map(({ status, label }) => (
                                <button
                                    key={status}
                                    onClick={() => handleBookShelfStatus(status)}
                                    className={`px-4 py-2 rounded-full transition-colors duration-200 ${
                                        filterStatus === status
                                            ? 'bg-white text-black'
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    {t(label)}
                                </button>
                            ))}
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
