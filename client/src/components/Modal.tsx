import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-4xl'
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  headerActions,
  maxWidth = 'max-w-md',
  zIndex = 50
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center`}
      style={{ zIndex }}
      onClick={onClose}
    >
      <div 
        className={`bg-gray-900 rounded-xl p-0 w-full ${maxWidth} mx-4 border border-gray-700 max-h-[90vh] flex flex-col shadow-2xl overflow-hidden`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose || headerActions) && (
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/95 sticky top-0 flex flex-col gap-4 shrink-0">
            <div className="flex justify-between items-center gap-4">
              {title && (
                <h2 className="text-xl font-bold text-white flex-1 min-w-0">
                  {title}
                </h2>
              )}
              <div className="flex gap-2 items-center shrink-0">
                {headerActions}
                
                {onClose && (
                  <>
                    {headerActions && <div className="w-px h-6 bg-gray-700 my-auto mx-1"></div>}
                    <button 
                      onClick={onClose} 
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                      title="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
