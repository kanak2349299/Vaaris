import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Bell, Cloud, Fingerprint, Link2, Network, Wallet } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const reminderStorageKey = (userId) => `vaaris_legacy_graph_reminders:${userId || 'session'}`;

const iconForCategory = (category = '') => {
  const value = category.toLowerCase();
  if (value.includes('wallet') || value.includes('crypto')) return Wallet;
  if (value.includes('cloud') || value.includes('storage') || value.includes('file')) return Cloud;
  return Fingerprint;
};

export default function LegacyGraphPage() {
  const { user } = useContext(AuthContext);
  const [assets, setAssets] = useState([]);
  const [heirs, setHeirs] = useState([]);
  const [reminders, setReminders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const [assetsResponse, heirsResponse] = await Promise.all([
          api.get('/assets'),
          api.get('/heirs')
        ]);
        setAssets(assetsResponse.data);
        setHeirs(heirsResponse.data);
      } catch (loadError) {
        console.error('Failed to load legacy graph:', loadError);
        setError('Could not load your inventory. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, []);

  const heirNames = useMemo(
    () => new Map(heirs.map((heir) => [heir.id, heir.full_name])),
    [heirs]
  );
  const unassignedAssets = assets.filter((asset) => !asset.assigned_heir_id);
  const assignedAssets = assets.length - unassignedAssets.length;
  const documentedPercent = assets.length ? Math.round((assignedAssets / assets.length) * 100) : 0;

  const setReminder = (assetId, dueDate) => {
    if (!dueDate) return;
    const next = { ...reminders, [assetId]: dueDate };
    try {
      localStorage.setItem(reminderStorageKey(user?.id), JSON.stringify(next));
      setReminders(next);
      setError('');
    } catch (saveError) {
      console.error('Failed to save legacy graph reminder:', saveError);
      setError('The reminder could not be saved in this browser.');
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(reminderStorageKey(user?.id));
      if (stored) setReminders(JSON.parse(stored));
    } catch (loadError) {
      console.error('Failed to load legacy graph reminders:', loadError);
      setError('Saved reminders could not be read. You can still use the graph.');
    }
  }, [user?.id]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans">
      <header>
        <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
          INVENTORY & RELATIONSHIPS
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">Digital legacy graph</h1>
        <p className="text-sm text-[#8A9E91] mt-1 max-w-3xl">
          Map the accounts you have registered, their platforms, and each nominated beneficiary. This graph uses only your Vaaris inventory; it never scans private accounts.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ['Inventory assets', assets.length],
          ['Assigned to a nominee', assignedAssets],
          ['Needs a nominee', unassignedAssets.length]
        ].map(([label, value]) => (
          <div key={label} className="bg-[#0A140E] border border-[#16291C] rounded-xl p-5">
            <div className="text-2xl font-bold text-white">{loading ? '—' : value}</div>
            <div className="text-xs text-[#8A9E91] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <section className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-[#34D399]" />
            <div>
              <h2 className="text-base font-bold text-white">Asset-to-beneficiary map</h2>
              <p className="text-xs text-[#8A9E91]">Account/platform → registered asset → nominee</p>
            </div>
          </div>
          <div className="text-xs text-[#8A9E91]">
            Assigned coverage <span className="text-[#34D399] font-semibold">{loading ? '—' : `${documentedPercent}%`}</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-[#F87171]/30 bg-[#1F0F0F] p-3 text-xs text-[#FCA5A5]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-[#8A9E91] py-8 text-center">Loading registered assets…</div>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A3F30] p-8 text-center">
            <p className="text-sm text-white font-semibold">No registered assets yet</p>
            <p className="text-xs text-[#8A9E91] mt-1">Add accounts, subscriptions, cloud storage, domains, wallets, and important files from Legacy planner.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => {
              const AssetIcon = iconForCategory(asset.category);
              const nominee = heirNames.get(asset.assigned_heir_id);
              const reminder = reminders[asset.id];
              return (
                <article key={asset.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 rounded-xl border border-[#16291C] bg-[#080F0A] p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-[#10291B] flex items-center justify-center text-[#34D399]">
                      <AssetIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{asset.platform || asset.category}</div>
                      <div className="text-[11px] text-[#5D7765] truncate">{asset.category}</div>
                    </div>
                  </div>
                  <ArrowRight className="hidden md:block w-4 h-4 text-[#45634D]" />
                  <div className="flex items-center gap-2 min-w-0">
                    <Link2 className="w-4 h-4 shrink-0 text-[#34D399]" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{asset.name}</div>
                      <div className="text-[11px] text-[#5D7765]">{asset.action_type || 'Action not set'}</div>
                    </div>
                  </div>
                  <ArrowRight className="hidden md:block w-4 h-4 text-[#45634D]" />
                  <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
                    <div className={`text-sm truncate ${nominee ? 'text-[#C7D5C9]' : 'text-amber-300'}`}>
                      {nominee || 'Nominee not assigned'}
                    </div>
                    {!nominee && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="sr-only" htmlFor={`reminder-${asset.id}`}>Reminder date for {asset.name}</label>
                        <input
                          id={`reminder-${asset.id}`}
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={reminder || ''}
                          onChange={(event) => setReminder(asset.id, event.target.value)}
                          className="w-32 rounded-md border border-[#24382A] bg-[#060C08] px-2 py-1.5 text-[10px] text-white"
                        />
                        {reminder ? (
                          <span className="text-[10px] text-[#34D399] whitespace-nowrap">Reminder set</span>
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-amber-300" aria-label="Reminder not set" />
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#10B981]/20 bg-[#091A12] p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-[#34D399] mt-0.5 shrink-0" />
        <p className="text-xs text-[#9BE7C4] leading-relaxed">
          Only assets you add yourself are included. Connected-account discovery is not enabled; no email, cloud drive, domain, or wallet is accessed without your explicit connection.
        </p>
      </section>
    </div>
  );
}
