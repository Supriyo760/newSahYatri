'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [connections, setConnections] = useState({ pendingSent: [], pendingReceived: [], active: [] });
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchConnectionsAndChats = async () => {
      try {
        const [connRes, chatsRes] = await Promise.all([
          fetch('/api/connections'),
          fetch('/api/inbox')
        ]);
        const connData = await connRes.json();
        const chatsData = await chatsRes.json();
        if (!mounted) return;
        if (connRes.ok) setConnections(connData.data);
        if (chatsRes.ok) setChats(chatsData.data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchConnectionsAndChats();
    return () => {
      mounted = false;
    };
  }, []);

  // Socket logic
  useEffect(() => {
    if (!socket || !selectedChatId) return;

    socket.emit('join_direct_chat', { chatId: selectedChatId });

    const handleUserTyping = (data: any) => {
      setOtherUserTyping(data.isTyping);
    };

    const handleMessagesRead = () => {
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    };

    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, selectedChatId]);

  // Messages polling (for MVP simplicity, we can also use sockets)
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/inbox/${selectedChatId}`);
        const data = await res.json();
        if (res.ok) {
          setMessages(data.data);
          // Auto scroll on new message if length changed
          if (messagesEndRef.current) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
          // Mark as read
          socket?.emit('read_direct_chat', { chatId: selectedChatId });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // simple polling for incoming messages
    return () => clearInterval(interval);
  }, [selectedChatId, socket]);

  const handleRespondRequest = async (connectionId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/connections/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, action }),
      });
      if (res.ok) {
        // Optimistically update UI or do a fetch (for MVP we'll just reload the page since fetchConnectionsAndChats is now inside useEffect)
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId) return;
    
    const content = newMessage;
    setNewMessage('');
    setIsTyping(false);
    socket?.emit('typing_direct_chat', { chatId: selectedChatId, isTyping: false });

    // Optimistic UI
    const tempMsg = { id: Date.now(), content, senderId: 'me', createdAt: new Date().toISOString(), isRead: false };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);

    try {
      await fetch(`/api/inbox/${selectedChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      // Will be refreshed by polling
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing_direct_chat', { chatId: selectedChatId, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('typing_direct_chat', { chatId: selectedChatId, isTyping: false });
    }, 2000);
  };

  const activeChatData = chats.find(c => c.id === selectedChatId);

  return (
    <div className="min-h-screen bg-[#f0eee9] flex flex-col pt-16">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#2c3d30] text-[#f0eee9] z-50 flex items-center px-4 md:px-8 justify-between shadow-md">
        <Link href="/" className="font-outfit font-black text-2xl tracking-tighter">
          SAH<span className="text-[#ddc0b9]">YATRI</span>
        </Link>
        <div className="font-journal-label tracking-widest text-xs opacity-80 uppercase">
          Connections
        </div>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row h-[calc(100vh-4rem)] p-4 gap-4">
        
        {/* Sidebar */}
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-[#ddc0b9]/30 flex flex-col overflow-hidden ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex bg-[#f8f7f5] p-2 border-b border-[#ddc0b9]/30">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-colors ${activeTab === 'chats' ? 'bg-white shadow text-[#2c3d30]' : 'text-[#89726c] hover:bg-[#f0eee9]'}`}
            >
              Messages
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-colors relative ${activeTab === 'requests' ? 'bg-white shadow text-[#2c3d30]' : 'text-[#89726c] hover:bg-[#f0eee9]'}`}
            >
              Requests
              {connections.pendingReceived.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full"></span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="p-4 text-center text-sm text-[#89726c]">Loading...</div>
            ) : activeTab === 'chats' ? (
              chats.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#89726c] font-medium">
                  No active chats yet. Connect with travelers in the Discover tab!
                </div>
              ) : (
                chats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedChatId === chat.id ? 'bg-[#f0eee9] border-l-4 border-[#8f361d]' : 'hover:bg-[#f8f7f5] border-l-4 border-transparent'}`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#e4e2dd] relative flex-shrink-0">
                      {chat.otherUser.avatarUrl ? (
                        <Image src={chat.otherUser.avatarUrl} alt={chat.otherUser.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#89726c] font-bold text-lg">
                          {chat.otherUser.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#2c3d30] truncate">{chat.otherUser.name}</div>
                      <div className="text-xs text-[#89726c] truncate">
                        {chat.lastMessageAt ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true }) : 'New connection'}
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Requests Tab
              <div className="space-y-4 p-2">
                {connections.pendingReceived.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-[#89726c] uppercase tracking-wider mb-2">Needs your response</h3>
                    {connections.pendingReceived.map((req: any) => (
                      <div key={req.id} className="bg-[#f8f7f5] p-3 rounded-xl border border-[#ddc0b9]/30 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-[#e4e2dd] flex items-center justify-center font-bold text-[#89726c]">
                            {req.otherUser.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#2c3d30]">{req.otherUser.name}</div>
                            <div className="text-[10px] text-[#89726c]">Wants to connect</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleRespondRequest(req.id, 'accept')} className="w-8 h-8 rounded-full bg-[#435848] text-white flex items-center justify-center hover:bg-[#2c3d30] shadow">✓</button>
                          <button onClick={() => handleRespondRequest(req.id, 'reject')} className="w-8 h-8 rounded-full bg-[#e4e2dd] text-[#89726c] flex items-center justify-center hover:bg-[#ddc0b9]">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {connections.pendingSent.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-[#89726c] uppercase tracking-wider mb-2">Sent Requests</h3>
                    {connections.pendingSent.map((req: any) => (
                      <div key={req.id} className="flex items-center gap-3 p-2 opacity-60">
                        <div className="w-8 h-8 rounded-full bg-[#e4e2dd] flex items-center justify-center font-bold text-xs text-[#89726c]">
                          {req.otherUser.name.charAt(0)}
                        </div>
                        <div className="font-medium text-sm text-[#2c3d30]">{req.otherUser.name}</div>
                        <div className="text-[10px] bg-[#e4e2dd] px-2 py-1 rounded ml-auto">Pending</div>
                      </div>
                    ))}
                  </div>
                )}

                {connections.pendingReceived.length === 0 && connections.pendingSent.length === 0 && (
                  <div className="p-8 text-center text-sm text-[#89726c] font-medium">
                    No pending requests.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Pane */}
        <div className={`w-full md:flex-1 bg-white rounded-2xl shadow-sm border border-[#ddc0b9]/30 flex flex-col overflow-hidden ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          {!selectedChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#89726c] p-8 text-center">
              <div className="w-20 h-20 bg-[#f0eee9] rounded-full flex items-center justify-center mb-4 text-3xl">✈️</div>
              <h2 className="text-xl font-bold text-[#2c3d30] mb-2">Select a Conversation</h2>
              <p className="max-w-xs">Tap on a connection from the left menu to start chatting and planning your trip.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-[#ddc0b9]/30 flex items-center px-4 bg-[#f8f7f5] justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedChatId(null)} className="md:hidden w-8 h-8 flex items-center justify-center text-[#2c3d30] font-bold">
                    ←
                  </button>
                  <div className="w-10 h-10 rounded-full bg-[#ddc0b9] flex items-center justify-center font-bold text-white">
                    {activeChatData?.otherUser.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#2c3d30]">{activeChatData?.otherUser.name}</div>
                    {otherUserTyping && <div className="text-[10px] text-[#8f361d] font-bold animate-pulse">typing...</div>}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#faf9f8] flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="text-center text-xs font-bold text-[#89726c] tracking-widest uppercase my-8 bg-[#e4e2dd] inline-block mx-auto px-4 py-1 rounded-full">
                    Connection formed. Say hi!
                  </div>
                )}
                {messages.map((msg, i) => {
                  // isMine logic: messages where senderId is NOT the other user are ours.
                  // The optimistic message uses senderId='me' which will never match a UUID, so it's safely treated as ours.
                  const isMine = msg.senderId !== activeChatData?.otherUser.id;
                  
                  return (
                    <div key={msg.id || i} className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMine ? 'bg-[#435848] text-white self-end rounded-tr-sm' : 'bg-white border border-[#ddc0b9]/30 text-[#2c3d30] self-start rounded-tl-sm'}`}>
                      {msg.content}
                      <div className={`text-[9px] mt-1 text-right ${isMine ? 'text-white/70' : 'text-[#89726c]'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMine && (
                          <span className="ml-1 font-bold">
                            {msg.isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-[#ddc0b9]/30">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#f0eee9] border-none rounded-full px-4 py-3 text-sm text-[#2c3d30] focus:outline-none focus:ring-2 focus:ring-[#8f361d]/50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-12 h-12 bg-[#8f361d] text-white rounded-full flex items-center justify-center hover:bg-[#af4d32] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
