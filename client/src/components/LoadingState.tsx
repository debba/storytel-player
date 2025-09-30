import React from 'react';

function LoadingState({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <div className="text-xl text-white">{message}</div>
      </div>
    </div>
  );
}

export default LoadingState;