import React, { useContext } from 'react';
import { 
  LayoutGrid, 
  Fingerprint, 
  ClipboardCheck, 
  Archive, 
  Users, 
  Clock, 
  BookOpen, 
  LogOut, 
  ShieldCheck 
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, onOpenWhatsApp }) {
  const { user, logout } = useContext(AuthContext);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'identity', label: 'Digital identity', icon: Fingerprint },
    { id: 'legacy-planner', label: 'Legacy planner', icon: ClipboardCheck },
    { id: 'vault', label: 'Vault', icon: Archive, badge: '3' },
    { id: 'nominees', label: 'Nominees', icon: Users },
    { id: 'check-ins', label: 'Check-ins', icon: Clock },
    { id: 'guides', label: 'Guides', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-[#08110A] border-r border-[#14241A] flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0F2317] border border-[#10B981]/40 flex items-center justify-center shadow-lg shadow-[#10B981]/10">
            <span className="text-[#34D399] font-bold text-base tracking-tighter font-mono">V</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center">
            vaaris<span className="text-[#34D399]">.</span>
          </span>
        </div>

        {/* Section Label */}
        <div className="px-6 pb-2 pt-2">
          <span className="text-[11px] font-semibold tracking-wider text-[#4E6655] uppercase font-mono">
            Personal space
          </span>
        </div>

        {/* Navigation List */}
        <nav className="px-3 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#10291B] text-[#34D399] border border-[#10B981]/30 font-semibold'
                    : 'text-[#8A9E91] hover:text-white hover:bg-[#0D1A11]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#34D399]' : 'text-[#6C8574]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#153322] text-[#34D399] font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#14241A] space-y-4">
        {/* Vault Status Indicator */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-[#0A160F] border border-[#14241A]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white">Vault protected</span>
            <span className="text-[10px] text-[#5D7765]">Synced just now</span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-2 py-2 text-xs font-medium text-[#8A9E91] hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>

        {/* User Profile Card */}
        <div className="flex items-center gap-3 px-2 pt-2 border-t border-[#14241A]/60">
          <div className="w-8 h-8 rounded-full bg-[#152E1E] border border-[#10B981]/30 flex items-center justify-center text-xs font-bold text-[#34D399]">
            {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'HG'}
          </div>
          <div className="flex flex-col text-left overflow-hidden">
            <span className="text-xs font-semibold text-white truncate">
              {user?.full_name || 'Himangi Gupta'}
            </span>
            <span className="text-[10px] text-[#5D7765] truncate">
              Personal account
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
