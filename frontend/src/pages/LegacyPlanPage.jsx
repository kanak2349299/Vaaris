import React, { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import api from '../services/api';
import AssetModal from '../components/AssetModal';

export default function LegacyPlanPage() {
  const [assets, setAssets] = useState([]);
  const [heirs, setHeirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assetsRes, heirsRes] = await Promise.all([
        api.get('/assets'),
        api.get('/heirs')
      ]);
      setAssets(assetsRes.data);
      setHeirs(heirsRes.data);
    } catch (err) {
      console.error('Failed to load assets and heirs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionChange = (id, newAction) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, action_type: newAction } : a));
  };

  const handleNoteChange = (id, newNote) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, description: newNote } : a));
  };

  const handleSaveAsset = async (asset) => {
    try {
      await api.put(`/assets/${asset.id}`, {
        name: asset.name,
        category: asset.category,
        platform: asset.platform,
        description: asset.description,
        access_instructions: asset.access_instructions,
        action_type: asset.action_type,
        assigned_heir_id: asset.assigned_heir_id
      });
      setSaveStatus(prev => ({ ...prev, [asset.id]: true }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [asset.id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const getPillColor = (action) => {
    switch (action) {
      case 'Memorialize': return 'text-[#34D399] border-[#10B981]/40 bg-[#0F2618]';
      case 'Transfer': return 'text-emerald-400 border-emerald-500/40 bg-[#0E2619]';
      case 'Archive': return 'text-teal-400 border-teal-500/40 bg-[#0E2421]';
      case 'Delete': return 'text-rose-400 border-rose-500/40 bg-[#260E12]';
      default: return 'text-[#8A9E91] border-[#1A2E20] bg-[#0D1711]';
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Page Header matching Screenshot 2 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
            YOUR DECISIONS, CLEARLY RECORDED
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Legacy plan
          </h1>
          <p className="text-sm text-[#8A9E91] mt-1">
            Choose what should happen to each asset. Selection never collects account credentials.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#34D399] hover:bg-[#2EB885] text-black font-semibold text-xs transition-all shadow-lg shadow-[#34D399]/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Digital Asset</span>
        </button>
      </div>

      {/* Asset Cards List */}
      {loading ? (
        <div className="p-12 text-center text-[#5D7765] font-mono text-sm">
          Loading legacy directives...
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#0A140E] border border-[#16291C] text-[#8A9E91]">
          No digital assets registered yet. Click "Add Digital Asset" to begin your plan.
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((asset, idx) => {
            const numStr = String(idx + 1).padStart(2, '0');
            const isSaved = saveStatus[asset.id];

            return (
              <div
                key={asset.id}
                className="bg-[#0A140E] border border-[#16291C] rounded-xl p-6 transition-all hover:border-[#1E3626]"
              >
                {/* Card Top Row: Number, Title, Category, Action Pill */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-[#34D399] font-bold mt-1">
                      {numStr}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {asset.name}
                      </h3>
                      <p className="text-xs text-[#5D7765] font-mono mt-0.5">
                        {asset.category}
                      </p>
                    </div>
                  </div>

                  {/* Top Right Action Pill Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono border font-medium ${getPillColor(asset.action_type)}`}>
                    {asset.action_type}
                  </span>
                </div>

                {/* Card Controls Grid: Desired Action dropdown, Handover note input, Save button */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Desired Action dropdown */}
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-[#5D7765] mb-1.5 font-semibold">
                      DESIRED ACTION
                    </label>
                    <select
                      value={asset.action_type}
                      onChange={(e) => handleActionChange(asset.id, e.target.value)}
                      className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34D399] transition-colors"
                    >
                      <option value="Memorialize">Memorialize</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Archive">Archive</option>
                      <option value="Delete">Delete</option>
                    </select>
                  </div>

                  {/* Handover Note input */}
                  <div className="md:col-span-7">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-[#5D7765] mb-1.5 font-semibold">
                      HANDOVER NOTE
                    </label>
                    <input
                      type="text"
                      value={asset.description || ''}
                      onChange={(e) => handleNoteChange(asset.id, e.target.value)}
                      placeholder="e.g. Preserve the photo archive for family."
                      className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34D399] transition-colors"
                    />
                  </div>

                  {/* Save button */}
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleSaveAsset(asset)}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center ${
                        isSaved
                          ? 'bg-[#10B981] text-black'
                          : 'bg-[#16291C] hover:bg-[#1F3A27] text-white'
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Asset Modal */}
      {isModalOpen && (
        <AssetModal
          heirs={heirs}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
