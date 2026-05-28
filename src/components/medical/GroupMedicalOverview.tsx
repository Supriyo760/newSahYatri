'use client';

import React from 'react';
import { Activity, AlertCircle, HeartPulse, UserCircle } from 'lucide-react';

export interface GroupMemberMedical {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  hasShared: boolean;
  conditionCategories: string[];
}

interface GroupMedicalOverviewProps {
  members: GroupMemberMedical[];
  isAuthorized: boolean;
}

export default function GroupMedicalOverview({ members, isAuthorized }: GroupMedicalOverviewProps) {
  if (!isAuthorized) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Overview Hidden</h3>
        <p className="text-sm text-gray-600 max-w-sm">
          You must enable your own medical data sharing before you can view the group&apos;s medical overview. This ensures mutual trust.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-rose-50/50 flex items-center gap-3">
        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
          <HeartPulse size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Group Medical Overview</h3>
          <p className="text-xs text-rose-600/80 font-medium">Shared for emergency preparedness only</p>
        </div>
      </div>
      
      <div className="p-0">
        <ul className="divide-y divide-gray-50">
          {members.map((member) => (
            <li key={member.userId} className="p-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200">
                      <UserCircle size={24} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{member.name}</h4>
                    {!member.hasShared && (
                      <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <AlertCircle size={12} />
                        Has not shared medical info
                      </span>
                    )}
                  </div>
                </div>

                {member.hasShared && (
                  <div className="flex flex-wrap gap-2 max-w-[50%] justify-end">
                    {member.conditionCategories && member.conditionCategories.length > 0 ? (
                      member.conditionCategories.map((condition) => (
                        <span 
                          key={condition} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200"
                        >
                          {condition.replace(/-/g, ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        No known conditions
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-start gap-2">
        <Activity size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
        <p>
          This dashboard only displays high-level condition categories. Specific medications, dosages, and emergency contacts are securely encrypted and only accessed by the automated system during an active SOS emergency.
        </p>
      </div>
    </div>
  );
}
