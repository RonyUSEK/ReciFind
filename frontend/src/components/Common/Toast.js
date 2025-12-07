import React from 'react';

/**
 * Reusable Toast Notification Component
 * @param {boolean} show - Whether to display the toast
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 * @param {function} onClose - Callback when toast is closed
 */
const Toast = ({ show, message, type = 'success', onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`rounded-lg shadow-lg p-4 min-w-[300px] ${
        type === 'success' 
          ? 'bg-green-600 text-white' 
          : type === 'error'
          ? 'bg-red-600 text-white'
          : type === 'warning'
          ? 'bg-yellow-600 text-white'
          : 'bg-blue-600 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-medium">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
