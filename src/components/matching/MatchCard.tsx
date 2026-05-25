import React from 'react';
import { User, Activity, Map, Navigation } from 'lucide-react';

interface MatchCardProps {
  match: {
    user: {
      name: string;
      avatarUrl?: string | null;
      age: number;
      travelStyle: string;
    };
    compatibility: {
      overallScore: number;
      conflictRisk: number;
      trustScore: number;
    };
  };
  onConnect: () => void;
}

export function MatchCard({ match, onConnect }: MatchCardProps) {
  const { user, compatibility } = match;

  // Determine border color based on score
  let scoreColor = 'border-green-500 text-green-600';
  if (compatibility.overallScore < 75) scoreColor = 'border-yellow-500 text-yellow-600';
  if (compatibility.overallScore < 60) scoreColor = 'border-red-500 text-red-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-md">
      {/* Avatar Section */}
      <div className="p-6 md:w-1/3 flex flex-col items-center justify-center bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
        <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden mb-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-indigo-400" />
          )}
        </div>
        <h3 className="text-xl font-bold text-slate-800">{user.name}, {user.age}</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 mt-2 capitalize">
          {user.travelStyle}
        </span>
      </div>

      {/* Stats Section */}
      <div className="p-6 md:w-2/3 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Compatibility</h4>
              <div className={`text-4xl font-black ${scoreColor}`}>
                {compatibility.overallScore}%
              </div>
            </div>
            
            <div className="text-right">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Trust Score</h4>
              <div className="text-2xl font-bold text-blue-600">
                {compatibility.trustScore}/100
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center text-sm text-slate-500 mb-1">
                <Activity className="w-4 h-4 mr-1" /> ML Conflict Risk
              </div>
              <div className="font-semibold text-slate-700">
                {(compatibility.conflictRisk * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center text-sm text-slate-500 mb-1">
                <Map className="w-4 h-4 mr-1" /> Shared Interests
              </div>
              <div className="font-semibold text-slate-700">
                Food, History
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onConnect}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          <Navigation className="w-5 h-5 mr-2" />
          Start Anonymous Chat
        </button>
      </div>
    </div>
  );
}
