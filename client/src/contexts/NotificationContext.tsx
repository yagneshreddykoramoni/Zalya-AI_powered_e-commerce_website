import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, initializeSocket } from '@/services/socketService';

type NotificationType = 'priceAlert' | 'stockAlert' | 'promo' | 'system';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: Date;
  productId?: string;
  imageUrl?: string;
  actionUrl?: string;
  price?: number | null;
  discountPrice?: number | null;
  previousPrice?: number | null;
  previousDiscountPrice?: number | null;
}

type StoredNotification = Omit<Notification, 'timestamp'> & { timestamp: string };

type AddNotificationInput = {
  id?: string;
  title: string;
  message: string;
  type?: NotificationType;
  productId?: string;
  imageUrl?: string | null;
  actionUrl?: string;
  timestamp?: Date | string;
  read?: boolean;
  price?: number | null;
  discountPrice?: number | null;
  previousPrice?: number | null;
  previousDiscountPrice?: number | null;
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (notification: AddNotificationInput) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isAuthenticated } = useAuth();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsedNotifications = (JSON.parse(savedNotifications) as StoredNotification[]).map((notification) => ({
          ...notification,
          timestamp: new Date(notification.timestamp)
        }));
        setNotifications(parsedNotifications);
      } catch (error) {
        console.error('Failed to parse notifications from localStorage:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(notification => !notification.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const addNotification = useCallback((notification: AddNotificationInput) => {
    setNotifications(prev => {
      const notificationId = notification.id || Math.random().toString(36).substring(2, 9);

      if (prev.some(existing => existing.id === notificationId)) {
        return prev;
      }

      const timestamp = notification.timestamp ? new Date(notification.timestamp) : new Date();

      const newNotification: Notification = {
        id: notificationId,
        title: notification.title,
        message: notification.message,
        type: notification.type ?? 'system',
        productId: notification.productId,
        imageUrl: notification.imageUrl || undefined,
        actionUrl: notification.actionUrl,
        timestamp,
        read: notification.read ?? false,
        price: notification.price ?? null,
        discountPrice: notification.discountPrice ?? null,
        previousPrice: notification.previousPrice ?? null,
        previousDiscountPrice: notification.previousDiscountPrice ?? null
      };

      return [newNotification, ...prev];
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

  let socketInstance: ReturnType<typeof initializeSocket> | undefined;

    try {
      socketInstance = getSocket();
    } catch {
      socketInstance = initializeSocket(token);
    }

    const handleProductNew = (payload: AddNotificationInput) => {
      addNotification({
        ...payload,
        type: payload.type || 'promo',
        read: false
      });
    };

    const handlePriceUpdate = (payload: AddNotificationInput) => {
      addNotification({
        ...payload,
        type: payload.type || 'priceAlert',
        read: false
      });
    };

    socketInstance?.on('product:new', handleProductNew);
    socketInstance?.on('product:price-update', handlePriceUpdate);

    return () => {
      socketInstance?.off('product:new', handleProductNew);
      socketInstance?.off('product:price-update', handlePriceUpdate);
    };
  }, [isAuthenticated, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        removeNotification,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
