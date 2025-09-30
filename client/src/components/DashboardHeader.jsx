import React from 'react';

function DashboardHeader({ onLogout }) {
  return (
    <nav className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
              <img src={'assets/icon.png'} alt={"Storytel"} className="w-12 h-12"/>
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
  );
}

export default DashboardHeader;
