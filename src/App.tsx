import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ActiveTab, SummaryDocument } from './types';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import {
  fetchUserSummaries,
  deleteSummaryFromFirestore,
} from './services/summaryService';
import { Sparkles } from 'lucide-react';

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [summaries, setSummaries] = useState<SummaryDocument[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<SummaryDocument | null>(null);

  const loadSummaries = useCallback(async () => {
    if (!user) return;
    setLoadingSummaries(true);
    try {
      const docs = await fetchUserSummaries(user.uid);
      setSummaries(docs);
    } catch (err) {
      console.error('Failed to load user summaries:', err);
    } finally {
      setLoadingSummaries(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSummaries();
    } else {
      setSummaries([]);
    }
  }, [user, loadSummaries]);

  const handleDeleteSummary = async (id: string) => {
    await deleteSummaryFromFirestore(id);
    setSummaries((prev) => prev.filter((s) => s.id !== id));
    if (selectedSummary?.id === id) {
      setSelectedSummary(null);
    }
  };

  const handleSelectSummary = (summary: SummaryDocument) => {
    setSelectedSummary(summary);
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 mb-4 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Loading AI Note Summarizer...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <AuthView />;
  }

  // Signed in dashboard & history views
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summaryCount={summaries.length}
      />

      <main className="flex-1">
        {activeTab === 'dashboard' ? (
          <Dashboard
            initialDocument={selectedSummary}
            onSummarySaved={loadSummaries}
            onNavigateToHistory={() => setActiveTab('history')}
            onClearInitialDocument={() => setSelectedSummary(null)}
          />
        ) : (
          <History
            summaries={summaries}
            loading={loadingSummaries}
            onDeleteSummary={handleDeleteSummary}
            onNavigateToDashboard={() => {
              setSelectedSummary(null);
              setActiveTab('dashboard');
            }}
            onSelectSummary={handleSelectSummary}
            onRefresh={loadSummaries}
          />
        )}
      </main>

      <footer className="py-6 border-t border-slate-200/80 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Note Summarizer</span>
          <span className="text-slate-400">
            Powered by Google Gemini 2.5 Flash, Firebase Authentication & Cloud Firestore
          </span>
        </div>
      </footer>
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
