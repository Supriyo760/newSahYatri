import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
  groupId?: string;
  chatId?: string;
  userId?: string;
}

export function useSocket({ groupId, chatId, userId }: UseSocketProps = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  useEffect(() => {
    // Connect to server (same origin) and pass userId for auth
    const socketInstance = io({
      auth: { userId }
    });
    
    // Defer state update to prevent synchronous cascading renders inside the effect
    Promise.resolve().then(() => {
      setSocket(socketInstance);
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket client connected:', socketInstance.id);

      if (groupId && userId) {
        socketInstance.emit('join_group', { groupId, userId });
      } else if (chatId && userId) {
        socketInstance.emit('join_pre_match', { chatId, userId });
      }
    });

    socketInstance.on('active_members', (userIds: string[]) => {
      setActiveUsers(userIds);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      setActiveUsers([]);
      console.log('Socket client disconnected');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [groupId, chatId, userId]);

  return {
    socket,
    isConnected,
    activeUsers,
  };
}
