export interface ConceptItem {
  name: string;
  explanation: string;
}

export interface PracticeQuestion {
  question: string;
  answerHint?: string;
}

export interface TopicOverview {
  topic: string;
  description: string;
}

export interface ExampleSection {
  title: string;
  description: string;
}

export type QuestionDifficultyCategory =
  | 'Basic understanding'
  | 'Conceptual understanding'
  | 'Application'
  | 'Reasoning'
  | 'Challenging questions';

export interface QuestionEvaluation {
  status: 'Correct' | 'Partially Correct' | 'Incorrect';
  score: number; // 0-10
  whatWasCorrect: string;
  whatIsMissing: string;
  explanation: string;
}

export interface GeneratedPracticeQuestion {
  id: string;
  question: string;
  category: QuestionDifficultyCategory | string;
  conceptTested: string;
  studentAnswer?: string;
  evaluation?: QuestionEvaluation;
  isAnalyzing?: boolean;
}

export interface PracticeSummaryReport {
  overallScore: number;
  strongAreas: string[];
  weakAreas: string[];
  conceptsToRevise: string[];
  recommendedNextStep: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isOutOfNotes?: boolean;
}

export type GapDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';

export interface GapQuestion {
  id: string;
  question: string;
  difficulty: GapDifficulty;
  conceptTested: string;
  studentAnswer?: string;
}

export interface LearningGapAnalysis {
  understandingScore: number; // 0-100
  whatYouUnderstand: string[];
  learningGaps: string[];
  misconceptions: string[];
  betterExplanation: string;
  whatToRevise: string[];
  fiveMinuteRevisionPlan: string[];
  nextBestStep: string;
}

export interface SummaryResult {
  // 1. Topic Overview
  topicOverview?: TopicOverview;
  // 2. Easy Explanation (steps or paragraphs)
  easyExplanation?: string[];
  // 3. Key Points (6-10 points)
  keyPoints: string[];
  // 4. Important Concepts
  importantConcepts?: ConceptItem[];
  // 5. Important Facts
  importantFacts?: string[];
  // 6. Example
  example?: ExampleSection;
  // 7. Practice Questions (4-6 questions)
  practiceQuestions?: PracticeQuestion[];
  // 8. Quick Revision (4-6 sentences)
  quickRevision?: string;

  // Saved practice / gap / chat sessions
  practiceQuestionsList?: GeneratedPracticeQuestion[];
  practiceReport?: PracticeSummaryReport;
  learningGapAnalysis?: LearningGapAnalysis;
  chatHistory?: ChatMessage[];

  // Backward compatibility & convenience fields
  summary: string;
  keywords: string[];
  questions?: string[];
}

export interface SummaryDocument extends SummaryResult {
  id: string;
  userId: string;
  originalText: string;
  createdAt: number;
}

export type ActiveTab = 'dashboard' | 'history';

