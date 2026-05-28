'use client';

import React, { useState } from 'react';
import PreMatchChat from './PreMatchChat';

interface StartPreMatchChatProps {
  recipientId: string;
  currentUserId: string;
  partnerName?: string | null;
}

export default function StartPreMatchChat({
  recipientId,
  currentUserId,
  partnerName,
}: StartPreMatchChatProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startChat = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chat/pre-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start chat');
      }
      setChatId(data.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start chat');
    } finally {
      setLoading(false);
    }
  };

  if (chatId) {
    return (
      <div className="h-[480px] rounded-2xl overflow-hidden border border-[#ddc0b9]/40 shadow-tactile">
        <PreMatchChat
          chatId={chatId}
          currentUserId={currentUserId}
          partnerName={partnerName ? `Anonymous chat with ${partnerName}` : 'Anonymous Match'}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#f0eee9]/50 border border-[#ddc0b9]/40 rounded-2xl p-6 space-y-4">
      <div>
        <h4 className="font-journal-headline text-2xl text-[#8f361d]">Anonymous Pre-Match Chat</h4>
        <p className="text-xs text-[#89726c] mt-1">
          Talk before forming a group. Your profile details stay protected until you both decide to continue.
        </p>
      </div>

      {error && (
        <div className="bg-[#ffdad6] text-[#93000a] border border-[#ffdad6] rounded-xl p-3 text-xs font-semibold">
          {error}
        </div>
      )}

      <button
        onClick={startChat}
        disabled={loading}
        className="w-full bg-[#8f361d] text-white py-3 rounded-full font-journal-label text-[10px] tracking-widest uppercase hover:bg-[#af4d32] transition-colors disabled:opacity-60"
      >
        {loading ? 'Opening Secure Room...' : 'Start Anonymous Chat'}
      </button>
    </div>
  );
}
