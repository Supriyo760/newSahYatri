import React from 'react';
import Link from 'next/link';

export interface BiodataModalProps {
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    age: number | null;
    gender: string | null;
    nationality: string | null;
    travelStyle: string | null;
    interests: string[];
    openness?: number;
    conscientiousness?: number;
    extraversion?: number;
    agreeableness?: number;
    neuroticism?: number;
    riskTolerance?: number;
    budgetLevel?: string;
    foodPreferences?: Record<string, boolean>;
  };
  compatibility?: {
    overallScore: number;
    personalityScore: number;
    travelStyleScore: number;
    budgetScore: number;
    foodScore: number;
    conflictRisk?: number;
  };
  isSelf?: boolean;
  onClose: () => void;
  // Connection actions for other users
  actionLoading?: boolean;
  connectionStatus?: 'none' | 'pendingSent' | 'pendingReceived' | 'active';
  onConnect?: () => void;
  onBlock?: () => void;
}

export default function BiodataModal({
  user,
  compatibility,
  isSelf = false,
  onClose,
  actionLoading = false,
  connectionStatus = 'none',
  onConnect,
  onBlock,
}: BiodataModalProps) {
  return (
    <div className="fixed inset-0 bg-[#1b1c19]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-[#fbf9f4] border-2 border-[#ddc0b9] p-6 md:p-8 rounded-3xl max-w-2xl w-full my-8 space-y-6 shadow-2xl relative text-left scrollbar-thin overflow-y-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#ddc0b9]/40 pb-3">
          <span className="font-journal-label text-[10px] text-[#8f361d] tracking-widest uppercase font-bold">
            {isSelf ? 'YOUR COMPREHENSIVE BIODATA' : 'COMPREHENSIVE TRAVELER BIODATA'}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f0eee9] hover:bg-[#ffdad6] text-[#89726c] hover:text-[#ba1a1a] flex items-center justify-center text-sm font-bold shadow-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Profile Overview */}
        <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-5 rounded-2xl border border-[#ddc0b9]/30 shadow-tactile">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#8f361d] shadow-md relative bg-[#e4e2dd] shrink-0">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
              alt={user.name || 'Traveler'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <h3 className="font-journal-headline text-3xl text-[#1b1c19] italic">
                {user.name || 'Explorer'}, {user.age || '20s'}
              </h3>
              {!isSelf && compatibility && (
                <span className="bg-[#8f361d] text-white text-[10px] font-bold px-3 py-1 rounded-full text-center tracking-wider">
                  {compatibility.overallScore}% COMPATIBLE
                </span>
              )}
            </div>
            <p className="font-journal-label text-[10px] text-[#89726c] uppercase">
              {user.nationality || 'Wanderer'} &bull; {user.gender || 'Other'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-2.5 py-0.5 rounded-full bg-[#fdb55c]/10 border border-[#fdb55c]/20 text-[9px] font-journal-label text-[#865300] uppercase font-bold">
                {user.travelStyle} Style
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#8f361d]/10 border border-[#8f361d]/20 text-[9px] font-journal-label text-[#8f361d] uppercase font-bold">
                Budget: {user.budgetLevel || 'Average'}
              </span>
            </div>
          </div>
        </div>

        {/* Grid details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Personality traits */}
          <div className="space-y-4 bg-[#f0eee9]/40 p-5 rounded-2xl border border-[#ddc0b9]/20">
            <h4 className="font-journal-headline text-lg text-[#8f361d] border-b border-[#ddc0b9]/30 pb-1">
              Big Five Personality Traits
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Openness', val: user.openness ?? 0.5 },
                { label: 'Conscientiousness', val: user.conscientiousness ?? 0.5 },
                { label: 'Extraversion', val: user.extraversion ?? 0.5 },
                { label: 'Agreeableness', val: user.agreeableness ?? 0.5 },
                { label: 'Neuroticism', val: user.neuroticism ?? 0.5 },
              ].map(trait => (
                <div key={trait.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-[#56423d]">
                    <span>{trait.label}</span>
                    <span>{Math.round(trait.val * 100)}%</span>
                  </div>
                  <div className="w-full bg-[#f0eee9] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#8f361d] h-2 rounded-full"
                      style={{ width: `${trait.val * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences & Matching Analytics */}
          <div className="space-y-4 flex flex-col justify-between">
            
            {/* Compatibility stats (Only if not self) */}
            {!isSelf && compatibility && (
              <div className="bg-[#f0eee9]/40 p-5 rounded-2xl border border-[#ddc0b9]/20 space-y-3">
                <h4 className="font-journal-headline text-lg text-[#8f361d] border-b border-[#ddc0b9]/30 pb-1">
                  Similarity Scores
                </h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                    <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Personality</span>
                    <span className="font-journal-headline text-base text-[#8f361d]">
                      {compatibility.personalityScore}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                    <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Travel Style</span>
                    <span className="font-journal-headline text-base text-[#8f361d]">
                      {compatibility.travelStyleScore}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                    <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Food Vibe</span>
                    <span className="font-journal-headline text-base text-[#8f361d]">
                      {compatibility.foodScore}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                    <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Budget</span>
                    <span className="font-journal-headline text-base text-[#8f361d]">
                      {compatibility.budgetScore}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Dietary vibe preferences */}
            <div className={`bg-[#f0eee9]/40 p-5 rounded-2xl border border-[#ddc0b9]/20 space-y-2 ${isSelf ? 'flex-1' : ''}`}>
              <h4 className="font-journal-label text-[10px] text-[#89726c] tracking-wider block font-bold">
                FOOD PREFERENCES
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {user.foodPreferences ? (
                  Object.entries(user.foodPreferences)
                    .filter(([, enabled]) => !!enabled)
                    .map(([key]) => {
                      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                      return (
                        <span key={key} className="px-2 py-0.5 rounded bg-[#b5ccb8]/20 border border-[#b5ccb8]/40 text-[9px] font-journal-label text-[#435848] uppercase font-semibold">
                          {formattedKey}
                        </span>
                      );
                    })
                ) : (
                  <span className="text-xs text-[#89726c] italic">No restrictions listed</span>
                )}
                {(!user.foodPreferences || Object.values(user.foodPreferences).filter(Boolean).length === 0) && (
                  <span className="text-[10px] text-[#89726c] italic">Omnivore (Street food & casual dining)</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Conflict & Interests full rows */}
        <div className="space-y-4">
          
          {/* Dynamic Conflict Analysis (Only if not self) */}
          {!isSelf && compatibility && (() => {
            const conflictRisk = compatibility.conflictRisk ?? 0.3;
            const riskLevel = conflictRisk > 0.6 ? 'High' : conflictRisk > 0.3 ? 'Moderate' : 'Low';
            const mitigationAdvice = riskLevel === 'High' 
              ? 'Schedule distinct individual downtime and define budget boundaries beforehand.' 
              : riskLevel === 'Moderate'
              ? 'Align on culinary choices and daily waking hours to avoid friction.'
              : 'Highly compatible styles. Dynamic cooperative scheduling is recommended!';
            const triggers = riskLevel === 'High'
              ? ['Budget discrepancies', 'Intense packing schedules']
              : riskLevel === 'Moderate'
              ? ['Different meal times', 'Pace mismatch']
              : ['Minimal triggers anticipated'];

            return (
              <div className="p-5 bg-white rounded-2xl border border-[#ddc0b9]/40 space-y-3">
                <div className="flex justify-between items-center border-b border-[#ddc0b9]/10 pb-2">
                  <span className="text-[10px] font-journal-label text-[#89726c] font-bold">COOPERATIVE CONFLICT PREDICTION</span>
                  <span className={`text-[10px] font-bold px-3 py-0.5 rounded-full ${
                    riskLevel === 'Low'
                      ? 'bg-[#d1e9d3] text-[#435848]'
                      : riskLevel === 'Moderate'
                      ? 'bg-[#fdb55c]/20 text-[#865300]'
                      : 'bg-[#ffdad6] text-[#ba1a1a]'
                  }`}>
                    {riskLevel} Conflict Risk
                  </span>
                </div>
                <p className="text-xs text-[#56423d] italic leading-relaxed">
                  &ldquo;{mitigationAdvice}&rdquo;
                </p>
                <div className="text-[10px] text-[#89726c]">
                  <strong>Potential Triggers:</strong> {triggers.join(', ')}
                </div>
              </div>
            );
          })()}

          {/* Shared Interests list */}
          <div className="p-5 bg-[#f0eee9]/30 rounded-2xl border border-[#ddc0b9]/20 space-y-2">
            <h4 className="font-journal-label text-[10px] text-[#89726c] tracking-wider block font-bold">
              EXPEDITION INTERESTS
            </h4>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(user.interests) ? user.interests : []).length > 0 ? (
                (user.interests || []).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-white border border-[#ddc0b9]/30 text-[10px] font-journal-label text-[#56423d] uppercase font-bold"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#89726c] italic">Slow exploration, scenery, culinary tours</span>
              )}
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#ddc0b9]/40">
          <div className="flex flex-col md:flex-row gap-3">
            {isSelf ? (
              <Link
                href="/onboarding"
                onClick={onClose}
                className="flex-1 bg-[#8f361d] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors cursor-pointer text-center font-bold shadow-md"
              >
                EDIT PERSONALITY PROFILE
              </Link>
            ) : (
              <>
                {connectionStatus === 'active' && (
                  <Link
                    href="/inbox"
                    className="flex-1 bg-[#435848] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#2c3d30] transition-colors cursor-pointer text-center font-bold shadow-md"
                  >
                    OPEN CHAT
                  </Link>
                )}
                {connectionStatus === 'pendingSent' && (
                  <button
                    disabled
                    className="flex-1 bg-[#e4e2dd] text-[#89726c] py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase cursor-not-allowed text-center font-bold"
                  >
                    REQUEST SENT
                  </button>
                )}
                {connectionStatus === 'pendingReceived' && (
                  <Link
                    href="/inbox"
                    className="flex-1 bg-[#8f361d] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors cursor-pointer text-center font-bold shadow-md"
                  >
                    RESPOND IN INBOX
                  </Link>
                )}
                {connectionStatus === 'none' && (
                  <button
                    onClick={onConnect}
                    disabled={actionLoading}
                    className="flex-1 bg-[#8f361d] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors cursor-pointer text-center font-bold shadow-md disabled:opacity-50"
                  >
                    {actionLoading ? 'SENDING...' : 'CONNECT'}
                  </button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="flex-1 bg-[#f0eee9] text-[#56423d] py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-all cursor-pointer text-center font-bold"
            >
              CLOSE
            </button>
          </div>
          
          {!isSelf && onBlock && (
            <div className="flex justify-center">
              <button
                onClick={onBlock}
                className="text-[10px] text-[#ba1a1a] hover:underline font-bold uppercase tracking-wider"
              >
                Report / Block User
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
