'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Send, UserCircle, Shield } from 'lucide-react';

interface PreMatchMessage {
  id: string;
  senderId: string;
  content: string;
  sentimentScore?: number | null;
  createdAt: string;
}

interface PreMatchChatProps {
  chatId: string;
  currentUserId: string;
  partnerName?: string; // E.g., 'Anonymous Traveler'
}

export default function PreMatchChat({ chatId, currentUserId, partnerName = 'Anonymous Match' }: PreMatchChatProps) {
  const { socket, isConnected } = useSocket({ chatId });
  const [messages, setMessages] = useState<PreMatchMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages (assuming API route exists or will exist)
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${chatId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch pre-match messages', err);
      }
    };
    fetchMessages();
  }, [chatId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg: PreMatchMessage) => {
      setMessages(prev => [...prev, msg]);
    };
    
    socket.on('new_pre_match_message', handleNewMessage);
    
    return () => {
      socket.off('new_pre_match_message', handleNewMessage);
    };
  }, [socket]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    socket.emit('send_pre_match_message', {
      chatId,
      senderId: currentUserId,
      content: input,
    });
    
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-500 z-20"></div>
      
      <div className="p-4 border-b border-gray-100 bg-white/90 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
            <UserCircle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{partnerName}</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Shield size={12} className="text-emerald-500" />
              <span>Identity hidden for safety</span>
            </div>
          </div>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'} shadow-sm animate-pulse`}></span>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
              <Shield size={28} className="text-indigo-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">Start an anonymous chat</p>
            <p className="text-sm text-gray-400 max-w-[250px]">
              Get to know your potential travel buddy before forming a group. Your identity remains private.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 shadow-sm ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm'
                }`}>
                  <p className="text-[15px] leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1.5 px-1 font-medium">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-3 items-center">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type anonymously..." 
          className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 rounded-full px-5 py-2.5 text-sm outline-none transition-all"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || !isConnected}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-all flex items-center justify-center shadow-sm"
        >
          <Send size={18} className={input.trim() && isConnected ? "translate-x-0.5" : ""} />
        </button>
      </form>
    </div>
  );
}
