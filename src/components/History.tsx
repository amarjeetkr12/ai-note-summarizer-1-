import React, { useState } from 'react';
import { SummaryDocument } from '../types';
import { ExplanationCard } from './ExplanationCard';
import {
  Calendar,
  Trash2,
  Sparkles,
  Inbox,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface HistoryProps {
  summaries: SummaryDocument[];
  loading: boolean;
  onDeleteSummary: (id: string) => Promise<void>;
  onNavigateToDashboard: () => void;
  onRefresh: () => void;
  onSelectSummary?: (summary: SummaryDocument) => void;
}

export const History: React.FC<HistoryProps> = ({
  summaries,
  loading,
  onDeleteSummary,
  onNavigateToDashboard,
  onSelectSummary,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this study guide from your history?')) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteSummary(id);
      if (expandedId === id) {
        setExpandedId(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Guide History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your saved explanations and study guides stored in Cloud Firestore.
          </p>
        </div>
        <button
          onClick={onNavigateToDashboard}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-3" />
          <span className="text-xs">Loading your saved study guides...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && summaries.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No study guides yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Your analyzed notes and explanations will automatically be saved here once generated.
          </p>
          <button
            onClick={onNavigateToDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate your first study guide</span>
          </button>
        </div>
      )}

      {/* Summaries List */}
      {!loading && summaries.length > 0 && (
        <div className="space-y-4">
          {summaries.map((item) => {
            const isExpanded = expandedId === item.id;
            const topic = item.topicOverview?.topic || 'Topic Study Guide';
            const description = item.topicOverview?.description || item.summary;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Clickable Header Banner */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded bg-indigo-50 text-indigo-600">
                        <BookOpen className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {topic}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {description}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      {item.keyPoints && (
                        <span>• {item.keyPoints.length} key points</span>
                      )}
                      {item.practiceQuestions && item.practiceQuestions.length > 0 && (
                        <span>• {item.practiceQuestions.length} practice questions</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectSummary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSummary(item);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Open this note in the interactive Study Assistant"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Study with AI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors">
                      <span>{isExpanded ? 'Collapse' : 'View Full Guide'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Full Explanation Card */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40">
                    <ExplanationCard data={item} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

