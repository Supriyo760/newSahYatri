'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';

export default function Onboarding() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'medical'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    gender: 'other',
    age: 25,
    nationality: '',
    travelStyle: 'mixed',
    budgetLevel: 'average',
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    riskTolerance: 0.5,
    streetFood: false,
    fineDining: false,
    vegetarian: false,
    vegan: false,
    halal: false,
    glutenFree: false,
    interests: '',
  });

  // Medical Form State
  const [medicalForm, setMedicalForm] = useState({
    bloodType: 'O+',
    conditions: [{ name: '', severity: 'mild', notes: '' }],
    medications: [{ name: '', dosage: '', schedule: '', notes: '' }],
    allergies: [{ allergen: '', severity: 'mild', response: '', hasEpipen: false }],
    emergencyContacts: [{ name: '', phone: '', relationship: '', isPrimary: true }],
    firstAidNotes: '',
    shareWithGroup: false,
  });

  // Fetch existing data
  useEffect(() => {
    async function loadData() {
      try {
        const profileRes = await fetch('/api/users/profile');
        const profileData = await profileRes.json();
        if (profileData.data) {
          const p = profileData.data;
          setProfileForm({
            gender: p.gender || 'other',
            age: p.age || 25,
            nationality: p.nationality || '',
            travelStyle: p.travelStyle || 'mixed',
            budgetLevel: p.budgetLevel || 'average',
            openness: p.openness ?? 0.5,
            conscientiousness: p.conscientiousness ?? 0.5,
            extraversion: p.extraversion ?? 0.5,
            agreeableness: p.agreeableness ?? 0.5,
            neuroticism: p.neuroticism ?? 0.5,
            riskTolerance: p.riskTolerance ?? 0.5,
            streetFood: !!p.foodPreferences?.streetFood,
            fineDining: !!p.foodPreferences?.fineDining,
            vegetarian: !!p.foodPreferences?.vegetarian,
            vegan: !!p.foodPreferences?.vegan,
            halal: !!p.foodPreferences?.halal,
            glutenFree: !!p.foodPreferences?.glutenFree,
            interests: p.interests?.join(', ') || '',
          });
        }

        const medRes = await fetch('/api/medical/profile');
        const medData = await medRes.json();
        if (medData.data) {
          const m = medData.data;
          setMedicalForm({
            bloodType: m.bloodType || 'O+',
            conditions: m.conditions?.length ? m.conditions : [{ name: '', severity: 'mild', notes: '' }],
            medications: m.medications?.length ? m.medications : [{ name: '', dosage: '', schedule: '', notes: '' }],
            allergies: m.allergies?.length ? m.allergies : [{ allergen: '', severity: 'mild', response: '', hasEpipen: false }],
            emergencyContacts: m.emergencyContacts?.length ? m.emergencyContacts : [{ name: '', phone: '', relationship: '', isPrimary: true }],
            firstAidNotes: m.firstAidNotes || '',
            shareWithGroup: !!m.shareWithGroup,
          });
        }
      } catch (err) {
        console.error('Failed to load onboarding data:', err);
      }
    }
    loadData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        gender: profileForm.gender,
        age: Number(profileForm.age),
        nationality: profileForm.nationality,
        openness: Number(profileForm.openness),
        conscientiousness: Number(profileForm.conscientiousness),
        extraversion: Number(profileForm.extraversion),
        agreeableness: Number(profileForm.agreeableness),
        neuroticism: Number(profileForm.neuroticism),
        travelStyle: profileForm.travelStyle,
        budgetLevel: profileForm.budgetLevel,
        // Convert 0-1 slider to 1-5 integer scale
        riskTolerance: Math.max(1, Math.min(5, Math.round(Number(profileForm.riskTolerance) * 4 + 1))),
        preferredGroupSize: 4,
        languagesSpoken: [],
        foodPreferences: {
          streetFood: profileForm.streetFood,
          fineDining: profileForm.fineDining,
          vegetarian: profileForm.vegetarian,
          vegan: profileForm.vegan,
          halal: profileForm.halal,
          glutenFree: profileForm.glutenFree,
        },
        interests: profileForm.interests.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (Array.isArray(resData.error)) {
          const messages = resData.error.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`);
          throw new Error(messages.join('. '));
        }
        throw new Error(resData.error || 'Failed to save profile');
      }

      setMessage('Travel questionnaire saved successfully! Move to Medical tab or Explore.');
      setActiveTab('medical');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Filter out empty lines in lists
      const conditionsFiltered = medicalForm.conditions.filter(c => c.name.trim());
      const medicationsFiltered = medicalForm.medications.filter(m => m.name.trim());
      const allergiesFiltered = medicalForm.allergies.filter(a => a.allergen.trim());
      const contactsFiltered = medicalForm.emergencyContacts.filter(c => c.name.trim() && c.phone.trim());

      const payload = {
        bloodType: medicalForm.bloodType,
        conditions: conditionsFiltered,
        medications: medicationsFiltered,
        allergies: allergiesFiltered,
        emergencyContacts: contactsFiltered,
        firstAidNotes: medicalForm.firstAidNotes,
        shareWithGroup: medicalForm.shareWithGroup,
      };

      const res = await fetch('/api/medical/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        if (Array.isArray(resData.error)) {
          const messages = resData.error.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`);
          throw new Error(messages.join('. '));
        }
        throw new Error(typeof resData.error === 'string' ? resData.error : 'Failed to save medical profile');
      }

      setMessage('Medical security profile saved and encrypted successfully!');
      router.push('/discover');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 pt-24 max-w-4xl w-full mx-auto px-6">
        {/* Editorial Title */}
        <div className="text-center mb-10">
          <span className="font-journal-label text-[#8f361d] tracking-widest block mb-2">PERSONAL JOURNAL</span>
          <h1 className="font-journal-headline text-4xl md:text-5xl text-[#1b1c19]">Who is the traveler?</h1>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#89726c] to-transparent w-24 mx-auto my-4" />
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center border-b border-[#ddc0b9]/40 mb-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-journal-label text-xs tracking-widest border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-[#8f361d] text-[#8f361d] font-bold'
                : 'border-transparent text-[#89726c]'
            }`}
          >
            TRAVEL QUESTIONNAIRE
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`px-6 py-3 font-journal-label text-xs tracking-widest border-b-2 transition-all ${
              activeTab === 'medical'
                ? 'border-[#8f361d] text-[#8f361d] font-bold'
                : 'border-transparent text-[#89726c]'
            }`}
          >
            SECURE MEDICAL CARD
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div className={`p-4 mb-6 rounded-xl text-center font-journal-body text-sm ${
            message.startsWith('Error')
              ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/20'
              : 'bg-[#d1e9d3] text-[#435848] border border-[#435848]/20'
          }`}>
            {message}
          </div>
        )}

        {/* Tab Content: Profile Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="bg-[#f0eee9] p-8 rounded-2xl shadow-tactile space-y-6">
            <h2 className="font-journal-headline text-2xl text-[#8f361d] border-b border-[#ddc0b9]/40 pb-2">
              Vibe & Preferences
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">GENDER</label>
                <select
                  value={profileForm.gender}
                  onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">AGE</label>
                <input
                  type="number"
                  value={profileForm.age}
                  onChange={e => setProfileForm({ ...profileForm, age: Number(e.target.value) })}
                  className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-sm"
                  min="18"
                  max="120"
                />
              </div>

              <div>
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">NATIONALITY</label>
                <input
                  type="text"
                  placeholder="e.g. Indian, Canadian"
                  value={profileForm.nationality}
                  onChange={e => setProfileForm({ ...profileForm, nationality: e.target.value })}
                  className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">TRAVEL STYLE</label>
                <select
                  value={profileForm.travelStyle}
                  onChange={e => setProfileForm({ ...profileForm, travelStyle: e.target.value })}
                  className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-sm"
                >
                  <option value="mixed">Mixed Style</option>
                  <option value="adventure">Adventure (Hiking, Wilds)</option>
                  <option value="cultural">Cultural (Museums, Architecture)</option>
                  <option value="relaxation">Relaxation (Resorts, Beaches)</option>
                  <option value="culinary">Culinary (Food Tours, Markets)</option>
                </select>
              </div>

              <div>
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">BUDGET LEVEL</label>
                <select
                  value={profileForm.budgetLevel}
                  onChange={e => setProfileForm({ ...profileForm, budgetLevel: e.target.value })}
                  className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-sm"
                >
                  <option value="minimal">Minimal (Backpacker, Hostels)</option>
                  <option value="average">Average (Mid-range hotels, Cafes)</option>
                  <option value="premium">Premium (Luxury, High-end resorts)</option>
                </select>
              </div>
            </div>

            {/* Sliders for Big Five Personality Traits */}
            <div className="space-y-4">
              <h3 className="font-journal-headline text-lg text-[#8f361d] pt-4">Big Five Personality Traits</h3>
              <p className="text-xs text-[#89726c]">Rate yourself between 0.0 (low) and 1.0 (high) for matching score accuracy.</p>

              {[
                { name: 'openness', label: 'Openness to Experience (Curiosity, Creativity)', val: profileForm.openness },
                { name: 'conscientiousness', label: 'Conscientiousness (Organization, Planning)', val: profileForm.conscientiousness },
                { name: 'extraversion', label: 'Extraversion (Social Energy, Talkativeness)', val: profileForm.extraversion },
                { name: 'agreeableness', label: 'Agreeableness (Compassion, Cooperativeness)', val: profileForm.agreeableness },
                { name: 'neuroticism', label: 'Neuroticism / Sensitivity (Emotional reactivity)', val: profileForm.neuroticism },
                { name: 'riskTolerance', label: 'Risk Tolerance (Comfort with adventure/unknowns)', val: profileForm.riskTolerance },
              ].map(slider => (
                <div key={slider.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-[#56423d]">
                    <span>{slider.label}</span>
                    <span>{slider.val.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={slider.val}
                    onChange={e => setProfileForm({ ...profileForm, [slider.name]: Number(e.target.value) })}
                    className="w-full accent-[#8f361d] bg-[#fbf9f4] rounded-lg h-2"
                  />
                </div>
              ))}
            </div>

            {/* Food preferences */}
            <div className="space-y-2">
              <label className="font-journal-label text-[10px] text-[#89726c] block">FOOD PREFERENCES</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'streetFood', label: 'Street Food friendly' },
                  { name: 'fineDining', label: 'Fine Dining lover' },
                  { name: 'vegetarian', label: 'Vegetarian' },
                  { name: 'vegan', label: 'Vegan' },
                  { name: 'halal', label: 'Halal' },
                  { name: 'glutenFree', label: 'Gluten Free' },
                ].map(pref => (
                  <label key={pref.name} className="flex items-center gap-3 bg-[#fbf9f4] p-3 rounded-lg border border-[#ddc0b9] text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(profileForm as any)[pref.name]}
                      onChange={e => setProfileForm({ ...profileForm, [pref.name]: e.target.checked })}
                      className="accent-[#8f361d] rounded"
                    />
                    <span>{pref.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">SHARED INTERESTS</label>
              <input
                type="text"
                placeholder="e.g. Photography, Hiking, History, Wine tasting"
                value={profileForm.interests}
                onChange={e => setProfileForm({ ...profileForm, interests: e.target.value })}
                className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-3 text-sm placeholder:text-[#89726c]/40"
              />
              <p className="text-[10px] text-[#89726c] mt-1">Separate tags with commas.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8f361d] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors shadow-tactile"
            >
              {loading ? 'CALCULATING EMBEDDINGS...' : 'SAVE & CALCULATE COMPATIBILITY'}
            </button>
          </form>
        )}

        {/* Tab Content: Medical Form */}
        {activeTab === 'medical' && (
          <form onSubmit={handleMedicalSubmit} className="bg-[#fdb55c]/10 border border-[#fdb55c]/20 p-8 rounded-2xl shadow-tactile space-y-6">
            <div className="flex justify-between items-center border-b border-[#ddc0b9]/40 pb-2">
              <h2 className="font-journal-headline text-2xl text-[#8f361d]">
                Secure Medical Dashboard
              </h2>
              <span className="bg-[#8f361d] text-white text-[10px] font-journal-label px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                AES-256 ENCRYPTED
              </span>
            </div>
            <p className="text-xs text-[#89726c] leading-relaxed">
              To guarantee your protection abroad, write your medical constraints below. Data is encrypted client-side using app-layer keys before persistence and is only visible during emergency SOS.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">BLOOD TYPE</label>
                <select
                  value={medicalForm.bloodType}
                  onChange={e => setMedicalForm({ ...medicalForm, bloodType: e.target.value })}
                  className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-lg p-2.5 text-sm"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 bg-[#fbf9f4] p-4 rounded-xl border border-[#ddc0b9]/40 mt-6">
                <input
                  type="checkbox"
                  checked={medicalForm.shareWithGroup}
                  onChange={e => setMedicalForm({ ...medicalForm, shareWithGroup: e.target.checked })}
                  className="accent-[#8f361d] w-4 h-4 rounded"
                />
                <div>
                  <label className="text-xs font-semibold text-[#1b1c19] block">CONSENT MEDICAL SHARING</label>
                  <span className="text-[10px] text-[#89726c]">Share only critical first-aid instructions with travel partners in an SOS.</span>
                </div>
              </div>
            </div>

            {/* Conditions Section */}
            <div className="space-y-3">
              <label className="font-journal-label text-[10px] text-[#89726c] block">MEDICAL CONDITIONS</label>
              {medicalForm.conditions.map((cond, idx) => (
                <div key={idx} className="grid md:grid-cols-3 gap-4 bg-[#fbf9f4] p-4 rounded-xl border border-[#ddc0b9]/40">
                  <input
                    type="text"
                    placeholder="e.g. Asthma, Diabetes"
                    value={cond.name}
                    onChange={e => {
                      const updated = [...medicalForm.conditions];
                      updated[idx].name = e.target.value;
                      setMedicalForm({ ...medicalForm, conditions: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  />
                  <select
                    value={cond.severity}
                    onChange={e => {
                      const updated = [...medicalForm.conditions];
                      updated[idx].severity = e.target.value as any;
                      setMedicalForm({ ...medicalForm, conditions: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={cond.notes}
                    onChange={e => {
                      const updated = [...medicalForm.conditions];
                      updated[idx].notes = e.target.value;
                      setMedicalForm({ ...medicalForm, conditions: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMedicalForm({
                  ...medicalForm,
                  conditions: [...medicalForm.conditions, { name: '', severity: 'mild', notes: '' }]
                })}
                className="text-xs text-[#8f361d] font-journal-label hover:underline"
              >
                + ADD CONDITION
              </button>
            </div>

            {/* Allergies Section */}
            <div className="space-y-3">
              <label className="font-journal-label text-[10px] text-[#89726c] block">ALLERGIES</label>
              {medicalForm.allergies.map((all, idx) => (
                <div key={idx} className="grid md:grid-cols-4 gap-4 bg-[#fbf9f4] p-4 rounded-xl border border-[#ddc0b9]/40 items-center">
                  <input
                    type="text"
                    placeholder="e.g. Peanuts, Penicillin"
                    value={all.allergen}
                    onChange={e => {
                      const updated = [...medicalForm.allergies];
                      updated[idx].allergen = e.target.value;
                      setMedicalForm({ ...medicalForm, allergies: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  />
                  <select
                    value={all.severity}
                    onChange={e => {
                      const updated = [...medicalForm.allergies];
                      updated[idx].severity = e.target.value as any;
                      setMedicalForm({ ...medicalForm, allergies: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="anaphylactic">Anaphylactic</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Reaction..."
                    value={all.response}
                    onChange={e => {
                      const updated = [...medicalForm.allergies];
                      updated[idx].response = e.target.value;
                      setMedicalForm({ ...medicalForm, allergies: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  />
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={all.hasEpipen}
                      onChange={e => {
                        const updated = [...medicalForm.allergies];
                        updated[idx].hasEpipen = e.target.checked;
                        setMedicalForm({ ...medicalForm, allergies: updated });
                      }}
                      className="accent-[#8f361d] rounded"
                    />
                    <span>CARRIES EPIPEN</span>
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMedicalForm({
                  ...medicalForm,
                  allergies: [...medicalForm.allergies, { allergen: '', severity: 'mild', response: '', hasEpipen: false }]
                })}
                className="text-xs text-[#8f361d] font-journal-label hover:underline"
              >
                + ADD ALLERGY
              </button>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-3">
              <label className="font-journal-label text-[10px] text-[#89726c] block">EMERGENCY CONTACTS</label>
              {medicalForm.emergencyContacts.map((contact, idx) => (
                <div key={idx} className="grid md:grid-cols-3 gap-4 bg-[#fbf9f4] p-4 rounded-xl border border-[#ddc0b9]/40">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={contact.name}
                    onChange={e => {
                      const updated = [...medicalForm.emergencyContacts];
                      updated[idx].name = e.target.value;
                      setMedicalForm({ ...medicalForm, emergencyContacts: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={contact.phone}
                    onChange={e => {
                      const updated = [...medicalForm.emergencyContacts];
                      updated[idx].phone = e.target.value;
                      setMedicalForm({ ...medicalForm, emergencyContacts: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Relationship (e.g. Spouse)"
                    value={contact.relationship}
                    onChange={e => {
                      const updated = [...medicalForm.emergencyContacts];
                      updated[idx].relationship = e.target.value;
                      setMedicalForm({ ...medicalForm, emergencyContacts: updated });
                    }}
                    className="w-full border-none border-b border-[#ddc0b9] p-2 text-sm bg-transparent"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMedicalForm({
                  ...medicalForm,
                  emergencyContacts: [...medicalForm.emergencyContacts, { name: '', phone: '', relationship: '', isPrimary: false }]
                })}
                className="text-xs text-[#8f361d] font-journal-label hover:underline"
              >
                + ADD CONTACT
              </button>
            </div>

            {/* First Aid Notes */}
            <div>
              <label className="font-journal-label text-[10px] text-[#89726c] block mb-2">FIRST AID INSTRUCTIONS</label>
              <textarea
                placeholder="Specific guidance for companions (e.g., 'If I lose consciousness, check sugar levels first...')"
                value={medicalForm.firstAidNotes}
                onChange={e => setMedicalForm({ ...medicalForm, firstAidNotes: e.target.value })}
                rows={3}
                className="w-full bg-[#fbf9f4] border border-[#ddc0b9] rounded-xl p-3 text-sm placeholder:text-[#89726c]/40"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8f361d] text-white py-3.5 rounded-full font-journal-label text-xs tracking-widest uppercase hover:bg-[#af4d32] transition-colors shadow-tactile"
            >
              {loading ? 'ENCRYPTING DATA...' : 'ENCRYPT & SAVE SECURITY PROFILE'}
            </button>
          </form>
        )}
      </main>

      <BottomNavBar />
    </div>
  );
}
