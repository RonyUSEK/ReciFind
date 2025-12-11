import React, { useState } from 'react';
import { API_BASE_URL } from '../../utils/api';

/**
 * ReportModal Component
 * Reusable modal for reporting recipes or comments
 * 
 * Props:
 * - show: boolean - whether to display modal
 * - contentType: 'recipe' | 'comment' - type of content being reported
 * - contentId: number - ID of content being reported
 * - contentTitle: string - title/preview of content (for display)
 * - onClose: function - callback when modal closes
 * - onSuccess: function - callback after successful report submission
 */
function ReportModal({ show, contentType, contentId, contentTitle, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reason options based on content type
  const recipeReasons = [
    { value: 'spam', label: 'Spam or Misleading' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'incorrect', label: 'Incorrect Information' },
    { value: 'copyright', label: 'Copyright Violation' },
    { value: 'other', label: 'Other' }
  ];

  const commentReasons = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'inappropriate', label: 'Inappropriate Language' },
    { value: 'offensive', label: 'Offensive Content' },
    { value: 'other', label: 'Other' }
  ];

  const reasons = contentType === 'recipe' ? recipeReasons : commentReasons;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select a reason for reporting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setError('');
    setLoading(false);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Report {contentType === 'recipe' ? 'Recipe' : 'Comment'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {contentTitle && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              "{contentTitle.length > 60 ? contentTitle.substring(0, 60) + '...' : contentTitle}"
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Reason Select */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Report <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Select a reason...</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description Textarea */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Provide any additional context that might help us review this report..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       resize-none"
              disabled={loading}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="px-6 pb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Our moderation team will review your report within 24-48 hours. 
              False reports may result in account restrictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
