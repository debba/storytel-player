import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {BookShelfEntity} from "../interfaces/books";
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import Navbar from './Navbar';
import "../types/window.d.ts";

function BookView() {
    const {t} = useTranslation();
    const {bookId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showFullDescription, setShowFullDescription] = useState(false);

    const book: BookShelfEntity = location.state?.book;

    useEffect(() => {
        if (book) {
            document.title = book.book.name;
        }

        return () => {
            document.title = 'Storytel Player';
        };
    }, [book]);

    const handlePlayBook = () => {
        navigate(`/player/${bookId}`, {state: {book}});
    };

    if (isLoading) {
        return <LoadingState message={t('common.loading')}/>;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => navigate('/')}/>;
    }

    if (!book) {
        return <ErrorState error={t('common.error')} onRetry={() => navigate('/')}/>;
    }

    const formatDuration = (microseconds: number) => {
        const hours = Math.floor(microseconds / 3600000000);
        const minutes = Math.floor((microseconds % 3600000000) / 60000000);
        return `${hours} h ${minutes} min`;
    };

    const getTruncatedDescription = () => {
        const description = book.abook.description || '';
        if (!description) return t('bookView.noDescription');

        if (description.length <= 250 || showFullDescription) {
            return description;
        }

        return description.substring(0, 250) + '...';
    };

    const shouldShowMoreButton = () => {
        const description = book.abook.description || '';
        return description.length > 250;
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar barTitle={t('bookView.details')} onBackClick={() => navigate('/')}>
                <span>{book.book.name}</span>
            </Navbar>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center">
                    {/* Book Cover */}
                    <div className="mb-6">
                        <img
                            src={"https://www.storytel.com" + (book.book.largeCover || book.book.largeCoverE)}
                            alt={book.book.name}
                            className="w-64 h-64 object-cover rounded-lg shadow-2xl"
                        />
                    </div>

                    {/*
                    Save Button
                    <button className="mb-6 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                        </svg>
                        <span>{t('bookView.saved')}</span>
                    </button> */}

                    {/* Book Title */}
                    <h1 className="text-2xl font-bold text-white mb-2 text-center">
                        {book.book.name}
                    </h1>

                    {/* Author and Narrator */}
                    <div className="text-sm text-gray-300 mb-4 text-center">
                        <p className="mb-1">
                            {t('bookCard.author')}: <span className="font-semibold">{book.book.authorsAsString}</span>
                        </p>
                        <p>
                            {t('bookCard.narrator')}: <span
                            className="font-semibold">{book.abook.narratorAsString}</span>
                        </p>
                    </div>

                    {/* Play Button */}
                    <button
                        onClick={handlePlayBook}
                        className="mb-6 px-8 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-colors flex items-center text-lg font-semibold"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>{t('bookView.listen')}</span>
                    </button>

                    {/* Book Info */}
                    <div className="w-full max-w-md space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">{t('bookView.language')}</span>
                            <span className="text-white">{book.book.language.localizedName}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">{t('bookView.duration')}</span>
                            <span className="text-white">{formatDuration(book.abook.time)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-800">
                            <span className="text-gray-400">{t('bookView.category')}</span>
                            <span className="text-white flex items-center">
                                {book.book.category.title}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="w-full max-w-md mt-8">
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {getTruncatedDescription()}
                        </p>
                        {shouldShowMoreButton() && (
                            <button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                className="text-white mt-2 text-sm font-semibold hover:text-gray-300 transition-colors"
                            >
                                ...{showFullDescription ? t('bookView.showLess') : t('bookView.showMore')}
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default BookView;
