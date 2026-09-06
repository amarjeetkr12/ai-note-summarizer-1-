import React from 'react';
import {
  Lightbulb,
  BookOpen,
  Globe,
  RotateCw,
  Brain,
  HelpCircle,
  FileCheck2,
  Sparkles,
  ArrowDown,
} from 'lucide-react';

interface SmartExplanationActionsProps {
  onSelectAction: (promptText: string, actionLabel: string) => void;
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  colorClass: string;
  badge: string;
}

export const SMART_ACTIONS: ActionItem[] = [
  {
    id: 'explain-simply',
    label: 'Explain Simply',
    icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
    prompt: 'Please explain this topic in very simple language as if teaching a beginner or high-school student.',
    colorClass: 'hover:border-amber-400 hover:bg-amber-50/50 text-amber-950',
    badge: 'Beginner',
  },
  {
    id: 'explain-detail',
    label: 'Explain in Detail',
    icon: <BookOpen className="w-4 h-4 text-blue-500" />,
    prompt: 'Please provide a deep-dive, highly detailed explanation covering all nuances and core mechanisms of this topic.',
    colorClass: 'hover:border-blue-400 hover:bg-blue-50/50 text-blue-950',
    badge: 'Deep Dive',
  },
  {
    id: 'real-life-example',
    label: 'Give Real-Life Example',
    icon: <Globe className="w-4 h-4 text-emerald-500" />,
    prompt: 'Give me a vivid, practical real-life example or analogy that illustrates how this concept works in the real world.',
    colorClass: 'hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-950',
    badge: 'Practical',
  },
  {
    id: 'another-way',
    label: 'Explain Another Way',
    icon: <RotateCw className="w-4 h-4 text-purple-500" />,
    prompt: 'Explain this topic using an alternative conceptual model or analogy to help it click immediately.',
    colorClass: 'hover:border-purple-400 hover:bg-purple-50/50 text-purple-950',
    badge: 'Alternative',
  },
  {
    id: 'step-by-step',
    label: 'Teach Step-by-Step',
    icon: <Brain className="w-4 h-4 text-indigo-500" />,
    prompt: 'Teach me this topic in explicit sequential steps, starting with the fundamentals and building up to the conclusion.',
    colorClass: 'hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-950',
    badge: 'Sequential',
  },
  {
    id: 'quiz-me',
    label: 'Quiz Me',
    icon: <HelpCircle className="w-4 h-4 text-pink-500" />,
    prompt: 'Ask me a sharp diagnostic quiz question about these notes right now, and wait for my answer before grading me.',
    colorClass: 'hover:border-pink-400 hover:bg-pink-50/50 text-pink-950',
    badge: 'Quick Test',
  },
  {
    id: 'exam-questions',
    label: 'Make Exam Questions',
    icon: <FileCheck2 className="w-4 h-4 text-teal-500" />,
    prompt: 'What are the top 3 most probable high-yield exam questions on this topic, and what tricky traps do students often fall into?',
    colorClass: 'hover:border-teal-400 hover:bg-teal-50/50 text-teal-950',
    badge: 'Exam Prep',
  },
];

export const SmartExplanationActions: React.FC<SmartExplanationActionsProps> = ({
  onSelectAction,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              ⚡ Smart Explanation Actions
            </h4>
            <p className="text-xs text-slate-500">
              One-click pedagogical prompts sent directly to your AI Study Tutor
            </p>
          </div>
        </div>
        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
          Sends to Chat <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {SMART_ACTIONS.map((action) => (
          <button
            key={action.id}
            id={`action-btn-${action.id}`}
            onClick={() => onSelectAction(action.prompt, action.label)}
            className={`p-3 rounded-xl border border-slate-200 bg-white hover:shadow-xs transition-all flex flex-col items-start justify-between text-left group cursor-pointer ${action.colorClass}`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-white transition shadow-2xs">
                {action.icon}
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {action.badge}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950 transition line-clamp-1">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
