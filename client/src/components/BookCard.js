import React from 'react';

function BookCard({ book, onBookSelect }) {

  const position = book.abookMark ?  book.abookMark.pos : 0;
  const totalDuration = book.abook.time;

  const formatTime = (microseconds) => {
    const totalSeconds = Math.floor(microseconds / 1000 / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} h ${minutes} min rimanente`;
  };

  const getCategoryLabel = (book) => {
    return book.book.category.title;
  };

  const category = getCategoryLabel(book);
  const remainingTime = totalDuration - position;
  console.log({remainingTime})

  return (


    <div className="border-b border-gray-800 pb-6 relative group">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <img
            src={book.book.cover ? "https://www.storytel.com" + book.book.cover : '/placeholder-book.jpg'}
            alt={book.book.name}
            className="w-32 h-44 object-cover rounded-lg shadow-lg"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-white mb-1">{book.book.name}</h2>
            <p className="text-lg text-gray-300 mb-1">Scritto da: {book.book.authorsAsString}</p>
            <p className="text-lg text-gray-300 mb-3">Letto da: {book.abook.narratorAsString}</p>
            <p className="text-lg text-orange-400 mb-4">
              {remainingTime > 0 ? formatTime(remainingTime) : 'Completed'}
            </p>
          </div>

          {position > 0 && (
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                <div
                  className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((position / totalDuration) * 100, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-white text-lg">{category}</span>
              {/*<div className="flex items-center space-x-4">
              <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </button>

              <button className="p-3 hover:bg-gray-800 rounded-full transition-colors">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
            </div>*/}
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
