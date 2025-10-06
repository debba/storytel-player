import React from 'react';
import {useTranslation} from 'react-i18next';
import {formatTimeNatural} from '../utils/helpers';
import {BookShelfEntity} from '../interfaces/books';
import {Chapter} from '../interfaces/chapters';

interface BookInfoProps {
    book: BookShelfEntity;
    currentChapter: {
        title: string;
        start: number;
        end: number;
        durationInSeconds?: number;
        number?: number;
    } | null;
    chapters: Chapter[];
    currentTime: number;
    playbackRate: number;
    onShowChaptersModal: () => void;
    onShowBookmarksModal: () => void;
}

const BookInfo: React.FC<BookInfoProps> = ({
    book,
    currentChapter,
    chapters,
    currentTime,
    playbackRate,
    onShowChaptersModal,
    onShowBookmarksModal,
}) => {
    const {t} = useTranslation();

    return (
        <div className="flex flex-col items-center">
            <div className="flex flex-col items-center mb-2">
                <img
                    src={"https://www.storytel.com" + (book.book.largeCover || book.book.largeCoverE)}
                    alt={book.book.name}
                    className="w-64 h-64 object-cover rounded-lg shadow-2xl mb-4"
                />
                <div className="text-center">
                    <h2 className="text-lg font-bold text-white mb-0.5">{book.book.name}</h2>
                    <p className="text-sm text-gray-300 mb-0">
                        {t('bookCard.author')} {book.book.authorsAsString} • {t('bookCard.narrator')} {book.abook.narratorAsString}
                    </p>
                </div>
            </div>

            {currentChapter && (
                <div className="px-6 py-0 flex justify-between items-start w-full mt-0">
                    <div className="text-left flex-1">
                        <p className="text-base text-white">{currentChapter.title}</p>
                        <p className="text-sm text-gray-400">
                            {formatTimeNatural((currentChapter.end - currentTime) / playbackRate)}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                        {chapters && chapters.length > 0 && (
                            <button
                                onClick={onShowChaptersModal}
                                className="px-2 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                                <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                    <g>
                                        <path fill="currentColor"></path>
                                        <g>
                                            <path fill="currentColor"
                                                  d="M16.002 22.002h25.997v4H16.002zM16.002 11.995h25.997v4H16.002zM16.002 32.008h25.997v4H16.002zM6 12h4v4H6zM6 22.006h4v4H6zM6 32.013h4v4H6z"></path>
                                        </g>
                                    </g>
                                </svg>
                            </button>
                        )}
                        <button
                            id="bookmark-btn"
                            onClick={onShowBookmarksModal}
                            className="px-2 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                 className="w-6 h-6">
                                <path
                                    id="SVGRepo_iconCarrier"
                                    stroke="#464455"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="currentColor"
                                    d="M15.75 5h-7.5C7.56 5 7 5.588 7 6.313V19l5-3.5 5 3.5V6.313C17 5.588 16.44 5 15.75 5"
                                ></path>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookInfo;
