import React from 'react';

interface DashboardHeaderProps {
  onLogout?: () => void;
}

function DashboardHeader({}: DashboardHeaderProps) {
  return (
    <nav className="bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Storytel Orange Logo Icon & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF5100] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF5100]/25 transition-transform hover:scale-105">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Storytel
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default DashboardHeader;
