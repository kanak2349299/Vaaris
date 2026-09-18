import React, { useState, useContext } from 'react';
import { Fingerprint, Eye, EyeOff, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function LoginPage() {
  const { login, loginDemo } = useContext(AuthContext);
  const [isSignIn, setIsSignIn] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('himangi@example.com');
  const [password, setPassword] = useState('legacy2026');
  const [phone, setPhone] = useState('+919876543210');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamically extract name from email or input
  const getDisplayName = () => {
    if (!isSignIn && fullName.trim()) {
      return fullName.trim().split(' ')[0];
    }
    if (!email || !email.includes('@')) return 'Himangi';
    const username = email.split('@')[0];
    const clean = username.replace(/[^a-zA-Z]/g, ' ').trim().split(' ')[0];
    if (!clean) return 'Himangi';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignIn) {
        // Attempt login
        try {
          await login(email, password);
        } catch (loginErr) {
          // If user doesn't exist yet, auto-register so ANY email works seamlessly!
          const derivedName = getDisplayName() + ' Gupta';
          const regRes = await api.post('/auth/register', {
            full_name: derivedName,
            email,
            password,
            phone
          });
          localStorage.setItem('vaaris_token', regRes.data.access_token);
          window.location.reload();
        }
      } else {
        // Register new account
        const regRes = await api.post('/auth/register', {
          full_name: fullName || (getDisplayName() + ' User'),
          email,
          password,
          phone
        });
        localStorage.setItem('vaaris_token', regRes.data.access_token);
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. You can also click "Try the demo account".');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setLoading(true);
    setError('');
    try {
      await loginDemo();
    } catch (err) {
      setError('Failed to load demo account.');
    } finally {
      setLoading(false);
    }
  };

  const displayName = getDisplayName();

  return (
    <div className="min-h-screen bg-[#060C08] text-white flex flex-col justify-between p-8 md:p-12 relative overflow-hidden font-sans select-none">
      {/* Top Navbar */}
      <div className="flex items-center gap-3 z-10">
        <div className="w-8 h-8 rounded-lg bg-[#0F2317] border border-[#10B981]/40 flex items-center justify-center shadow-lg shadow-[#10B981]/15">
          <span className="text-[#34D399] font-bold text-base tracking-tighter font-mono">V</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-white flex items-center">
          vaaris<span className="text-[#34D399]">.</span>
        </span>
      </div>

      {/* Main Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto z-10">
        {/* Left Hero Section with Orbital Graphic */}
        <div className="lg:col-span-7 space-y-8 relative">
          <div className="absolute -top-24 -left-20 w-[550px] h-[550px] pointer-events-none opacity-40">
            <div className="radar-circle w-96 h-96"></div>
            <div className="radar-circle w-72 h-72"></div>
            <div className="radar-circle w-48 h-48 border-[#10B981]/25"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#0E1F14] border border-[#10B981]/40 flex items-center justify-center shadow-lg shadow-[#10B981]/20">
                <Fingerprint className="w-7 h-7 text-[#34D399]" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[#5D7765] mt-1 font-semibold uppercase">YOU</span>
            </div>
            <div className="absolute top-16 left-32 px-2 py-0.5 rounded border border-[#1A2E20] bg-[#0A160F] text-[9px] font-mono text-[#8A9E91] tracking-wider uppercase">
              MEMORIES
            </div>
            <div className="absolute bottom-24 right-20 px-2 py-0.5 rounded border border-[#1A2E20] bg-[#0A160F] text-[9px] font-mono text-[#8A9E91] tracking-wider uppercase">
              WALLET
            </div>
            <div className="absolute top-28 right-32 w-1.5 h-1.5 rounded-full bg-[#34D399] opacity-70"></div>
            <div className="absolute bottom-36 left-28 w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-60"></div>
          </div>

          <div className="relative z-10 max-w-xl space-y-4">
            <div className="text-[11px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold">
              PRIVATE BY DESIGN
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white">
              Your digital life deserves a thoughtful afterlife.
            </h1>
            <p className="text-base md:text-lg text-[#8A9E91] font-normal leading-relaxed max-w-lg pt-2">
              Decide what happens to your accounts, memories and assets — while you are still in control.
            </p>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-[#0A140E] border border-[#16291C] rounded-2xl p-7 shadow-2xl relative transition-all">
            <div className="flex justify-end mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0D1C13] border border-[#10B981]/20 text-[10px] font-mono text-[#8A9E91] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span>
                PRIVATE SESSION
              </span>
            </div>

            <div className="flex gap-6 border-b border-[#16291C] pb-3 mb-6">
              <button
                type="button"
                onClick={() => setIsSignIn(true)}
                className={`text-sm font-medium transition-colors relative ${
                  isSignIn ? 'text-white' : 'text-[#5D7765] hover:text-white'
                }`}
              >
                Sign in
                {isSignIn && (
                  <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#34D399]"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsSignIn(false)}
                className={`text-sm font-medium transition-colors relative ${
                  !isSignIn ? 'text-white' : 'text-[#5D7765] hover:text-white'
                }`}
              >
                Create account
                {!isSignIn && (
                  <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#34D399]"></span>
                )}
              </button>
            </div>

            <div className="space-y-1 mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#5D7765] uppercase font-semibold">
                {isSignIn ? 'WELCOME BACK' : 'GET STARTED'}
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight transition-all">
                {isSignIn ? `Welcome back, ${displayName}.` : `Welcome, ${displayName}.`}
              </h2>
              <p className="text-xs text-[#8A9E91]">
                Your digital legacy is waiting in a protected space.
              </p>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSignIn && (
                <div>
                  <label className="block text-[11px] font-mono text-[#8A9E91] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Himangi Gupta"
                    required
                    className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#34D399] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-[#8A9E91] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="himangi@example.com"
                  required
                  className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#34D399] transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-[#8A9E91]">
                    Password
                  </label>
                  {isSignIn && (
                    <button
                      type="button"
                      className="text-[11px] text-[#34D399] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full bg-[#060C08] border border-[#16291C] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#34D399] transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5D7765] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#34D399] hover:bg-[#2EB885] text-black font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#34D399]/15"
              >
                <span>{loading ? 'Entering...' : 'Enter Vaaris'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-[#16291C]">
              <button
                type="button"
                onClick={handleDemoClick}
                disabled={loading}
                className="w-full text-left p-3.5 rounded-xl bg-[#0F2417]/80 hover:bg-[#153321] border border-[#10B981]/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#14301F] flex items-center justify-center text-[#34D399]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#34D399] transition-colors">
                      Try the demo account
                    </div>
                    <div className="text-[11px] text-[#5D7765]">
                      Explore every feature instantly
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#5D7765] group-hover:text-[#34D399] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <p className="text-[10px] text-[#4E6655] text-center mt-4 leading-relaxed">
              By continuing, you agree to keep your recovery plan accurate and private.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 z-10 pt-6">
        <Shield className="w-4 h-4 text-[#34D399]" />
        <div>
          <span className="text-xs font-semibold text-white">One calm place for your legacy.</span>{' '}
          <span className="text-xs text-[#5D7765]">Plans, nominees and encrypted recovery.</span>
        </div>
      </div>
    </div>
  );
}
