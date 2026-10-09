import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Key, Lock, Unlock, Download, Upload, RefreshCw,
  Copy, Check, AlertTriangle, Eye, EyeOff, Plus, Trash2, Cpu,
  FileKey, Shield, ChevronRight, Info
} from 'lucide-react';
import api from '../services/api';
import {
  generateDEK, encryptVaultData, decryptVaultData,
  splitDEKIntoShamirShares, reconstructDEKFromShamirShares,
  generateNomineeKeyPair, sealShareForNominee, unsealShareWithNomineeKey,
  bytesToBase64, base64ToBytes
} from '../services/vaultCryptoService';

// ─── tiny helpers ──────────────────────────────────────────────────────────────
const slug = (str) => str?.slice(0, 8).toUpperCase() + '…';

function Badge({ children, color = 'green' }) {
  const palette = {
    green: 'bg-[#10291B] border-[#10B981]/40 text-[#34D399]',
    amber: 'bg-amber-950/40 border-amber-700/50 text-amber-300',
    red:   'bg-red-950/40 border-red-800/50 text-red-300',
    blue:  'bg-blue-950/40 border-blue-700/50 text-blue-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${palette[color]}`}>
      {children}
    </span>
  );
}

function Alert({ type = 'info', children }) {
  const cfg = {
    info:    { cls: 'bg-blue-950/30 border-blue-700/40 text-blue-200',   icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" /> },
    success: { cls: 'bg-[#0D2418] border-[#194D2C] text-[#6EE7B7]',     icon: <ShieldCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" /> },
    warning: { cls: 'bg-amber-950/30 border-amber-700/40 text-amber-200',icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> },
    error:   { cls: 'bg-red-950/40 border-red-800/50 text-red-300',      icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /> },
  };
  const { cls, icon } = cfg[type];
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${cls}`}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

// ─── SECURE VAULT TAB ──────────────────────────────────────────────────────────
function SecureVaultTab() {
  const [nominees, setNominees] = useState([]);
  const [loadingNominees, setLoadingNominees] = useState(true);

  // Vault creation form
  const [vaultName, setVaultName] = useState('My Digital Legacy Vault');
  const [threshold, setThreshold] = useState(2);
  const [totalShares, setTotalShares] = useState(3);
  const [fields, setFields] = useState([
    { id: 1, label: 'Bank Account Numbers', value: '', show: false },
    { id: 2, label: 'Important Passwords',  value: '', show: false },
    { id: 3, label: 'Insurance Policy IDs', value: '', show: false },
    { id: 4, label: 'Last Will Notes',      value: '', show: false },
  ]);

  // Nominee keypair generation state (per nominee slot)
  const [nomineeKeys, setNomineeKeys] = useState({}); // { nomineeId: { publicKey, privateKey, downloaded } }

  // Save flow
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [rotationError, setRotationError] = useState('');
  const [rotating, setRotating] = useState(false);

  // Vault list
  const [vaults, setVaults] = useState([]);
  const [loadingVaults, setLoadingVaults] = useState(false);

  // Recovery flow
  const [recovering, setRecovering] = useState(false);
  const [recoveryVaultId, setRecoveryVaultId] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState(null);
  const [submittedShares, setSubmittedShares] = useState([]);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [recoveryError, setRecoveryError] = useState('');
  const [decryptedData, setDecryptedData] = useState(null);

  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    api.get('/heirs').then(r => {
      setNominees(r.data || []);
    }).catch(() => setNominees([])).finally(() => setLoadingNominees(false));
    loadVaults();
  }, []);

  const loadVaults = async () => {
    setLoadingVaults(true);
    try {
      const r = await api.get('/vault');
      setVaults(r.data || []);
    } catch { setVaults([]); }
    finally { setLoadingVaults(false); }
  };

  const addField = () => setFields(f => [...f, { id: Date.now(), label: '', value: '', show: false }]);
  const removeField = (id) => setFields(f => f.filter(x => x.id !== id));
  const updateField = (id, key, val) => setFields(f => f.map(x => x.id === id ? { ...x, [key]: val } : x));

  const generateKeyForNominee = (nomineeId) => {
    const kp = generateNomineeKeyPair();
    setNomineeKeys(prev => ({ ...prev, [nomineeId]: { ...kp, downloaded: false } }));
  };

  const downloadPrivateKey = (nominee) => {
    const kd = nomineeKeys[nominee.id];
    if (!kd) return;
    const blob = new Blob([JSON.stringify({
      vaaris_nominee_private_key: kd.privateKey,
      nominee_name: nominee.full_name,
      nominee_email: nominee.email,
      public_key_fingerprint: kd.publicKey.slice(0, 16),
      WARNING: 'KEEP THIS FILE SAFE. This private key is the ONLY way to recover your vault share.',
      generated_at: new Date().toISOString(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaaris_nominee_key_${nominee.full_name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNomineeKeys(prev => ({ ...prev, [nominee.id]: { ...kd, downloaded: true } }));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Core: Encrypt → Split DEK → Seal shares → POST /vault
  const handleCreateVault = async () => {
    setSaveError('');
    setSaveResult(null);

    const activeNominees = nominees.slice(0, totalShares);
    if (activeNominees.length < totalShares) {
      setSaveError(`You need ${totalShares} nominees for this recovery policy. Currently you have ${nominees.length}. Add nominees on the Nominees page first.`);
      return;
    }

    const missingKeys = activeNominees.filter(n => !nomineeKeys[n.id]?.publicKey);
    if (missingKeys.length > 0) {
      setSaveError(`Generate Curve25519 keypairs for all ${totalShares} nominees before saving. Missing: ${missingKeys.map(n => n.full_name).join(', ')}`);
      return;
    }

    const notDownloaded = activeNominees.filter(n => !nomineeKeys[n.id]?.downloaded);
    if (notDownloaded.length > 0) {
      setSaveError(`Download private key files for all nominees before saving: ${notDownloaded.map(n => n.full_name).join(', ')}. They CANNOT be retrieved later.`);
      return;
    }

    const payload = {};
    fields.forEach(f => { if (f.label && f.value) payload[f.label] = f.value; });
    if (Object.keys(payload).length === 0) {
      setSaveError('Please enter at least one piece of sensitive data before saving.');
      return;
    }

    setSaving(true);
    let dek;
    try {
      // 1. Generate DEK
      dek = generateDEK();

      // 2. Encrypt payload
      const encrypted = await encryptVaultData(payload, dek);

      // 3. Split DEK using the selected recovery policy
      const shamirShares = splitDEKIntoShamirShares(dek, threshold, totalShares);

      // 4. Seal each share with the nominee's public key
      const sealedShares = activeNominees.map((nominee, i) => ({
        share_index: i + 1,
        custodian_name: nominee.full_name,
        nominee_id: nominee.id,
        nominee_public_key: nomineeKeys[nominee.id].publicKey,
        encrypted_share_blob: sealShareForNominee(shamirShares[i], nomineeKeys[nominee.id].publicKey),
      }));

      // 5. POST to backend (server only sees ciphertext + sealed blobs)
      const res = await api.post('/vault', {
        name: vaultName,
        description: `Secure vault with ${threshold}-of-${totalShares} Shamir threshold`,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        algorithm: encrypted.algorithm,
        version: encrypted.version,
        threshold,
        total_shares: totalShares,
        shares: sealedShares,
      });

      setSaveResult(res.data);
      setVaults(prev => [res.data, ...prev]);
    } catch (err) {
      setSaveError(err.response?.data?.detail || err.message || 'Encryption failed');
    } finally {
      if (dek) dek.fill(0);
      setSaving(false);
    }
  };

  // Recovery: fetch metadata → user provides private keys → unseal shares → reconstruct DEK → decrypt
  const handleRequestRecovery = async () => {
    setRecoveryError('');
    setRecoveryInfo(null);
    setRecoveryResult(null);
    setDecryptedData(null);
    if (!recoveryVaultId) { setRecoveryError('Enter a Vault ID to recover.'); return; }
    try {
      const r = await api.post('/vault/recovery/request', { vault_id: recoveryVaultId });
      setRecoveryInfo(r.data);
      setThreshold(r.data.threshold);
      setTotalShares(r.data.total_shares);
      setSubmittedShares(Array.from({ length: r.data.threshold }, (_, index) => ({
        share_index: r.data.required_nominees[index]?.share_index ?? null,
        private_key: '',
      })));
    } catch (err) {
      setRecoveryError(err.response?.data?.detail || 'Recovery request failed');
    }
  };

  const handleFileUpload = (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        const privKey = json.vaaris_nominee_private_key || json.privateKey || '';
        setSubmittedShares(prev => prev.map((s, i) => i === idx ? { ...s, private_key: privKey } : s));
      } catch { setRecoveryError('Invalid private key file format.'); }
    };
    reader.readAsText(file);
  };

  const handleCompleteRecovery = async () => {
    setRecoveryError('');
    setRecoveryResult(null);
    setDecryptedData(null);
    setRecovering(true);
    let dek;
    try {
      // 1. Unseal shares client-side
      const unsealedShares = [];
      for (let i = 0; i < submittedShares.length; i++) {
        const { share_index, private_key } = submittedShares[i];
        if (!private_key) throw new Error(`Missing private key for Share ${share_index}`);
        const nomineeInfo = recoveryInfo.required_nominees.find(n => n.share_index === share_index);
        if (!nomineeInfo) throw new Error(`Share index ${share_index} not found in vault`);
        const rawShare = unsealShareWithNomineeKey(nomineeInfo.encrypted_share_blob, private_key.trim());
        unsealedShares.push({ share_index, raw_share: rawShare });
      }
      if (new Set(unsealedShares.map(share => share.share_index)).size !== unsealedShares.length) {
        throw new Error('Choose a different share for each recovery slot.');
      }

      // 2. Validate with backend that the configured share threshold is met
      const res = await api.post('/vault/recovery/complete', {
        vault_id: recoveryVaultId,
        submitted_shares: unsealedShares.map(s => ({ share_index: s.share_index })),
      });

      // 3. Reconstruct DEK client-side
      dek = reconstructDEKFromShamirShares(unsealedShares.map(s => s.raw_share));

      // 4. Decrypt vault payload
      const plaintext = await decryptVaultData(res.data.ciphertext, res.data.nonce, dek);

      setDecryptedData(plaintext);
      setRecoveryResult({ message: res.data.message, algorithm: res.data.algorithm });
    } catch (err) {
      setRecoveryError(err.message || 'Recovery failed');
    } finally {
      if (dek) dek.fill(0);
      setRecovering(false);
    }
  };

  const handleRotateRecoveredVault = async () => {
    setRotationError('');
    if (!recoveryInfo || !decryptedData) {
      setRotationError('Recover and decrypt this vault before changing its policy.');
      return;
    }
    if (activeNominees.length !== totalShares) {
      setRotationError(`Add ${totalShares} nominees before rotating this vault.`);
      return;
    }
    const missingKeys = activeNominees.filter(n => !nomineeKeys[n.id]?.publicKey || !nomineeKeys[n.id]?.downloaded);
    if (missingKeys.length) {
      setRotationError(`Generate and download key files for all selected nominees first: ${missingKeys.map(n => n.full_name).join(', ')}`);
      return;
    }

    setRotating(true);
    let dek;
    try {
      dek = generateDEK();
      const encrypted = await encryptVaultData(decryptedData, dek);
      const shamirShares = splitDEKIntoShamirShares(dek, threshold, totalShares);
      const sealedShares = activeNominees.map((nominee, index) => ({
        share_index: index + 1,
        custodian_name: nominee.full_name,
        nominee_id: nominee.id,
        nominee_public_key: nomineeKeys[nominee.id].publicKey,
        encrypted_share_blob: sealShareForNominee(shamirShares[index], nomineeKeys[nominee.id].publicKey),
      }));

      const response = await api.post('/vault/rotate-key', {
        vault_id: recoveryVaultId,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        algorithm: encrypted.algorithm,
        version: recoveryInfo.version,
        threshold,
        total_shares: totalShares,
        shares: sealedShares,
      });
      setVaults(current => current.map(vault => vault.id === response.data.id ? response.data : vault));
      setRecoveryInfo(current => ({
        ...current,
        version: response.data.version,
        threshold: response.data.threshold,
        total_shares: response.data.total_shares,
        required_nominees: response.data.shares,
      }));
      setSubmittedShares(Array.from({ length: threshold }, (_, index) => ({
        share_index: index + 1,
        private_key: '',
      })));
      setDecryptedData(null);
      setRecoveryResult(null);
    } catch (error) {
      setRotationError(error.response?.data?.detail || error.message || 'Could not securely re-share the vault key.');
    } finally {
      if (dek) dek.fill(0);
      setRotating(false);
    }
  };

  const activeNominees = nominees.slice(0, totalShares);

  return (
    <div className="space-y-8">
      {/* Security Banner */}
      <Alert type="success">
        <strong>Zero-Knowledge Architecture</strong> — Your data is encrypted with AES-256-GCM <em>on this device</em> before it leaves your browser. The server stores only ciphertext. Decryption keys are split using your selected {threshold}-of-{totalShares} Shamir policy and sealed per-nominee with Curve25519 public-key cryptography.
      </Alert>

      {/* ── CREATE VAULT ─────────────────────────────────────────────────── */}
      <section className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10291B] border border-[#10B981]/30 flex items-center justify-center">
            <Lock className="w-4 h-4 text-[#34D399]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Create Secure Vault</h2>
            <p className="text-[11px] text-[#5D7765]">All fields are encrypted before leaving your device</p>
          </div>
          <Badge color="green">AES-256-GCM</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[10px] font-mono uppercase text-[#5D7765]">
            Required trustees to recover
            <select
              value={threshold}
              onChange={event => setThreshold(Number(event.target.value))}
              className="mt-1 block w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs text-white normal-case"
            >
              {Array.from({ length: totalShares - 1 }, (_, index) => index + 2).map(value => (
                <option key={value} value={value}>{value} shares required</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] font-mono uppercase text-[#5D7765]">
            Total trustees / shares
            <select
              value={totalShares}
              onChange={event => {
                const nextTotal = Number(event.target.value);
                setTotalShares(nextTotal);
                setThreshold(current => Math.min(current, nextTotal));
              }}
              className="mt-1 block w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs text-white normal-case"
            >
              {[2, 3, 4, 5].map(value => <option key={value} value={value}>{value} shares</option>)}
            </select>
          </label>
          <p className="sm:col-span-2 text-[11px] text-[#8A9E91]">
            Changing a vault's policy requires recovering it and securely re-sharing a newly encrypted key to all selected trustees.
          </p>
        </div>

        {/* Vault name */}
        <div>
          <label className="block text-[10px] font-mono uppercase text-[#5D7765] mb-1">Vault Name</label>
          <input
            value={vaultName}
            onChange={e => setVaultName(e.target.value)}
            className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#34D399] transition-colors"
          />
        </div>

        {/* Sensitive data fields */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase text-[#5D7765]">Sensitive Data Fields</label>
            <button onClick={addField} className="flex items-center gap-1 text-[#34D399] text-xs hover:text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>
          {fields.map(f => (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
              <input
                value={f.label}
                onChange={e => updateField(f.id, 'label', e.target.value)}
                placeholder="Field name"
                className="col-span-3 bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs text-[#8A9E91] focus:outline-none focus:border-[#34D399] font-mono"
              />
              <div className="col-span-8 relative">
                <input
                  type={f.show ? 'text' : 'password'}
                  value={f.value}
                  onChange={e => updateField(f.id, 'value', e.target.value)}
                  placeholder="Sensitive value (never sent to server in plaintext)"
                  className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 pr-9 text-xs text-white focus:outline-none focus:border-[#34D399] font-mono"
                />
                <button
                  onClick={() => updateField(f.id, 'show', !f.show)}
                  className="absolute right-2.5 top-2.5 text-[#5D7765] hover:text-white"
                >
                  {f.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button onClick={() => removeField(f.id)} className="col-span-1 text-[#5D7765] hover:text-red-400 transition-colors mt-2">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Nominee keypair section */}
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#5D7765] mb-0.5">Nominee Curve25519 Keypairs</div>
            <div className="text-[11px] text-[#5D7765]">
              Generate a unique keypair per nominee. Their Shamir share is sealed with the public key.
              Download and send the private key file — it is the ONLY way to unlock their share.
            </div>
          </div>

          {loadingNominees ? (
            <div className="text-xs text-[#5D7765]">Loading nominees…</div>
          ) : activeNominees.length < totalShares ? (
            <Alert type="warning">
              You need at least {totalShares} nominees for a {threshold}-of-{totalShares} recovery policy. You have {nominees.length}. <br />
              <a href="#/nominees" className="underline text-amber-300">Go to Nominees page →</a>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeNominees.map((nominee, i) => {
                const kd = nomineeKeys[nominee.id];
                return (
                  <div key={nominee.id} className="bg-[#060C08] border border-[#16291C] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#34D399] font-bold">SHARE {i + 1}</span>
                      {kd?.downloaded && <Badge color="green">READY</Badge>}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-[#5D7765] uppercase">Custodian</div>
                      <div className="text-sm text-white font-semibold truncate">{nominee.full_name}</div>
                      <div className="text-[11px] text-[#5D7765] truncate">{nominee.email}</div>
                    </div>
                    {kd ? (
                      <div className="space-y-2">
                        <div className="bg-[#0A140E] border border-[#1E3626] rounded-lg p-2">
                          <div className="text-[9px] font-mono text-[#5D7765] uppercase mb-0.5">Public Key (stored in vault)</div>
                          <div className="text-[10px] font-mono text-[#34D399] break-all">{kd.publicKey.slice(0, 28)}…</div>
                        </div>
                        <button
                          onClick={() => downloadPrivateKey(nominee)}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                            kd.downloaded
                              ? 'bg-[#10291B] border border-[#10B981]/30 text-[#34D399]'
                              : 'bg-amber-900/30 border border-amber-700/50 text-amber-300 animate-pulse'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          {kd.downloaded ? 'Downloaded ✓' : 'Download Private Key →'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateKeyForNominee(nominee.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#10291B] border border-[#10B981]/30 text-[#34D399] text-[11px] font-semibold hover:bg-[#183D29] transition-all"
                      >
                        <Key className="w-3 h-3" /> Generate Keypair
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {saveError && <Alert type="error">{saveError}</Alert>}
        {saveResult && (
          <Alert type="success">
            <strong>Vault created!</strong> ID: <code className="font-mono text-xs">{saveResult.id}</code><br />
            Your data is encrypted and stored. The server has only ciphertext — your DEK was wiped from memory.
          </Alert>
        )}

        <button
          onClick={handleCreateVault}
          disabled={saving || activeNominees.length < totalShares}
          className="w-full py-3 rounded-xl bg-[#34D399] hover:bg-[#2EB885] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#34D399]/10"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {saving ? 'Encrypting & Saving…' : 'Encrypt & Save to Vault'}
        </button>
      </section>

      {/* ── VAULT LIST ──────────────────────────────────────────────────── */}
      {vaults.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-mono uppercase text-[#5D7765] tracking-wider">Your Encrypted Vaults</h3>
          {vaults.map(v => (
            <div key={v.id} className="flex items-center gap-4 bg-[#0A140E] border border-[#16291C] rounded-xl px-5 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#10291B] border border-[#10B981]/20 flex items-center justify-center shrink-0">
                <FileKey className="w-4 h-4 text-[#34D399]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-semibold truncate">{v.name}</div>
                <div className="text-[10px] font-mono text-[#5D7765]">ID: {v.id}</div>
                  <div className="text-[10px] font-mono text-[#5D7765]">{v.threshold}-of-{v.total_shares} recovery policy</div>
              </div>
              <Badge color="green">{v.algorithm}</Badge>
              <Badge color="blue">v{v.version}</Badge>
              <button
                onClick={() => { setRecoveryVaultId(v.id); window.scrollTo(0, document.body.scrollHeight); }}
                className="text-[11px] text-[#34D399] hover:underline flex items-center gap-1"
              >
                Recover <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* ── RECOVERY FLOW ───────────────────────────────────────────────── */}
      <section className="bg-[#0A140E] border border-[#10B981]/20 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10291B] border border-[#10B981]/30 flex items-center justify-center">
            <Unlock className="w-4 h-4 text-[#34D399]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Recover Vault</h2>
            <p className="text-[11px] text-[#5D7765]">Provide the configured number of distinct trustee keys to reconstruct and decrypt</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            value={recoveryVaultId}
            onChange={e => setRecoveryVaultId(e.target.value)}
            placeholder="Paste Vault ID…"
            className="flex-1 bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34D399]"
          />
          <button
            onClick={handleRequestRecovery}
            className="px-4 py-2 rounded-lg bg-[#10291B] border border-[#10B981]/30 text-[#34D399] text-xs font-semibold hover:bg-[#183D29] transition-all flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4" /> Fetch Vault Info
          </button>
        </div>

        {recoveryInfo && (
          <div className="space-y-4">
            <Alert type="info">
              <strong>{recoveryInfo.vault_name}</strong> — {recoveryInfo.algorithm}, Version {recoveryInfo.version}.<br />
              Submit any <strong>{recoveryInfo.threshold} of {recoveryInfo.total_shares}</strong> nominee private key files to decrypt.
            </Alert>

            {submittedShares.map((share, idx) => {
              const nomineeInfo = recoveryInfo.required_nominees.find(n => n.share_index === share.share_index);
              return (
                <div key={idx} className="bg-[#060C08] border border-[#16291C] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#34D399] font-bold">TRUSTEE SHARE {idx + 1}</span>
                    <select
                      value={share.share_index || ''}
                      onChange={e => setSubmittedShares(prev => prev.map((s, i) => i === idx ? { ...s, share_index: Number(e.target.value) } : s))}
                      className="bg-[#0A140E] border border-[#16291C] rounded-lg px-2 py-1 text-[11px] font-mono text-white focus:outline-none"
                    >
                      {recoveryInfo.required_nominees.map(n => (
                        <option key={n.share_index} value={n.share_index}>Share {n.share_index} — {n.custodian_name}</option>
                      ))}
                    </select>
                  </div>
                  {nomineeInfo && (
                    <div className="text-[10px] font-mono text-[#5D7765]">
                      Custodian: {nomineeInfo.custodian_name}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-[#5D7765]">Paste Private Key or Upload File</label>
                    <textarea
                      value={share.private_key}
                      onChange={e => setSubmittedShares(prev => prev.map((s, i) => i === idx ? { ...s, private_key: e.target.value } : s))}
                      placeholder="Paste Base64 private key here…"
                      rows={2}
                      className="w-full bg-[#0A140E] border border-[#16291C] rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:outline-none focus:border-[#34D399] resize-none"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#34D399] hover:text-white transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Upload vaaris_nominee_key_*.json
                      <input type="file" accept=".json" className="hidden" onChange={e => handleFileUpload(idx, e)} />
                    </label>
                    {share.private_key && (
                      <div className="text-[10px] font-mono text-[#34D399]">✓ Key loaded ({share.private_key.length} chars)</div>
                    )}
                  </div>
                </div>
              );
            })}

            {recoveryError && <Alert type="error">{recoveryError}</Alert>}

            <button
              onClick={handleCompleteRecovery}
              disabled={recovering}
              className="w-full py-2.5 rounded-xl bg-[#10291B] hover:bg-[#183D29] border border-[#10B981]/40 text-[#34D399] font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {recovering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              {recovering ? 'Reconstructing DEK & Decrypting…' : 'Reconstruct DEK & Decrypt Vault'}
            </button>
          </div>
        )}

        {decryptedData && (
          <div className="space-y-3 animate-fadeIn">
            <Alert type="success">
              <strong>Vault decrypted successfully!</strong> {recoveryResult?.message}
            </Alert>
            <div className="bg-[#060C08] border border-[#194D2C] rounded-xl p-4 space-y-2">
              <div className="text-[10px] font-mono uppercase text-[#5D7765] mb-2">Decrypted Vault Contents</div>
              {Object.entries(decryptedData).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 py-2 border-b border-[#16291C] last:border-0">
                  <span className="text-[11px] font-mono text-[#5D7765] shrink-0">{k}</span>
                  <span className="text-xs font-mono text-white break-all">{v}</span>
                  <button onClick={() => copyToClipboard(v, k)} className="text-[#5D7765] hover:text-white shrink-0">
                    {copiedKey === k ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
            <Alert type="warning">
              To change this vault's trustee threshold, the DEK and all sealed shares must be regenerated together.
              The server will replace the ciphertext and policy atomically.
            </Alert>
            {rotationError && <Alert type="error">{rotationError}</Alert>}
            <button
              onClick={handleRotateRecoveredVault}
              disabled={rotating}
              className="w-full py-2.5 rounded-xl bg-amber-900/30 hover:bg-amber-900/50 border border-amber-700/50 text-amber-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {rotating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {rotating ? 'Re-encrypting & re-sharing…' : `Re-share with ${threshold}-of-${totalShares} policy`}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── SHAMIR DEMO TAB (original educational UI) ─────────────────────────────────
function ShamirDemoTab() {
  const [vaultData, setVaultData] = useState(null);
  const [customSecret, setCustomSecret] = useState('VAARIS-VAULT-2026-RECOVERY-SEED-ALPHA-9821');
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [selectedShare1, setSelectedShare1] = useState('');
  const [selectedShare2, setSelectedShare2] = useState('');
  const [reconstructionResult, setReconstructionResult] = useState(null);
  const [reconstructing, setReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState('');

  useEffect(() => {
    api.get('/vault/shamir/current').then(r => {
      setVaultData(r.data);
      if (r.data.shares?.length >= 2) {
        setSelectedShare1(r.data.shares[0].share_value);
        setSelectedShare2(r.data.shares[1].share_value);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSplitNew = async () => {
    setLoading(true);
    try {
      const res = await api.post('/vault/shamir/split', { secret: customSecret, threshold: 2, total_shares: 3 });
      setVaultData(res.data);
      setReconstructionResult(null);
      if (res.data.shares?.length >= 2) {
        setSelectedShare1(res.data.shares[0].share_value);
        setSelectedShare2(res.data.shares[2].share_value);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleReconstruct = async () => {
    setReconstructing(true);
    setReconstructError('');
    setReconstructionResult(null);
    try {
      const shares = [selectedShare1, selectedShare2].filter(Boolean);
      if (shares.length < 2 || selectedShare1 === selectedShare2) {
        setReconstructError('Select two DIFFERENT shares. Two copies of the same share cannot reconstruct the polynomial!');
        setReconstructing(false); return;
      }
      const res = await api.post('/vault/shamir/reconstruct', { shares });
      setReconstructionResult(res.data);
    } catch (err) {
      setReconstructError(err.response?.data?.detail || 'Reconstruction failed');
    } finally { setReconstructing(false); }
  };

  return (
    <div className="space-y-6">
      <Alert type="info">
        This is the <strong>educational demo</strong> of Shamir's Secret Sharing. Secrets are split/reconstructed server-side for demonstration purposes only. For production use, switch to the <strong>Secure Vault</strong> tab where everything happens client-side.
      </Alert>

      {/* Secret input */}
      <div className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          <Key className="w-4 h-4 text-[#34D399]" />
          <span>Master Vault Recovery Secret</span>
          <span className="text-[10px] font-mono text-[#5D7765] ml-auto">Prime Field GF(2^521 - 1)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text" value={customSecret}
            onChange={e => setCustomSecret(e.target.value)}
            className="md:col-span-9 bg-[#060C08] border border-[#16291C] rounded-lg px-3.5 py-2 text-xs font-mono text-[#34D399] focus:outline-none focus:border-[#34D399]"
          />
          <button onClick={handleSplitNew} disabled={loading}
            className="md:col-span-3 py-2 px-4 rounded-lg bg-[#34D399] hover:bg-[#2EB885] text-black font-semibold text-xs flex items-center justify-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-Split into 3 Shares
          </button>
        </div>
      </div>

      {/* Share cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-mono text-[#5D7765] uppercase tracking-wider">Generated Cryptographic Shares (Total: 3)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vaultData?.shares?.map((share, idx) => (
            <div key={share.share_index} className="bg-[#0A140E] border border-[#16291C] rounded-xl p-5 space-y-4 hover:border-[#1E3626] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#34D399]">SHARE 0{share.share_index}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#122417] text-[#8A9E91] border border-[#1A2E20]">
                  {share.share_label?.split(' ')[0] ?? `Share ${share.share_index}`}
                </span>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#5D7765] uppercase">Designated Custodian</div>
                <div className="text-sm font-semibold text-white mt-0.5 truncate">{share.custodian}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#5D7765] uppercase">Share Hash Value</div>
                <div className="mt-1 bg-[#060C08] border border-[#16291C] rounded-lg p-2.5 text-[11px] font-mono text-[#8A9E91] break-all flex items-center justify-between gap-2">
                  <span className="truncate">{share.share_value}</span>
                  <button onClick={() => handleCopy(share.share_value, idx)} className="text-[#5D7765] hover:text-white shrink-0">
                    {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reconstruction */}
      <div className="bg-[#0A140E] border border-[#10B981]/30 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-[#34D399]" />
          <div>
            <h3 className="text-base font-bold text-white">Live Reconstruction Simulator (Lagrange Proof)</h3>
            <p className="text-xs text-[#8A9E91]">Select any 2 of the 3 shares to reconstruct the master secret.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[selectedShare1, selectedShare2].map((val, i) => (
            <div key={i}>
              <label className="block text-[10px] font-mono text-[#5D7765] uppercase mb-1">Select {i === 0 ? 'First' : 'Second'} Share:</label>
              <select
                value={val}
                onChange={e => i === 0 ? setSelectedShare1(e.target.value) : setSelectedShare2(e.target.value)}
                className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#34D399]"
              >
                {vaultData?.shares?.map(s => (
                  <option key={s.share_index} value={s.share_value}>Share {s.share_index} — {s.custodian}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {reconstructError && <Alert type="error">{reconstructError}</Alert>}
        <button onClick={handleReconstruct} disabled={reconstructing}
          className="w-full py-2.5 rounded-lg bg-[#10291B] hover:bg-[#183D29] border border-[#10B981]/50 text-[#34D399] font-semibold text-xs flex items-center justify-center gap-2">
          <Unlock className="w-4 h-4" />
          {reconstructing ? 'Evaluating Polynomial…' : 'Reconstruct Master Secret (Combine Shares)'}
        </button>
        {reconstructionResult && (
          <div className="p-4 rounded-xl bg-[#0D2418] border border-[#194D2C] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#34D399]">
              <ShieldCheck className="w-4 h-4" />{reconstructionResult.message}
            </div>
            <div className="p-2.5 rounded-lg bg-[#060C08] border border-[#16291C] font-mono text-xs text-white">
              <span className="text-[#5D7765]">RECOVERED SECRET: </span>
              <span className="text-[#34D399] font-bold">{reconstructionResult.reconstructed_secret}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function VaultPage() {
  const [tab, setTab] = useState('secure');

  const tabs = [
    { id: 'secure', label: 'Secure Vault', icon: <Shield className="w-4 h-4" /> },
    { id: 'demo',   label: 'Shamir Demo',  icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-7 font-sans">
      {/* Page header */}
      <div>
        <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
          CRYPTOGRAPHIC GUARANTEE
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white flex flex-wrap items-center gap-3">
          Secure Vault
          <Badge color="green">AES-256-GCM + configurable Shamir</Badge>
          <Badge color="blue">Curve25519</Badge>
        </h1>
        <p className="text-sm text-[#8A9E91] mt-1 max-w-2xl">
          Zero-knowledge digital legacy vault. Your data never leaves your device in plaintext.
          The configured number of nominees can reconstruct the key and decrypt.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#060C08] border border-[#16291C] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-[#10291B] border border-[#10B981]/40 text-[#34D399]'
                : 'text-[#5D7765] hover:text-white'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'secure' ? <SecureVaultTab /> : <ShamirDemoTab />}
    </div>
  );
}
