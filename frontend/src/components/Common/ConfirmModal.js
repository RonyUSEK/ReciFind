import React from 'react';

/**
 * Reusable Confirmation Modal Component
 * @param {boolean} show - Whether to display the modal
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {function} onConfirm - Callback when confirmed
 * @param {function} onCancel - Callback when cancelled
 * @param {boolean} loading - Whether action is in progress
 * @param {string} confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} cancelText - Text for cancel button (default: 'Cancel')
 * @param {string} confirmStyle - Style variant: 'success', 'danger', 'primary' (default: 'success')
 */
const ConfirmModal = ({ 
  show, 
  title = 'Confirm Action',
  message, 
  onConfirm, 
  onCancel, 
  loading = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'success'
}) => {
  if (!show) return null;

  const confirmButtonStyles = {
    success: 'bg-green-600 hover:bg-green-700 disabled:bg-green-400',
    danger: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400',
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 ${confirmButtonStyles[confirmStyle]} text-white font-semibold py-2 px-4 rounded-lg transition duration-200`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
