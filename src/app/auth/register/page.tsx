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

          <div className="mt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-[#ddc0b9]/30"></div>
              <span className="font-journal-label text-[9px] text-[#89726c]">OR CONTINUE WITH</span>
              <div className="h-px flex-1 bg-[#ddc0b9]/30"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  import('next-auth/react').then(({ signIn }) => signIn('google', { callbackUrl: '/dashboard' }));
                }}
                className="flex items-center justify-center gap-2 border border-[#ddc0b9]/40 py-3 rounded-lg font-journal-body text-xs hover:bg-[#f0eee9] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.58 15.02 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.87 3a6.98 6.98 0 0 1 6.89-5.68z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44a5.52 5.52 0 0 1-2.4 3.62l3.73 2.89c2.18-2 3.72-4.96 3.72-8.61z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.11 14.72A7.02 7.02 0 0 1 4.7 12c0-.95.16-1.87.41-2.72L1.24 6.28A11.96 11.96 0 0 0 0 12c0 2.08.53 4.04 1.24 5.72l3.87-3z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.9l-3.73-2.89a6.98 6.98 0 0 1-10.45-3.8l-3.9 3.02C3.86 20.26 7.6 23 12 23z"
                  />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 border border-[#ddc0b9]/40 py-3 rounded-lg font-journal-body text-xs hover:bg-[#f0eee9] transition-colors opacity-50 cursor-not-allowed"
                disabled
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.99.08 2.16-.52 2.82-1.33z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </div>

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
