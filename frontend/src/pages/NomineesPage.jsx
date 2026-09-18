import React, { useState, useEffect } from 'react';
import { Plus, Key, Copy, Check, Send, ExternalLink, CheckCircle2, Phone } from 'lucide-react';
import api from '../services/api';
import HeirModal from '../components/HeirModal';

export default function NomineesPage({ onOpenWhatsApp, onOpenHeirPortal }) {
  const [heirs, setHeirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [phoneInput, setPhoneInput] = useState({});
  const [sentStatus, setSentStatus] = useState({});

  useEffect(() => { loadHeirs(); }, []);

  const loadHeirs = async () => {
    try {
      const res = await api.get('/heirs');
      setHeirs(res.data);
    } catch (err) {
      console.error('Failed to load heirs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/heir/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getCleanPhone = (heir) => {
    const custom = phoneInput[heir.id];
    let raw = custom || heir.phone || '';
    let clean = raw.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    return clean;
  };

  const handleWhatsAppSend = (heir) => {
    const clean = getCleanPhone(heir);
    const portalUrl = `${window.location.origin}/heir/${heir.access_token}`;
    const msg = `??? *Vaaris Legacy Alert*\n\nA digital legacy action associated with your trusted contact has been verified.\n\n?? Nominee: ${heir.full_name} (${heir.relationship})\n?? Access Key: ${heir.access_token}\n\n?? *Assigned Assets:*\n• Instagram (Memorialize)\n• Bitcoin Wallet (Transfer via Shamir Shares)\n• Google Photos (Archive)\n• Encrypted Estate Deeds (Transfer)\n\n?? *Open Heir Portal:*\n${portalUrl}\n\n— Vaaris Digital Legacy Platform\n"Your Data. Your Wishes. Your Legacy."`;
    
    const waUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    
    setSentStatus(prev => ({ ...prev, [heir.id]: true }));
    setTimeout(() => setSentStatus(prev => ({ ...prev, [heir.id]: false })), 3000);

    api.post('/notifications/test-whatsapp', {
      heir_id: heir.id,
      custom_message: msg
    }).catch(() => {});
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
            TRUSTED NOMINEES DIRECTORY
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Nominees</h1>
          <p className="text-sm text-[#8A9E91] mt-1">
            Designated individuals who receive your legacy instructions and Shamir cryptographic shares.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#34D399] hover:bg-[#2EB885] text-black font-semibold text-xs transition-all shadow-lg shadow-[#34D399]/10">
          <Plus className="w-4 h-4" /><span>Add Nominee</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#5D7765] font-mono text-sm">Loading trusted nominees...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heirs.map((heir) => (
            <div key={heir.id} className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4 hover:border-[#1E3626] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#10291B] border border-[#10B981]/30 flex items-center justify-center text-sm font-bold text-[#34D399]">
                    {heir.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{heir.full_name}</h3>
                    <span className="text-xs text-[#5D7765] font-mono">{heir.relationship}</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#10291B] text-[#34D399] border border-[#10B981]/30">{heir.status}</span>
              </div>

              <div className="space-y-1 text-xs text-[#8A9E91]">
                <div className="flex items-center justify-between">
                  <span className="text-[#5D7765]">Email:</span><span>{heir.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5D7765]">Permissions:</span>
                  <span className="text-emerald-400 font-mono text-[11px]">{heir.permissions}</span>
                </div>
              </div>

              <div className="bg-[#060C08] border border-[#16291C] rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#8A9E91] font-mono truncate">
                  <Key className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                  <span className="text-[#34D399] font-semibold">{heir.access_token}</span>
                </div>
                <button onClick={() => handleCopyLink(heir.access_token)} className="px-2 py-1 rounded bg-[#10291B] text-[#34D399] text-[10px] font-mono hover:bg-[#163825] flex items-center gap-1 shrink-0">
                  {copiedToken === heir.access_token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedToken === heir.access_token ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#16291C]">
                <div>
                  <label className="block text-[10px] font-mono text-[#5D7765] mb-1 uppercase">
                    Recipient WhatsApp Number (with country code)
                  </label>
                  <input
                    type="text"
                    value={phoneInput[heir.id] !== undefined ? phoneInput[heir.id] : heir.phone}
                    onChange={(e) => setPhoneInput(prev => ({ ...prev, [heir.id]: e.target.value }))}
                    placeholder="+918851241608"
                    className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34D399]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleWhatsAppSend(heir)}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#25D366]/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sentStatus[heir.id] ? 'WhatsApp Opened!' : 'Send WhatsApp Message'}</span>
                  </button>
                  <button
                    onClick={() => onOpenHeirPortal(heir.access_token)}
                    className="py-2.5 px-3 rounded-lg bg-[#16291C] hover:bg-[#1F3A27] text-xs text-white flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /><span>Portal</span>
                  </button>
                </div>

                {sentStatus[heir.id] && (
                  <div className="p-2 rounded-lg text-[11px] font-mono flex items-center gap-1.5 bg-emerald-950/60 text-emerald-300 border border-emerald-700/50">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>WhatsApp opened with pre-filled Vaaris legacy alert! Just tap Send.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <HeirModal onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); loadHeirs(); }} />
      )}
    </div>
  );
}
