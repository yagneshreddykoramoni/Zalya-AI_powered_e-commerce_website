
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationCenter from './notifications/NotificationCenter';
import { useNotifications } from '@/contexts/NotificationContext';

const NotificationBadge: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleClose = () => {
    setIsOpen(false);
  };
  
  return (
    <div className="relative notification-badge">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">{unreadCount}</span>
          </div>
        )}
      </Button>
      {isOpen && <NotificationCenter onClose={handleClose} />}
    </div>
  );
};

export default NotificationBadge;
