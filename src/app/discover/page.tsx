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
  };
  compatibility: {
    overallScore: number;
    personalityScore: number;
    travelStyleScore: number;
    budgetScore: number;
    foodScore: number;
    riskScore: number;
    conflictPrediction: {
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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const matchRes = await fetch('/api/matching/discover');
      const matchData = await matchRes.json();
      if (matchRes.ok) {
        setMatches(matchData.data || []);
      } else {
        setError(matchData.error || 'Failed to fetch matches. Please onboarding first.');
      }

      const groupRes = await fetch('/api/groups');
      const groupData = await groupRes.json();
      if (groupRes.ok) {
        setGroups(groupData.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred while loading discovery feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
                <div
                  key={match.user.id}
                  onClick={() => setSelectedMatch(match)}
                  className="group relative flex flex-col items-center bg-white p-5 pb-8 rounded-2xl shadow-tactile border border-[#ddc0b9]/30 transition-transform duration-500 hover:-translate-y-2 cursor-pointer"
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
                      {match.user.interests?.slice(0, 2).map((interest, idx) => (
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Group Creation & Detailed Match view (col-span-4) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Match Detail View overlay or panel */}
          {selectedMatch && (
            <div className="bg-[#fdb55c]/10 border border-[#fdb55c]/30 rounded-2xl p-6 shadow-tactile space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="font-journal-headline text-xl text-[#8f361d]">
                  Compatibility Analysis
                </h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-xs font-semibold text-[#89726c] hover:text-[#8f361d]"
                >
                  Clear Details
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-[#56423d] mb-1">
                    Matching score with {selectedMatch.user.name}:
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-[#f0eee9] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#8f361d] h-2.5 rounded-full"
                        style={{ width: `${selectedMatch.compatibility.overallScore}%` }}
                      />
                    </div>
                    <span className="font-journal-headline text-2xl text-[#8f361d]">
                      {selectedMatch.compatibility.overallScore}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/60 p-3 rounded-xl border border-[#ddc0b9]/30">
                    <span className="text-[10px] text-[#89726c] block">Personality</span>
                    <span className="font-journal-headline text-lg text-[#8f361d]">
                      {selectedMatch.compatibility.personalityScore}%
                    </span>
                  </div>
                  <div className="bg-white/60 p-3 rounded-xl border border-[#ddc0b9]/30">
                    <span className="text-[10px] text-[#89726c] block">Travel Style</span>
                    <span className="font-journal-headline text-lg text-[#8f361d]">
                      {selectedMatch.compatibility.travelStyleScore}%
                    </span>
                  </div>
                  <div className="bg-white/60 p-3 rounded-xl border border-[#ddc0b9]/30">
                    <span className="text-[10px] text-[#89726c] block">Food Vibe</span>
                    <span className="font-journal-headline text-lg text-[#8f361d]">
                      {selectedMatch.compatibility.foodScore}%
                    </span>
                  </div>
                  <div className="bg-white/60 p-3 rounded-xl border border-[#ddc0b9]/30">
                    <span className="text-[10px] text-[#89726c] block">Budget Alignment</span>
                    <span className="font-journal-headline text-lg text-[#8f361d]">
                      {selectedMatch.compatibility.budgetScore}%
                    </span>
                  </div>
                </div>

                {/* Conflict Prediction Card */}
                <div className="p-4 bg-white rounded-xl border border-[#ddc0b9]/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-journal-label text-[#89726c]">CONFLICT PREDICTION</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedMatch.compatibility.conflictPrediction.riskLevel === 'Low'
                        ? 'bg-[#d1e9d3] text-[#435848]'
                        : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}>
                      {selectedMatch.compatibility.conflictPrediction.riskLevel} Risk
                    </span>
                  </div>
                  <p className="text-xs text-[#56423d] italic leading-relaxed">
                    &ldquo;{selectedMatch.compatibility.conflictPrediction.mitigationAdvice}&rdquo;
                  </p>
                  <div className="text-[10px] text-[#89726c]">
                    <strong>Potential Triggers:</strong> {selectedMatch.compatibility.conflictPrediction.triggers.join(', ')}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-[#56423d]">
                    <strong>Interests: </strong>
                    {selectedMatch.user.interests?.join(', ') || 'General exploration'}
                  </p>
                  <p className="text-xs text-[#56423d]">
                    <strong>Style Summary: </strong>
                    An onboarded traveler seeking slow, high-depth encounters.
                  </p>
                </div>
              </div>
            </div>
          )}

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

      <BottomNavBar />
    </div>
  );
}
