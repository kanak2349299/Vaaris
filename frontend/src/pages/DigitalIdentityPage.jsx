import React from 'react';
import { Fingerprint, Shield, Check, Globe, Mail, Cloud, Database } from 'lucide-react';

export default function DigitalIdentityPage() {
  const identities = [
    { title: 'Primary Email Identity', desc: 'Protected by OAuth tokens and recovery trustees', icon: Mail, status: 'Protected' },
    { title: 'Decentralized Keypairs', desc: 'Split via Shamir Secret Sharing across 3 nodes', icon: Database, status: 'Active (3 Shares)' },
    { title: 'Cloud Data Archives', desc: 'Google & Proton Drive automated export directives', icon: Cloud, status: 'Configured' },
    { title: 'Social & Public Footprint', desc: 'Memorialization triggers for Meta & LinkedIn', icon: Globe, status: 'Monitored' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
          SOVEREIGN IDENTITY MATRIX
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Digital Identity
        </h1>
        <p className="text-sm text-[#8A9E91] mt-1">
          Unified map of all digital footprints, sovereign identifiers, and verification anchors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {identities.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4 hover:border-[#1E3626] transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#10291B] border border-[#10B981]/30 flex items-center justify-center text-[#34D399]">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#10291B] text-[#34D399] border border-[#10B981]/30">
                  {item.status}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-[#8A9E91] mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
