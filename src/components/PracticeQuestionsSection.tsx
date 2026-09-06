import React, { useState } from 'react';
import {
  GeneratedPracticeQuestion,
  QuestionEvaluation,
  PracticeSummaryReport,
} from '../types';
import {
  generatePracticeQuestions,
  analyzePracticeAnswer,
  computePracticeSummary,
} from '../services/summaryService';
import {
  HelpCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Compass,
} from 'lucide-react';

interface PracticeQuestionsSectionProps {
  notes: string;
  initialQuestions?: GeneratedPracticeQuestion[];
  initialReport?: PracticeSummaryReport;
  onSaveQuestions?: (
    questions: GeneratedPracticeQuestion[],
    report?: PracticeSummaryReport
  ) => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Basic understanding': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  'Conceptual understanding': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  Application: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  Reasoning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  'Challenging questions': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const PracticeQuestionsSection: React.FC<PracticeQuestionsSectionProps> = ({
  notes,
  initialQuestions,
  initialReport,
  onSaveQuestions,
}) => {
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(10);
  const [questions, setQuestions] = useState<GeneratedPracticeQuestion[]>(
    initialQuestions || []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<PracticeSummaryReport | null>(
    initialReport || null
  );
  const [isComputingReport, setIsComputingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (count: 5 | 10 | 15 = questionCount) => {
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generatePracticeQuestions(notes, count);
      setQuestions(generated);
      setReport(null);
      if (onSaveQuestions) {
        onSaveQuestions(generated, undefined);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate practice questions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (questionId: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, studentAnswer: text } : q))
    );
  };

  const handleAnalyze = async (q: GeneratedPracticeQuestion) => {
    if (!q.studentAnswer || !q.studentAnswer.trim()) {
      alert('Please write your answer before submitting for AI analysis.');
      return;
    }

    setQuestions((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, isAnalyzing: true } : item))
    );

    try {
      const evaluation: QuestionEvaluation = await analyzePracticeAnswer(
        notes,
        q.question,
        q.studentAnswer,
        q.conceptTested
      );

      const updated = questions.map((item) =>
        item.id === q.id
          ? { ...item, evaluation, isAnalyzing: false }
          : item
      );
      setQuestions(updated);

      if (onSaveQuestions) {
        onSaveQuestions(updated, report || undefined);
      }
    } catch (err: any) {
      alert(`Evaluation failed: ${err?.message || 'Unknown error'}`);
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, isAnalyzing: false } : item))
      );
    }
  };

  const handleComputeOverallReport = async () => {
    const answered = questions.filter((q) => q.evaluation);
    if (answered.length === 0) {
      alert('Please answer and analyze at least one question first!');
      return;
    }

    setIsComputingReport(true);
    try {
      const computed = await computePracticeSummary(notes, questions);
      setReport(computed);
      if (onSaveQuestions) {
        onSaveQuestions(questions, computed);
      }
    } catch (err: any) {
      alert(`Could not generate overall score: ${err?.message || 'Error'}`);
    } finally {
      setIsComputingReport(false);
    }
  };

  const answeredCount = questions.filter((q) => q.evaluation).length;

  return (
    <div id="practice-questions-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Flexible AI Practice Questions
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Mixed Difficulties
              </span>
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Targeted questions testing basic recall, comprehension, application, and reasoning from your notes.
            </p>
          </div>
        </div>

        {/* Quantity Selector buttons */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
          <span className="text-xs font-medium text-slate-500 pl-2">Quantity:</span>
          {([5, 10, 15] as const).map((cnt) => (
            <button
              key={cnt}
              onClick={() => {
                setQuestionCount(cnt);
                handleGenerate(cnt);
              }}
              disabled={isGenerating}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                questionCount === cnt
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {cnt} Questions
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* When no questions yet or user wants to re-generate */}
      {questions.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-slate-800 text-lg mb-1">
            Ready to test your mastery?
          </h4>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Generate {questionCount} questions crafted specifically from your study notes. Includes instant AI feedback and score breakdown.
          </p>
          <button
            id="generate-practice-questions-btn"
            onClick={() => handleGenerate(questionCount)}
            disabled={isGenerating}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting Practice Exam...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate {questionCount} Questions</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Answered: {answeredCount} of {questions.length} questions</span>
            <span>{Math.round((answeredCount / questions.length) * 100)}% completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-6">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Cards List */}
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const catStyle =
                CATEGORY_STYLES[q.category] || {
                  bg: 'bg-slate-50',
                  text: 'text-slate-700',
                  border: 'border-slate-200',
                };

              const evalResult = q.evaluation;

              return (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-2xs"
                >
                  {/* Question top meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {q.category}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400">
                      Concept: <strong className="text-slate-600">{q.conceptTested}</strong>
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <p className="font-semibold text-slate-900 text-base mb-3 leading-snug">
                    {q.question}
                  </p>

                  {/* Student Answer Textarea */}
                  <div className="space-y-2">
                    <textarea
                      value={q.studentAnswer || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Type your answer here in your own words..."
                      rows={3}
                      disabled={q.isAnalyzing}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-y"
                    />

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-400">
                        Answers are evaluated on understanding and factual accuracy against the notes.
                      </p>
                      <button
                        onClick={() => handleAnalyze(q)}
                        disabled={q.isAnalyzing || !q.studentAnswer?.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                      >
                        {q.isAnalyzing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{evalResult ? 'Re-Analyze Answer' : 'Analyze Answer'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Evaluation result */}
                  {evalResult && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {evalResult.status === 'Correct' ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Correct</span>
                            </div>
                          ) : evalResult.status === 'Partially Correct' ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span>Partially Correct</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100/90 px-3 py-1 rounded-full border border-rose-300">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>Needs Work / Incorrect</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          Score: <span className="text-purple-600 text-sm">{evalResult.score}</span> / 10
                        </div>
                      </div>

                      {/* What was correct */}
                      {evalResult.whatWasCorrect && (
                        <div className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-emerald-800">What you got right:</strong>{' '}
                            {evalResult.whatWasCorrect}
                          </div>
                        </div>
                      )}

                      {/* What is missing */}
                      {evalResult.whatIsMissing && (
                        <div className="flex items-start gap-2 text-xs text-slate-700">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-800">What was missing / incomplete:</strong>{' '}
                            {evalResult.whatIsMissing}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {evalResult.explanation && (
                        <div className="flex items-start gap-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                          <Lightbulb className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-purple-900">Concept Explanation:</strong>{' '}
                            {evalResult.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action to calculate Overall Score */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => handleGenerate(questionCount)}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate {questionCount} Questions
            </button>

            <button
              onClick={handleComputeOverallReport}
              disabled={isComputingReport || answeredCount === 0}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isComputingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing Overall Mastery...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Calculate Overall Score & Diagnosis ({answeredCount}/{questions.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Overall Performance Report Card */}
          {report && (
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/70 border border-purple-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      Overall Practice Performance
                    </h4>
                    <p className="text-xs text-slate-500">
                      Synthesized based on your answers across {questions.length} questions
                    </p>
                  </div>
                </div>

                <div className="text-center sm:text-right bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                  <div className="text-2xl font-black text-purple-700">
                    {Math.round(report.overallScore)}%
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Mastery Score
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strong Areas */}
                <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-2">
                  <h5 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Strong Areas
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {report.strongAreas.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weak Areas */}
                <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
                  <h5 className="font-bold text-xs text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Weak Areas to Strengthen
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {report.weakAreas.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Concepts to Revise & Next Step */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Concepts to Revise
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {report.conceptsToRevise.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 font-bold">→</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-white border border-purple-200 shadow-2xs space-y-2">
                  <h5 className="font-bold text-xs text-purple-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Compass className="w-4 h-4 text-purple-600" />
                    Recommended Next Step
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {report.recommendedNextStep}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
