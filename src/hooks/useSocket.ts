import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
  groupId?: string;
  chatId?: string;
}

export function useSocket({ groupId, chatId }: UseSocketProps = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to server (same origin)
    const socketInstance = io();
    
    // Defer state update to prevent synchronous cascading renders inside the effect
    Promise.resolve().then(() => {
      setSocket(socketInstance);
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket client connected:', socketInstance.id);

      if (groupId) {
        socketInstance.emit('join_group', { groupId });
      } else if (chatId) {
        socketInstance.emit('join_pre_match', { chatId });
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket client disconnected');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [groupId, chatId]);

  return {
    socket,
    isConnected,
  };
}

