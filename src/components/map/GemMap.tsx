'use client';

import React, { useState } from 'react';
import { MapPin, Compass, Info } from 'lucide-react';

interface HiddenGem {
  id: string;
  name: string;
  category: string;
  description: string;
  story: string;
  lat: number;
  lng: number;
  gemScore: number;
  touristDensityScore: number;
  photoUrl?: string;
  tips?: string;
}

interface GemMapProps {
  gems: HiddenGem[];
  cityCenter: { lat: number; lng: number };
}

export default function GemMap({ gems, cityCenter }: GemMapProps) {
  const [selectedGem, setSelectedGem] = useState<HiddenGem | null>(null);
  const mapCenter = selectedGem ? { lat: selectedGem.lat, lng: selectedGem.lng } : cityCenter;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden flex flex-col md:flex-row h-[600px] relative">
      {/* Map Area */}
      <div className="flex-1 w-full bg-slate-50 relative">
        <div className="absolute top-4 left-4 z-10 bg-indigo-600/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-white flex items-center gap-2">
          <Compass size={18} />
          <span className="text-sm font-semibold tracking-wide">Hidden Gem Discovery</span>
        </div>

        <iframe
          src={`https://maps.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=13&output=embed`}
          className="w-full h-full border-0"
          loading="lazy"
          title="Hidden gem map"
          allowFullScreen
        />

        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {gems.map((gem) => (
            <button
              key={gem.id}
              onClick={() => setSelectedGem(gem)}
              className={`text-left rounded-xl px-3 py-2 border shadow-sm transition-colors ${
                selectedGem?.id === gem.id
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white/95 text-gray-800 border-indigo-100 hover:bg-indigo-50'
              }`}
            >
              <span className="block text-xs font-bold truncate">{gem.name}</span>
              <span className="block text-[10px] opacity-80">{gem.gemScore.toFixed(0)} gem score</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="w-full md:w-96 bg-white border-l border-gray-100 overflow-y-auto flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20">
        {selectedGem ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {selectedGem.photoUrl ? (
              <div className="w-full h-48 bg-gray-200 relative">
                <img src={selectedGem.photoUrl} alt={selectedGem.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <span className="px-2 py-1 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-2 inline-block">
                    {selectedGem.category}
                  </span>
                  <h3 className="text-xl font-bold text-white leading-tight">{selectedGem.name}</h3>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-indigo-600">
                <span className="px-2 py-1 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-2 inline-block">
                  {selectedGem.category}
                </span>
                <h3 className="text-2xl font-bold text-white leading-tight">{selectedGem.name}</h3>
              </div>
            )}
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="flex-1 text-center">
                  <div className="text-2xl font-black text-indigo-600">{selectedGem.gemScore.toFixed(0)}</div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Gem Score</div>
                </div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-black text-emerald-600">
                    {selectedGem.touristDensityScore < 30 ? 'Low' : selectedGem.touristDensityScore < 70 ? 'Med' : 'High'}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Crowds</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                  <Info size={16} className="text-indigo-500" />
                  The Local Story
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed italic border-l-2 border-indigo-200 pl-3">
                  &ldquo;{selectedGem.story}&rdquo;
                </p>
              </div>

              {selectedGem.tips && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Insider Tip</h4>
                  <p className="text-sm text-amber-900/80">{selectedGem.tips}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <MapPin size={48} className="mb-4 text-indigo-200" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Explore the map</h3>
            <p className="text-sm">Click on any purple gem pin to uncover its story, hidden secrets, and local tips.</p>
          </div>
        )}
      </div>
    </div>
  );
}
