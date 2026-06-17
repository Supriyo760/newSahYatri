'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('other');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          age: Number(age),
          gender,
          nationality: nationality.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (Array.isArray(resData.error)) {
          const messages = resData.error.map((issue: any) => {
            const field = issue.path.join('.');
            const fieldFriendly = field === 'password' ? 'Passcode' : field.charAt(0).toUpperCase() + field.slice(1);
            if (issue.code === 'too_small' && field === 'password') {
              return 'Passcode must be at least 8 characters long';
            }
            return `${fieldFriendly}: ${issue.message}`;
          });
          throw new Error(messages.join('. '));
        }
        throw new Error(typeof resData.error === 'string' ? resData.error : 'Failed to register');
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="paper-texture min-h-screen text-[#1b1c19] flex items-center justify-center p-6 md:p-16 relative overflow-hidden">
      {/* Atmospheric Background Image */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        <img
          className="w-full h-full object-cover select-none"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUPKlMQQ79O0i6x_eeImu1Za0ycMLPPeLb4esKJzsn8bnRsdy5o-DVFiPyKA-xPFKk9_AmmivcLPVoy9IACHv64mWOvIgpjUOu_VF0cA3GuIcNEh_IRjlo2ecz29DMVmODuCwSpM--Bg0x9Aoi9lWNalXYwCR72I5QJr3JULa6013IVI9NVgTwYEkWz3lCUuS39sxyCmdXMSAIbIaHQtHernG5afxfKMEGl0MldJoLbH1yyjZVusdIdozNeRFUeryRdfoXyx8r6tU"
          alt="Ancient peaks background"
        />
      </div>

      {/* Decorative Corner Elements */}
      <div className="fixed top-0 left-0 w-32 h-32 border-t border-l border-[#ddc0b9]/20 m-8 pointer-events-none hidden md:block"></div>
      <div className="fixed bottom-0 right-0 w-32 h-32 border-b border-r border-[#ddc0b9]/20 m-8 pointer-events-none hidden md:block"></div>

      {/* Main Auth Canvas */}
      <main className="relative z-10 w-full max-w-[480px] my-8">
        {/* Logo Anchor */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="font-journal-headline text-3xl text-[#8f361d] tracking-tight mb-2 hover:opacity-85 transition-opacity">
            SahYatri
          </Link>
          <div className="h-px w-12 bg-[#ddc0b9] opacity-50"></div>
        </div>

        {/* Sign Up Card */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-10 journal-shadow border border-[#ddc0b9]/30 rounded-2xl">
          <header className="mb-8 text-center">
            <h1 className="font-journal-headline text-4xl text-[#8f361d] mb-2">Begin your story</h1>
            <p className="font-journal-body text-xs text-[#56423d] italic">Every legend starts with a single entry.</p>
          </header>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] p-3 rounded-lg text-center text-xs font-semibold border border-[#ba1a1a]/20 mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-[#d1e9d3] text-[#435848] p-3 rounded-lg text-center text-xs font-semibold border border-[#435848]/20 mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <label className="font-journal-label text-[10px] text-[#89726c] block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Aria Chen"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#ddc0b9] focus:ring-0 focus:border-[#8f361d] px-0 py-1.5 font-journal-body text-sm placeholder:text-[#ddc0b9]/60 transition-colors focus:outline-none"
                required
              />
            </div>

            <div className="relative group">
              <label className="font-journal-label text-[10px] text-[#89726c] block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="aria@explorer.com"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#ddc0b9] focus:ring-0 focus:border-[#8f361d] px-0 py-1.5 font-journal-body text-sm placeholder:text-[#ddc0b9]/60 transition-colors focus:outline-none"
                required
              />
            </div>

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
              />
            </div>

            <div className="relative group">
              <label className="font-journal-label text-[10px] text-[#89726c] block mb-1">Chosen Passcode</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#ddc0b9] focus:ring-0 focus:border-[#8f361d] px-0 py-1.5 font-journal-body text-sm placeholder:text-[#ddc0b9]/60 transition-colors focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8f361d] text-white font-journal-label text-xs py-4 tracking-widest hover:bg-[#af4d32] active:scale-[0.98] transition-all journal-shadow rounded-xl mt-4"
            >
              {loading ? 'OPENING JOURNAL...' : 'OPEN THE JOURNAL'}
            </button>
          </form>

          <footer className="mt-8 pt-6 border-t border-[#ddc0b9]/20 text-center">
            <Link href="/auth/login" className="font-journal-body text-xs text-[#8f361d] hover:underline cursor-pointer">
              Already have an entry? <span className="font-bold underline">Welcome back</span>
            </Link>
          </footer>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="h-px w-24 bg-[#ddc0b9]/40 mb-4"></div>
          <p className="font-journal-headline text-lg text-[#56423d] italic opacity-60">&quot;Your next chapter starts here.&quot;</p>
        </div>
      </main>
    </div>
  );
}
