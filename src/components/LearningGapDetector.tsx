import React, { useState } from 'react';
import {
  GapDifficulty,
  GapQuestion,
  LearningGapAnalysis,
} from '../types';
import {
  generateLearningGapQuestions,
  analyzeLearningGaps,
} from '../services/summaryService';
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Clock,
  ArrowRight,
  Target,
  Rocket,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

interface LearningGapDetectorProps {
  notes: string;
  initialAnalysis?: LearningGapAnalysis;
  onSaveAnalysis?: (analysis: LearningGapAnalysis) => void;
}

export const LearningGapDetector: React.FC<LearningGapDetectorProps> = ({
  notes,
  initialAnalysis,
  onSaveAnalysis,
}) => {
  const [difficulty, setDifficulty] = useState<GapDifficulty>('Mixed');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LearningGapAnalysis | null>(
    initialAnalysis || null
  );
  const [error, setError] = useState<string | null>(null);

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateLearningGapQuestions(
        notes,
        difficulty,
        questionCount
      );
      setQuestions(generated);
      const initialMap: Record<string, string> = {};
      generated.forEach((q) => {
        initialMap[q.id] = '';
      });
      setAnswers(initialMap);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate diagnostic questions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleRunAnalysis = async () => {
    const payload = questions.map((q) => ({
      question: q.question,
      answer: answers[q.id] || '(No answer provided)',
      conceptTested: q.conceptTested,
      difficulty: q.difficulty,
    }));

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeLearningGaps(notes, payload);
      setAnalysis(result);
      if (onSaveAnalysis) {
        onSaveAnalysis(result);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze learning gaps.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;

  return (
    <div id="learning-gap-detector" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              AI Learning Gap Detector
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                Diagnostic Tutor
              </span>
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Identifies hidden misconceptions, evaluates deep comprehension, and formulates a 5-minute targeted revision plan.
            </p>
          </div>
        </div>

        {/* Controls: Difficulty & Count */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty options */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 pl-2 font-medium">Difficulty:</span>
            {(['Easy', 'Medium', 'Hard', 'Mixed'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  difficulty === diff
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Count options */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            {([5, 8, 10] as const).map((cnt) => (
              <button
                key={cnt}
                onClick={() => setQuestionCount(cnt)}
                className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  questionCount === cnt
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {cnt} Qs
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Generate or Questions List */}
      {questions.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Brain className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-slate-800 text-lg mb-1">
            Detect Hidden Gaps in Your Understanding
          </h4>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Gemini will generate {questionCount} probing questions ({difficulty} difficulty) to test if you truly understand the logic or are just memorizing keywords.
          </p>
          <button
            id="generate-diagnostic-questions-btn"
            onClick={handleGenerateQuestions}
            disabled={isGenerating}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Formulating Diagnostic Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Diagnostic Questions ({difficulty})</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm">
              Answer the following to reveal learning gaps:
            </h4>
            <span className="text-xs text-slate-500">
              {answeredCount} of {questions.length} answered
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Question {idx + 1} ({q.difficulty})
                  </span>
                  <span className="text-xs text-slate-400">
                    Probing: <strong className="text-slate-600">{q.conceptTested}</strong>
                  </span>
                </div>

                <p className="font-medium text-slate-900 text-sm sm:text-base">
                  {q.question}
                </p>

                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Explain your understanding in a sentence or two..."
                  rows={2}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                />
              </div>
            ))}
          </div>

          {/* Submit Diagnostic */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleGenerateQuestions}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate Questions
            </button>

            <button
              id="analyze-learning-gaps-btn"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || answeredCount === 0}
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running Cognitive Gap Diagnostics...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Analyze My Learning Gaps ({answeredCount}/{questions.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Deep Learning Gap Analysis Results */}
      {analysis && (
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-rose-50/60 via-white to-pink-50/60 border border-rose-200 shadow-sm space-y-6">
          {/* Header & Score */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  Cognitive Understanding Diagnostics
                </h4>
                <p className="text-xs text-slate-500">
                  AI analysis of genuine grasp vs misconceptions
                </p>
              </div>
            </div>

            <div className="text-center sm:text-right bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
              <div className="text-3xl font-black text-rose-600">
                {Math.round(analysis.understandingScore)} / 100
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Understanding Score
              </div>
            </div>
          </div>

          {/* Grid: What You Understand vs Learning Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-2">
              <h5 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ✅ What You Truly Understand
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysis.whatYouUnderstand.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
              <h5 className="font-bold text-xs text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                ⚠️ Identified Learning Gaps
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysis.learningGaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Misconceptions */}
          <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-2">
            <h5 className="font-bold text-xs text-rose-800 flex items-center gap-1.5 uppercase tracking-wide">
              <XCircle className="w-4 h-4 text-rose-600" />
              ❌ Detected Misconceptions
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {analysis.misconceptions.map((misc, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{misc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Better Explanation */}
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-indigo-200 shadow-2xs space-y-2">
            <h5 className="font-bold text-xs text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Lightbulb className="w-4 h-4 text-indigo-600" />
              💡 Better Explanation (Tailored to Bridge Your Gaps)
            </h5>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {analysis.betterExplanation}
            </p>
          </div>

          {/* 5-Minute Revision Plan & What to Revise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Target className="w-4 h-4 text-purple-600" />
                🎯 High-Yield Topics To Revise
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysis.whatToRevise.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-purple-500 font-bold">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
              <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-amber-600" />
                ⏱️ 5-Minute Precision Revision Plan
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysis.fiveMinuteRevisionPlan.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">⚡</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next Best Step */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-100">
                🚀 Your Next Best Step
              </div>
              <div className="text-xs sm:text-sm font-semibold mt-0.5">
                {analysis.nextBestStep}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
