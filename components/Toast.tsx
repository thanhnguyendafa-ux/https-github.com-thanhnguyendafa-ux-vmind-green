
import React, { useEffect, useState } from 'react';
import Icon from './Icon';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}

const typeStyles = {
  info: {
    bg: 'bg-gray-800',
    text: 'text-white',
    border: 'border-gray-700',
    icon: 'info-circle', // Assuming you might add this icon later
  },
  success: {
    bg: 'bg-emerald-600',
    text: 'text-white',
    border: 'border-emerald-500',
    icon: 'check-circle',
  },
  error: {
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-500',
    icon: 'error-circle',
  },
};

const Toast: React.FC<ToastProps> = ({ message, type = 'info', actionText, onAction, onClose, duration = 5000 }) => {
  const [visible, setVisible] = useState(false);
  const styles = typeStyles[type];

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300); // Wait for fade-out animation
  };

  const handleActionClick = () => {
    onAction?.();
    handleClose();
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className={`flex items-center justify-between gap-4 py-3 px-5 rounded-lg shadow-2xl border ${styles.bg} ${styles.border}`}>
        <Icon name={styles.icon} className={`w-6 h-6 flex-shrink-0 ${styles.text}`} />
        <span className={`font-semibold ${styles.text}`}>{message}</span>
        <div className="flex items-center gap-4">
          {actionText && (
            <button onClick={handleActionClick} className="text-green-400 hover:text-green-300 font-bold uppercase text-sm tracking-wider">
              {actionText}
            </button>
          )}
          <button onClick={handleClose} className="text-gray-200/70 hover:text-white">
            <Icon name="x" className="w-5 h-5"/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
