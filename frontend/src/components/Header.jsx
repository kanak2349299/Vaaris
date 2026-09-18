import React, { useContext } from 'react';
import { Search, ExternalLink, MessageSquareText } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Header({ activeTab, onOpenWhatsApp, onOpenHeirView }) {
  const { user } = useContext(AuthContext);

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'identity': return 'Digital identity';
      case 'legacy-planner': return 'Legacy planner';
      case 'vault': return 'Vault (Shamir SSS)';
      case 'nominees': return 'Nominees';
      case 'check-ins': return 'Check-ins (Trigger Engine)';
      case 'guides': return 'Guides';
      default: return 'Legacy planner';
    }
  };

  return (
    <header className="h-16 border-b border-[#14241A] bg-[#060C08]/90 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-[#5D7765]">Personal space</span>
        <span className="text-[#3A4E40]">&gt;</span>
        <span className="text-white font-medium">{getBreadcrumb()}</span>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-3">
        {/* WhatsApp Simulator Trigger Button */}
        <button
          onClick={onOpenWhatsApp}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1F14] border border-[#10B981]/30 text-xs text-[#34D399] hover:bg-[#152E1E] transition-all"
          title="Open WhatsApp Alert Simulator"
        >
          <MessageSquareText className="w-3.5 h-3.5 text-[#34D399]" />
          <span>WhatsApp Alert</span>
        </button>

        {/* View as Heir Button */}
        <button
          onClick={onOpenHeirView}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14241A] text-xs text-[#8A9E91] hover:text-white transition-all"
          title="Simulate Heir View"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Heir Portal</span>
        </button>

        {/* User Badge */}
        <div className="w-7 h-7 rounded-full bg-[#152E1E] border border-[#10B981]/30 flex items-center justify-center text-xs font-semibold text-[#34D399]">
          {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'HG'}
        </div>
      </div>
    </header>
  );
}
