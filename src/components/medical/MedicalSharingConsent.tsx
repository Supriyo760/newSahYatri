'use client';

import React, { useState } from 'react';
import { Shield, ShieldAlert, Info } from 'lucide-react';

interface MedicalSharingConsentProps {
  groupId: string;
  initialConsent: boolean;
  onConsentChange?: (consent: boolean) => void;
}

export default function MedicalSharingConsent({ groupId, initialConsent, onConsentChange }: MedicalSharingConsentProps) {
  const [hasConsent, setHasConsent] = useState(initialConsent);
  const [isLoading, setIsLoading] = useState(false);

  const toggleConsent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/medical-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: !hasConsent }),
      });
      
      if (res.ok) {
        setHasConsent(!hasConsent);
        onConsentChange?.(!hasConsent);
      } else {
        console.error('Failed to update medical consent');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full flex-shrink-0 transition-colors ${
          hasConsent ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {hasConsent ? <Shield size={24} /> : <ShieldAlert size={24} />}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">Medical Data Sharing</h3>
            <button
              onClick={toggleConsent}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                hasConsent ? 'bg-emerald-500' : 'bg-gray-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="switch"
              aria-checked={hasConsent}
            >
              <span className="sr-only">Enable medical sharing</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  hasConsent ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {hasConsent 
              ? 'Your medical condition categories are visible to your group. Sensitive details remain encrypted.' 
              : 'Your medical data is hidden. We strongly recommend enabling this for group safety and rapid emergency response.'}
          </p>

          <div className="flex items-start gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
            <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>
              When enabled, your group members will know about basic condition categories (e.g. &ldquo;Diabetes&rdquo;, &ldquo;Allergies&rdquo;) to better support you in emergencies. Specific medications and contacts are only used by the AI emergency router.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
