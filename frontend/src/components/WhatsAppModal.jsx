import React, { useState, useEffect, useContext } from 'react';
import { X, CheckCheck, Send, ExternalLink, ShieldCheck, Settings, Key, Check } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function WhatsAppModal({ onClose, onOpenHeirPortal }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [config, setConfig] = useState({ twilio_configured: false, mode: 'Mock Simulator' });
  const [heirs, setHeirs] = useState([]);
  const [selectedHeirId, setSelectedHeirId] = useState('');
  const [customPhone, setCustomPhone] = useState('+91');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Twilio setup inputs
  const [showTwilioSettings, setShowTwilioSettings] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('+14155238886');
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioSaveSuccess, setTwilioSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [notifsRes, cfgRes, heirsRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/config-status'),
        api.get('/heirs')
      ]);
      setNotifications(notifsRes.data);
      setConfig(cfgRes.data);
      setHeirs(heirsRes.data);
      if (heirsRes.data.length > 0) {
        setSelectedHeirId(heirsRes.data[0].id);
        setCustomPhone(heirsRes.data[0].phone);
      }
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    }
  };

  const handleHeirChange = (heirId) => {
    setSelectedHeirId(heirId);
    const heir = heirs.find(h => h.id === heirId);
    if (heir) {
      setCustomPhone(heir.phone);
    }
  };

  const selectedHeir = heirs.find(h => h.id === selectedHeirId) || heirs[0];
  const heirToken = selectedHeir?.access_token || 'VR-PRIYA-772';
  const portalUrl = `${window.location.origin}/heir/${heirToken}`;
  const defaultBody = `Vaaris Alert: A digital legacy action associated with ${user?.full_name || 'your trusted contact'} has been reviewed. Access key: ${heirToken}. Tap to view assigned digital assets: ${portalUrl}`;
  const activeMessage = customMessage || defaultBody;

  const handleSaveTwilio = async (e) => {
    e.preventDefault();
    setSavingTwilio(true);
    try {
      await api.post('/notifications/configure-twilio', {
        account_sid: accountSid,
        auth_token: authToken,
        whatsapp_number: twilioNumber
      });
      setTwilioSaveSuccess(true);
      setTimeout(() => setTwilioSaveSuccess(false), 3000);
      await loadData();
    } catch (err) {
      alert('Failed to save Twilio settings: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingTwilio(false);
    }
  };

  const handleSendTwilio = async () => {
    if (!selectedHeirId) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.post('/notifications/test-whatsapp', { 
        heir_id: selectedHeirId,
        custom_message: activeMessage
      });
      setSendResult(res.data);
      await loadData();
    } catch (err) {
      alert('Error sending WhatsApp: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0E2E1B] flex items-center justify-center text-[#25D366]">
              <span className="font-bold text-sm">WA</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Twilio WhatsApp Notification Center</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${config.twilio_configured ? 'bg-[#25D366] animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="text-xs text-[#8A9E91]">
                  Twilio Status: <strong className="text-white">{config.twilio_configured ? 'Active & Ready' : 'Credentials Needed'}</strong>
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#5D7765] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Smartphone Chat Preview */}
        <div className="max-w-sm mx-auto bg-[#070E09] border-2 border-[#16291C] rounded-3xl p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between border-b border-[#16291C] pb-2 text-[11px] text-[#5D7765]">
            <div className="flex items-center gap-2 text-white font-medium">
              <div className="w-6 h-6 rounded-full bg-[#10291B] border border-[#25D366]/40 flex items-center justify-center text-[10px] text-[#25D366] font-bold">
                V
              </div>
              <span>Vaaris Legacy System</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#25D366]" />
            </div>
            <span className="text-[#25D366]">Online</span>
          </div>

          <div className="py-2 min-h-[100px]">
            <div className="bg-[#0D2418] border border-[#19422B] text-white p-3 rounded-2xl rounded-tl-none text-xs space-y-2 shadow-md">
              <p className="leading-relaxed text-[#D2E0D7] text-[11px]">
                {activeMessage}
              </p>
              <div className="flex items-center justify-end gap-1 text-[9px] text-[#5D7765]">
                <span>Just now</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              if (onOpenHeirPortal) onOpenHeirPortal(heirToken);
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#10291B] hover:bg-[#183D29] border border-[#25D366]/30 text-xs font-semibold text-[#25D366] transition-all flex items-center justify-center gap-2"
          >
            <span>Open Heir Portal Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Twilio Dispatch Section */}
        <div className="bg-[#060C08] border border-[#16291C] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#34D399] font-bold">
              SEND VIA TWILIO API
            </span>
            <button
              onClick={() => setShowTwilioSettings(!showTwilioSettings)}
              className="text-xs text-[#34D399] hover:underline flex items-center gap-1 font-mono"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showTwilioSettings ? 'Hide Twilio Keys' : 'Configure Twilio Keys'}</span>
            </button>
          </div>

          {/* Twilio Keys Form */}
          {showTwilioSettings && (
            <form onSubmit={handleSaveTwilio} className="bg-[#0A140E] border border-[#16291C] rounded-lg p-3 space-y-2.5 text-xs animate-fadeIn">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Enter Twilio Credentials</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#5D7765] mb-1">ACCOUNT SID (AC...)</label>
                  <input
                    type="text"
                    required
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    className="w-full bg-[#060C08] border border-[#16291C] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#34D399]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#5D7765] mb-1">AUTH TOKEN</label>
                  <input
                    type="password"
                    required
                    placeholder="Auth token from Twilio console"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    className="w-full bg-[#060C08] border border-[#16291C] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#34D399]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#5D7765]">
                  Keys will be saved to <code className="text-[#34D399]">backend/.env</code>
                </span>
                <button
                  type="submit"
                  disabled={savingTwilio}
                  className="px-3 py-1.5 rounded bg-[#34D399] text-black font-semibold text-xs flex items-center gap-1 hover:bg-[#2EB885]"
                >
                  {twilioSaveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{savingTwilio ? 'Saving...' : twilioSaveSuccess ? 'Saved!' : 'Save Twilio Credentials'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#5D7765] mb-1 uppercase">
                Recipient Nominee
              </label>
              <select
                value={selectedHeirId}
                onChange={(e) => handleHeirChange(e.target.value)}
                className="w-full bg-[#0A140E] border border-[#16291C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34D399]"
              >
                {heirs.map(h => (
                  <option key={h.id} value={h.id}>{h.full_name} ({h.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#5D7765] mb-1 uppercase">
                Target Phone (Include Country Code)
              </label>
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full bg-[#0A140E] border border-[#16291C] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34D399]"
              />
            </div>
          </div>

          <button
            onClick={handleSendTwilio}
            disabled={sending}
            className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-black font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Dispatching via Twilio...' : 'Send WhatsApp Alert via Twilio'}</span>
          </button>

          {sendResult && (
            <div className={`p-3 rounded-lg text-xs font-mono border ${
              sendResult.is_real_twilio
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}>
              {sendResult.is_real_twilio ? (
                <div>? Dispatched to real phone via Twilio WhatsApp API!</div>
              ) : (
                <div>
                  ?? <strong>Twilio credentials not configured yet.</strong> Dispatched in high-fidelity mock mode. Click <strong>&quot;Configure Twilio Keys&quot;</strong> above to enter your Twilio SID & Token!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
