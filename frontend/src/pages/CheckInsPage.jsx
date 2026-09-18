import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, CheckCircle2, RotateCcw, Play, AlertCircle, ArrowRight, MessageSquare } from 'lucide-react';
import api from '../services/api';

export default function CheckInsPage({ onOpenWhatsApp, onOpenHeirPortal }) {
  const [triggerStatus, setTriggerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    loadTrigger();
    const interval = setInterval(() => {
      loadTrigger();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (triggerStatus?.grace_period_seconds_remaining > 0) {
      setCountdown(triggerStatus.grace_period_seconds_remaining);
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [triggerStatus]);

  const loadTrigger = async () => {
    try {
      const res = await api.get('/trigger/status');
      setTriggerStatus(res.data);
    } catch (err) {
      console.error('Failed to load trigger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStep = async () => {
    setSimulating(true);
    try {
      const res = await api.post('/trigger/simulate');
      setTriggerStatus(res.data);
      if (res.data.stage_number === 4) {
        // Handover executed, prompt WhatsApp preview
        setTimeout(() => {
          if (onOpenWhatsApp) onOpenWhatsApp();
        }, 1200);
      }
    } catch (err) {
      console.error('Simulate failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    setSimulating(true);
    try {
      const res = await api.post('/trigger/reset');
      setTriggerStatus(res.data);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const stages = [
    { num: 1, title: 'Trigger Initiated', desc: 'Inactivity threshold exceeded or manual emergency request.' },
    { num: 2, title: 'Heartbeat Grace Period', desc: 'Active challenge window for account owner response.' },
    { num: 3, title: 'Multi-party Verification', desc: 'Legal proof and trusted nominee consensus verified.' },
    { num: 4, title: 'Handover Executed', desc: 'Legacy directives unlocked & WhatsApp alerts dispatched.' }
  ];

  const currentStep = triggerStatus?.stage_number || 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold mb-1">
            FAIL-SAFE POSTHUMOUS ENGINE
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Check-ins & Verification
          </h1>
          <p className="text-sm text-[#8A9E91] mt-1">
            Multi-stage verification pipeline preventing premature handover through cryptographic challenges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {triggerStatus?.can_reset && (
            <button
              onClick={handleReset}
              disabled={simulating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#16291C] hover:bg-[#1E3A27] text-xs font-semibold text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          )}

          <button
            onClick={handleSimulateStep}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#34D399] hover:bg-[#2EB885] text-black font-semibold text-xs transition-all shadow-lg shadow-[#34D399]/15"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{currentStep === 0 ? 'Simulate Trigger' : currentStep < 4 ? 'Advance Next Stage' : 'Re-run Trigger'}</span>
          </button>
        </div>
      </div>

      {/* Current State Highlight Banner */}
      <div className={`rounded-2xl p-6 border transition-all ${
        currentStep === 4
          ? 'bg-[#0E2619] border-[#10B981]'
          : currentStep > 0
          ? 'bg-[#1F190D] border-amber-600/40'
          : 'bg-[#0A140E] border-[#16291C]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              currentStep === 4 ? 'bg-[#133823] text-[#34D399]' : currentStep > 0 ? 'bg-amber-950/60 text-amber-400' : 'bg-[#102417] text-[#5D7765]'
            }`}>
              {currentStep === 4 ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#5D7765]">CURRENT STATUS</div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {triggerStatus?.stage_name || 'Safe / Inactive Baseline'}
              </h2>
              <p className="text-xs text-[#8A9E91] mt-0.5">
                {triggerStatus?.trigger_reason || 'System is secure. No emergency signals recorded.'}
              </p>
            </div>
          </div>

          {currentStep === 2 && countdown > 0 && (
            <div className="flex items-center gap-3 bg-[#060C08] border border-amber-700/40 px-4 py-2 rounded-xl">
              <span className="text-xs text-amber-300 font-mono">Grace Countdown:</span>
              <span className="text-lg font-bold font-mono text-amber-400">{countdown}s</span>
            </div>
          )}

          {currentStep === 4 && (
            <button
              onClick={() => onOpenHeirPortal('VR-PRIYA-772')}
              className="px-4 py-2 rounded-lg bg-[#34D399] hover:bg-[#2EB885] text-black font-semibold text-xs flex items-center gap-2"
            >
              <span>Inspect Heir Handover View</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4-Stage Visual Stepper */}
      <div className="bg-[#0A140E] border border-[#16291C] rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#16291C] pb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-[#5D7765] font-semibold">
            CONTROLLED VERIFICATION PIPELINE
          </span>
          <span className="text-xs font-mono text-[#34D399]">
            Stage {currentStep} of 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {stages.map((stage) => {
            const isCompleted = currentStep >= stage.num;
            const isCurrent = currentStep === stage.num;

            return (
              <div
                key={stage.num}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-[#10291B] border-[#10B981] shadow-lg shadow-[#10B981]/15'
                    : isCompleted
                    ? 'bg-[#0E2116] border-[#163D27] text-white'
                    : 'bg-[#060C08] border-[#16291C] text-[#5D7765]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                    isCompleted ? 'bg-[#10B981] text-black' : 'bg-[#14241A] text-[#8A9E91]'
                  }`}>
                    {isCompleted ? '?' : stage.num}
                  </span>
                  <span className="text-[10px] font-mono text-[#5D7765]">STEP 0{stage.num}</span>
                </div>

                <h4 className={`text-sm font-bold mb-1 ${isCompleted ? 'text-white' : 'text-[#8A9E91]'}`}>
                  {stage.title}
                </h4>
                <p className="text-[11px] text-[#5D7765] leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
