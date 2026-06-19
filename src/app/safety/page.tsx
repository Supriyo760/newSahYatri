'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import Link from 'next/link';

interface Hospital {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  isOpen: boolean | null;
}

interface MedicalProfile {
  bloodType: string;
  firstAidNotes: string | null;
  allergies: Array<{ allergen: string; severity: string; response: string; hasEpipen: boolean }>;
  conditions: Array<{ name: string; severity: string; notes: string }>;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string; isPrimary: boolean }>;
}

export default function Safety() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: -8.8139, lng: 115.0884 });
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [protocols, setProtocols] = useState<string[][]>([]);
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile | null>(null);
  
  // SOS State
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sosActivated, setSosActivated] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Medication Tracker State
  const [medications, setMedications] = useState<any[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00');

  const handleToggleMed = (id: string) => {
    setMedications(medications.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName) return;
    const timeFormatted = new Date(`2000-01-01T${newMedTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setMedications([
      ...medications,
      {
        id: Date.now().toString(),
        name: newMedName,
        dosage: newMedDosage || '1 dose',
        time: timeFormatted,
        taken: false
      }
    ]);
    setNewMedName('');
    setNewMedDosage('');
  };

  // Removed AI Chatbot State and methods per MVP constraints

  // Get current position
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation failed, defaulting to Uluwatu, Bali coords:', err);
          // Fallback to Bali coordinates
          setCoords({ lat: -8.8139, lng: 115.0884 });
        }
      );
    }

    // Load active groups
    async function loadGroups() {
      try {
        const res = await fetch('/api/groups');
        const data = await res.json();
        if (res.ok && data.data) {
          setGroups(data.data);
          if (data.data.length > 0) {
            setSelectedGroupId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load groups for SOS:', err);
      }
    }

    // Load user's medical profile
    async function loadMedicalProfile() {
      try {
        const res = await fetch('/api/medical/profile');
        const data = await res.json();
        if (res.ok && data.data) {
          setMedicalProfile(data.data);
        }
      } catch (err) {
        console.error('Failed to load medical profile:', err);
      }
    }

    loadGroups();
    loadMedicalProfile();
  }, []);

  const triggerSOS = async () => {
    if (!coords) return;
    setSosSending(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          groupId: selectedGroupId || undefined,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to alert services');
      setHospitals(resData.data.hospitals || []);
      setProtocols(resData.data.firstAidProtocols || []);
      setSosActivated(true);
    } catch (err: any) {
      setErrorMessage(`SOS Transmission error: ${err.message}`);
    } finally {
      setSosSending(false);
    }
  };

  const handleMouseDown = () => {
    setHolding(true);
    setProgress(0);
    
    // Progress bar animation (3000ms total)
    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / 3000) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressTimerRef.current!);
      }
    }, 50);

    holdTimerRef.current = setTimeout(() => {
      triggerSOS();
      setHolding(false);
      setProgress(100);
    }, 3000);
  };

  const handleMouseUp = () => {
    setHolding(false);
    setProgress(0);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 pt-24 max-w-7xl w-full mx-auto px-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#ddc0b9]/40 pb-4 mb-10">
          <div>
            <span className="font-journal-label text-[10px] text-[#ba1a1a] tracking-widest uppercase">
              CRITICAL LIFE SAFETY
            </span>
            <h1 className="font-journal-headline text-4xl">Security Desk & Emergency SOS</h1>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-xs text-[#89726c]">Monitor location of group:</span>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="bg-[#f0eee9] border border-[#ddc0b9] rounded-xl p-2 px-4 text-xs font-semibold"
            >
              <option value="">None Selected</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Errors Banner */}
        {errorMessage && (
          <div className="bg-[#ffdad6] text-[#93000a] p-4 rounded-xl border border-[#ffdad6]/40 text-center text-xs font-semibold mb-6">
            {errorMessage}
          </div>
        )}

        {/* Split Grid: SOS activator & Medical record */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* SOS Activator (col-span-5) */}
          <div className="lg:col-span-5 bg-[#ffdad6]/10 border border-[#ffdad6]/20 p-8 rounded-2xl shadow-tactile flex flex-col items-center justify-center text-center space-y-6">
            <span className="bg-[#ba1a1a] text-white text-[9px] font-journal-label px-3.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
              SOS Broadcast Node
            </span>
            <h3 className="font-journal-headline text-3xl text-[#ba1a1a]">Secure SOS Activator</h3>
            <p className="text-xs text-[#89726c] max-w-sm leading-relaxed">
              Press and hold the SOS button below for 3 seconds. Release to cancel. When activated, we broadcast your exact coordinates to tourist police and nearby medical points.
            </p>

            {/* Interactive SOS button */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              {/* Outer pulsing rings */}
              <div className={`absolute inset-0 rounded-full bg-[#ba1a1a]/10 ${holding ? 'animate-ping' : ''}`} />
              <div className="absolute inset-4 rounded-full bg-[#ba1a1a]/5" />

              <button
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                className="relative z-10 w-36 h-36 rounded-full bg-[#ba1a1a] text-white shadow-2xl flex flex-col items-center justify-center select-none active:scale-95 transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="font-journal-label text-[10px] tracking-widest uppercase">
                  {sosSending ? 'TRANSMITTING...' : holding ? 'HOLD SECURE...' : 'HOLD FOR SOS'}
                </span>
              </button>

              {/* Progress ring outline */}
              {holding && (
                <svg className="absolute top-0 left-0 w-full h-full rotate-[-90deg] pointer-events-none">
                  <circle
                    cx="104"
                    cy="104"
                    r="85"
                    stroke="#ba1a1a"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={534}
                    strokeDashoffset={534 - (534 * progress) / 100}
                    className="transition-all duration-75"
                  />
                </svg>
              )}
            </div>

            <div className="w-full bg-[#f0eee9] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#ba1a1a] h-2.5 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            {coords && (
              <span className="text-[10px] font-mono text-[#89726c]">
                GPS Coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </span>
            )}
          </div>

          {/* Medical Identity & Alerts card (col-span-7) */}
          <div className="lg:col-span-7 bg-[#f0eee9] p-8 rounded-2xl shadow-tactile space-y-6">
            <div className="flex justify-between items-start border-b border-[#ddc0b9]/40 pb-2">
              <span className="font-journal-label text-[10px] text-[#8f361d] tracking-widest uppercase">
                EMERGENCY MEDICAL IDENTITY
              </span>
              <Link href="/onboarding" className="text-xs text-[#8f361d] hover:underline">
                EDIT DETAILS
              </Link>
            </div>

            {medicalProfile ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[9px] text-[#89726c] uppercase block">Blood Type</span>
                    <span className="font-journal-headline text-3xl text-[#ba1a1a] font-bold">
                      {medicalProfile.bloodType || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#89726c] uppercase block">Emergency Contact</span>
                    <span className="text-xs font-semibold block text-[#1b1c19]">
                      {medicalProfile.emergencyContacts?.[0]?.name || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#89726c] uppercase block">Relationship</span>
                    <span className="text-xs block text-[#89726c]">
                      {medicalProfile.emergencyContacts?.[0]?.relationship || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#89726c] uppercase block">Contact Phone</span>
                    <span className="text-xs block font-semibold text-[#8f361d]">
                      {medicalProfile.emergencyContacts?.[0]?.phone || 'Not provided'}
                    </span>
                  </div>
                </div>

                {/* Conditions list */}
                {medicalProfile.conditions?.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-journal-label text-[9px] text-[#89726c] uppercase">LOGGED CONDITIONS</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medicalProfile.conditions.map((cond, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-[#ddc0b9]/20 text-xs">
                          <span className="font-semibold block text-[#ba1a1a]">{cond.name}</span>
                          <p className="text-[10px] text-[#89726c] mt-1">{cond.notes || 'No notes specified.'}</p>
                          <span className="inline-block mt-2 bg-[#ffdad6] text-[#93000a] text-[8px] font-bold px-2 py-0.5 rounded-full">
                            Severity: {cond.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergies details */}
                {medicalProfile.allergies?.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-journal-label text-[9px] text-[#89726c] uppercase">ALLERGIES</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medicalProfile.allergies.map((all, idx) => (
                        <div key={idx} className="bg-[#ba1a1a]/5 p-4 rounded-xl border border-[#ba1a1a]/10 text-xs">
                          <span className="font-semibold block text-[#ba1a1a]">{all.allergen}</span>
                          <p className="text-[10px] text-[#89726c] mt-1">Reaction: {all.response || 'Severe swelling/shock'}</p>
                          <div className="flex gap-2 items-center mt-2">
                            <span className="bg-[#ffdad6] text-[#93000a] text-[8px] font-bold px-2 py-0.5 rounded-full">
                              Severity: {all.severity}
                            </span>
                            {all.hasEpipen && (
                              <span className="bg-[#ba1a1a] text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                                CARRIES EPIPEN
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medication Intake Log & Schedule panel */}
                <div className="space-y-4 pt-4 border-t border-[#ddc0b9]/40">
                  <div className="flex justify-between items-center">
                    <span className="font-journal-label text-[9px] text-[#89726c] uppercase">MEDICATION INTAKE LOG</span>
                    <span className="text-[10px] font-semibold text-[#8f361d]">
                      {medications.filter(m => m.taken).length} / {medications.length} Done
                    </span>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2.5">
                    {medications.map(med => (
                      <div
                        key={med.id}
                        onClick={() => handleToggleMed(med.id)}
                        className={`p-3.5 rounded-xl border flex justify-between items-center transition-all cursor-pointer select-none active:scale-[0.99] ${
                          med.taken
                            ? 'bg-[#d1e9d3]/20 border-[#435848]/30 opacity-75 line-through text-[#89726c]'
                            : 'bg-white border-[#ddc0b9]/30 hover:shadow-tactile'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={med.taken}
                            onChange={() => {}} // toggled via parent click
                            className="w-4 h-4 rounded text-[#8f361d] focus:ring-[#8f361d] border-[#ddc0b9]"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-[#1b1c19] block">{med.name}</span>
                            <span className="text-[10px] text-[#89726c]">{med.dosage}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[#89726c]">{med.time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick add form */}
                  <form onSubmit={handleAddMed} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2">
                    <input
                      type="text"
                      placeholder="Medication Name"
                      value={newMedName}
                      onChange={e => setNewMedName(e.target.value)}
                      className="md:col-span-5 bg-white border border-[#ddc0b9]/40 rounded-lg p-2 text-xs"
                      required
                    />
                    <input
                      type="text"
                      placeholder="e.g. 500mg, 1 tab"
                      value={newMedDosage}
                      onChange={e => setNewMedDosage(e.target.value)}
                      className="md:col-span-3 bg-white border border-[#ddc0b9]/40 rounded-lg p-2 text-xs"
                    />
                    <input
                      type="time"
                      value={newMedTime}
                      onChange={e => setNewMedTime(e.target.value)}
                      className="md:col-span-2 bg-white border border-[#ddc0b9]/40 rounded-lg p-2 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="md:col-span-2 bg-[#8f361d] text-white py-2 rounded-lg font-journal-label text-[9px] uppercase tracking-wider hover:bg-[#af4d32] transition-colors cursor-pointer active:scale-95 text-center font-bold"
                    >
                      ADD
                    </button>
                  </form>
                </div>

                {/* Insurance details */}
                <div className="space-y-2 pt-4 border-t border-[#ddc0b9]/40">
                  <span className="font-journal-label text-[9px] text-[#89726c] uppercase">LOGGED COVERAGE</span>
                  <div className="p-4 bg-white rounded-xl border border-[#ddc0b9]/30 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#1b1c19] block">Global Nomad Premium Care</span>
                      <span className="text-[10px] text-[#89726c]">ID Number: #SAH-9928-BALI</span>
                    </div>
                    <span className="bg-[#b5ccb8] text-[#0c1f13] text-[9px] font-bold px-3 py-1 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-xs text-[#89726c] italic">No secure medical data logged for this traveler.</p>
                <Link href="/onboarding" className="text-xs text-[#8f361d] font-bold underline mt-2 inline-block">
                  Onboard Medical Card Now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* SOS Results Dashboard */}
        {sosActivated && (
          <section className="bg-white border border-[#ba1a1a]/30 p-8 rounded-2xl shadow-2xl space-y-8 animate-fade-in mb-16">
            <div className="flex items-center gap-3 border-b border-[#ba1a1a]/20 pb-4">
              <span className="w-4 h-4 rounded-full bg-[#ba1a1a] animate-ping" />
              <h2 className="font-journal-headline text-3xl text-[#ba1a1a]">Emergency SOS Activated</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Nearby Hospitals (col-span-7) */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-journal-headline text-xl text-[#1b1c19]">Nearest Trauma Centers</h3>
                <p className="text-xs text-[#89726c]">Recommended emergency rooms closest to your coordinates:</p>

                <div className="space-y-4">
                  {hospitals.map((hospital, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-[#fbf9f4] border border-[#ddc0b9] rounded-xl flex justify-between items-center gap-4 hover:bg-[#f0eee9] transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-journal-label text-[#8f361d] font-bold uppercase">
                          {hospital.isOpen ? 'OPEN NOW' : 'CALL BEFORE DEPARTURE'}
                        </span>
                        <h4 className="font-bold text-sm text-[#1b1c19]">{hospital.name}</h4>
                        <p className="text-xs text-[#89726c] leading-relaxed">{hospital.address}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ', ' + hospital.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#8f361d] text-white text-center px-4 py-2 rounded-lg font-journal-label text-[10px] tracking-wider uppercase hover:bg-[#af4d32] transition-colors"
                        >
                          NAVIGATE
                        </a>
                      </div>
                    </div>
                  ))}
                  {hospitals.length === 0 && (
                    <div className="p-5 bg-[#fbf9f4] border border-[#ddc0b9]/40 rounded-xl text-center text-xs text-[#89726c] italic">
                      Searching Google maps index... (If empty, try again shortly)
                    </div>
                  )}
                </div>
              </div>

              {/* Group Medical Protocols (col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-journal-headline text-xl text-[#ba1a1a]">Emergency First-Aid Guides</h3>
                <p className="text-xs text-[#89726c]">Extracted protocols for condition profiles logged in this group:</p>

                <div className="space-y-4">
                  {protocols.map((protocol, pIdx) => (
                    <div key={pIdx} className="bg-[#ffdad6]/20 border border-[#ffdad6] p-5 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold text-[#ba1a1a] uppercase tracking-wider">
                        CRITICAL ASSIST GUIDE
                      </h4>
                      <ol className="list-decimal list-inside text-xs text-[#56423d] space-y-1.5 leading-relaxed">
                        {protocol.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}

                  {protocols.length === 0 && (
                    <div className="bg-[#f0eee9] p-5 rounded-xl border border-[#ddc0b9]/30 text-xs italic text-[#89726c] text-center">
                      No matching group member conditions requiring first-aid steps. Use standard CPR.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>
        )}

      </main>

      {/* Static First-Aid Registry Access */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link 
          href="/medical"
          className="bg-[#ba1a1a] text-white px-6 py-3 rounded-full font-journal-label text-[10px] tracking-widest uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[#ba1a1a]"
        >
          VIEW FIRST-AID REGISTRY
        </Link>
      </div>

      <BottomNavBar />
    </div>
  );
}
