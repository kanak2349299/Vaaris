import React, { useState, useEffect, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import LegacyPlanPage from './pages/LegacyPlanPage';
import VaultPage from './pages/VaultPage';
import NomineesPage from './pages/NomineesPage';
import CheckInsPage from './pages/CheckInsPage';
import DigitalIdentityPage from './pages/DigitalIdentityPage';
import DeathCertificatePage from './pages/DeathCertificatePage';
import LegacyGraphPage from './pages/LegacyGraphPage';
import GuidesPage from './pages/GuidesPage';
import HeirPortalPage from './pages/HeirPortalPage';
import WhatsAppModal from './components/WhatsAppModal';
import api from './services/api';

function MainApp() {
  const { user, loading } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('legacy-planner');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [heirTokenView, setHeirTokenView] = useState(null);
  const [appNotice, setAppNotice] = useState('');

  const handleOpenHeirView = async () => {
    setAppNotice('');
    try {
      const response = await api.get('/heirs');
      if (!response.data.length) {
        setAppNotice('Add a nominee before opening the heir portal.');
        return;
      }
      setHeirTokenView(response.data[0].access_token);
    } catch (error) {
      console.error('Failed to load nominees for the heir portal:', error);
      setAppNotice('Could not load the heir portal. Please try again.');
    }
  };
  
  // Interactive Cursor Position for Ambient Spotlight
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check URL pathname for /heir/:token
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/heir/')) {
      const token = path.replace('/heir/', '');
      if (token) setHeirTokenView(token);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060C08] text-white flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-ping"></div>
          <span>Unlocking sovereign vault...</span>
        </div>
      </div>
    );
  }

  // If viewing heir portal directly
  if (heirTokenView) {
    return (
      <div className="min-h-screen bg-[#060C08] text-white relative">
        {/* Cursor Ambient Glow */}
        <div
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.08), transparent 80%)`
          }}
        />
        <div className="relative z-10">
          <HeirPortalPage
            accessToken={heirTokenView}
            onBackToApp={() => {
              setHeirTokenView(null);
              window.history.pushState({}, '', '/');
            }}
          />
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page with interactive cursor spotlight
  if (!user) {
    return (
      <div className="min-h-screen bg-[#060C08] text-white relative transition-opacity duration-700">
        {/* Cursor Ambient Glow */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(52, 211, 153, 0.09), transparent 80%)`
          }}
        />
        <div className="relative z-10 animate-in fade-in duration-500">
          <LoginPage />
        </div>
      </div>
    );
  }

  // Logged in Dashboard Shell
  return (
    <div className="min-h-screen bg-[#060C08] text-white flex relative overflow-hidden font-sans">
      {/* Interactive Cursor Spotlight that persists across all pages */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.08), transparent 80%)`
        }}
      />

      {/* Fixed Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen relative z-10">
        <Header
          activeTab={activeTab}
          onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
          onOpenHeirView={handleOpenHeirView}
        />

        <main className="flex-1 pb-16 animate-in fade-in zoom-in-95 duration-300">
          {appNotice && (
            <div role="alert" className="mx-8 mt-4 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-xs text-amber-200">
              {appNotice}
            </div>
          )}
          {activeTab === 'overview' && <OverviewPage setActiveTab={setActiveTab} />}
          {activeTab === 'legacy-planner' && <LegacyPlanPage />}
          {activeTab === 'vault' && <VaultPage />}
          {activeTab === 'nominees' && (
            <NomineesPage
              onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
              onOpenHeirPortal={(token) => setHeirTokenView(token)}
            />
          )}
          {activeTab === 'check-ins' && (
            <CheckInsPage
              onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
              onOpenHeirPortal={(token) => setHeirTokenView(token)}
            />
          )}
          {activeTab === 'identity' && <DigitalIdentityPage />}
          {activeTab === 'proof-of-death' && <DeathCertificatePage />}
          {activeTab === 'legacy-graph' && <LegacyGraphPage />}
          {activeTab === 'guides' && <GuidesPage />}
        </main>
      </div>

      {/* WhatsApp Dispatch Simulator Modal */}
      {isWhatsAppOpen && (
        <WhatsAppModal
          onClose={() => setIsWhatsAppOpen(false)}
          onOpenHeirPortal={(token) => {
            setIsWhatsAppOpen(false);
            setHeirTokenView(token);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
