import React, { useState } from 'react';
import { SummaryResult } from '../types';
import {
  BookOpen,
  GraduationCap,
  Key,
  Brain,
  Pin,
  Lightbulb,
  HelpCircle,
  Zap,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Share2,
} from 'lucide-react';

interface ExplanationCardProps {
  data: SummaryResult;
  titleSuffix?: React.ReactNode;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({ data, titleSuffix }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const topicName = data.topicOverview?.topic || 'Topic Study Guide';
  const topicDesc = data.topicOverview?.description || data.summary;

  const copyFullGuide = () => {
    const sections: string[] = [];
    sections.push(`📖 TOPIC: ${topicName}\n${topicDesc}\n`);

    if (data.easyExplanation && data.easyExplanation.length > 0) {
      sections.push(
        `🎓 EASY EXPLANATION:\n` +
          data.easyExplanation.map((step, idx) => `Step ${idx + 1}: ${step}`).join('\n\n') +
          '\n'
      );
    }

    if (data.keyPoints && data.keyPoints.length > 0) {
      sections.push(
        `🔑 KEY POINTS:\n` + data.keyPoints.map((pt, i) => `${i + 1}. ${pt}`).join('\n') + '\n'
      );
    }

    if (data.importantConcepts && data.importantConcepts.length > 0) {
      sections.push(
        `🧠 IMPORTANT CONCEPTS:\n` +
          data.importantConcepts.map((c) => `• ${c.name}: ${c.explanation}`).join('\n') +
          '\n'
      );
    }

    if (data.importantFacts && data.importantFacts.length > 0) {
      sections.push(
        `📌 IMPORTANT FACTS:\n` + data.importantFacts.map((f) => `• ${f}`).join('\n') + '\n'
      );
    }

    if (data.example) {
      sections.push(
        `💡 EXAMPLE - ${data.example.title}:\n${data.example.description}\n`
      );
    }

    if (data.practiceQuestions && data.practiceQuestions.length > 0) {
      sections.push(
        `❓ PRACTICE QUESTIONS:\n` +
          data.practiceQuestions
            .map(
              (q, i) =>
                `Q${i + 1}: ${q.question}${q.answerHint ? `\n   Answer/Hint: ${q.answerHint}` : ''}`
            )
            .join('\n') +
          '\n'
      );
    }

    if (data.quickRevision) {
      sections.push(`⚡ QUICK REVISION:\n${data.quickRevision}\n`);
    }

    handleCopy(sections.join('\n---\n\n'), 'all');
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/60 p-4 rounded-2xl border border-indigo-100">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-md">
            Interactive Study Guide
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">{topicName}</h2>
        </div>

        <div className="flex items-center gap-2">
          {titleSuffix}
          <button
            type="button"
            id="copy-full-guide-btn"
            onClick={copyFullGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedSection === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied Study Guide!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Entire Guide</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. 📖 Topic Overview */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>1. Topic Overview</span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(topicDesc, 'overview')}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
            title="Copy Topic Overview"
          >
            {copiedSection === 'overview' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
          {topicDesc}
        </div>
      </section>

      {/* 2. 🎓 Easy Explanation */}
      {data.easyExplanation && data.easyExplanation.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <GraduationCap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Easy Explanation</h3>
                <p className="text-[11px] text-slate-500">Step-by-step breakdown in simple, beginner-friendly terms</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(data.easyExplanation?.join('\n\n') || '', 'explanation')}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              title="Copy Easy Explanation"
            >
              {copiedSection === 'explanation' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="space-y-3">
            {data.easyExplanation.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 bg-emerald-50/30 rounded-lg border border-emerald-100/60"
              >
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed flex-1">{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. 🔑 Key Points */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Key className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">3. Key Points</h3>
                <p className="text-[11px] text-slate-500">6–10 substantive takeaways to remember</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  data.keyPoints.map((pt, i) => `${i + 1}. ${pt}`).join('\n'),
                  'points'
                )
              }
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              title="Copy Key Points"
            >
              {copiedSection === 'points' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.keyPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700"
              >
                <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold mt-0.5">
                  {index + 1}
                </span>
                <span className="leading-snug">{point}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. 🧠 Important Concepts */}
      {data.importantConcepts && data.importantConcepts.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Brain className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">4. Important Concepts</h3>
                <p className="text-[11px] text-slate-500">Core ideas explained in 1–3 clear sentences</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  data.importantConcepts?.map((c) => `${c.name}: ${c.explanation}`).join('\n\n') || '',
                  'concepts'
                )
              }
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              title="Copy Important Concepts"
            >
              {copiedSection === 'concepts' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.importantConcepts.map((concept, index) => (
              <div
                key={index}
                className="p-3.5 rounded-lg bg-indigo-50/40 border border-indigo-100/70 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <h4 className="text-xs font-bold text-indigo-900 tracking-wide">
                    {concept.name}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{concept.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. 📌 Important Facts */}
      {data.importantFacts && data.importantFacts.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <Pin className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">5. Important Facts</h3>
                <p className="text-[11px] text-slate-500">Definitions, dates, formulas, numbers & names verified from notes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  data.importantFacts?.map((f) => `• ${f}`).join('\n') || '',
                  'facts'
                )
              }
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              title="Copy Important Facts"
            >
              {copiedSection === 'facts' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {data.importantFacts.map((fact, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-2.5 bg-rose-50/40 rounded-lg border border-rose-100/60 text-slate-700"
              >
                <Pin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{fact}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 6. 💡 Example */}
      {data.example && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">6. Relatable Example</h3>
                <p className="text-[11px] text-slate-500">How to think about this in the real world</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${data.example?.title}\n\n${data.example?.description}`,
                  'example'
                )
              }
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              title="Copy Example"
            >
              {copiedSection === 'example' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {data.example.title}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">{data.example.description}</p>
          </div>
        </section>
      )}

      {/* 7. ❓ Practice Questions */}
      {data.practiceQuestions && data.practiceQuestions.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-violet-50 text-violet-700">
                <HelpCircle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">7. Practice Questions</h3>
                <p className="text-[11px] text-slate-500">Test your understanding based directly on the notes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  data.practiceQuestions
                    ?.map(
                      (q, i) =>
                        `Q${i + 1}: ${q.question}${q.answerHint ? `\nAnswer/Hint: ${q.answerHint}` : ''}`
                    )
                    .join('\n\n') || '',
                  'questions'
                )
              }
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
              title="Copy Practice Questions"
            >
              {copiedSection === 'questions' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="space-y-3">
            {data.practiceQuestions.map((item, index) => {
              const isRevealed = Boolean(revealedAnswers[index]);
              return (
                <div
                  key={index}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-violet-100 text-violet-700 text-xs font-bold mt-0.5">
                        Q{index + 1}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">
                        {item.question}
                      </p>
                    </div>

                    {item.answerHint && (
                      <button
                        type="button"
                        onClick={() => toggleAnswer(index)}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded cursor-pointer transition-colors"
                      >
                        <span>{isRevealed ? 'Hide Answer' : 'Check Answer'}</span>
                        {isRevealed ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {item.answerHint && isRevealed && (
                    <div className="pt-2 pl-7 text-xs text-indigo-900 bg-indigo-50/70 p-2.5 rounded-md border border-indigo-100 leading-relaxed animate-in fade-in duration-200">
                      <span className="font-bold">Answer Hint: </span>
                      <span>{item.answerHint}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. ⚡ Quick Revision */}
      {data.quickRevision && (
        <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 rounded-xl border border-amber-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-amber-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">8. Quick Revision</h3>
                <p className="text-[11px] text-amber-800/80">4–6 sentence summary for instant recall before exams</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(data.quickRevision || '', 'revision')}
              className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer transition-colors"
              title="Copy Quick Revision"
            >
              {copiedSection === 'revision' ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="p-4 bg-white/90 rounded-lg border border-amber-200/80 text-sm text-slate-800 leading-relaxed font-medium">
            {data.quickRevision}
          </div>
        </section>
      )}

      {/* Keywords / Tags if present */}
      {data.keywords && data.keywords.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium mr-1">Study Tags:</span>
          {data.keywords.map((kw, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
            >
              #{kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
