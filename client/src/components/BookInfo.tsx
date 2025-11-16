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
    onDownload: () => void;
    onCancelDownload: () => void;
    isDownloaded: boolean;
    isDownloading: boolean;
}

const BookInfo: React.FC<BookInfoProps> = ({
                                               book,
                                               currentChapter,
                                               chapters,
                                               currentTime,
                                               playbackRate,
                                               onShowChaptersModal,
                                               onShowBookmarksModal,
                                               onDownload,
                                               onCancelDownload,
                                               isDownloaded,
                                               isDownloading,
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
                <div className="text-center max-w-full px-4 py-2">
                    <h2 className="text-lg font-bold text-white mb-0.5 break-words">{book.book.name}</h2>
                    <p className="text-sm text-gray-300 mb-0 break-words">
                        {t('bookCard.author')} {book.book.authorsAsString} • {t('bookCard.narrator')} {book.abook.narratorAsString}
                    </p>
                </div>
            </div>

            <div className="px-4 py-0 flex justify-between items-start w-full mt-0">
                {currentChapter && (
                    <div className="text-left flex-1">
                        <p className="text-base text-white">{currentChapter.title}</p>
                        <p className="text-sm text-gray-400">
                            {formatTimeNatural((currentChapter.end - currentTime) / playbackRate)}
                        </p>
                    </div>
                )}
                <div className={`flex items-center space-x-3 ${currentChapter ? 'ml-4' : 'ml-auto'}`}>
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
                    <button
                        id="download-btn"
                        onClick={isDownloading ? onCancelDownload : onDownload}
                        className={`px-2 py-2 rounded-md transition-colors ${
                            isDownloaded
                                ? 'bg-green-600 hover:bg-green-700'
                                : isDownloading
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-gray-800 hover:bg-gray-700'
                        } text-white`}
                    >
                        {isDownloading ? (
                            <svg className="w-6 h-6 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none"
                                 viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookInfo;
