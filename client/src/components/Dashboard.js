import React from 'react';
import { useNavigate } from 'react-router-dom';
import BookshelfView from "./BookshelfView";

function Dashboard({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Storytel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Welcome to Your Storytel Library
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Access your audiobooks and continue your listening journey
            </p>
            <div className="mt-10">
              <BookshelfView />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
