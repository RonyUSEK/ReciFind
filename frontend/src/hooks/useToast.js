import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications
 * @param {number} duration - Auto-dismiss duration in ms (default: 5000)
 * @returns {object} Toast state and control functions
 */
const useToast = (duration = 5000) => {
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    
    // Auto-dismiss after duration
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }, [duration]);

  const hideToast = useCallback(() => {
    setToast({ show: false, message: '', type: 'success' });
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
};

export default useToast;
