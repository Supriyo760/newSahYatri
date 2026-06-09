'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';

interface Match {
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
  compatibility: {
    overallScore: number;
    personalityScore: number;
    travelStyleScore: number;
    budgetScore: number;
    foodScore: number;
    riskScore: number;
    conflictRisk?: number;
    conflictPrediction?: {
      riskLevel: string;
      triggers: string[];
      mitigationAdvice: string;
    };
  };
}

interface Group {
  id: string;
  name: string;
  destination: string | null;
  status: string;
  maxMembers: number;
  inviteCode: string;
  compatibilityScore: number | null;
  createdAt: string;
}

export default function Discover() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDest, setNewGroupDest] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);

  const handleUpgradePremium = async () => {
    setMessage('Premium upgrades are temporarily disabled while we migrate to our new billing provider. Coming soon!');
  };

  // Fetch data
  const fetchData = async (pageNumber = 1, append = false) => {
    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');
    
    try {
      const matchRes = await fetch(`/api/matching/discover?page=${pageNumber}&limit=20`);
      const matchData = await matchRes.json();
      if (matchRes.ok) {
        if (append) {
          setMatches(prev => [...prev, ...(matchData.data || [])]);
        } else {
          setMatches(matchData.data || []);
        }
        setHasMore(matchData.data.pagination?.page < matchData.data.pagination?.totalPages);
      } else {
        setError(matchData.error || 'Failed to fetch matches. Please onboarding first.');
      }

      if (pageNumber === 1) {
        const groupRes = await fetch('/api/groups');
        const groupData = await groupRes.json();
        if (groupRes.ok) {
          setGroups(groupData.data || []);
        }
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while loading discovery feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, true);
  };

  const handleBlockUser = async (userId: string) => {
    if (!confirm('Are you sure you want to block this user? You will no longer see each other.')) return;
    // Real implementation would call /api/users/block
    setMessage('User blocked successfully.');
    setSelectedMatch(null);
    setMatches(prev => prev.filter(m => m.user.id !== userId));
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join group');
      setMessage(`Successfully joined group: ${data.data.name}!`);
      setInviteCodeInput('');
      fetchData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          destination: newGroupDest.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      setMessage(`Successfully created group: ${data.data.name}! Invite Code: ${data.data.inviteCode}`);
      setNewGroupName('');
      setNewGroupDest('');
      fetchData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 pt-24 max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Polaroid matches & feed (col-span-8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Editorial Header */}
          <div className="text-left space-y-2 border-b border-[#ddc0b9]/40 pb-4">
            <span className="font-journal-label text-xs text-[#8f361d] tracking-widest uppercase">
              CURATED CONNECTIONS
            </span>
            <h2 className="font-journal-headline text-4xl text-[#1b1c19]">
              Discover a soul that wanders the same paths.
            </h2>
            <p className="text-xs text-[#89726c]">
              Calculated using weighted similarity vectors across personality, food compatibility, budget, and travel style.
            </p>
          </div>

          {/* Feedback/Error messages */}
          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-6 rounded-2xl border border-[#ffdad6]/40 text-center">
              <p className="font-journal-headline text-lg mb-2">{error}</p>
              <Link
                href="/onboarding"
                className="inline-block mt-2 bg-[#8f361d] text-white px-6 py-2 rounded-full font-journal-label text-[10px] tracking-wider uppercase hover:bg-[#af4d32] transition-colors"
              >
                Go to Onboarding & Profile Setup
              </Link>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center">
              <span className="font-journal-headline text-2xl text-[#89726c] italic animate-pulse">
                Reviewing the journals...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {matches.length === 0 && !error && (
                <div className="col-span-2 py-20 text-center flex flex-col items-center">
                  <span className="font-journal-headline text-2xl text-[#89726c] italic">
                    Wait for the ink to dry...
                  </span>
                  <p className="text-[#89726c] text-sm mt-2">
                    More compatible souls are joining the journal soon.
                  </p>
                </div>
              )}

              {matches.map((match) => (
                <Link
                  key={match.user.id}
                  href={`/profile/${match.user.id}`}
                  className="group relative flex flex-col items-center bg-white p-5 pb-8 rounded-2xl shadow-tactile border border-[#ddc0b9]/30 transition-transform duration-500 hover:-translate-y-2 cursor-pointer block"
                >
                  <div className="relative w-full aspect-[4/5] overflow-hidden mb-6 rounded-lg bg-[#f0eee9]">
                    <img
                      className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-700"
                      alt={match.user.name || 'Traveler'}
                      src={match.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <span className="text-[10px] font-journal-label text-[#8f361d] font-bold">
                        {match.compatibility.overallScore}% COMPATIBLE
                      </span>
                    </div>
                  </div>

                  <div className="w-full px-2 text-center md:text-left">
                    <h3 className="font-journal-headline text-2xl text-[#1b1c19] mb-1 italic">
                      {match.user.name || 'Explorer'}, {match.user.age || '20s'}
                    </h3>
                    <p className="font-journal-label text-[10px] text-[#89726c] uppercase mb-4">
                      {match.user.nationality || 'Wanderer'} &bull; {match.user.gender || 'Other'}
                    </p>

                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                      <span className="px-3 py-1 rounded-full bg-[#fdb55c]/10 border border-[#fdb55c]/20 text-[9px] font-journal-label text-[#865300] uppercase">
                        {match.user.travelStyle} Style
                      </span>
                      {(Array.isArray(match.user.interests) ? match.user.interests : []).slice(0, 2).map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-[#b5ccb8]/10 border border-[#b5ccb8]/20 text-[9px] font-journal-label text-[#435848] uppercase"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[#89726c] italic leading-relaxed line-clamp-2">
                      &ldquo;Seeking to explore hidden sanctuaries and share authentic culinary discoveries...&rdquo;
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-white text-[#8f361d] border border-[#ddc0b9] px-6 py-2.5 rounded-full font-journal-label text-[10px] tracking-wider uppercase hover:bg-[#f0eee9] transition-colors disabled:opacity-50 font-bold shadow-sm"
              >
                {loadingMore ? 'LOADING...' : 'LOAD MORE TRAVELERS'}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Group Creation & Detailed Match view (col-span-4) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Match Detail View has been upgraded to a full glassmorphic Biodata Modal Overlay */}

          {/* Messages alert banner */}
          {message && (
            <div className="bg-[#d1e9d3] text-[#435848] p-4 rounded-xl border border-[#435848]/20 text-center text-xs font-semibold">
              {message}
            </div>
          )}

          {/* Create Group Form */}
          <div className="bg-[#f0eee9] p-6 rounded-2xl border border-[#ddc0b9]/40 space-y-4">
            <h3 className="font-journal-headline text-xl text-[#8f361d] border-b border-[#ddc0b9]/30 pb-2">
              Form Travel Group
            </h3>
            <p className="text-xs text-[#89726c]">
              Create a group and share your invite code with companion matches to merge preferences and start cooperative itinerary planning.
            </p>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                placeholder="Group Name (e.g. Spice Trails)"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs"
                required
              />
              <input
                type="text"
                placeholder="Destination (e.g. Cochin, Kerala)"
                value={newGroupDest}
                onChange={e => setNewGroupDest(e.target.value)}
                className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs"
              />
              <button
                type="submit"
                className="w-full bg-[#8f361d] text-white py-2.5 rounded-full font-journal-label text-[10px] tracking-wider uppercase hover:bg-[#af4d32] transition-colors"
              >
                CREATE GROUP
              </button>
            </form>
          </div>

          {/* Join Group Form */}
          <div className="bg-[#f0eee9] p-6 rounded-2xl border border-[#ddc0b9]/40 space-y-4">
            <h3 className="font-journal-headline text-xl text-[#8f361d] border-b border-[#ddc0b9]/30 pb-2">
              Join Existing Group
            </h3>
            <p className="text-xs text-[#89726c]">
              Enter a 6-digit invite code provided by another SahYatri traveler.
            </p>
            <form onSubmit={handleJoinGroup} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="INVITE CODE"
                value={inviteCodeInput}
                onChange={e => setInviteCodeInput(e.target.value)}
                className="flex-1 bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs text-center font-bold tracking-widest"
                required
              />
              <button
                type="submit"
                className="bg-[#8f361d] text-white px-4 rounded-lg font-journal-label text-[10px] hover:bg-[#af4d32] transition-colors"
              >
                JOIN
              </button>
            </form>
          </div>

          {/* Premium Billing Section */}
          <div className="bg-[#1b1c19] text-[#fbf9f4] p-6 rounded-2xl border border-[#ddc0b9]/40 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#8f361d]/30 to-transparent pointer-events-none" />
            <div className="flex justify-between items-center border-b border-[#ddc0b9]/20 pb-3">
              <span className="font-journal-label text-[9px] text-[#fdb55c] tracking-widest uppercase font-bold">
                PLATFORM SUBSCRIPTION
              </span>
              <span className="bg-[#8f361d] text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full">
                PREMIUM
              </span>
            </div>
            
            <div className="space-y-1">
              <h4 className="font-journal-headline text-2xl text-[#fdb55c] italic">Global Nomad Premium</h4>
              <p className="text-[10px] text-[#89726c]">Unlock all dynamic AI and safety metrics</p>
            </div>

            <div className="text-2xl font-bold flex items-baseline gap-1">
              <span>$9.99</span>
              <span className="text-xs text-[#89726c] font-normal">/ month</span>
            </div>

            <ul className="space-y-2.5 text-xs text-[#dcdacb]">
              <li className="flex items-start gap-2">
                <span className="text-[#fdb55c] font-bold">✓</span>
                <span>Persistent **AI Safety Assistant Chatbot** bubble</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#fdb55c] font-bold">✓</span>
                <span>Unleash **Dijkstra Dynamic Route Radar** paths</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#fdb55c] font-bold">✓</span>
                <span>Score **XGBoost Hidden Gems** at 100% depth</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#fdb55c] font-bold">✓</span>
                <span>Interactive **Medication Intake Checklist** logs</span>
              </li>
            </ul>

            <button
              onClick={handleUpgradePremium}
              className="w-full bg-[#fdb55c] text-[#1b1c19] font-bold py-2.5 rounded-full font-journal-label text-[10px] tracking-wider uppercase hover:bg-white hover:text-[#8f361d] transition-all transform active:scale-95 shadow-tactile text-center cursor-pointer"
            >
              UPGRADE TO PREMIUM
            </button>
          </div>

          {/* List of Joined Groups */}
          <div className="bg-[#fbf9f4] border border-[#ddc0b9]/40 p-6 rounded-2xl space-y-4">
            <h3 className="font-journal-headline text-lg text-[#1b1c19]">
              Your Active Groups
            </h3>
            {groups.length === 0 ? (
              <p className="text-xs text-[#89726c] italic">No active groups. Form one above!</p>
            ) : (
              <div className="space-y-3">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="p-4 bg-white rounded-xl border border-[#ddc0b9]/30 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-xs text-[#1b1c19]">{group.name}</span>
                        <span className="text-[10px] font-journal-label text-[#8f361d] font-bold">
                          {group.compatibilityScore ? `${group.compatibilityScore}% Compatibility` : 'New'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#89726c]">
                        Destination: {group.destination || 'Unspecified'}
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-2 border-t border-[#ddc0b9]/20">
                      <span>Code: <strong className="text-[#8f361d]">{group.inviteCode}</strong></span>
                      <Link
                        href={`/itinerary?groupId=${group.id}`}
                        className="text-[#8f361d] underline hover:no-underline font-semibold"
                      >
                        Plan Itinerary
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>



      {/* Full screen glassmorphic Biodata Modal Overlay */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-[#1b1c19]/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-[#fbf9f4] border-2 border-[#ddc0b9] p-6 md:p-8 rounded-3xl max-w-2xl w-full my-8 space-y-6 shadow-2xl relative text-left scrollbar-thin overflow-y-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#ddc0b9]/40 pb-3">
              <span className="font-journal-label text-[10px] text-[#8f361d] tracking-widest uppercase font-bold">
                COMPREHENSIVE TRAVELER BIODATA
              </span>
              <button
                onClick={() => setSelectedMatch(null)}
                className="w-7 h-7 rounded-full bg-[#f0eee9] hover:bg-[#ffdad6] text-[#89726c] hover:text-[#ba1a1a] flex items-center justify-center text-sm font-bold shadow-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* Profile Overview (Polaroid card / Header slot) */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-5 rounded-2xl border border-[#ddc0b9]/30 shadow-tactile">
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#8f361d] shadow-md relative bg-[#e4e2dd] shrink-0">
                <img
                  src={selectedMatch.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                  alt={selectedMatch.user.name || 'Traveler'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2 text-center md:text-left flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <h3 className="font-journal-headline text-3xl text-[#1b1c19] italic">
                    {selectedMatch.user.name || 'Explorer'}, {selectedMatch.user.age || '20s'}
                  </h3>
                  <span className="bg-[#8f361d] text-white text-[10px] font-bold px-3 py-1 rounded-full text-center tracking-wider">
                    {selectedMatch.compatibility.overallScore}% COMPATIBLE
                  </span>
                </div>
                <p className="font-journal-label text-[10px] text-[#89726c] uppercase">
                  {selectedMatch.user.nationality || 'Wanderer'} &bull; {selectedMatch.user.gender || 'Other'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#fdb55c]/10 border border-[#fdb55c]/20 text-[9px] font-journal-label text-[#865300] uppercase font-bold">
                    {selectedMatch.user.travelStyle} Style
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#8f361d]/10 border border-[#8f361d]/20 text-[9px] font-journal-label text-[#8f361d] uppercase font-bold">
                    Budget: {selectedMatch.user.budgetLevel || 'Average'}
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
                    { label: 'Openness', val: selectedMatch.user.openness ?? 0.5 },
                    { label: 'Conscientiousness', val: selectedMatch.user.conscientiousness ?? 0.5 },
                    { label: 'Extraversion', val: selectedMatch.user.extraversion ?? 0.5 },
                    { label: 'Agreeableness', val: selectedMatch.user.agreeableness ?? 0.5 },
                    { label: 'Neuroticism', val: selectedMatch.user.neuroticism ?? 0.5 },
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
                
                {/* Compatibility stats */}
                <div className="bg-[#f0eee9]/40 p-5 rounded-2xl border border-[#ddc0b9]/20 space-y-3">
                  <h4 className="font-journal-headline text-lg text-[#8f361d] border-b border-[#ddc0b9]/30 pb-1">
                    Similarity Scores
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                      <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Personality</span>
                      <span className="font-journal-headline text-base text-[#8f361d]">
                        {selectedMatch.compatibility.personalityScore}%
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                      <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Travel Style</span>
                      <span className="font-journal-headline text-base text-[#8f361d]">
                        {selectedMatch.compatibility.travelStyleScore}%
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                      <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Food Vibe</span>
                      <span className="font-journal-headline text-base text-[#8f361d]">
                        {selectedMatch.compatibility.foodScore}%
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#ddc0b9]/20">
                      <span className="text-[9px] text-[#89726c] block uppercase font-semibold">Budget</span>
                      <span className="font-journal-headline text-base text-[#8f361d]">
                        {selectedMatch.compatibility.budgetScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dietary vibe preferences */}
                <div className="bg-[#f0eee9]/40 p-5 rounded-2xl border border-[#ddc0b9]/20 space-y-2">
                  <h4 className="font-journal-label text-[10px] text-[#89726c] tracking-wider block font-bold">
                    FOOD PREFERENCES
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMatch.user.foodPreferences ? (
                      Object.entries(selectedMatch.user.foodPreferences)
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
                    {(!selectedMatch.user.foodPreferences || Object.values(selectedMatch.user.foodPreferences).filter(Boolean).length === 0) && (
                      <span className="text-[10px] text-[#89726c] italic">Omnivore (Street food & casual dining)</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Conflict & Interests full rows */}
            <div className="space-y-4">
              
              {/* Dynamic Conflict Analysis */}
              {(() => {
                const conflictRisk = selectedMatch.compatibility.conflictRisk ?? 0.3;
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
                  {(Array.isArray(selectedMatch.user.interests) ? selectedMatch.user.interests : []).length > 0 ? (
                    (selectedMatch.user.interests || []).map((interest, idx) => (
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
                <button
                  onClick={() => {
                    setSelectedMatch(null);
                    const createGroupEl = document.getElementById('new-group-name');
                    if (createGroupEl) {
                      createGroupEl.focus();
                    }
                    setMessage(`Start planning! Form a group and invite ${selectedMatch.user.name || 'your match'}.`);
                  }}
                  className="flex-1 bg-[#8f361d] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors cursor-pointer text-center font-bold shadow-md"
                >
                  FORM TRAVEL GROUP
                </button>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 bg-[#f0eee9] text-[#56423d] py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-all cursor-pointer text-center font-bold"
                >
                  BACK TO DISCOVER
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handleBlockUser(selectedMatch.user.id)}
                  className="text-[10px] text-[#ba1a1a] hover:underline font-bold uppercase tracking-wider"
                >
                  Report / Block User
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <BottomNavBar />
    </div>
  );
}
