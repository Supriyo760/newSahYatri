'use client';

import React from 'react';
import Header from '@/components/Header';
import BottomNavBar from '@/components/BottomNavBar';
import { FIRST_AID_REGISTRY } from '@/lib/medical/first-aid-registry';

export default function MedicalRegistryPage() {
  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] flex flex-col font-sans pb-24">
      <Header />
      <main className="flex-1 pt-24 max-w-4xl w-full mx-auto px-6">
        <div className="mb-10">
          <span className="font-journal-label text-[#ba1a1a] tracking-widest block mb-2 uppercase">
            MEDICAL REGISTRY
          </span>
          <h1 className="font-journal-headline text-4xl text-[#1b1c19]">
            Emergency First-Aid
          </h1>
          <p className="text-[#89726c] font-journal-body mt-4 max-w-2xl">
            Static, professionally reviewed first-aid content. Please read the source and effective date carefully. This information does not replace professional medical advice.
          </p>
        </div>

        <div className="space-y-8">
          {FIRST_AID_REGISTRY.map((protocol) => (
            <div key={protocol.id} className="bg-white p-8 rounded-2xl border border-[#ddc0b9]/40 shadow-sm print:shadow-none print:border-black">
              <div className="flex justify-between items-start border-b border-[#ddc0b9]/40 pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-journal-headline text-[#ba1a1a]">{protocol.title}</h2>
                  <div className="text-xs text-[#89726c] mt-2 space-y-1">
                    <p><strong>Source:</strong> {protocol.source}</p>
                    <p><strong>Jurisdiction:</strong> {protocol.jurisdiction}</p>
                    <p><strong>Effective Date:</strong> {protocol.effectiveDate} (Version {protocol.version})</p>
                  </div>
                </div>
                <button className="hidden md:block border border-[#ddc0b9] text-[#56423d] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#f0eee9]" onClick={() => typeof window !== 'undefined' && window.print()}>
                  PRINT CARD
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-3 text-[#1b1c19] leading-relaxed text-sm md:text-base">
                {protocol.content.map((step, idx) => (
                  <li key={idx} className="pl-2">{step.replace(/^\d+\.\s*/, '')}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </main>
      <BottomNavBar />
    </div>
  );
}
