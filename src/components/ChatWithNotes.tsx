import React, { useState, useRef, useEffect } from 'react';
import { SummaryResult, ChatMessage } from '../types';
import { sendChatMessage } from '../services/summaryService';
import Markdown from 'react-markdown';
import {
  GraduationCap,
  User,
  Send,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Square,
  Lightbulb,
  FileCheck,
  HelpCircle,
  Compass,
  KeyRound,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ChatWithNotesProps {
  notes: string;
  summaryData: SummaryResult;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  savedChatHistory?: ChatMessage[];
  onSaveChatHistory?: (messages: ChatMessage[]) => void;
}

interface QuickActionItem {
  id: string;
  label: string;
  actionName: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
  colorStyle: string;
}

const TUTOR_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'simpler',
    label: 'Explain simpler',
    actionName: 'Explain simpler',
    prompt: 'Could you explain this in simpler terms with a clear everyday analogy?',
    icon: Lightbulb,
    colorStyle: 'text-amber-800 bg-amber-50/80 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
  },
  {
    id: 'example',
    label: 'Give an example',
    actionName: 'Give an example',
    prompt: 'Can you give me a clear, relatable real-world example to illustrate this concept?',
    icon: Sparkles,
    colorStyle: 'text-emerald-800 bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
  },
  {
    id: 'exam',
    label: 'Exam answer',
    actionName: 'Exam answer',
    prompt: 'How should I structure a crisp, high-scoring answer for this topic in an exam? Please highlight key keywords to write.',
    icon: FileCheck,
    colorStyle: 'text-blue-800 bg-blue-50/80 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
  },
  {
    id: 'quiz',
    label: 'Quiz me',
    actionName: 'Quiz me',
    prompt: 'Quiz me with one sharp question on this to check if I really understood it.',
    icon: HelpCircle,
    colorStyle: 'text-purple-800 bg-purple-50/80 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
  },
  {
    id: 'why',
    label: 'Why?',
    actionName: 'Why?',
    prompt: 'Why does this happen? What is the underlying cause or mechanism behind it?',
    icon: Compass,
    colorStyle: 'text-indigo-800 bg-indigo-50/80 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
  },
  {
    id: 'hint',
    label: 'Give me a hint',
    actionName: 'Give me a hint',
    prompt: 'Give me a guiding hint about this concept to steer my thinking without giving away the full answer.',
    icon: KeyRound,
    colorStyle: 'text-teal-800 bg-teal-50/80 border-teal-200 hover:bg-teal-100 hover:border-teal-300',
  },
  {
    id: 'challenge',
    label: 'Challenge me',
    actionName: 'Challenge me',
    prompt: 'Give me a challenging reasoning question or tricky edge-case from these notes to test my deep understanding.',
    icon: Flame,
    colorStyle: 'text-rose-800 bg-rose-50/80 border-rose-200 hover:bg-rose-100 hover:border-rose-300',
  },
];

const SUGGESTED_QUESTIONS = [
  'Explain the main concept in 2–3 simple sentences.',
  'What is the most important thing to remember for exams?',
  'Explain the difference between the key concepts.',
  'What common mistakes do students make on this topic?',
  'Give me a step-by-step breakdown.',
];

export const ChatWithNotes: React.FC<ChatWithNotesProps> = ({
  notes,
  summaryData,
  initialPrompt,
  onClearInitialPrompt,
  savedChatHistory,
  onSaveChatHistory,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (savedChatHistory && savedChatHistory.length > 0) {
      return savedChatHistory;
    }
    const topic = summaryData.topicOverview?.topic || 'your study notes';
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I've reviewed your notes on **${topic}**. What would you like to explore first, or is there a specific concept you'd like us to walk through together?`,
        timestamp: Date.now(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle external initial prompt trigger (e.g. from Smart Explanation Actions)
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0 && !isLoading) {
      handleSend(initialPrompt);
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    }
  }, [initialPrompt]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSend = async (textToSend?: string, quickActionName?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const summaryContext = {
        topic: summaryData.topicOverview?.topic || '',
        description: summaryData.topicOverview?.description || summaryData.summary || '',
        keyPoints: summaryData.keyPoints || [],
        concepts: summaryData.importantConcepts?.map((c) => `${c.name}: ${c.explanation}`) || [],
      };

      const replyText = await sendChatMessage(
        notes,
        summaryContext,
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        quickActionName,
        controller.signal
      );

      const isOutOfNotes =
        replyText.includes('not covered in your provided notes') ||
        replyText.includes('not mentioned in your provided notes') ||
        replyText.includes('not mentioned in the notes');

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
        isOutOfNotes,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      if (onSaveChatHistory) {
        onSaveChatHistory(finalMessages);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const stoppedMessage: ChatMessage = {
          id: `stopped-${Date.now()}`,
          role: 'assistant',
          content: `*(Response stopped)*`,
          timestamp: Date.now(),
        };
        const updated = [...newMessages, stoppedMessage];
        setMessages(updated);
        if (onSaveChatHistory) onSaveChatHistory(updated);
        return;
      }

      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I ran into a temporary issue connecting to your notes: ${err?.message || 'Could not retrieve response.'} Please try sending your question again.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const topic = summaryData.topicOverview?.topic || 'your notes';
    const resetList: ChatMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Hi! We've started a fresh conversation on **${topic}**. What would you like to study right now?`,
        timestamp: Date.now(),
      },
    ];
    setMessages(resetList);
    if (onSaveChatHistory) {
      onSaveChatHistory(resetList);
    }
  };

  return (
    <div id="chat-with-notes" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 text-amber-300 flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base sm:text-lg">
                Personal Study Tutor
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1-on-1 Session
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Direct, patient faculty guidance grounded strictly in your study material
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            id="chat-clear-btn"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition cursor-pointer"
            title="Start fresh conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Interactive Quick Actions Bar */}
      <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Tutor Actions:
          </span>
          <button
            type="button"
            onClick={() => setShowQuestions(!showQuestions)}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{showQuestions ? 'Hide sample questions' : 'Sample questions'}</span>
            {showQuestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Action pills */}
        <div className="flex flex-wrap gap-1.5">
          {TUTOR_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleSend(action.prompt, action.actionName)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition font-medium cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${action.colorStyle}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Collapsible sample questions */}
        {showQuestions && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="text-xs px-2.5 py-1 rounded-md bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[540px] min-h-[360px] overflow-y-auto bg-slate-50/40">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-xs ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-amber-300 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed relative shadow-xs transition ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                }`}
              >
                {/* Out of notes banner */}
                {msg.isOutOfNotes && (
                  <div className="mb-2.5 p-2 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Outside Notes Context: Answered with reliable general academic knowledge.</span>
                  </div>
                )}

                {/* Content */}
                {isUser ? (
                  <div className="whitespace-pre-wrap font-normal text-white">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-800 prose-headings:text-slate-900 prose-headings:font-semibold prose-headings:my-2 prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-li:my-0.5 prose-strong:text-slate-900 prose-code:bg-slate-100 prose-code:text-indigo-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}

                {/* Footer for tutor message */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[10px] font-medium text-slate-400">Personal Tutor</span>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title="Copy explanation"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Active Typing Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 flex-row">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-300 border border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center justify-between gap-4 max-w-[85%]">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="flex gap-1 items-center px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-medium text-slate-600">Tutor is thinking...</span>
              </div>
              <button
                type="button"
                onClick={handleStopGeneration}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-2.5 h-2.5 fill-rose-600" />
                <span>Stop</span>
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              id="chat-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the tutor a question, or request an explanation (Enter to send, Shift+Enter for new line)..."
              rows={2}
              disabled={isLoading}
              className="w-full resize-none rounded-xl border border-slate-200 p-3 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:bg-slate-50 disabled:opacity-75"
            />
            <div className="absolute right-3 bottom-2.5 text-[10px] text-slate-400 hidden sm:block pointer-events-none">
              Enter ↵
            </div>
          </div>

          {isLoading ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="h-11 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              id="chat-send-btn"
              disabled={!input.trim()}
              className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <span>Ask Tutor</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Answers grounded in your notes & concepts</span>
          <span className="hidden sm:inline">Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
