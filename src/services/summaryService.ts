import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  SummaryDocument,
  SummaryResult,
  GeneratedPracticeQuestion,
  QuestionEvaluation,
  PracticeSummaryReport,
  ChatMessage,
  GapDifficulty,
  GapQuestion,
  LearningGapAnalysis,
} from '../types';

const COLLECTION_NAME = 'summaries';

/**
 * Calls the secure backend /api/summarize to execute Gemini with the 8-part educational explanation
 */
export async function summarizeNotesWithGemini(text: string): Promise<SummaryResult> {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to explain notes with Gemini.');
  }

  return {
    topicOverview: data.topicOverview,
    easyExplanation: Array.isArray(data.easyExplanation) ? data.easyExplanation : [],
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    importantConcepts: Array.isArray(data.importantConcepts) ? data.importantConcepts : [],
    importantFacts: Array.isArray(data.importantFacts) ? data.importantFacts : [],
    example: data.example,
    practiceQuestions: Array.isArray(data.practiceQuestions) ? data.practiceQuestions : [],
    quickRevision: data.quickRevision || '',
    summary: data.summary || data.topicOverview?.description || '',
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    questions: Array.isArray(data.questions) ? data.questions : [],
  };
}

/**
 * FEATURE 1: Generates 5, 10, or 15 practice questions based strictly on notes
 */
export async function generatePracticeQuestions(notes: string, count: number = 10): Promise<GeneratedPracticeQuestion[]> {
  const response = await fetch('/api/practice-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, count }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to generate practice questions.');
  }
  return Array.isArray(data.questions) ? data.questions : [];
}

/**
 * FEATURE 1: Evaluates a single student answer with Gemini
 */
export async function analyzePracticeAnswer(
  notes: string,
  question: string,
  studentAnswer: string,
  conceptTested?: string
): Promise<QuestionEvaluation> {
  const response = await fetch('/api/analyze-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, question, studentAnswer, conceptTested }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to analyze answer.');
  }
  return data;
}

/**
 * FEATURE 1: Generates overall practice session score & diagnosis
 */
export async function computePracticeSummary(
  notes: string,
  questions: GeneratedPracticeQuestion[]
): Promise<PracticeSummaryReport> {
  const response = await fetch('/api/practice-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, questions }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to compute practice summary report.');
  }
  return data;
}

/**
 * FEATURE 2 & 3: Chat with your notes tutor endpoint
 */
export async function sendChatMessage(
  notes: string,
  summaryContext: any,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  quickAction?: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, summaryContext, messages, quickAction }),
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to get tutor answer.');
  }
  return data.reply || '';
}

/**
 * FEATURE 4: Generate Diagnostic Questions for Learning Gap Detector
 */
export async function generateLearningGapQuestions(
  notes: string,
  difficulty: GapDifficulty = 'Mixed',
  count: number = 5
): Promise<GapQuestion[]> {
  const response = await fetch('/api/learning-gap-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, difficulty, count }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to generate learning gap questions.');
  }
  return Array.isArray(data.questions) ? data.questions : [];
}

/**
 * FEATURE 4: Deep Learning Gap Analysis
 */
export async function analyzeLearningGaps(
  notes: string,
  questionsAndAnswers: Array<{ question: string; answer: string; conceptTested?: string; difficulty?: string }>
): Promise<LearningGapAnalysis> {
  const response = await fetch('/api/learning-gap-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, questionsAndAnswers }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to run learning gap analysis.');
  }
  return data;
}

/**
 * Updates an existing summary document in Firestore
 */
export async function updateSummaryInFirestore(
  summaryId: string,
  updates: Record<string, any>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, summaryId);
  await updateDoc(docRef, updates);
}

/**
 * Saves a completed explanation document into Cloud Firestore
 */
export async function saveSummaryToFirestore(
  userId: string,
  originalText: string,
  result: SummaryResult
): Promise<string> {
  const docData: Record<string, any> = {
    userId,
    originalText,
    summary: result.summary,
    keyPoints: result.keyPoints,
    keywords: result.keywords,
    questions: result.questions || [],
    createdAt: Date.now(),
    serverTimestamp: serverTimestamp(),
  };

  if (result.topicOverview) {
    docData.topicOverview = result.topicOverview;
  }
  if (result.easyExplanation) {
    docData.easyExplanation = result.easyExplanation;
  }
  if (result.importantConcepts) {
    docData.importantConcepts = result.importantConcepts;
  }
  if (result.importantFacts) {
    docData.importantFacts = result.importantFacts;
  }
  if (result.example) {
    docData.example = result.example;
  }
  if (result.practiceQuestions) {
    docData.practiceQuestions = result.practiceQuestions;
  }
  if (result.quickRevision) {
    docData.quickRevision = result.quickRevision;
  }
  if (result.practiceQuestionsList) {
    docData.practiceQuestionsList = result.practiceQuestionsList;
  }
  if (result.practiceReport) {
    docData.practiceReport = result.practiceReport;
  }
  if (result.learningGapAnalysis) {
    docData.learningGapAnalysis = result.learningGapAnalysis;
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
  return docRef.id;
}


/**
 * Fetches all summaries for a specific user from Firestore
 */
export async function fetchUserSummaries(userId: string): Promise<SummaryDocument[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const documents: SummaryDocument[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      documents.push({
        id: docSnap.id,
        userId: data.userId,
        originalText: data.originalText || '',
        summary: data.summary || '',
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        questions: Array.isArray(data.questions) ? data.questions : [],
        topicOverview: data.topicOverview,
        easyExplanation: Array.isArray(data.easyExplanation) ? data.easyExplanation : undefined,
        importantConcepts: Array.isArray(data.importantConcepts) ? data.importantConcepts : undefined,
        importantFacts: Array.isArray(data.importantFacts) ? data.importantFacts : undefined,
        example: data.example,
        practiceQuestions: Array.isArray(data.practiceQuestions) ? data.practiceQuestions : undefined,
        quickRevision: data.quickRevision,
        practiceQuestionsList: Array.isArray(data.practiceQuestionsList) ? data.practiceQuestionsList : undefined,
        practiceReport: data.practiceReport,
        learningGapAnalysis: data.learningGapAnalysis,
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      });
    });

    // Client-side sort to avoid requiring Firestore composite indexes
    documents.sort((a, b) => b.createdAt - a.createdAt);

    return documents;
  } catch (err: any) {
    console.error('Error loading summaries from Firestore:', err);
    throw new Error(err?.message || 'Could not load your summary history from Firestore.');
  }
}

/**
 * Deletes a summary document by ID
 */
export async function deleteSummaryFromFirestore(summaryId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, summaryId));
}
