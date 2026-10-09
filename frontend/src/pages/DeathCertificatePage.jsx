import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, FileCheck2, Fingerprint, History, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const auditStorageKey = (userId) => `vaaris_proof_of_death_audit:${userId || 'session'}`;
const caseStorageKey = (userId) => `vaaris_proof_of_death_case:${userId || 'session'}`;

async function hashAuditEntry(entry) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure audit hashing is unavailable in this browser context.');
  }
  const content = JSON.stringify({
    previousHash: entry.previousHash,
    timestamp: entry.timestamp,
    action: entry.action,
    reviewer: entry.reviewer || '',
    rationaleHash: entry.rationaleHash || ''
  });
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function DeathCertificatePage() {
  const { user } = useContext(AuthContext);
  const [evidence, setEvidence] = useState([]);
  const [sourceName, setSourceName] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [rationale, setRationale] = useState('');
  const [reviewRequested, setReviewRequested] = useState(false);
  const [decision, setDecision] = useState('PENDING');
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditIntegrity, setAuditIntegrity] = useState('checking');
  const [caseLoaded, setCaseLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const saved = localStorage.getItem(auditStorageKey(user?.id));
        const entries = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(entries)) throw new Error('Saved audit log has an invalid format.');

        let previousHash = 'GENESIS';
        for (const entry of entries) {
          if (entry.previousHash !== previousHash || await hashAuditEntry(entry) !== entry.hash) {
            setAuditIntegrity('invalid');
            setAuditEntries(entries);
            return;
          }
          previousHash = entry.hash;
        }

        setAuditEntries(entries);
        setAuditIntegrity('valid');
      } catch (loadError) {
        console.error('Failed to verify proof-of-death audit log:', loadError);
        setAuditIntegrity('unavailable');
        setError(loadError.message || 'Audit log could not be verified.');
      }

      try {
        const savedCase = localStorage.getItem(caseStorageKey(user?.id));
        if (savedCase) {
          const parsedCase = JSON.parse(savedCase);
          const validEvidence = Array.isArray(parsedCase.evidence) && parsedCase.evidence.every(
            (item) => item.id && item.source && item.reference && ['PENDING', 'CORROBORATED', 'CONFLICT'].includes(item.status)
          );
          if (!validEvidence || !['PENDING', 'APPROVED', 'REJECTED'].includes(parsedCase.decision)) {
            throw new Error('Saved verification case has an invalid format.');
          }
          setEvidence(parsedCase.evidence);
          setReviewRequested(Boolean(parsedCase.reviewRequested));
          setDecision(parsedCase.decision);
        }
      } catch (caseError) {
        console.error('Failed to load saved proof-of-death case:', caseError);
        setError(caseError.message || 'Saved verification case could not be loaded.');
      } finally {
        setCaseLoaded(true);
      }
    };
    loadAudit();
  }, [user?.id]);

  const confirmedCount = evidence.filter((item) => item.status === 'CORROBORATED').length;
  const conflictCount = evidence.filter((item) => item.status === 'CONFLICT').length;
  const needsManualReview = conflictCount > 0 || confirmedCount < 2;
  const auditReady = auditIntegrity === 'valid' && caseLoaded;
  const caseLocked = decision !== 'PENDING';
  const latestProof = decision === 'PENDING' ? null : auditEntries[auditEntries.length - 1]?.hash;
  const caseStatus = useMemo(() => {
    if (decision !== 'PENDING') return decision;
    if (conflictCount) return 'SUSPICIOUS — CONFLICT DETECTED';
    if (confirmedCount < 2) return 'AWAITING INDEPENDENT EVIDENCE';
    return 'READY FOR HUMAN REVIEW';
  }, [confirmedCount, conflictCount, decision]);

  useEffect(() => {
    if (!caseLoaded) return;
    try {
      localStorage.setItem(caseStorageKey(user?.id), JSON.stringify({ evidence, reviewRequested, decision }));
    } catch (saveError) {
      console.error('Failed to save proof-of-death case:', saveError);
      setError('The verification case could not be saved in this browser.');
    }
  }, [caseLoaded, decision, evidence, reviewRequested, user?.id]);

  const appendAudit = async (action, reviewerName = '', rationaleHash = '') => {
    const previousHash = auditEntries[auditEntries.length - 1]?.hash || 'GENESIS';
    const entry = { timestamp: new Date().toISOString(), action, previousHash, reviewer: reviewerName, rationaleHash };
    entry.hash = await hashAuditEntry(entry);
    const updated = [...auditEntries, entry];
    localStorage.setItem(auditStorageKey(user?.id), JSON.stringify(updated));
    setAuditEntries(updated);
    setAuditIntegrity('valid');
  };

  const addEvidence = async (event) => {
    event.preventDefault();
    const name = sourceName.trim();
    const reference = sourceReference.trim();
    if (!name || !reference) return;
    if (evidence.some((item) => item.source.toLowerCase() === name.toLowerCase())) {
      setError('Each evidence check must come from a distinct source.');
      return;
    }

    try {
      const newEvidence = { id: globalThis.crypto.randomUUID(), source: name, reference, status: 'PENDING' };
      await appendAudit('Independent evidence source added');
      setEvidence((current) => [...current, newEvidence]);
      setSourceName('');
      setSourceReference('');
      setError('');
    } catch (auditError) {
      console.error('Failed to record evidence addition:', auditError);
      setError(auditError.message || 'Could not append the audit entry.');
    }
  };

  const updateEvidence = async (id, status) => {
    const selected = evidence.find((item) => item.id === id);
    if (!selected) return;
    try {
      await appendAudit(`Evidence check updated: ${status.toLowerCase()}`);
      setEvidence((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      setError('');
    } catch (auditError) {
      console.error('Failed to audit evidence update:', auditError);
      setError(auditError.message || 'Could not append the audit entry.');
    }
  };

  const requestReview = async () => {
    try {
      await appendAudit('Human review requested');
      setReviewRequested(true);
      setError('');
    } catch (auditError) {
      console.error('Failed to audit review request:', auditError);
      setError(auditError.message || 'Could not append the audit entry.');
    }
  };

  const recordDecision = async (nextDecision) => {
    if (!reviewRequested || !reviewer.trim() || !rationale.trim()) return;
    if (nextDecision === 'APPROVED' && (confirmedCount < 2 || conflictCount > 0)) return;
    try {
      const rationaleHash = Array.from(
        new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(rationale.trim()))),
        (byte) => byte.toString(16).padStart(2, '0')
      ).join('');
      await appendAudit(`Human decision recorded: ${nextDecision.toLowerCase()}`, reviewer.trim(), rationaleHash);
      setDecision(nextDecision);
      setError('');
    } catch (auditError) {
      console.error('Failed to audit verification decision:', auditError);
      setError(auditError.message || 'Could not append the audit entry.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <header>
        <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
          PRIVACY-FIRST PROOF OF DEATH
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">Proof-of-death privacy firewall</h1>
        <p className="text-sm text-[#8A9E91] mt-1 max-w-3xl">
          Add independent verification sources, compare their findings, flag conflicting records, request a human review, and share the final decision proof with beneficiaries.
        </p>
      </header>

      <div className="text-xs text-[#8A9E91]">
        <a href="https://edistrict.delhigovt.nic.in/" target="_blank" rel="noreferrer" className="text-[#34D399] underline underline-offset-2">
          Delhi e-District citizen services
        </a>
      </div>

      <section className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Independent evidence checks</h2>
            <p className="text-xs text-[#8A9E91] mt-1">Record sources and reference identifiers only—do not upload sensitive documents here.</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono ${needsManualReview ? 'border-amber-400/30 bg-amber-950/30 text-amber-200' : 'border-[#10B981]/30 bg-[#10291B] text-[#34D399]'}`}>
            {caseStatus}
          </span>
        </div>

        <form onSubmit={addEvidence} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} disabled={!auditReady || caseLocked} placeholder="Independent source (e.g. issuing authority)" className="rounded-lg border border-[#24382A] bg-[#060C08] px-3 py-2 text-xs text-white disabled:opacity-50" />
          <input value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} disabled={!auditReady || caseLocked} placeholder="Reference ID (avoid personal details)" className="rounded-lg border border-[#24382A] bg-[#060C08] px-3 py-2 text-xs text-white disabled:opacity-50" />
          <button disabled={!auditReady || caseLocked} className="rounded-lg bg-[#34D399] px-4 py-2 text-xs font-semibold text-black disabled:opacity-50">Add source</button>
        </form>

        <div className="space-y-3">
          {evidence.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#2A3F30] p-5 text-center text-xs text-[#8A9E91]">
              No evidence sources recorded. Add two or more independent sources; one uploaded certificate is not sufficient.
            </div>
          ) : evidence.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-[#16291C] bg-[#080F0A] p-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{item.source}</div>
                <div className="text-[11px] text-[#8A9E91] font-mono">Ref: {item.reference}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono ${item.status === 'CONFLICT' ? 'text-rose-300' : item.status === 'CORROBORATED' ? 'text-[#34D399]' : 'text-amber-200'}`}>{item.status}</span>
                <button type="button" disabled={!auditReady || caseLocked} onClick={() => updateEvidence(item.id, 'CORROBORATED')} className="rounded-md border border-[#10B981]/30 px-2.5 py-1.5 text-[10px] text-[#34D399] disabled:opacity-50">Corroborated</button>
                <button type="button" disabled={!auditReady || caseLocked} onClick={() => updateEvidence(item.id, 'CONFLICT')} className="rounded-md border border-rose-500/30 px-2.5 py-1.5 text-[10px] text-rose-300 disabled:opacity-50">Flag conflict</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#16291C] pt-4">
          <p className="text-xs text-[#8A9E91]">{confirmedCount} corroborated / 2 required · {conflictCount} conflicting record(s)</p>
          <button type="button" onClick={requestReview} disabled={!auditReady || reviewRequested || caseLocked} className="rounded-lg bg-[#10291B] border border-[#10B981]/30 px-4 py-2 text-xs font-semibold text-[#34D399] disabled:opacity-50">
            {reviewRequested ? 'Human review requested' : 'Request human review'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <UserRoundCheck className="w-5 h-5 text-[#34D399]" />
            <div>
              <h2 className="text-base font-bold text-white">Human review decision</h2>
              <p className="text-xs text-[#8A9E91]">Approval is blocked until two sources corroborate and conflicts are resolved.</p>
            </div>
          </div>
          <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Reviewer name / role" className="w-full rounded-lg border border-[#24382A] bg-[#060C08] px-3 py-2 text-xs text-white" />
          <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Decision rationale (keep sensitive personal data out)" rows={3} className="w-full resize-y rounded-lg border border-[#24382A] bg-[#060C08] px-3 py-2 text-xs text-white" />
          <div className="flex gap-2">
            <button type="button" onClick={() => recordDecision('APPROVED')} disabled={!auditReady || !reviewRequested || !reviewer.trim() || !rationale.trim() || confirmedCount < 2 || conflictCount > 0 || caseLocked} className="rounded-lg bg-[#34D399] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Approve</button>
            <button type="button" onClick={() => recordDecision('REJECTED')} disabled={!auditReady || !reviewRequested || !reviewer.trim() || !rationale.trim() || caseLocked} className="rounded-lg border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-300 disabled:opacity-40">Reject</button>
          </div>
        </div>

        <div className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <LockKeyhole className="w-5 h-5 text-[#34D399]" />
            <div>
              <h2 className="text-base font-bold text-white">Beneficiary-safe proof</h2>
              <p className="text-xs text-[#8A9E91]">No evidence references or source records appear in this view.</p>
            </div>
          </div>
          <div className="rounded-xl border border-[#16291C] bg-[#060C08] p-4 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#5D7765]">Verification status</div>
            <div className="text-lg font-bold text-white">{decision}</div>
            {latestProof && <div className="text-[10px] text-[#8A9E91] font-mono break-all">Audit proof: {latestProof}</div>}
            {!latestProof && <div className="text-xs text-[#8A9E91]">No decision recorded yet.</div>}
          </div>
          <div className="flex items-start gap-2 text-xs text-[#9BE7C4]">
            <Fingerprint className="w-4 h-4 mt-0.5 shrink-0" />
            Only the decision and audit digest are shown. Verification documents remain private to the review process.
          </div>
        </div>
      </section>

      <section className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#34D399]" />
            <h2 className="text-sm font-bold text-white">Tamper-evident decision trail</h2>
          </div>
          <span className={`text-[10px] font-mono ${auditIntegrity === 'valid' ? 'text-[#34D399]' : 'text-amber-200'}`}>
            {auditIntegrity === 'valid' ? 'HASH CHAIN VERIFIED' : auditIntegrity === 'checking' ? 'VERIFYING…' : 'INTEGRITY NOT VERIFIED'}
          </span>
        </div>
        {auditEntries.length === 0 ? (
          <p className="text-xs text-[#8A9E91]">No audit events yet. Each recorded check and decision will be chained to the previous SHA-256 digest.</p>
        ) : (
          <div className="space-y-2">
            {auditEntries.slice().reverse().map((entry) => (
              <div key={entry.hash} className="flex items-start gap-3 border-b border-[#16291C]/70 pb-2 last:border-0">
                <BadgeCheck className="w-4 h-4 text-[#34D399] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-white">{entry.action}</div>
                  {entry.reviewer && <div className="text-[10px] text-[#8A9E91]">Reviewer: {entry.reviewer}</div>}
                  <div className="text-[10px] text-[#5D7765] font-mono">{new Date(entry.timestamp).toLocaleString()}</div>
                  <div className="text-[9px] text-[#45634D] font-mono break-all">{entry.hash}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-start gap-2 text-[10px] text-[#8A9E91]">
          <FileCheck2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Demo audit chain is stored in this browser; production-grade tamper resistance requires server-side append-only storage and signing.
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
    </div>
  );
}
