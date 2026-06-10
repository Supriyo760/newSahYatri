'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

function TiltCard({ children, className = '', intensity = 15 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, left: '0%', top: '0%' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const px = (mouseX / width) - 0.5;
    const py = (mouseY / height) - 0.5;

    const rotateY = px * intensity; 
    const rotateX = -py * intensity;

    setTransformStyle(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setGlareStyle({
      opacity: 0.15,
      left: `${(mouseX / width) * 100}%`,
      top: `${(mouseY / height) * 100}%`,
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlareStyle(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden transition-all duration-300 ease-out select-none cursor-pointer ${className}`}
      style={{
        transform: transformStyle,
        transformStyle: 'preserve-3d',
      }}
    >
      <div 
        className="absolute pointer-events-none rounded-full blur-[80px] w-[180px] h-[180px] bg-white transition-opacity duration-300"
        style={{
          opacity: glareStyle.opacity,
          left: glareStyle.left,
          top: glareStyle.top,
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      />
      <div className="h-full w-full" style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </div>
  );
}

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

function ScrollReveal({ children, className = '', delayMs = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    const el = ref.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98]'
      } ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const bgRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const compassRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  const scrollTarget = useRef(0);
  const scrollCurrent = useRef(0);
  const mouseTarget = useRef({ 
    x: 0, 
    y: 0, 
    screenX: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, 
    screenY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 
  });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const needleAngleCurrent = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      scrollTarget.current = window.scrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5,
        screenX: e.clientX,
        screenY: e.clientY,
      };
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let animationFrameId: number;

    const updateParallax = () => {
      // Lerping coordinates for absolute buttery-smooth motion
      scrollCurrent.current += (scrollTarget.current - scrollCurrent.current) * 0.08;
      mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * 0.08;
      mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * 0.08;

      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(${mouseCurrent.current.x * -20}px, ${mouseCurrent.current.y * -20 + scrollCurrent.current * 0.15}px, 0) scale(1.1)`;
      }
      if (midRef.current) {
        midRef.current.style.transform = `translate3d(${mouseCurrent.current.x * 15}px, ${mouseCurrent.current.y * 15 + scrollCurrent.current * 0.08}px, 0) scale(1.05)`;
      }
      if (fgRef.current) {
        fgRef.current.style.transform = `translate3d(${mouseCurrent.current.x * 12}px, ${mouseCurrent.current.y * 12 + scrollCurrent.current * -0.05}px, 0)`;
      }
      if (indicatorRef.current) {
        const opacity = Math.max(0, 0.6 - scrollCurrent.current / 150);
        indicatorRef.current.style.opacity = opacity.toString();
        indicatorRef.current.style.transform = `translate3d(-50%, ${scrollCurrent.current * 0.3}px, 0)`;
      }

      // 1. Compass Dial Rotation on Scroll
      if (dialRef.current) {
        dialRef.current.style.transform = `rotate(${scrollCurrent.current * 0.12}deg)`;
      }

      // 2. Magnetic Compass Needle Pointing to Cursor
      if (compassRef.current && needleRef.current) {
        const rect = compassRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = mouseTarget.current.screenX - centerX;
        const dy = mouseTarget.current.screenY - centerY;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI) + 90;

        let diff = angleDeg - needleAngleCurrent.current;
        diff = ((diff + 180) % 360) - 180;
        needleAngleCurrent.current += diff * 0.1;
        needleRef.current.style.transform = `rotate(${needleAngleCurrent.current}deg)`;
      }

      // 3. Polaroid Parallax scrolling translation
      if (card1Ref.current) {
        card1Ref.current.style.transform = `translate3d(0, ${scrollCurrent.current * -0.15}px, 0)`;
      }
      if (card2Ref.current) {
        card2Ref.current.style.transform = `translate3d(0, ${scrollCurrent.current * -0.25}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(updateParallax);
    };

    updateParallax();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] overflow-x-hidden flex flex-col font-sans relative">
      <Header />

      {/* Hero Section */}
      <section className="relative h-[95vh] w-full flex items-center justify-center overflow-hidden bg-[#242522] text-white">
        {/* Layer 1: Vintage Map Background */}
        <div 
          ref={bgRef}
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2000&q=80')`,
            opacity: 0.12,
            mixBlendMode: 'overlay',
            willChange: 'transform',
          }}
        />

        {/* Interactive 3D Compass */}
        <div 
          ref={compassRef} 
          className="absolute w-[280px] h-[280px] md:w-[450px] md:h-[450px] pointer-events-none opacity-20 flex items-center justify-center z-10"
        >
          {/* Dial Ring (Rotates on scroll) */}
          <div ref={dialRef} className="absolute inset-0 transition-transform duration-75 ease-out">
            <svg viewBox="0 0 200 200" className="w-full h-full text-[#8f361d]">
              <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
              <text x="100" y="24" textAnchor="middle" className="font-journal-label text-[11px] fill-[#8f361d] font-bold">N</text>
              <text x="176" y="104" textAnchor="middle" className="font-journal-label text-[11px] fill-[#8f361d] font-bold">E</text>
              <text x="100" y="184" textAnchor="middle" className="font-journal-label text-[11px] fill-[#8f361d] font-bold">S</text>
              <text x="24" y="104" textAnchor="middle" className="font-journal-label text-[11px] fill-[#8f361d] font-bold">W</text>
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180;
                const length = i % 2 === 0 ? 8 : 4;
                const x1 = 100 + (90 - length) * Math.cos(angle);
                const y1 = 100 + (90 - length) * Math.sin(angle);
                const x2 = 100 + 90 * Math.cos(angle);
                const y2 = 100 + 90 * Math.sin(angle);
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.75" />
                );
              })}
            </svg>
          </div>
          {/* Needle (Points to cursor) */}
          <div className="absolute">
            <div ref={needleRef} className="w-10 h-40 md:w-12 md:h-48" style={{ transformOrigin: 'center center', willChange: 'transform' }}>
              <svg viewBox="0 0 40 160" className="w-full h-full">
                <polygon points="20,10 30,80 20,73" fill="#fdb55c" />
                <polygon points="20,10 10,80 20,73" fill="#d99336" />
                <polygon points="20,150 30,80 20,87" fill="#8f361d" />
                <polygon points="20,150 10,80 20,87" fill="#66200f" />
                <circle cx="20" cy="80" r="4" fill="#242522" />
                <circle cx="20" cy="80" r="1.5" fill="#fff" opacity="0.8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Floating Polaroids / Postcards Scrapbook Collage */}
        <div 
          ref={card1Ref} 
          className="absolute left-[4%] top-[18%] w-[180px] md:w-[240px] hidden sm:block z-20 pointer-events-auto"
          style={{ willChange: 'transform' }}
        >
          <TiltCard intensity={10} className="bg-white p-3 pb-5 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[#ddc0b9]/30 -rotate-3">
            <img 
              className="w-full aspect-square object-cover mb-3" 
              src="https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80" 
              alt="Himalayas campsite" 
            />
            <p className="font-journal-headline text-base text-[#56423d] italic text-center">Himalayan Sanctuary</p>
            <p className="font-journal-label text-[8px] text-[#89726c]/60 text-center tracking-wider mt-1">VOL. 01 // ENTRY #12</p>
          </TiltCard>
        </div>

        <div 
          ref={card2Ref} 
          className="absolute right-[4%] top-[25%] w-[180px] md:w-[240px] hidden sm:block z-20 pointer-events-auto"
          style={{ willChange: 'transform' }}
        >
          <TiltCard intensity={10} className="bg-white p-3 pb-5 rounded-sm shadow-[0_12px_36px_rgba(0,0,0,0.28)] border border-[#ddc0b9]/30 rotate-6">
            <img 
              className="w-full aspect-square object-cover mb-3" 
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80" 
              alt="Goa beach sunset" 
            />
            <p className="font-journal-headline text-base text-[#56423d] italic text-center">Goa&apos;s Emerald Veil</p>
            <p className="font-journal-label text-[8px] text-[#89726c]/60 text-center tracking-wider mt-1">VOL. 01 // ENTRY #45</p>
          </TiltCard>
        </div>

        {/* Layer 3: Organic floating dust particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes floatDust {
              0% { transform: translate(0, 0) rotate(0deg); }
              50% { transform: translate(20px, -25px) rotate(180deg); }
              100% { transform: translate(0, 0) rotate(360deg); }
            }
          `}} />
          {[...Array(15)].map((_, i) => {
            const speed = 6 + (i % 5) * 4;
            const delay = (i % 3) * -2;
            return (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#fdb55c] opacity-25 filter blur-[0.5px]"
                style={{
                  top: `${(i * 23) % 100}%`,
                  left: `${(i * 31) % 100}%`,
                  animation: `floatDust ${speed}s ease-in-out infinite alternate`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>

        {/* Foreground Content */}
        <div 
          ref={fgRef}
          className="relative z-20 text-center px-6 max-w-4xl mx-auto flex flex-col items-center"
          style={{
            willChange: 'transform',
          }}
        >
          <span className="font-journal-label text-[10px] uppercase tracking-[0.4em] mb-4 text-[#fdb55c] bg-[#8f361d]/20 px-4 py-1.5 rounded-full border border-[#8f361d]/30 backdrop-blur-md">
            SahYatri presents
          </span>
          <h2 className="font-journal-headline text-6xl md:text-8xl mb-8 italic text-[#fbf9f4] drop-shadow-lg tracking-tight select-none">
            Journey beyond the map.
          </h2>
          <p className="font-journal-body text-lg md:text-xl text-[#f0eee9] max-w-xl mb-10 leading-relaxed font-light drop-shadow">
            The intelligent, matchmaker-first travel network. Connect with compatible companions, plan journeys, and discover hidden sanctuaries together.
          </p>
          <Link
            href="/dashboard"
            className="group bg-[#8f361d] text-white px-12 py-4.5 rounded-full font-journal-label text-xs uppercase tracking-widest hover:bg-[#af4d32] transition-all shadow-tactile hover:shadow-[0_8px_30px_rgb(143,54,29,0.3)] active:scale-95 flex items-center gap-3"
          >
            <span>Begin Exploration</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </Link>
        </div>

        {/* Elegant scroll indicator */}
        <div 
          ref={indicatorRef}
          className="absolute bottom-10 left-1/2 flex flex-col items-center gap-2 opacity-60 z-20"
          style={{
            transform: 'translate3d(-50%, 0, 0)',
            willChange: 'transform, opacity',
          }}
        >
          <span className="font-journal-label text-[9px] tracking-[0.2em] uppercase">Scroll</span>
          <div className="w-[1px] h-10 bg-gradient-to-b from-[#fdb55c] to-transparent rounded-full animate-bounce" />
        </div>
      </section>

      {/* Journal Section: Introduction */}
      <section className="py-24 px-6 md:px-16 max-w-6xl mx-auto bg-[#fbf9f4]">
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <TiltCard className="w-full aspect-[4/5] rounded-2xl shadow-tactile group">
              <img
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt="Travel notebook"
                src="https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80"
              />
            </TiltCard>
            <div className="flex flex-col gap-6">
              <span className="font-journal-label text-[#8f361d] tracking-widest uppercase">
                The Journal — Vol. 01
              </span>
              <h3 className="font-journal-headline text-4xl text-[#8f361d] leading-tight">
                Travel isn&apos;t about the distance, but the depth of the encounter.
              </h3>
              <p className="font-journal-body text-base text-[#56423d] leading-relaxed">
                We believe in the slow reveal. In the quiet conversations with Himalayan monks and the scent of salt on a secluded beach. SahYatri is your curated companion for the soulful, the hidden, and the genuinely authentic.
              </p>
              <div className="h-[1px] bg-gradient-to-r from-transparent via-[#89726c] to-transparent my-6" />
              <p className="font-journal-body text-base italic text-[#89726c]">
                &ldquo;To travel is to discover that everyone is wrong about other countries.&rdquo; — Aldous Huxley
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Hidden Gems Section */}
      <section className="py-24 bg-[#f0eee9] px-6 md:px-16">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="flex justify-between items-end mb-16">
              <div>
                <span className="font-journal-label text-[#865300] tracking-widest uppercase">
                  Curated Discovery
                </span>
                <h2 className="font-journal-headline text-4xl text-[#8f361d] mt-2">
                  Hidden Gems
                </h2>
              </div>
              <Link
                href="/itinerary"
                className="font-journal-label text-[#8f361d] border-b border-[#8f361d] pb-1 hover:opacity-60 transition-opacity"
              >
                Explore Journeys
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8">
              <ScrollReveal delayMs={100}>
                <TiltCard className="relative overflow-hidden rounded-2xl group h-[450px]">
                  <img
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt="Banaras Ghats"
                    src="https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=1200&q=80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1b1c19]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 text-white">
                    <span className="font-journal-label text-xs opacity-80 text-[#fdb55c]">Spiritual</span>
                    <h4 className="font-journal-headline text-2xl mt-1">The Ghats of Banaras</h4>
                  </div>
                </TiltCard>
              </ScrollReveal>
            </div>
            <div className="md:col-span-4">
              <ScrollReveal delayMs={200}>
                <TiltCard className="relative overflow-hidden rounded-2xl group h-[450px]">
                  <img
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt="Hidden emerald lagoon"
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1b1c19]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 text-white">
                    <span className="font-journal-label text-xs opacity-80 text-[#fdb55c]">Sanctuary</span>
                    <h4 className="font-journal-headline text-2xl mt-1">Goa’s Emerald Veil</h4>
                  </div>
                </TiltCard>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Soulful Connections Section */}
      <section className="py-24 px-6 md:px-16 bg-[#fbf9f4]">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 order-2 md:order-1">
                <TiltCard intensity={5} className="bg-[#f0eee9] p-12 rounded-2xl relative shadow-tactile border border-[#ddc0b9]/30">
                  <span className="font-journal-headline text-7xl text-[#8f361d] absolute top-2 right-6 opacity-10">
                    &ldquo;
                  </span>
                  <h3 className="font-journal-headline text-xl md:text-2xl text-[#8f361d] mb-6 italic leading-relaxed">
                    &ldquo;सैर कर दुनिया की गाफ़िल, ज़िन्दगानी फिर कहाँ?<br/>ज़िन्दगी गर कुछ रही तो, नौजवानी फिर कहाँ?&rdquo;
                  </h3>
                  <div className="flex items-center gap-4">
                    <img
                      className="w-12 h-12 rounded-full object-cover border border-[#8f361d] bg-white"
                      alt="Rahul Sankrityayan"
                      src="https://upload.wikimedia.org/wikipedia/commons/6/66/Rahul_Sankrityayan_1993_stamp_of_India.jpg"
                    />
                    <div>
                      <p className="font-journal-body font-bold text-[#1b1c19]">Rahul Sankrityayan</p>
                      <p className="font-journal-label text-[10px] text-[#89726c] uppercase">Father of Indian Travelogue</p>
                    </div>
                  </div>
                </TiltCard>
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2">
                <TiltCard className="w-full h-[400px] rounded-2xl shadow-tactile overflow-hidden group">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt="Indian Thali"
                    src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80"
                  />
                </TiltCard>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Signature Journal Entry */}
      <section className="py-24 bg-[#fbf9f4] text-center px-6 border-t border-[#ddc0b9]/30">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <span className="font-journal-label text-[11px] text-[#89726c] uppercase tracking-[0.2em] mb-4">
              Entry #402 — 12.10.23
            </span>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#89726c] to-transparent w-24 my-6" />
            <h2 className="font-journal-headline text-3xl md:text-5xl text-[#8f361d] italic leading-tight">
              Your story is the only map you&apos;ll ever truly need.
            </h2>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#89726c] to-transparent w-24 my-6" />
            <p className="font-journal-body text-base text-[#89726c] max-w-md mx-auto mb-10">
              Join our circle of modern explorers and receive curated dispatches from the edges of the world.
            </p>
            <form className="w-full max-w-md flex flex-col gap-4">
              <input
                className="bg-[#f0eee9] border border-transparent py-4 px-4 rounded-xl focus:outline-none focus:border-[#8f361d]/50 focus:ring-1 focus:ring-[#8f361d]/30 text-center font-journal-body text-[#8f361d] placeholder:text-[#89726c]/50 transition-all"
                placeholder="Your email address"
                type="email"
                required
              />
              <button className="bg-[#8f361d] text-white py-4 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-all shadow-tactile">
                Subscribe to Dispatches
              </button>
            </form>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="bg-[#e4e2dd] py-16 px-6 md:px-16 text-[#56423d] mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h2 className="font-journal-headline text-3xl text-[#8f361d] tracking-tight mb-4">SahYatri</h2>
            <p className="font-journal-body text-sm max-w-xs">
              Crafting soulful journeys for the modern explorer. Based in Goa, wandering everywhere.
            </p>
          </div>
          <div>
            <h4 className="font-journal-label text-xs text-[#8f361d] uppercase mb-6">Navigation</h4>
            <ul className="flex flex-col gap-4 font-journal-body text-sm">
              <li>
                <Link href="/" className="hover:text-[#8f361d] transition-colors">The Journal</Link>
              </li>
              <li>
                <Link href="/discover" className="hover:text-[#8f361d] transition-colors">Discover Matches</Link>
              </li>
              <li>
                <Link href="/itinerary" className="hover:text-[#8f361d] transition-colors">Bespoke Journeys</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-journal-label text-xs text-[#8f361d] uppercase mb-6">Security</h4>
            <ul className="flex flex-col gap-4 font-journal-body text-sm">
              <li>
                <Link href="/safety" className="hover:text-[#8f361d] transition-colors">Emergency SOS Dashboard</Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-[#8f361d] transition-colors">Medical Profile</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-[#ddc0b9] flex flex-col md:flex-row justify-between gap-4 font-journal-label text-[10px] uppercase tracking-widest text-[#89726c]">
          <p>&copy; 2026 SahYatri. All Rights Reserved.</p>
          <div className="flex gap-8">
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Discovery</Link>
          </div>
        </div>
      </footer>

      <BottomNavBar />
    </div>
  );
}
