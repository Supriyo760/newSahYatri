import React from 'react';
import { db } from '@/db';
import { users, personalityProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getCompatibility } from '@/lib/matching/compatibility';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  const { id } = await params;

  // 1. Fetch the requested profile
  const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!targetUser) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans">
        <Header />
        <main className="flex-1 pt-32 text-center px-6">
          <h2 className="font-journal-headline text-3xl text-[#ba1a1a]">Profile Not Found</h2>
          <p className="text-sm text-[#89726c] mt-4">This traveler does not exist or has deleted their account.</p>
          <Link href="/discover" className="mt-6 inline-block bg-[#8f361d] text-white px-6 py-2.5 rounded-full font-journal-label text-[10px] tracking-wider uppercase hover:bg-[#af4d32] transition-colors">
            Back to Discover
          </Link>
        </main>
        <BottomNavBar />
      </div>
    );
  }

  const [targetProfile] = await db.select().from(personalityProfiles).where(eq(personalityProfiles.userId, id)).limit(1);
  const [myProfile] = await db.select().from(personalityProfiles).where(eq(personalityProfiles.userId, session.user.id)).limit(1);

  // If viewing someone else, compute compatibility
  let matchDetails = null;
  let aiAdjustedScore = 0;
  
  if (myProfile && targetProfile && id !== session.user.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchDetails = await getCompatibility(myProfile as any, targetProfile as any);
    
    // Simulate API call to ML service for conflict prediction
    let conflictProbability = 0.5;
    try {
      const mlRes = await fetch('http://127.0.0.1:8000/api/ml/matching/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_a_features: myProfile.embeddingVector || [],
          user_b_features: targetProfile.embeddingVector || [],
        }),
      });
      if (mlRes.ok) {
        const mlData = await mlRes.json();
        conflictProbability = mlData.conflict_probability;
      }
    } catch {
      // Ignored
    }
    
    aiAdjustedScore = Math.round(
      (matchDetails.overallScore * 0.8) +
      (100 * 0.1) +
      ((1 - conflictProbability) * 10)
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 pt-24 max-w-4xl w-full mx-auto px-6">
        <div className="bg-white border-2 border-[#ddc0b9] p-6 md:p-8 rounded-3xl w-full space-y-8 shadow-2xl relative">
          
          <div className="flex justify-between items-center border-b border-[#ddc0b9]/40 pb-4">
            <span className="font-journal-label text-xs text-[#8f361d] tracking-widest uppercase font-bold">
              COMPREHENSIVE TRAVELER BIODATA
            </span>
            <Link href="/discover" className="text-xs text-[#89726c] hover:text-[#ba1a1a] font-bold transition-colors">
              BACK
            </Link>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center bg-[#f0eee9]/40 p-6 rounded-2xl border border-[#ddc0b9]/30 shadow-tactile">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-[#8f361d] shadow-md relative bg-[#e4e2dd] shrink-0">
              <img
                src={targetUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                alt={targetUser.name || 'Traveler'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3 text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h3 className="font-journal-headline text-4xl text-[#1b1c19] italic">
                  {targetUser.name || 'Explorer'}, {targetUser.age || '20s'}
                </h3>
                {matchDetails && (
                  <span className="bg-[#8f361d] text-white text-xs font-bold px-4 py-1.5 rounded-full text-center tracking-wider shadow-sm">
                    {aiAdjustedScore}% COMPATIBLE
                  </span>
                )}
              </div>
              <p className="font-journal-label text-xs text-[#89726c] uppercase">
                {targetUser.nationality || 'Wanderer'} &bull; {targetUser.gender || 'Other'}
              </p>
              
              {targetProfile ? (
                <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                  <span className="px-3 py-1 rounded-full bg-[#fdb55c]/10 border border-[#fdb55c]/20 text-[10px] font-journal-label text-[#865300] uppercase font-bold">
                    {targetProfile.travelStyle} Style
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#8f361d]/10 border border-[#8f361d]/20 text-[10px] font-journal-label text-[#8f361d] uppercase font-bold">
                    Budget: {targetProfile.budgetLevel || 'Average'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[#ba1a1a] italic mt-2">This user hasn&apos;t completed their travel questionnaire yet.</p>
              )}
            </div>
          </div>

          {targetProfile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6 bg-white p-6 rounded-2xl border border-[#ddc0b9]/30 shadow-sm">
                <h4 className="font-journal-headline text-2xl text-[#8f361d] border-b border-[#ddc0b9]/40 pb-2">
                  Personality Traits
                </h4>
                <div className="space-y-4">
                  {[
                    { label: 'Openness', val: targetProfile.openness ?? 0.5 },
                    { label: 'Conscientiousness', val: targetProfile.conscientiousness ?? 0.5 },
                    { label: 'Extraversion', val: targetProfile.extraversion ?? 0.5 },
                    { label: 'Agreeableness', val: targetProfile.agreeableness ?? 0.5 },
                    { label: 'Neuroticism', val: targetProfile.neuroticism ?? 0.5 },
                  ].map(trait => (
                    <div key={trait.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-[#56423d]">
                        <span>{trait.label}</span>
                        <span>{Math.round(trait.val * 100)}%</span>
                      </div>
                      <div className="w-full bg-[#f0eee9] h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#8f361d] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${trait.val * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 flex flex-col justify-between">
                
                {matchDetails && (
                  <div className="bg-[#f0eee9]/40 p-6 rounded-2xl border border-[#ddc0b9]/30 space-y-4">
                    <h4 className="font-journal-headline text-xl text-[#8f361d] border-b border-[#ddc0b9]/30 pb-2">
                      Similarity Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      {[
                        { label: 'Personality', val: matchDetails.personalityScore },
                        { label: 'Travel Style', val: matchDetails.travelStyleScore },
                        { label: 'Food Vibe', val: matchDetails.foodScore },
                        { label: 'Budget', val: matchDetails.budgetScore },
                      ].map(metric => (
                        <div key={metric.label} className="bg-white p-3 rounded-xl border border-[#ddc0b9]/20 shadow-sm">
                          <span className="text-[10px] text-[#89726c] block uppercase font-bold mb-1">{metric.label}</span>
                          <span className="font-journal-headline text-xl text-[#8f361d]">
                            {metric.val}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#f0eee9]/40 p-6 rounded-2xl border border-[#ddc0b9]/30 space-y-3">
                  <h4 className="font-journal-label text-[11px] text-[#89726c] tracking-wider block font-bold">
                    FOOD RESTRICTIONS / VIBE
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {targetProfile.foodPreferences ? (
                      Object.entries(targetProfile.foodPreferences)
                        .filter(([, enabled]) => !!enabled)
                        .map(([key]) => {
                          const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                          return (
                            <span key={key} className="px-2.5 py-1 rounded bg-[#b5ccb8]/20 border border-[#b5ccb8]/40 text-[10px] font-journal-label text-[#435848] uppercase font-bold shadow-sm">
                              {formattedKey}
                            </span>
                          );
                        })
                    ) : (
                      <span className="text-sm text-[#89726c] italic">No restrictions listed</span>
                    )}
                    {(!targetProfile.foodPreferences || Object.values(targetProfile.foodPreferences).filter(Boolean).length === 0) && (
                      <span className="text-xs text-[#89726c] italic">Omnivore (Open to anything)</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {targetProfile && (
            <div className="space-y-6">
              <div className="p-6 bg-[#f0eee9]/30 rounded-2xl border border-[#ddc0b9]/30 space-y-3 shadow-sm">
                <h4 className="font-journal-label text-[11px] text-[#89726c] tracking-wider block font-bold">
                  EXPEDITION INTERESTS
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {(Array.isArray(targetProfile.interests) ? targetProfile.interests : []).length > 0 ? (
                    (targetProfile.interests || []).map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-1.5 rounded-full bg-white border border-[#ddc0b9]/40 text-[11px] font-journal-label text-[#56423d] uppercase font-bold shadow-sm"
                      >
                        {interest}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#89726c] italic">Flexible explorer, open to suggestions.</span>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}
