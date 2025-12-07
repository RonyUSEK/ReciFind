import { useState, useCallback } from 'react';

/**
 * Custom hook for managing confirmation dialogs
 * @returns {object} Confirm modal state and control functions
 */
const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: 'Confirm Action',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmStyle: 'success'
  });

  const showConfirm = useCallback((options) => {
    const {
      message,
      onConfirm,
      title = 'Confirm Action',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmStyle = 'success'
    } = options;

    setConfirmState({
      show: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      confirmStyle
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
    setConfirmState(prev => ({ ...prev, show: false }));
  }, [confirmState.onConfirm]);

  const handleCancel = useCallback(() => {
    setConfirmState(prev => ({ ...prev, show: false }));
  }, []);

  return {
    confirmState,
    showConfirm,
    handleConfirm,
    handleCancel
  };
};

export default useConfirm;
