import * as React from 'react';
import Icon from './Icon';

interface NotificationProps {
  message: string;
  icon: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, icon, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slideInUp">
      <div className="flex items-center gap-4 bg-green-600 text-white font-bold py-3 px-5 rounded-lg shadow-2xl border border-green-500 dark:border-green-500">
        <Icon name={icon} className="w-7 h-7" />
        <div>
          <p className="text-sm font-bold">Badge Unlocked!</p>
          <p className="text-sm font-normal">{message}</p>
        </div>
        <button onClick={onClose} className="text-green-200 hover:text-white ml-4">
          <Icon name="x" className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );
};

export default Notification;