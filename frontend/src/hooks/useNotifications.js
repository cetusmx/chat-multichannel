import { useEffect } from 'react';
import useUIStore from '../stores/useUIStore.js';
import { getNotificationsSocket } from '../services/socket.js';

export default function useNotifications() {
  const { addNotification } = useUIStore();

  useEffect(() => {
    const socket = getNotificationsSocket();
    if (!socket) return;

    socket.on('notification', (notification) => {
      addNotification(notification);
    });

    return () => {
      socket.off('notification');
    };
  }, [addNotification]);
}
