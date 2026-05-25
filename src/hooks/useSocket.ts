import { useEffect, useRef, useState } from 'react';
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
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket client connected:', socket.id);

      if (groupId) {
        socket.emit('join_group', { groupId });
      } else if (chatId) {
        socket.emit('join_pre_match', { chatId });
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
