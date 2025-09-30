import React from 'react';
import {formatMicrosecondsTime, formatTime} from "../utils/helpers";
import {BookShelfEntity} from "../interfaces/books";

interface BookCardProps {
  book: BookShelfEntity;
  onBookSelect: (book: BookShelfEntity) => void;
}

function BookCard({ book, onBookSelect } : BookCardProps) {

  const position = book.abookMark ?  book.abookMark.pos : 0;
  const totalDuration = book.abook.time;

  const getCategoryLabel = (book: BookShelfEntity) => {
    return book.book.category.title;
  };

  const category = getCategoryLabel(book);
  const remainingTime = totalDuration - position;

  return (


    <div className="border-b border-gray-800 pb-6 relative group">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 flex flex-col">
          <img
            src={book.book.cover ? "https://www.storytel.com" + book.book.cover : '/placeholder-book.jpg'}
            alt={book.book.name}
            className="w-32 h-32 object-cover rounded-lg shadow-lg mb-2"
          />
          <span className="text-white text-sm">{category}</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-1">
            <h2 className="text-lg font-bold text-white mb-0.5 truncate">{book.book.name}</h2>
            <p className="text-sm text-gray-300 mb-0.5 truncate">Author: {book.book.authorsAsString}</p>
            <p className="text-sm text-gray-300 mb-2 truncate">Narrator; {book.abook.narratorAsString}</p>
          </div>

          <div className="mt-auto flex items-center gap-4">
            <p className="text-sm text-white whitespace-nowrap">
              {remainingTime > 0 ? formatMicrosecondsTime(remainingTime) + ' remanining' : 'Completed'}
            </p>
            {position > 0 && (
              <div className="w-[100px] bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((position / totalDuration) * 100, 100)}%`
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
        onClick={() => onBookSelect(book)}
      >
        <div className="bg-black bg-opacity-75 rounded-full p-4">
          <button className="p-4 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookCard;
