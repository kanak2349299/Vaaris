import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Archive, Clock, ArrowUpRight, Activity } from 'lucide-react';
import api from '../services/api';

export default function OverviewPage({ setActiveTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    {
      label: 'Total Digital Assets',
      value: stats?.total_assets ?? 4,
      desc: 'Secured in legacy plan',
      tab: 'legacy-planner',
      icon: Archive
    },
    {
      label: 'Trusted Nominees',
      value: stats?.total_heirs ?? 2,
      desc: 'Holding Shamir shares',
      tab: 'nominees',
      icon: Users
    },
    {
      label: 'Shamir Secret Shares',
      value: '3 Shares',
      desc: 'Threshold: 2 required',
      tab: 'vault',
      icon: ShieldCheck
    },
    {
      label: 'Verification Pipeline',
      value: stats?.verification_status === 'SECURE_ACTIVE' ? 'Active / Safe' : stats?.verification_status || 'Safe',
      desc: 'Heartbeat monitored',
      tab: 'check-ins',
      icon: Clock
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div>
        <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
          PERSONAL OVERVIEW
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Digital Legacy Summary
        </h1>
        <p className="text-sm text-[#8A9E91] mt-1">
          Real-time health of your digital testament, cryptographic shares, and verification triggers.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              onClick={() => setActiveTab(kpi.tab)}
              className="bg-[#0A140E] border border-[#16291C] rounded-xl p-5 hover:border-[#10B981]/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0F2417] flex items-center justify-center text-[#34D399]">
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#5D7765] group-hover:text-[#34D399] transition-colors" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight mb-1">
                {kpi.value}
              </div>
              <div className="text-xs text-[#8A9E91] font-medium">
                {kpi.label}
              </div>
              <div className="text-[11px] text-[#5D7765] mt-1">
                {kpi.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Baseline Banner */}
      <div className="bg-[#0A140E] border border-[#10B981]/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0F291B] border border-[#10B981]/40 flex items-center justify-center text-[#34D399]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Vault Protected & Inactive Heartbeat Monitored</h3>
            <p className="text-xs text-[#8A9E91] mt-0.5">
              Zero plain credentials stored. All directives operate via Shamir shares and verified trigger gates.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('check-ins')}
          className="px-4 py-2 rounded-lg bg-[#10291B] hover:bg-[#163825] border border-[#10B981]/40 text-[#34D399] text-xs font-semibold whitespace-nowrap transition-all"
        >
          Check-in Simulator &rarr;
        </button>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Activity className="w-4 h-4 text-[#34D399]" />
            <span>Recent Legacy Activity Log</span>
          </div>
          <span className="text-[10px] font-mono text-[#5D7765]">Cryptographically Audited</span>
        </div>

        <div className="space-y-3">
          {stats?.recent_activities?.map((act) => (
            <div
              key={act.id}
              className="flex items-start justify-between py-2 border-b border-[#16291C]/50 last:border-0 text-xs"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-white">{act.action.replace(/_/g, ' ')}</div>
                <div className="text-[#8A9E91]">{act.description}</div>
              </div>
              <div className="text-[10px] font-mono text-[#5D7765] whitespace-nowrap ml-4">
                {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )) || (
            <div className="text-xs text-[#5D7765]">No recent activities logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
