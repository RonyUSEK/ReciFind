import React, { useState } from 'react';
import ReportModal from './ReportModal';
import useToast from '../../hooks/useToast';
import Toast from '../Common/Toast';

/**
 * ReportButton Component
 * Reusable button to report recipes
 * 
 * Props:
 * - contentType: 'recipe' (kept for backwards compatibility)
 * - contentId: number
 * - contentTitle: string - for display in modal
 * - variant: 'icon' | 'text' | 'full' - button style
 * - className: string - additional CSS classes
 */
function ReportButton({ 
  contentType = 'recipe', 
  contentId, 
  contentTitle, 
  variant = 'icon',
  className = '' 
}) {
  const [showModal, setShowModal] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSuccess = () => {
    showToast('Report submitted successfully. Thank you for helping keep our community safe.', 'success');
  };

  // Button variants
  const variants = {
    icon: (
      <button
        onClick={() => setShowModal(true)}
        className={`p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 
                   dark:hover:text-red-500 transition-colors ${className}`}
        title="Report this content"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      </button>
    ),
    text: (
      <button
        onClick={() => setShowModal(true)}
        className={`text-sm text-gray-600 hover:text-red-600 dark:text-gray-400 
                   dark:hover:text-red-500 transition-colors ${className}`}
      >
        Report
      </button>
    ),
    full: (
      <button
        onClick={() => setShowModal(true)}
        className={`px-3 py-1.5 text-sm border border-red-300 dark:border-red-700
                   text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                   rounded-lg transition-colors ${className}`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          Report
        </span>
      </button>
    )
  };

  return (
    <>
      {variants[variant]}
      
      <ReportModal
        show={showModal}
        contentType={contentType}
        contentId={contentId}
        contentTitle={contentTitle}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />

      <Toast 
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </>
  );
}

export default ReportButton;
