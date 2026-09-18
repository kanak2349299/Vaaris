import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, CheckCircle, ArrowLeft, Key, ExternalLink, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';

export default function HeirPortalPage({ accessToken = 'VR-PRIYA-772', onBackToApp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    loadPortal();
  }, [accessToken]);

  const loadPortal = async () => {
    try {
      const res = await api.get(`/heir-portal/${accessToken}`);
      setData(res.data);
      if (res.data.heir?.status === 'CUSTODY_CLAIMED') {
        setClaimed(true);
      }
    } catch (err) {
      console.error('Failed to load heir portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await api.post(`/heir-portal/${accessToken}/claim`);
      setClaimed(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Claim failed:', err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060C08] text-white flex items-center justify-center font-mono text-sm">
        Verifying Heir Cryptographic Token...
      </div>
    );
  }

  const isUnlocked = data?.is_unlocked;

  return (
    <div className="min-h-screen bg-[#060C08] text-white p-6 md:p-12 font-sans relative">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-[#16291C] pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0F2317] border border-[#10B981]/40 flex items-center justify-center">
            <span className="text-[#34D399] font-bold font-mono">V</span>
          </div>
          <span className="font-bold text-lg">Vaaris Heir Portal</span>
        </div>

        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 text-xs font-mono text-[#8A9E91] hover:text-white px-3 py-1.5 rounded-lg bg-[#102417]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Console</span>
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Verification Status Header */}
        <div className="bg-[#0A140E] border border-[#10B981]/30 rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0F2B1A] border border-[#10B981]/50 flex items-center justify-center text-[#34D399]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#34D399] font-semibold">
                  {isUnlocked ? 'VERIFIED LEGACY HANDOVER ACTIVE' : 'PRE-VERIFICATION ESCROW'}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Inherited Digital Assets for {data?.heir?.full_name}
                </h1>
                <p className="text-xs text-[#8A9E91] mt-1">
                  Designated by <span className="text-white font-semibold">{data?.decedent?.full_name}</span> ({data?.heir?.relationship})
                </p>
              </div>
            </div>

            {isUnlocked && (
              <button
                onClick={handleClaim}
                disabled={claimed || claiming}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-lg ${
                  claimed
                    ? 'bg-[#10B981] text-black cursor-default'
                    : 'bg-[#34D399] hover:bg-[#2EB885] text-black shadow-[#34D399]/20'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{claimed ? 'Custody Acknowledged' : 'Acknowledge Custody'}</span>
              </button>
            )}
          </div>

          {/* Decedent Letter / Message */}
          <div className="p-4 rounded-xl bg-[#060C08] border border-[#16291C] text-xs leading-relaxed text-[#BAC7BF] italic">
            &quot;{data?.testament_message}&quot;
          </div>
        </div>

        {/* Assigned Assets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#5D7765] font-semibold">
              ALLOCATED DIGITAL ASSETS & DIRECTIVES
            </h2>
            <span className="text-xs font-mono text-[#34D399]">
              {data?.assigned_assets?.length || 0} Assets
            </span>
          </div>

          <div className="space-y-3">
            {data?.assigned_assets?.map((asset) => (
              <div
                key={asset.id}
                className="bg-[#0A140E] border border-[#16291C] rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{asset.name}</h3>
                    <p className="text-xs text-[#5D7765] font-mono">{asset.category} &bull; {asset.platform}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#10291B] text-[#34D399] border border-[#10B981]/30">
                    Action: {asset.action_type}
                  </span>
                </div>

                <div className="text-xs text-[#8A9E91] bg-[#060C08] p-3 rounded-lg border border-[#16291C] space-y-1">
                  <div className="text-[#5D7765] font-mono text-[10px] uppercase font-semibold">SAFE DIRECTIVE:</div>
                  <p className="text-white">{asset.access_instructions}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
