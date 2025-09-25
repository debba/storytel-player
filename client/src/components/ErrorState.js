import React from 'react';

function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-red-400 text-xl mb-4 font-semibold">Something went wrong</div>
        <p className="text-gray-400 mb-6">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md transition-colors font-medium"
          >
            Try Again
          </button>
        )}\n      </div>
    </div>
  );
}

export default ErrorState;