
import React from 'react';
import Modal from './Modal';
import Icon from './Icon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warning?: string;
  confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmText = 'Confirm',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6">
        <p className="text-slate-600 dark:text-gray-300 mb-4">{message}</p>
        
        {warning && (
          <div className="bg-red-500/10 dark:bg-red-900/20 p-3 rounded-md mb-6">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Warning:</strong> {warning}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="bg-white dark:bg-gray-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="bg-red-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;