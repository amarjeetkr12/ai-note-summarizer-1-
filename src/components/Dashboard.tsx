import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  SummaryResult,
  SummaryDocument,
  GeneratedPracticeQuestion,
  PracticeSummaryReport,
  LearningGapAnalysis,
  ChatMessage,
} from '../types';
import {
  summarizeNotesWithGemini,
  saveSummaryToFirestore,
  updateSummaryInFirestore,
} from '../services/summaryService';
import { ExplanationCard } from './ExplanationCard';
import { SmartExplanationActions } from './SmartExplanationActions';
import { ChatWithNotes } from './ChatWithNotes';
import { PracticeQuestionsSection } from './PracticeQuestionsSection';
import { LearningGapDetector } from './LearningGapDetector';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Brain,
  Layers,
  CheckCircle2,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface DashboardProps {
  initialDocument?: SummaryDocument | null;
  onSummarySaved?: () => void;
  onNavigateToHistory: () => void;
  onClearInitialDocument?: () => void;
}

type StudyToolTab = 'guide' | 'chat' | 'practice' | 'gaps' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({
  initialDocument,
  onSummarySaved,
  onNavigateToHistory,
  onClearInitialDocument,
}) => {
  const { user } = useAuth();
  const [noteText, setNoteText] = useState(initialDocument?.originalText || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(initialDocument || null);
  const [savedDocId, setSavedDocId] = useState<string | null>(initialDocument?.id || null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active study mode tab
  const [activeTab, setActiveTab] = useState<StudyToolTab>('guide');

  // Triggered prompt for Chat
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);

  // Chat messages state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    initialDocument?.chatHistory || []
  );

  // Practice questions state
  const [practiceQuestions, setPracticeQuestions] = useState<GeneratedPracticeQuestion[]>(
    initialDocument?.practiceQuestionsList || []
  );
  const [practiceReport, setPracticeReport] = useState<PracticeSummaryReport | undefined>(
    initialDocument?.practiceReport
  );

  // Learning gap state
  const [learningGapAnalysis, setLearningGapAnalysis] = useState<LearningGapAnalysis | undefined>(
    initialDocument?.learningGapAnalysis
  );

  useEffect(() => {
    if (initialDocument) {
      setNoteText(initialDocument.originalText);
      setResult(initialDocument);
      setSavedDocId(initialDocument.id);
      setPracticeQuestions(initialDocument.practiceQuestionsList || []);
      setPracticeReport(initialDocument.practiceReport);
      setLearningGapAnalysis(initialDocument.learningGapAnalysis);
      setChatHistory(initialDocument.chatHistory || []);
    }
  }, [initialDocument]);

  const handleGenerateSummary = async () => {
    const text = noteText.trim();
    if (!text) {
      setError('Please enter your notes before analyzing.');
      return;
    }
    if (text.length < 10) {
      setError('Notes are too short. Please enter at least 10 characters.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setSavedSuccess(false);

    try {
      const summaryData = await summarizeNotesWithGemini(text);
      setResult(summaryData);
      setPracticeQuestions([]);
      setPracticeReport(undefined);
      setLearningGapAnalysis(undefined);
      setActiveTab('guide');

      if (user) {
        const newDocId = await saveSummaryToFirestore(user.uid, text, summaryData);
        setSavedDocId(newDocId);
        setSavedSuccess(true);
        if (onSummarySaved) {
          onSummarySaved();
        }
      }
    } catch (err: any) {
      console.error('Explain error:', err);
      setError(err?.message || 'Failed to explain notes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSmartAction = (promptText: string) => {
    setChatPrompt(promptText);
    setActiveTab('chat');
    setTimeout(() => {
      const el = document.getElementById('chat-with-notes');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handleSaveQuestions = async (
    questionsList: GeneratedPracticeQuestion[],
    rep?: PracticeSummaryReport
  ) => {
    setPracticeQuestions(questionsList);
    if (rep) {
      setPracticeReport(rep);
    }
    if (savedDocId && user) {
      try {
        await updateSummaryInFirestore(savedDocId, {
          practiceQuestionsList: questionsList,
          ...(rep ? { practiceReport: rep } : {}),
        });
      } catch (err) {
        console.warn('Could not persist practice questions:', err);
      }
    }
  };

  const handleSaveLearningGap = async (analysis: LearningGapAnalysis) => {
    setLearningGapAnalysis(analysis);
    if (savedDocId && user) {
      try {
        await updateSummaryInFirestore(savedDocId, {
          learningGapAnalysis: analysis,
        });
      } catch (err) {
        console.warn('Could not persist learning gap analysis:', err);
      }
    }
  };

  const handleSaveChatHistory = async (messages: ChatMessage[]) => {
    setChatHistory(messages);
    if (savedDocId && user) {
      try {
        await updateSummaryInFirestore(savedDocId, {
          chatHistory: messages,
        });
      } catch (err) {
        console.warn('Could not persist chat history:', err);
      }
    }
  };

  const handleStartNewNote = () => {
    setNoteText('');
    setResult(null);
    setSavedDocId(null);
    setSavedSuccess(false);
    setPracticeQuestions([]);
    setPracticeReport(undefined);
    setLearningGapAnalysis(undefined);
    setChatHistory([]);
    setActiveTab('guide');
    if (onClearInitialDocument) {
      onClearInitialDocument();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* App Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-100">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Smart AI Study Assistant &amp; Topic Explainer</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              AI Note Explainer &amp; Study Assistant
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Turn complex notes into structured 8-part study guides, test your mastery with flexible practice questions, converse with your AI tutor, and pinpoint learning gaps.
            </p>
          </div>
          {result && (
            <button
              onClick={handleStartNewNote}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Notes</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Box Card (collapsible or styled) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="note-input"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            Input Study Notes
          </label>
          <span className="text-xs text-slate-400">
            {noteText.trim() ? `${noteText.trim().split(/\s+/).length} words • ${noteText.length} characters` : '0 words'}
          </span>
        </div>

        <textarea
          id="note-input"
          rows={6}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Paste your lecture notes, textbook excerpts, research summaries, or study guide concepts here..."
          className="w-full p-4 text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white resize-y transition"
          disabled={isLoading}
        />

        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Generates 8-part topic breakdown, flexible practice questions, and activates AI tutor chat.
          </p>

          <button
            id="generate-summary-btn"
            onClick={handleGenerateSummary}
            disabled={isLoading || !noteText.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing &amp; Transforming Notes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Explain &amp; Generate Study Guide</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Study Assistant Workspace */}
      {result && !isLoading && (
        <div className="space-y-6">
          {savedSuccess && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-2xs">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Study guide and assistant workspace saved to Cloud Firestore!</span>
              </span>
              <button
                onClick={onNavigateToHistory}
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                <span>View Saved History</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Smart Tool Navigation Bar */}
          <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('guide')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'guide'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>📖 Study Guide</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>💬 Chat Tutor</span>
              </button>

              <button
                onClick={() => setActiveTab('practice')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'practice'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>✍️ Practice Questions</span>
                {practiceQuestions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-800 text-[10px]">
                    {practiceQuestions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('gaps')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === 'gaps'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>🧠 Learning Gap Detector</span>
              </button>
            </div>

            <button
              onClick={() => setActiveTab(activeTab === 'all' ? 'guide' : 'all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {activeTab === 'all' ? 'Focus Tabs' : 'View All on One Page'}
              </span>
            </button>
          </div>

          {/* Quick Smart Actions Bar (Always visible or in guide view) */}
          <SmartExplanationActions onSelectAction={handleTriggerSmartAction} />

          {/* SECTION 1: 8-Part Explanation Card */}
          {(activeTab === 'guide' || activeTab === 'all') && (
            <div className="space-y-4">
              <ExplanationCard
                data={result}
                titleSuffix={
                  <span className="text-xs font-normal text-slate-400">
                    Comprehensive Study Guide
                  </span>
                }
              />
            </div>
          )}

          {/* SECTION 2: Chat with Your Notes */}
          {(activeTab === 'chat' || activeTab === 'all') && (
            <ChatWithNotes
              notes={noteText}
              summaryData={result}
              initialPrompt={chatPrompt}
              onClearInitialPrompt={() => setChatPrompt(null)}
              savedChatHistory={chatHistory}
              onSaveChatHistory={handleSaveChatHistory}
            />
          )}

          {/* SECTION 3: Flexible AI Practice Questions */}
          {(activeTab === 'practice' || activeTab === 'all') && (
            <PracticeQuestionsSection
              notes={noteText}
              initialQuestions={practiceQuestions}
              initialReport={practiceReport}
              onSaveQuestions={handleSaveQuestions}
            />
          )}

          {/* SECTION 4: AI Learning Gap Detector */}
          {(activeTab === 'gaps' || activeTab === 'all') && (
            <LearningGapDetector
              notes={noteText}
              initialAnalysis={learningGapAnalysis}
              onSaveAnalysis={handleSaveLearningGap}
            />
          )}
        </div>
      )}
    </div>
  );
};
