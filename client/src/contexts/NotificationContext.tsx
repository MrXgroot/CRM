import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: React.Dispatch<React.SetStateAction<number>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  return (
    <NotificationContext.Provider value={{ notificationCount, setNotificationCount}}>
      {children}
    </NotificationContext.Provider>
  );
};

