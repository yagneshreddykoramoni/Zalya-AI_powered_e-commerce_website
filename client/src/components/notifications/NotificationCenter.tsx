
import React, { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NotificationCenterProps {
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const { notifications, markAllAsRead, markAsRead } = useNotifications();

  useEffect(() => {
    // Add event listener to close when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-center') && !target.closest('.notification-badge')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="notification-center absolute top-full right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border">
      <div className="p-3 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <Bell size={16} />
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllAsRead} 
            className="text-xs hover:bg-gray-100"
          >
            Mark all as read
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X size={16} />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        {notifications.length > 0 ? (
          <div>
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                {notification.actionUrl && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs p-0 h-auto mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = notification.actionUrl || '';
                    }}
                  >
                    {notification.actionUrl ? 'View' : 'View'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No new notifications</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default NotificationCenter;
