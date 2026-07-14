import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@shared/stores/useAuthStore';
import Config from 'react-native-config';
import { Platform } from 'react-native';

const BASE_SOCKET_URL = Config.BACKEND_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export default function useMobileSocket(chatId, onNewMessage) {
  const [socket, setSocket] = useState(null);

  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    const newSocket = io(`${BASE_SOCKET_URL}/chat`, {
      auth: (cb) => cb({ token: useAuthStore.getState().token }),
      transports: ['websocket'], 
      reconnection: true,
      reconnectionAttempts: 5,
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connect Error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !chatId) return;

    const joinRoom = () => socket.emit('join_conversation', chatId);
    
    if (socket.connected) {
      joinRoom();
    }
    
    socket.on('connect', joinRoom);

    const handleMsg = (message) => {
      if (message.conversationId === chatId && onNewMessageRef.current) {
        onNewMessageRef.current(message);
      }
    };

    socket.on('new_message', handleMsg);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('new_message', handleMsg);
    };
  }, [socket, chatId]);

  return socket;
}
