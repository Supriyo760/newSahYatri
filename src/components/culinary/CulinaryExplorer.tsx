'use client';

import React, { useState } from 'react';
import { Utensils, Star, MapPin, DollarSign, ShieldCheck, ChefHat } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  cuisineTypes: string[];
  priceLevel: number;
  rating: number;
  address: string;
  photoUrl?: string;
  specialties: string[];
  isLocalGem: boolean;
  hygieneScore?: number;
}

interface CulinaryExplorerProps {
  destination: string;
  recommendations: Restaurant[];
  userPreferences: any;
}

export default function CulinaryExplorer({ destination, recommendations }: CulinaryExplorerProps) {
  const [filter, setFilter] = useState<'all' | 'street' | 'fine' | 'gem'>('all');

  const filtered = recommendations.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'gem') return r.isLocalGem;
    if (filter === 'street') return r.priceLevel <= 1;
    if (filter === 'fine') return r.priceLevel >= 3;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden flex flex-col h-[600px]">
      <div className="p-5 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
            <Utensils size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">Culinary Discovery</h2>
            <p className="text-sm text-gray-600">Authentic flavors matched to your taste in {destination}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}
          >
            Top Matches
          </button>
          <button 
            onClick={() => setFilter('gem')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${filter === 'gem' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-indigo-50'}`}
          >
            <ChefHat size={14} /> Local Gems
          </button>
          <button 
            onClick={() => setFilter('street')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'street' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-amber-50'}`}
          >
            Street Food & Budget
          </button>
          <button 
            onClick={() => setFilter('fine')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'fine' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-slate-100'}`}
          >
            Fine Dining
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(restaurant => (
            <div key={restaurant.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              {restaurant.photoUrl ? (
                <div className="h-32 bg-gray-200 relative overflow-hidden">
                  <img src={restaurant.photoUrl} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {restaurant.isLocalGem && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                      <ChefHat size={12} /> Local Secret
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 bg-orange-100 flex items-center justify-center relative">
                  <Utensils size={32} className="text-orange-300" />
                  {restaurant.isLocalGem && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                      <ChefHat size={12} /> Local Secret
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 line-clamp-1">{restaurant.name}</h3>
                  <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded text-xs font-semibold text-gray-700">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    {restaurant.rating.toFixed(1)}
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-3 line-clamp-1">
                  <MapPin size={12} /> {restaurant.address}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {restaurant.specialties.slice(0, 2).map(spec => (
                    <span key={spec} className="bg-orange-50 text-orange-700 border border-orange-100 text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Must try: {spec}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-0.5 text-emerald-600">
                    {Array.from({ length: restaurant.priceLevel || 1 }).map((_, i) => (
                      <DollarSign key={i} size={14} />
                    ))}
                    {Array.from({ length: 4 - (restaurant.priceLevel || 1) }).map((_, i) => (
                      <DollarSign key={i} size={14} className="text-gray-300" />
                    ))}
                  </div>
                  
                  {restaurant.hygieneScore && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                      <ShieldCheck size={12} />
                      Hygiene: {restaurant.hygieneScore}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-12 text-center text-gray-500">
              <Utensils size={32} className="mx-auto mb-3 text-gray-300" />
              <p>No restaurants found matching this filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
