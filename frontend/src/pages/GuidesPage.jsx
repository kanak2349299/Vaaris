import React from 'react';
import { BookOpen, Shield, Key, Users, CheckCircle2 } from 'lucide-react';

export default function GuidesPage() {
  const guides = [
    {
      title: 'How Shamir Secret Sharing Protects Your Legacy',
      category: 'CRYPTOGRAPHY',
      readTime: '4 min read',
      desc: 'Learn how mathematical polynomials prevent single-point-of-failure vulnerabilities in estate planning.'
    },
    {
      title: 'Setting Up Digital Nominees & Trustees',
      category: 'LEGAL & NOMINEES',
      readTime: '3 min read',
      desc: 'Best practices for selecting primary beneficiaries and legal advisors without leaking plain passwords.'
    },
    {
      title: 'Configuring WhatsApp Heartbeat Verification',
      category: 'AUTOMATION',
      readTime: '5 min read',
      desc: 'Understanding the 4-stage verification trigger and grace period countdown.'
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
          KNOWLEDGE BASE
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Guides & Architecture
        </h1>
        <p className="text-sm text-[#8A9E91] mt-1">
          Comprehensive documentation on digital estate planning, cryptography, and legal directives.
        </p>
      </div>

      <div className="space-y-4">
        {guides.map((g, idx) => (
          <div key={idx} className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 hover:border-[#1E3626] transition-all space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[#34D399] tracking-wider uppercase font-semibold">{g.category}</span>
              <span className="text-[10px] font-mono text-[#5D7765]">&bull; {g.readTime}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{g.title}</h3>
            <p className="text-xs text-[#8A9E91] leading-relaxed">{g.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
