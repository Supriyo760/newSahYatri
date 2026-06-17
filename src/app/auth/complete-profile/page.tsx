'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('other');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number(age),
          gender,
          nationality: nationality.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to complete profile');
      }

      // Update the session to reflect that needsCompletion is now false
      await update({ needsCompletion: false });
      
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paper-texture min-h-screen text-[#1b1c19] flex items-center justify-center p-6 md:p-16 relative overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        <img
          className="w-full h-full object-cover select-none"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUPKlMQQ79O0i6x_eeImu1Za0ycMLPPeLb4esKJzsn8bnRsdy5o-DVFiPyKA-xPFKk9_AmmivcLPVoy9IACHv64mWOvIgpjUOu_VF0cA3GuIcNEh_IRjlo2ecz29DMVmODuCwSpM--Bg0x9Aoi9lWNalXYwCR72I5QJr3JULa6013IVI9NVgTwYEkWz3lCUuS39sxyCmdXMSAIbIaHQtHernG5afxfKMEGl0MldJoLbH1yyjZVusdIdozNeRFUeryRdfoXyx8r6tU"
          alt="Background"
        />
      </div>

      <main className="relative z-10 w-full max-w-[480px]">
        <div className="flex flex-col items-center mb-8">
          <h1 className="font-journal-headline text-3xl text-[#8f361d] tracking-tight mb-2">
            SahYatri
          </h1>
          <div className="h-px w-12 bg-[#ddc0b9] opacity-50"></div>
        </div>

        <div className="w-full bg-white/80 backdrop-blur-sm p-10 journal-shadow border border-[#ddc0b9]/30 rounded-2xl">
          <header className="mb-8 text-center">
            <h2 className="font-journal-headline text-3xl text-[#8f361d] mb-2">Complete Your Profile</h2>
            <p className="font-journal-body text-xs text-[#56423d] italic">
              Hello {session?.user?.name?.split(' ')[0] || 'Traveler'}! Just a few more details to pack before we begin.
            </p>
          </header>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-center text-xs font-semibold border border-[#ba1a1a]/20 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(Number(e.target.value))}
                  min="18"
                  max="100"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#ddc0b9] focus:ring-0 focus:border-[#8f361d] px-0 py-1.5 font-journal-body text-sm transition-colors focus:outline-none"
                  required
                />
              </div>

              <div className="relative group">
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#ddc0b9] focus:ring-0 focus:border-[#8f361d] px-0 py-1.5 font-journal-body text-sm transition-colors focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="relative group">
              <label className="font-journal-label text-[10px] text-[#89726c] block mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                placeholder="e.g. Indian"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#ddc0b9] focus:ring-0 focus:border-[#8f361d] px-0 py-1.5 font-journal-body text-sm placeholder:text-[#ddc0b9]/60 transition-colors focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8f361d] text-white font-journal-label text-xs py-4 tracking-widest hover:bg-[#af4d32] active:scale-[0.98] transition-all journal-shadow rounded-xl mt-4"
            >
              {loading ? 'SAVING...' : 'FINISH REGISTRATION'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
