'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Send, AlertTriangle, MapPin } from 'lucide-react';

interface Message {
  id: string;
  senderId: string | null;
  content: string;
  type: string;
  createdAt: string;
  metadata?: any;
}

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
  groupMembers: { id: string; name: string; avatarUrl: string | null }[];
}

export default function GroupChat({ groupId, currentUserId, groupMembers }: GroupChatProps) {
  const { socket, isConnected, activeUsers } = useSocket({ groupId, userId: currentUserId });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };
    fetchMessages();
  }, [groupId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    };
    
    socket.on('new_message', handleNewMessage);
    
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    socket.emit('send_message', {
      groupId,
      senderId: currentUserId,
      content: input,
      type: 'text'
    });
    
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between z-10">
        <h3 className="font-semibold text-gray-800">Group Discussion</h3>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMembers(!showMembers)}
            className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors flex items-center gap-1.5"
          >
            <span>{groupMembers.length} Members</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isConnected ? 'Live' : 'Connecting'}
          </span>
        </div>
      </div>

      {showMembers && (
        <div className="absolute top-16 right-4 w-64 bg-white border border-gray-100 shadow-lg rounded-xl z-20 overflow-hidden">
          <div className="p-3 border-b border-gray-50 bg-gray-50/50">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Group Roster</h4>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {groupMembers.map(member => {
              const isOnline = activeUsers.includes(member.id);
              return (
                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-800">{member.name} {member.id === currentUserId && '(You)'}</span>
                  </div>
                  {isOnline ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Online</span>
                  ) : (
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Offline</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/30 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 shadow-sm ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
              }`}>
                {msg.type === 'emergency' ? (
                  <div className="flex items-center gap-2 text-rose-600 font-medium">
                    <AlertTriangle size={18} />
                    <span>{msg.content}</span>
                  </div>
                ) : msg.type === 'location' ? (
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <MapPin size={18} />
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1.5 px-1 font-medium">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-3 items-center">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message the group..." 
          className="flex-1 bg-gray-100/80 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-full px-5 py-2.5 text-sm outline-none transition-all"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || !isConnected}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-all flex items-center justify-center shadow-sm"
        >
          <Send size={18} className={input.trim() && isConnected ? "translate-x-0.5" : ""} />
        </button>
      </form>
    </div>
  );
}
