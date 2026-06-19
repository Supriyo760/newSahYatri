'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import GroupChat from '@/components/chat/GroupChat';
import MedicalSharingConsent from '@/components/medical/MedicalSharingConsent';
import GroupMedicalOverview, { GroupMemberMedical } from '@/components/medical/GroupMedicalOverview';
import ChecklistNavigation from '@/components/trips/ChecklistNavigation';
import LiveLocationMap from '@/components/map/LiveLocationMap';
import { CooperativeRouteRadar } from '@/components/map/CooperativeRouteRadar';

interface Group {
  id: string;
  name: string;
  destination: string | null;
}

interface ItineraryItem {
  id: string;
  orderIndex: number;
  type: 'activity' | 'food' | 'lodging';
  name: string;
  description: string | null;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  estimatedDurationMinutes: number | null;
  estimatedCostPerPerson: number | null;
  isHiddenGem: boolean | null;
  tips: string | null;
  photoUrl: string | null;
}

interface ItineraryDay {
  id: string;
  dayNumber: number;
  date: string;
  theme: string | null;
  items: ItineraryItem[];
}

interface Trip {
  id: string;
  groupId: string;
  destination: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalBudget: number | null;
  perPersonBudget: number | null;
  currency: string | null;
  hiddenGemMode: boolean;
  generationPromptUsed?: string | null;
  days: ItineraryDay[];
}

interface GroupDetails {
  createdBy: string;
  currentMembership: {
    medicalSharingConsent: boolean | null;
  };
  members: Array<GroupMemberMedical & {
    id: string;
    role: string | null;
    medicalSharingConsent: boolean | null;
  }>;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: 'equal' | 'custom';
  createdAt: string;
  category: string | null;
}

function ItineraryContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initialGroupId = searchParams.get('groupId') || '';

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  // Generation form fields
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetTotal, setBudgetTotal] = useState(1000);

  // Selected item details for Maps overlay simulated popup
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'attractions' | 'food'>('attractions');
  const [workflowTab, setWorkflowTab] = useState<'navigate' | 'chat' | 'care' | 'location'>('navigate');

  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || 'Traveler';
  // Derived: is the current user the creator of the selected group?
  const isCreator = !!groupDetails && groupDetails.createdBy === currentUserId;
  const groupMembers = (groupDetails?.members || []).map(member => ({
    id: member.userId,
    name: member.name,
    avatarUrl: member.avatarUrl || null,
  }));
  const firstDayItems = trip?.days?.[0]?.items || [];

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch('/api/groups');
        const data = await res.json();
        if (res.ok && data.data) {
          setGroups(data.data);
          if (data.data.length > 0) {
            setSelectedGroupId(prev => prev || data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load groups:', err);
      }
    }
    loadGroups();
  }, []);

  const loadGroupDetails = useCallback(async (groupId: string) => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        // Flatten createdBy from nested group object into the top-level GroupDetails
        setGroupDetails({
          createdBy: data.data.group?.createdBy ?? '',
          currentMembership: data.data.currentMembership,
          members: data.data.members,
        });
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    }
  }, []);

  const loadTrip = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setLoading(true);
    setTrip(null);
    setMessage('');
    try {
      const res = await fetch(`/api/trips?groupId=${groupId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setTrip(data.data);
        if (data.data.destination) {
          setDestination(data.data.destination);
        }
        if (data.data.startDate) {
          setStartDate(new Date(data.data.startDate).toISOString().split('T')[0]);
        }
        if (data.data.endDate) {
          setEndDate(new Date(data.data.endDate).toISOString().split('T')[0]);
        }
        if (data.data.totalBudget) {
          setBudgetTotal(data.data.totalBudget);
        }
      }
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      void Promise.resolve().then(() => {
        loadTrip(selectedGroupId);
        loadGroupDetails(selectedGroupId);
        const matchedGroup = groups.find(g => g.id === selectedGroupId);
        if (matchedGroup?.destination) {
          setDestination(matchedGroup.destination);
        }
      });
    }
  }, [selectedGroupId, groups, loadTrip, loadGroupDetails]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    setGenerating(true);
    setMessage('');
    try {
      const res = await fetch('/api/trips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          destination,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          budgetTotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || (typeof data.error === 'string' ? data.error : 'Failed to generate itinerary'));
      setMessage('Itinerary successfully generated by SahYatri AI!');
      loadTrip(selectedGroupId);
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 pt-24 max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Select Group + Itinerary Details (col-span-8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Select active group */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-[#ddc0b9]/40 pb-4">
            <div>
              <span className="font-journal-label text-[10px] text-[#8f361d] tracking-widest uppercase">
                COOPERATIVE PLANNING
              </span>
              <h2 className="font-journal-headline text-3xl">Curated Itinerary</h2>
            </div>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="bg-[#f0eee9] border border-[#ddc0b9] rounded-xl p-2 px-4 text-xs font-semibold"
            >
              <option value="">Select Group...</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Messages info banner */}
          {message && (
            <div className="bg-[#d1e9d3] text-[#435848] p-4 rounded-xl border border-[#435848]/20 text-center text-xs font-semibold">
              {message}
            </div>
          )}

          {/* Loading */}
          {loading && selectedGroupId && (
            <div className="py-24 text-center">
              <span className="font-journal-headline text-2xl text-[#89726c] italic animate-pulse">
                Unfolding the pages of exploration...
              </span>
            </div>
          )}

          {/* State 1: No Group Selected */}
          {!selectedGroupId && (
            <div className="py-24 text-center border border-dashed border-[#ddc0b9] rounded-2xl bg-[#f0eee9]/40 p-8">
              <h3 className="font-journal-headline text-xl text-[#89726c] italic mb-4">No Travel Group Selected</h3>
              <p className="text-xs text-[#89726c] max-w-sm mx-auto mb-6">
                Create a travel group first or enter an invite code to begin cooperative trip scheduling.
              </p>
              <Link
                href="/discover"
                className="bg-[#8f361d] text-white px-6 py-2.5 rounded-full font-journal-label text-[10px] tracking-wider uppercase hover:bg-[#af4d32] transition-colors"
              >
                Go to Matchmaker Dashboard
              </Link>
            </div>
          )}

          {/* State 2: Group Selected but No Itinerary — CREATOR ONLY shows the form */}
          {!loading && !trip && selectedGroupId && !generating && isCreator && (
            <form onSubmit={handleGenerate} className="bg-[#f0eee9] p-8 rounded-2xl shadow-tactile space-y-6">
              <h3 className="font-journal-headline text-2xl text-[#8f361d]">
                Initiate AI Journey Crafting
              </h3>
              <p className="text-xs text-[#89726c] leading-relaxed">
                By tapping the SahYatri AI planner, we merge the personality variables, risk indices, and dining choices of all members in the group to structure an optimized route.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">DESTINATION</label>
                  <input
                    type="text"
                    placeholder="e.g. Cochin, Kerala, India"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs font-semibold text-[#1b1c19]"
                    required
                  />
                </div>

                <div>
                  <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">BUDGET LIMIT (₹)</label>
                  <input
                    type="number"
                    value={budgetTotal}
                    onChange={e => setBudgetTotal(Number(e.target.value))}
                    className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs font-semibold"
                    min="100"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">START DATE</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">END DATE</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#8f361d] text-white py-3 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors shadow-tactile"
              >
                CRAFT OPTIMIZED AI ITINERARY
              </button>
            </form>
          )}

          {/* State 2b: Group Selected but No Itinerary — MEMBER sees read-only message */}
          {!loading && !trip && selectedGroupId && !generating && !isCreator && (
            <div className="py-24 text-center border border-dashed border-[#ddc0b9] rounded-2xl bg-[#f0eee9]/40 p-8 space-y-4">
              <div className="text-4xl">🗺️</div>
              <h3 className="font-journal-headline text-xl text-[#89726c] italic">Waiting for the plan...</h3>
              <p className="text-xs text-[#89726c] max-w-sm mx-auto leading-relaxed">
                The group creator is crafting your shared itinerary. Once they generate it, the full journey plan will appear here for you to explore.
              </p>
              <div className="inline-block px-4 py-2 bg-[#ddc0b9]/30 text-[#56423d] text-[10px] font-journal-label uppercase tracking-widest rounded-full border border-[#ddc0b9]/40">
                View Only — Editing Reserved for Creator
              </div>
            </div>
          )}

          {/* State 3: Generating loading state */}
          {generating && (
            <div className="py-24 text-center bg-[#f0eee9]/40 border border-[#ddc0b9] rounded-2xl p-8 space-y-6">
              <span className="font-journal-headline text-3xl text-[#8f361d] italic animate-pulse block">
                Weaving spices and routes...
              </span>
              <p className="text-sm text-[#89726c] max-w-md mx-auto leading-relaxed">
                SahYatri is connecting to the Google Gemini model. We are scoring local restaurants, ranking hidden cultural sanctuaries, mapping safe emergency access corridors, and resolving travel styles into a singular journal.
              </p>
              <div className="h-[1px] bg-[#89726c] w-24 mx-auto" />
              <p className="text-xs text-[#89726c] italic">
                &ldquo;Every traveler&apos;s preference is a thread in the collective tapestry.&rdquo;
              </p>
            </div>
          )}

          {/* State 4: Displaying Itinerary Timeline */}
          {trip && (
            <div className="space-y-12">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="text-left space-y-1">
                  <span className="font-journal-label text-[10px] text-[#8f361d] uppercase tracking-widest block">
                    {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} IN {trip.destination}
                  </span>
                  <h3 className="font-journal-headline text-4xl italic text-[#1b1c19] capitalize">
                    {trip.destination}: {trip.durationDays}-Day Expedition
                  </h3>
                  {trip.totalBudget && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8f361d]/10 text-[#8f361d] font-journal-label text-[10px] uppercase tracking-widest rounded-full border border-[#8f361d]/20 mt-1">
                      Target Budget: ₹{trip.totalBudget}
                    </div>
                  )}
                </div>
                {/* Only the creator can regenerate the itinerary */}
                {isCreator && (
                  <button
                    onClick={() => setTrip(null)}
                    className="sm:self-end border border-[#ddc0b9] text-[#8f361d] py-2 px-5 rounded-full font-journal-label text-[10px] tracking-widest uppercase hover:bg-[#f0eee9] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    Change Location
                  </button>
                )}
                {!isCreator && (
                  <div className="sm:self-end inline-flex items-center gap-1.5 px-4 py-2 bg-[#f0eee9] border border-[#ddc0b9]/40 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#435848]" />
                    <span className="font-journal-label text-[10px] text-[#56423d] uppercase tracking-wider">Viewing Plan</span>
                  </div>
                )}
              </div>
              <div className="h-[1px] bg-gradient-to-r from-transparent via-[#89726c] to-transparent w-full my-4" />

              {/* Tab Selector */}
              <div className="flex border-b border-[#ddc0b9]/40 gap-8">
                <button
                  onClick={() => setActiveTab('attractions')}
                  className={`pb-3 font-journal-label text-xs uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === 'attractions'
                      ? 'border-[#8f361d] text-[#8f361d] font-bold'
                      : 'border-transparent text-[#89726c] hover:text-[#1b1c19]'
                  }`}
                >
                  Journey Itinerary (Attractions)
                </button>
                <button
                  onClick={() => setActiveTab('food')}
                  className={`pb-3 font-journal-label text-xs uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === 'food'
                      ? 'border-[#8f361d] text-[#8f361d] font-bold'
                      : 'border-transparent text-[#89726c] hover:text-[#1b1c19]'
                  }`}
                >
                  Culinary Explorer (Local Food Guide)
                </button>
              </div>

              {activeTab === 'attractions' ? (
                /* Day loops - Attractions Only */
                <div className="relative border-l border-dashed border-[#89726c]/30 pl-6 space-y-12">
                  {trip.days.map((day) => {
                    const attractions = day.items.filter(item => item.type !== 'food');
                    return (
                      <div key={day.id} className="relative space-y-6">
                        {/* Day Marker */}
                        <div className="absolute -left-[35px] top-0 w-[18px] h-[18px] rounded-full bg-[#8f361d] border-4 border-[#fbf9f4]" />

                        <div>
                          <span className="text-[10px] font-journal-label text-[#89726c] uppercase">
                            DAY {day.dayNumber} &bull; {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </span>
                          <h4 className="font-journal-headline text-2xl text-[#8f361d]">
                            {day.theme || `Day ${day.dayNumber}`}
                          </h4>
                        </div>

                        {/* Items loops */}
                        {attractions.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {attractions.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`p-5 rounded-2xl shadow-tactile border transition-all cursor-pointer hover:shadow-2xl hover:scale-[1.01] ${
                                  item.isHiddenGem
                                    ? 'bg-[#fdb55c]/10 border-[#fdb55c]/40 hidden-gem-glow'
                                    : 'bg-white border-[#ddc0b9]/30'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[9px] font-journal-label uppercase px-2 py-0.5 rounded bg-[#fdb55c] text-[#2b1700]">
                                    {item.type}
                                  </span>
                                  {item.isHiddenGem && (
                                    <span className="text-[9px] font-journal-label uppercase px-2 py-0.5 rounded bg-[#8f361d] text-white animate-pulse">
                                      HIDDEN GEM
                                    </span>
                                  )}
                                </div>

                                <h5 className="font-semibold text-sm text-[#1b1c19] mb-1">{item.name}</h5>
                                <p className="text-xs text-[#89726c] line-clamp-3 mb-2 leading-relaxed">
                                  {item.description}
                                </p>

                                <a
                                  href={`https://www.google.com/maps/search/${encodeURIComponent(item.name + ', ' + (item.locationName || ''))}/data=!3m1!4b1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[10px] text-[#8f361d] font-semibold hover:underline mb-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  📸 View Real Photos on Google Maps →
                                </a>

                                {item.estimatedDurationMinutes && (
                                  <div className="text-[10px] text-[#89726c] border-t border-[#ddc0b9]/20 pt-2 flex justify-between items-center">
                                    <span>Duration: {item.estimatedDurationMinutes}m</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#89726c] italic">
                            No scheduled attractions for today. Perfect day for free exploration or food hunting!
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Culinary Explorer - Local Specialties & Shops (No Time/Date Category) */
                <div className="space-y-8">
                  <div className="bg-[#f0eee9] p-6 rounded-2xl border border-[#ddc0b9]/40 space-y-2">
                    <h4 className="font-journal-headline text-2xl text-[#8f361d]">
                      Local Specialties & Famous Shops
                    </h4>
                    <p className="text-xs text-[#89726c] leading-relaxed">
                      Discover the authentic local delicacies of {trip.destination}. We have handpicked the best street hot zones, sweet corners, and famous shops where locals eat.
                    </p>
                  </div>

                  {trip.generationPromptUsed && (
                    <div className="bg-white p-6 rounded-2xl shadow-tactile border border-[#ddc0b9]/40 space-y-4">
                      <h5 className="font-journal-headline text-xl text-[#1b1c19]">The Taste of {trip.destination}</h5>
                      <div className="text-xs text-[#56423d] leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                        {trip.generationPromptUsed}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const allFoods = trip.days.flatMap(day => day.items).filter(item => item.type === 'food');
                      const uniqueFoodsMap = new Map();
                      allFoods.forEach(f => {
                        const nameKey = f.name.toLowerCase().trim();
                        if (!uniqueFoodsMap.has(nameKey)) {
                          uniqueFoodsMap.set(nameKey, f);
                        }
                      });
                      const uniqueFoods = Array.from(uniqueFoodsMap.values()) as ItineraryItem[];
                      return uniqueFoods.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="p-5 rounded-2xl shadow-tactile border bg-white border-[#ddc0b9]/30 transition-all cursor-pointer hover:shadow-2xl hover:scale-[1.01] flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="w-full h-36 rounded-xl overflow-hidden relative">
                              <iframe
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(item.name + ', ' + (item.locationName || ''))}&t=m&z=15&output=embed&iwloc=near`}
                                className="w-full h-full border-0"
                                loading="lazy"
                                title={item.name}
                                allowFullScreen
                              />
                              <span className="absolute top-3 left-3 text-[9px] font-journal-label uppercase px-2 py-0.5 rounded bg-[#b5ccb8] text-[#0c1f13] z-10">
                                specialty
                              </span>
                            </div>

                            <h5 className="font-semibold text-base text-[#1b1c19]">{item.name}</h5>
                            <p className="text-xs text-[#89726c] leading-relaxed">
                              {item.description}
                            </p>

                            {item.tips && (
                              <div className="p-3 bg-[#fbf9f4] rounded-lg border border-[#ddc0b9]/30 text-[11px] italic text-[#56423d]">
                                <strong>Tip:</strong> {item.tips}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 border-t border-[#ddc0b9]/20 pt-3">
                            <div className="text-xs text-[#89726c]">
                              <p><strong>Recommended Shop/Zone:</strong> {item.locationName || 'Local street stalls'}</p>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ', ' + (item.locationName || ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-center bg-[#8f361d]/10 text-[#8f361d] py-2 rounded-xl font-journal-label text-[9px] uppercase tracking-widest hover:bg-[#8f361d] hover:text-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Show Shop Map Pin
                            </a>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Map assistance & Detail Side Drawer (col-span-4) */}
        <div className="lg:col-span-4 space-y-8">
          {selectedGroupId && (
            <div className="bg-[#fbf9f4] border border-[#ddc0b9]/40 rounded-2xl overflow-hidden shadow-tactile">
              <div className="p-4 border-b border-[#ddc0b9]/30 bg-[#f0eee9]">
                <span className="font-journal-label text-[9px] text-[#8f361d] uppercase tracking-widest">
                  Continuous Trip Workspace
                </span>
                <h3 className="font-journal-headline text-xl text-[#1b1c19] mt-1">
                  Group command center
                </h3>
              </div>

              <div className="grid grid-cols-4 border-b border-[#ddc0b9]/30 text-[9px] font-journal-label uppercase tracking-wider">
                {[
                  { id: 'navigate', label: 'Nav' },
                  { id: 'chat', label: 'Chat' },
                  { id: 'care', label: 'Care' },
                  { id: 'location', label: 'Live' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setWorkflowTab(tab.id as typeof workflowTab)}
                    className={`py-3 transition-colors ${
                      workflowTab === tab.id
                        ? 'bg-[#8f361d] text-white'
                        : 'bg-[#fbf9f4] text-[#89726c] hover:bg-[#f0eee9]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {workflowTab === 'navigate' && (
                  trip && trip.days.length > 0 ? (
                    <ChecklistNavigation
                      days={trip.days.map(d => ({
                        dayNumber: d.dayNumber,
                        items: d.items.map((item, index) => ({
                          id: item.id,
                          name: item.name,
                          type: item.type,
                          time: `${String(9 + index * 2).padStart(2, '0')}:00`,
                          description: item.description || 'Planned group stop',
                          isCompleted: false,
                          estimatedDurationMinutes: item.estimatedDurationMinutes || 60,
                        }))
                      }))}
                      onNavigate={(itemId) => {
                        // find item across all days
                        const item = trip.days.flatMap(d => d.items).find(i => i.id === itemId);
                        if (item) setSelectedItem(item);
                      }}
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-[#89726c] bg-[#f0eee9]/50 rounded-xl">
                      Generate an itinerary to activate checklist navigation.
                    </div>
                  )
                )}

                {workflowTab === 'chat' && currentUserId && (
                  <div className="h-[440px]">
                    <GroupChat 
                      groupId={selectedGroupId} 
                      currentUserId={currentUserId} 
                      groupMembers={groupMembers}
                    />
                  </div>
                )}

                {workflowTab === 'care' && (
                  <div className="space-y-4">
                    <MedicalSharingConsent
                      key={`${selectedGroupId}-${groupDetails?.currentMembership?.medicalSharingConsent ? 'shared' : 'hidden'}`}
                      groupId={selectedGroupId}
                      initialConsent={!!groupDetails?.currentMembership?.medicalSharingConsent}
                      onConsentChange={() => loadGroupDetails(selectedGroupId)}
                    />
                    <GroupMedicalOverview
                      members={groupDetails?.members || []}
                      isAuthorized={!!groupDetails?.currentMembership?.medicalSharingConsent}
                    />
                  </div>
                )}

                {workflowTab === 'location' && currentUserId && (
                  <LiveLocationMap
                    groupId={selectedGroupId}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    initialCenter={
                      trip?.days?.[0]?.items?.find(item => item.lat && item.lng)
                        ? {
                            lat: trip.days[0].items.find(item => item.lat && item.lng)!.lat!,
                            lng: trip.days[0].items.find(item => item.lat && item.lng)!.lng!,
                          }
                        : { lat: 20.5937, lng: 78.9629 }
                    }
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Detailed Item Assistant details (simulating interactive map card details) */}
          {selectedItem && (
            <div className="bg-white border border-[#ddc0b9]/40 p-6 rounded-2xl shadow-tactile space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-journal-label text-[#8f361d] tracking-widest uppercase">
                  PLACE CARD
                </span>
                <button onClick={() => setSelectedItem(null)} className="text-xs text-[#89726c] hover:underline">
                  Close
                </button>
              </div>

              {itemPhoto(selectedItem)}

              <h4 className="font-journal-headline text-2xl text-[#1b1c19]">{selectedItem.name}</h4>
              <p className="text-xs text-[#56423d] leading-relaxed">{selectedItem.description}</p>

              {selectedItem.tips && (
                <div className="p-4 bg-[#f0eee9] rounded-xl border border-[#ddc0b9] text-xs italic text-[#56423d] leading-relaxed">
                  <strong>SahYatri Tip:</strong> {selectedItem.tips}
                </div>
              )}

              <div className="space-y-1.5 text-xs text-[#89726c]">
                <p><strong>Location:</strong> {selectedItem.locationName || 'Unknown Coordinates'}</p>
                {selectedItem.lat && selectedItem.lng && (
                  <p><strong>GPS:</strong> {selectedItem.lat.toFixed(4)}, {selectedItem.lng.toFixed(4)}</p>
                )}
              </div>

              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(selectedItem.name + ', ' + (selectedItem.locationName || ''))}/data=!3m1!4b1`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-[#f0eee9] text-[#8f361d] py-2.5 rounded-xl font-journal-label text-[10px] uppercase tracking-widest hover:bg-[#ddc0b9]/40 transition-colors border border-[#ddc0b9]"
              >
                📸 VIEW ALL PHOTOS ON GOOGLE MAPS
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedItem.name + ', ' + (selectedItem.locationName || ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-[#8f361d] text-white py-2.5 rounded-xl font-journal-label text-[10px] uppercase tracking-widest hover:bg-[#af4d32] transition-colors"
              >
                Open in Google Maps
              </a>
            </div>
          )}

          {/* Cooperative Route Radar Component */}
          {trip && (
            <CooperativeRouteRadar
              tripId={trip.id}
              groupId={selectedGroupId}
              currentDayNumber={
                selectedItem 
                  ? trip.days.find(d => d.items.some(i => i.id === selectedItem.id))?.dayNumber || 1 
                  : trip.days[0]?.dayNumber || 1
              }
            />
          )}

        </div>
      </main>

      <BottomNavBar />
    </div>
  );
}

// Utility to display item location — uses Google Maps embed showing real place view
function itemPhoto(item: ItineraryItem) {
  const query = encodeURIComponent(
    item.name + (item.locationName ? ', ' + item.locationName : '')
  );
  return (
    <div className="w-full h-48 rounded-xl shadow-md border border-[#ddc0b9]/20 overflow-hidden">
      <iframe
        src={`https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near`}
        className="w-full h-full border-0"
        loading="lazy"
        title={`${item.name} on Google Maps`}
        allowFullScreen
      />
    </div>
  );
}

export default function Itinerary() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex items-center justify-center font-sans">
        <span className="font-journal-headline text-2xl text-[#89726c] italic animate-pulse">
          Opening the travel journal...
        </span>
      </div>
    }>
      <ItineraryContent />
    </Suspense>
  );
}
