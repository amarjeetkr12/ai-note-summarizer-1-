import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // In-memory cooldown tracking for rate-limited models
  const modelCooldowns: Record<string, number> = {};

  function getCandidateModels(): string[] {
    // Robust hierarchy: verified active model first, then modern alternatives recommended by Gemini API
    const allModels = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];
    const now = Date.now();
    const available = allModels.filter((m) => !modelCooldowns[m] || modelCooldowns[m] < now);
    return available.length > 0 ? available : allModels;
  }

  function markModelCooldown(model: string, cooldownSeconds: number = 60) {
    modelCooldowns[model] = Date.now() + Math.max(cooldownSeconds, 20) * 1000;
  }

  function handleModelError(model: string, err: any) {
    const msg = err?.message || String(err || '');
    if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available')) {
      markModelCooldown(model, 86400); // Deprecated/unavailable model: cool down for 24h
    } else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      markModelCooldown(model, 180); // Quota exhausted: cool down for 3 minutes
    } else if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
      markModelCooldown(model, 120); // High demand spike: cool down for 2 minutes
    }
  }

  function getFriendlyErrorMessage(err: any, defaultMsg: string): string {
    const raw = err?.message || String(err || '');
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
      return 'The AI service free-tier quota is currently busy. Please wait 15–30 seconds and try again.';
    }
    if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
      return 'The AI model is experiencing a temporary spike in traffic. Please retry in a few moments.';
    }
    return raw || defaultMsg;
  }

  // Reusable structured generator across candidate models
  async function executeStructuredPrompt(prompt: string, schema: any): Promise<any> {
    const ai = getGeminiClient();
    const candidateModels = getCandidateModels();
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
        if (response && response.text) {
          const raw = response.text.trim();
          try {
            return JSON.parse(raw);
          } catch {
            const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) return JSON.parse(match[0]);
          }
        }
      } catch (err: any) {
        lastError = err;
        handleModelError(model, err);
        console.warn(`Model ${model} failed, trying next candidate:`, err?.message || String(err));
      }
    }
    throw lastError || new Error('All Gemini candidate models failed to generate valid structured response.');
  }

  // Reusable multi-turn chat generator
  async function executeChatTutor(
    systemInstruction: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    message: string
  ): Promise<string> {
    const ai = getGeminiClient();
    const candidateModels = getCandidateModels();
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const chat = ai.chats.create({
          model,
          config: {
            systemInstruction,
          },
          history,
        });

        const response = await chat.sendMessage({
          message,
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        handleModelError(model, err);
        console.warn(`Chat model ${model} failed, trying next candidate:`, err?.message || String(err));
      }
    }
    throw lastError || new Error('All Gemini candidate models failed to produce chat response.');
  }


  // Summarize notes endpoint
  app.post('/api/summarize', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
          error: 'Please provide note text to summarize.',
        });
      }

      const trimmedText = text.trim();
      if (trimmedText.length < 10) {
        return res.status(400).json({
          error: 'Notes are too short to summarize. Please enter at least 10 characters.',
        });
      }

      const ai = getGeminiClient();

      const prompt = `You are an expert tutor and educational guide.
Transform the provided notes into a medium-detailed, student-friendly, and intelligent topic explanation.
Do not simply shorten or compress the notes; explain the topic clearly and intelligently step-by-step so that any student can learn and master it.

Strictly adhere to this 8-part educational structure:

1. 📖 Topic Overview:
- Identify the main topic title.
- Explain in 2–3 simple sentences what the topic is about and why it is important.

2. 🎓 Easy Explanation:
- Explain the complete topic step-by-step in simple language.
- Assume the student is learning the topic for the very first time.
- Provide 3 to 6 logical, sequential steps/paragraphs.
- Explain difficult terms in simple words.
- Use examples when the original notes contain examples.

3. 🔑 Key Points:
- 6 to 10 important points.
- Each point must contain meaningful, substantive information (no vague generalities).

4. 🧠 Important Concepts:
- List the major concepts (3 to 6 concepts).
- Explain each concept in 1–3 clear sentences.

5. 📌 Important Facts:
- Include definitions, dates, formulas, numbers, names, and concrete examples explicitly mentioned in the notes.
- CRITICAL: Never invent facts, figures, or formulas that are not in the notes.

6. 💡 Example:
- Provide a simple, relatable example or scenario that explains the topic clearly, keeping it strictly relevant to the notes.

7. ❓ Practice Questions:
- Generate 4 to 6 questions based only on the notes.
- Include conceptual and short-answer questions.
- Provide a concise answerHint for each question so students can check their understanding.

8. ⚡ Quick Revision:
- Exactly a 4–6 sentence revision section at the end for rapid review.

QUALITY REQUIREMENTS:
- Medium length: thorough enough to teach the concept, not unnecessarily long.
- Explain rather than merely summarize.
- Use simple, clear, engaging language.
- Preserve all important information from the notes.
- Do not hallucinate. Do not copy the original notes word-for-word.

Notes to analyze and explain:
"""
${trimmedText}
"""`;

      const candidateModels = getCandidateModels();
      let response;
      let lastError: any = null;

      for (const model of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object',
                properties: {
                  topicOverview: {
                    type: 'object',
                    properties: {
                      topic: { type: 'string', description: 'Main topic name or title' },
                      description: { type: 'string', description: '2 to 3 simple sentences explaining what the topic is about and why it is important' },
                    },
                    required: ['topic', 'description'],
                  },
                  easyExplanation: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Step-by-step explanation in simple language breaking down the topic for a first-time learner',
                  },
                  keyPoints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '6 to 10 important points, each containing meaningful information',
                  },
                  importantConcepts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Concept name' },
                        explanation: { type: 'string', description: '1 to 3 sentences explaining the concept in simple terms' },
                      },
                      required: ['name', 'explanation'],
                    },
                    description: 'Major concepts with 1-3 sentence explanations',
                  },
                  importantFacts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Definitions, dates, formulas, numbers, names, and examples directly from the notes',
                  },
                  example: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Title or situation for the example' },
                      description: { type: 'string', description: 'Clear, relevant illustrative example' },
                    },
                    required: ['title', 'description'],
                  },
                  practiceQuestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string', description: 'Conceptual or short-answer practice question' },
                        answerHint: { type: 'string', description: 'Helpful answer hint or answer based on the notes' },
                      },
                      required: ['question', 'answerHint'],
                    },
                    description: '4 to 6 practice questions based on the notes',
                  },
                  quickRevision: {
                    type: 'string',
                    description: 'A 4 to 6 sentence revision summary for quick exam/review',
                  },
                  summary: {
                    type: 'string',
                    description: 'Concise 2-3 sentence overview summary',
                  },
                  keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Important keywords and concept tags',
                  },
                },
                required: [
                  'topicOverview',
                  'easyExplanation',
                  'keyPoints',
                  'importantConcepts',
                  'importantFacts',
                  'example',
                  'practiceQuestions',
                  'quickRevision',
                ],
              },
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          handleModelError(model, err);
          console.warn(`Model ${model} failed, attempting next model if available:`, err?.message || String(err));
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('All Gemini models failed to generate a response.');
      }

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response received from Gemini API.');
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Unable to parse Gemini output as structured JSON.');
        }
      }

      // Extract and safely fallback each of the 8 sections
      const topicOverview = parsedData.topicOverview && typeof parsedData.topicOverview === 'object'
        ? {
            topic: String(parsedData.topicOverview.topic || 'Topic Overview'),
            description: String(parsedData.topicOverview.description || ''),
          }
        : {
            topic: 'Topic Overview',
            description: typeof parsedData.summary === 'string' ? parsedData.summary : '',
          };

      const easyExplanation: string[] = Array.isArray(parsedData.easyExplanation)
        ? parsedData.easyExplanation.map((s: any) => String(s))
        : typeof parsedData.easyExplanation === 'string'
        ? [parsedData.easyExplanation]
        : [];

      const keyPoints: string[] = Array.isArray(parsedData.keyPoints)
        ? parsedData.keyPoints.map((s: any) => String(s))
        : [];

      const importantConcepts = Array.isArray(parsedData.importantConcepts)
        ? parsedData.importantConcepts.map((c: any) => ({
            name: String(c.name || 'Concept'),
            explanation: String(c.explanation || ''),
          }))
        : [];

      const importantFacts: string[] = Array.isArray(parsedData.importantFacts)
        ? parsedData.importantFacts.map((f: any) => String(f))
        : [];

      const example = parsedData.example && typeof parsedData.example === 'object'
        ? {
            title: String(parsedData.example.title || 'Practical Example'),
            description: String(parsedData.example.description || ''),
          }
        : undefined;

      const practiceQuestions = Array.isArray(parsedData.practiceQuestions)
        ? parsedData.practiceQuestions.map((q: any) => ({
            question: String(q.question || ''),
            answerHint: q.answerHint ? String(q.answerHint) : undefined,
          }))
        : [];

      const quickRevision = typeof parsedData.quickRevision === 'string'
        ? parsedData.quickRevision
        : '';

      const summary = typeof parsedData.summary === 'string'
        ? parsedData.summary
        : topicOverview.description || (easyExplanation[0] ?? '');

      const keywords: string[] = Array.isArray(parsedData.keywords)
        ? parsedData.keywords.map((k: any) => String(k))
        : [];

      return res.json({
        topicOverview,
        easyExplanation,
        keyPoints,
        importantConcepts,
        importantFacts,
        example,
        practiceQuestions,
        quickRevision,
        summary,
        keywords,
        questions: practiceQuestions.map(q => q.question),
      });
    } catch (err: any) {
      console.error('Error generating summary:', err);
      const errorMessage = getFriendlyErrorMessage(err, 'Failed to generate summary with Gemini.');
      return res.status(500).json({ error: errorMessage });
    }
  });

  // FEATURE 1: Generate Flexible Practice Questions
  app.post('/api/practice-questions', async (req: Request, res: Response) => {
    try {
      const { notes, count = 10 } = req.body;
      if (!notes || typeof notes !== 'string' || notes.trim().length < 10) {
        return res.status(400).json({ error: 'Please provide valid notes to generate practice questions.' });
      }

      const qCount = Math.min(Math.max(Number(count) || 10, 5), 15);
      const prompt = `You are an expert test designer and university tutor.
Generate exactly ${qCount} diverse, non-repetitive practice questions based ONLY on the provided notes.
Do NOT test any outside concepts not mentioned in the notes.

Required question mix across difficulty categories:
1. "Basic understanding" - Direct recall of core terms, definitions, facts from the notes.
2. "Conceptual understanding" - Comprehension of the 'why' and 'how' behind the principles.
3. "Application" - Applying the principles to practical scenarios or problem-solving.
4. "Reasoning" - Analytical thinking, cause-and-effect relationships, and logical implications.
5. "Challenging questions" - Higher-order synthesis, tricky nuances, edge cases, or multi-concept connections.

For each question:
- Assign an "id" (e.g. "pq-1", "pq-2").
- Formulate a clear, direct "question".
- Categorize with "category" (Must be exactly one of: "Basic understanding", "Conceptual understanding", "Application", "Reasoning", "Challenging questions").
- Identify the specific concept being assessed in "conceptTested".

Notes to base all questions upon:
"""
${notes.trim()}
"""`;

      const schema = {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                category: {
                  type: 'string',
                  enum: [
                    'Basic understanding',
                    'Conceptual understanding',
                    'Application',
                    'Reasoning',
                    'Challenging questions',
                  ],
                },
                conceptTested: { type: 'string' },
              },
              required: ['id', 'question', 'category', 'conceptTested'],
            },
          },
        },
        required: ['questions'],
      };

      const result = await executeStructuredPrompt(prompt, schema);
      const questions = Array.isArray(result?.questions) ? result.questions : [];
      return res.json({ questions });
    } catch (err: any) {
      console.error('Error generating practice questions:', err);
      return res.status(500).json({ error: getFriendlyErrorMessage(err, 'Failed to generate practice questions.') });
    }
  });

  // FEATURE 1: Analyze Student Answer to Practice Question
  app.post('/api/analyze-answer', async (req: Request, res: Response) => {
    try {
      const { notes, question, studentAnswer, conceptTested } = req.body;
      if (!notes || !question) {
        return res.status(400).json({ error: 'Missing notes or question for analysis.' });
      }

      const answer = typeof studentAnswer === 'string' && studentAnswer.trim().length > 0
        ? studentAnswer.trim()
        : '(No answer provided by the student)';

      const prompt = `You are a supportive, insightful educational tutor evaluating a student's answer.
Base your evaluation strictly on the provided study notes and question.

Question:
"${question}"

Concept Being Tested:
"${conceptTested || 'Not specified'}"

Student's Answer:
"${answer}"

Study Notes Reference:
"""
${notes.trim()}
"""

Evaluate the student's answer fairly and constructively:
1. "status": Must be one of "Correct", "Partially Correct", or "Incorrect".
2. "score": An integer from 0 to 10 (10 = fully accurate and complete, 5-8 = partially accurate with minor gaps, 0-4 = incorrect or blank).
3. "whatWasCorrect": What specific ideas, keywords, or reasoning did the student get right? (If nothing was right or blank, explain clearly).
4. "whatIsMissing": What key facts, nuances, mechanisms, or explanations did the student miss or get wrong?
5. "explanation": A clear, beginner-friendly explanation of the correct concept written in encouraging language so the student masters it immediately.`;

      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['Correct', 'Partially Correct', 'Incorrect'] },
          score: { type: 'number', description: 'Score out of 10' },
          whatWasCorrect: { type: 'string' },
          whatIsMissing: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['status', 'score', 'whatWasCorrect', 'whatIsMissing', 'explanation'],
      };

      const evaluation = await executeStructuredPrompt(prompt, schema);
      return res.json(evaluation);
    } catch (err: any) {
      console.error('Error analyzing practice answer:', err);
      return res.status(500).json({ error: getFriendlyErrorMessage(err, 'Failed to analyze answer.') });
    }
  });

  // FEATURE 1: Calculate Overall Practice Session Report
  app.post('/api/practice-summary', async (req: Request, res: Response) => {
    try {
      const { notes, questions } = req.body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Please provide evaluated practice questions.' });
      }

      const prompt = `You are an expert academic evaluator.
The student completed a practice exam session on their study notes.
Here is the list of questions, the student's answers, and their individual evaluations:

${JSON.stringify(questions, null, 2)}

Study Notes:
"""
${notes ? String(notes).trim().slice(0, 3000) : ''}
"""

Synthesize an overall study performance report:
1. "overallScore": Calculate a composite percentage score from 0 to 100 based on their individual question scores.
2. "strongAreas": 2 to 4 bullet points of topics and reasoning skills where the student demonstrated high proficiency.
3. "weakAreas": 2 to 4 bullet points of specific gaps or topics where the student struggled or had incomplete answers.
4. "conceptsToRevise": 3 to 5 concrete concepts or definitions from the notes the student should review.
5. "recommendedNextStep": 1 to 2 encouraging, actionable sentences advising what the student should do next to achieve total mastery.`;

      const schema = {
        type: 'object',
        properties: {
          overallScore: { type: 'number' },
          strongAreas: { type: 'array', items: { type: 'string' } },
          weakAreas: { type: 'array', items: { type: 'string' } },
          conceptsToRevise: { type: 'array', items: { type: 'string' } },
          recommendedNextStep: { type: 'string' },
        },
        required: ['overallScore', 'strongAreas', 'weakAreas', 'conceptsToRevise', 'recommendedNextStep'],
      };

      const report = await executeStructuredPrompt(prompt, schema);
      return res.json(report);
    } catch (err: any) {
      console.error('Error calculating practice summary:', err);
      return res.status(500).json({ error: getFriendlyErrorMessage(err, 'Failed to compute practice report.') });
    }
  });

  // FEATURE 2 & 3: Chat with Your Notes & Smart Explanation Actions
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { notes, summaryContext, messages, quickAction } = req.body;
      if (!notes || typeof notes !== 'string') {
        return res.status(400).json({ error: 'Please provide notes context for the chat.' });
      }

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages history is required.' });
      }

      const systemInstruction = `You are an experienced, dedicated university faculty member and personal academic tutor sitting one-on-one with a student.
You are directly teaching and guiding the student through their study material.

CRITICAL IDENTITY & CONVERSATION RULES:
1. YOU ARE NOT A GENERIC CHATBOT OR ARTICLE GENERATOR.
   - Do NOT produce bloated essays or walls of text.
   - Do NOT automatically throw markdown tables, excessive bolding, emoji lists, or artificial section headers into every response.
   - Do NOT repeat the student's question before answering.
   - NEVER end responses with robotic clichés like:
     "Does that help?", "Would you like to know more?", "I hope this helps!", "Certainly!", "Absolutely!", "Great question!", "Let me know if you need anything else!"
   - Speak naturally, calmly, patiently, and encouragingly. Use conversational phrases like:
     "Yes, that's the key difference.", "You're close, but notice one detail.", "Think about it this way:", "Let's break this down simply.", "Not quite—look at where it happens.", "Exactly right."

2. ANSWER THE STUDENT FIRST:
   - Start immediately with the direct, clear answer to the student's specific question.
   - Then explain only as much as needed.
   - Simple question: 2 to 5 sentences.
   - Core concept: 1 to 3 short paragraphs.
   - Difficult concept: step-by-step walkthrough.
   - Exam question: crisp, high-scoring exam answer.

3. USE THE STUDENT'S NOTES AS THE PRIMARY SOURCE:
   - Base your teaching directly on the student's notes and concepts provided below.
   - Do NOT bring in unrelated outside material.
   - If the student asks about something NOT in their notes:
     - Directly inform the student: "That is not covered in your provided notes."
     - If helpful, provide a brief, clear explanation from reliable academic knowledge, clearly distinguishing it from their notes.

4. ADAPT TO THE STUDENT & SOCRATIC PEDAGOGY:
   - If the student says "I don't understand", "Explain simpler", or expresses confusion:
     - DO NOT repeat the previous explanation.
     - Shift to an intuitive, relatable real-life analogy or a simpler fundamental picture.
   - Use Socratic guidance when appropriate:
     - When a student asks a conceptual question or asks for a hint, don't just give the whole solution away immediately. Guide them with a hint or a small leading question so they experience the breakthrough themselves.
   - Understanding checks:
     - Periodically (when relevant), end your explanation with ONE short, natural question to check their understanding (e.g., "Quick check: if liquid water turns to vapour from the surface of a lake, which process is that?").
     - When the student replies to a check:
       - Validate warmly: "You're on the right track", "Almost", or "Exactly."
       - Point out what was correct.
       - Point out what was missing or misunderstood.
       - Provide the correct concise takeaway.
       - Do NOT invent artificial numerical scores unless they asked for an exam/quiz evaluation.
   - Never be harsh or dismissive. Always remain supportive and constructive.

5. EXAM FOCUS:
   - If the student asks "Exam mein kya likhna hai?", "How to write for 2 marks?", "Important points for exams?", or asks for definitions/marking criteria:
     - Switch into crisp exam format: clear, high-scoring definition, bulleted scoring points, and critical keywords the examiner will look for.
     - Match language naturally: if asked in Hinglish/Hindi, understand and answer with appropriate clarity.

6. NO FAKE PERSONALITY:
   - Do NOT make up stories ("When I was a student...", "As your professor, I feel..."). Simply teach with authentic academic warmth, authority, and patience.

7. SPECIAL ACTION HANDLING:
   - If action is "Explain simpler": Strip away jargon, use a vivid everyday comparison, keep to 2-3 short, clear paragraphs.
   - If action is "Give an example": Provide one intuitive, relatable scenario directly grounded in the concept.
   - If action is "Exam answer": Provide a crisp 2-to-5 mark model answer with key terminology highlighted.
   - If action is "Quiz me": Ask ONE sharp diagnostic question based on their notes and invite their answer.
   - If action is "Why?": Explain the underlying causal mechanism or principle directly and logically.
   - If action is "Give me a hint": Give a helpful conceptual nudge without spoiling the full answer.
   - If action is "Challenge me": Ask a thoughtful reasoning or application-based question testing an edge case from their notes.

STUDY MATERIAL CONTEXT:
Original Notes:
\"\"\"
${notes.trim()}
\"\"\"
${summaryContext?.topic ? `Topic: ${summaryContext.topic}\nOverview: ${summaryContext.description || ''}` : ''}
${Array.isArray(summaryContext?.keyPoints) && summaryContext.keyPoints.length > 0 ? `Key Points:\n${summaryContext.keyPoints.map((p: string) => `- ${p}`).join('\n')}` : ''}
${Array.isArray(summaryContext?.concepts) && summaryContext.concepts.length > 0 ? `Key Concepts:\n${summaryContext.concepts.map((c: string) => `- ${c}`).join('\n')}` : ''}
`;

      // Build conversation history for multi-turn chat
      const chatHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        if (msg.role === 'user' || msg.role === 'assistant') {
          chatHistory.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(msg.content || '') }],
          });
        }
      }

      const lastMessage = messages[messages.length - 1];
      let userQuery = String(lastMessage.content || '').trim();

      if (quickAction) {
        userQuery = `${userQuery} [Action context: "${quickAction}"]`;
      }

      const reply = await executeChatTutor(systemInstruction, chatHistory, userQuery);

      return res.json({ reply });
    } catch (err: any) {
      console.error('Error in chat with notes:', err);
      return res.status(500).json({ error: getFriendlyErrorMessage(err, 'Failed to generate tutor response.') });
    }
  });

  // FEATURE 4: AI Learning Gap Detector - Generate Diagnostic Questions
  app.post('/api/learning-gap-questions', async (req: Request, res: Response) => {
    try {
      const { notes, difficulty = 'Mixed', count = 5 } = req.body;
      if (!notes || typeof notes !== 'string' || notes.trim().length < 10) {
        return res.status(400).json({ error: 'Please provide notes to generate diagnostic questions.' });
      }

      const qCount = Math.min(Math.max(Number(count) || 5, 5), 10);
      const prompt = `You are an educational diagnostician identifying hidden learning gaps and misconceptions.
Based ONLY on the provided notes, generate exactly ${qCount} diagnostic questions designed to probe genuine comprehension rather than mere rote memorization.

Difficulty Level requested: "${difficulty}" (Can be Easy, Medium, Hard, or Mixed).
- If Mixed: Provide a blend from intuitive conceptual questions to deep analytical edge-cases.
- If Easy: Test foundational concepts and definitions without tricky wording.
- If Medium: Test relational understanding (how A relates to B, cause and effect).
- If Hard: Test nuanced edge cases, common pitfalls, and multi-step reasoning.

Notes:
"""
${notes.trim()}
"""

Generate questions with:
- "id": string (e.g. "gq-1")
- "question": clear, open-ended question that reveals how deeply the student grasps the material
- "difficulty": "Easy", "Medium", or "Hard"
- "conceptTested": concise name of the concept being probed`;

      const schema = {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
                conceptTested: { type: 'string' },
              },
              required: ['id', 'question', 'difficulty', 'conceptTested'],
            },
          },
        },
        required: ['questions'],
      };

      const result = await executeStructuredPrompt(prompt, schema);
      return res.json({ questions: result?.questions || [] });
    } catch (err: any) {
      console.error('Error generating learning gap questions:', err);
      return res.status(500).json({ error: getFriendlyErrorMessage(err, 'Failed to generate diagnostic questions.') });
    }
  });

  // FEATURE 4: AI Learning Gap Detector - Deep Diagnostic Analysis
  app.post('/api/learning-gap-analyze', async (req: Request, res: Response) => {
    try {
      const { notes, questionsAndAnswers } = req.body;
      if (!Array.isArray(questionsAndAnswers) || questionsAndAnswers.length === 0) {
        return res.status(400).json({ error: 'Please provide questions and answers to evaluate.' });
      }

      const prompt = `You are a cognitive learning scientist and diagnostic study tutor.
A student answered diagnostic questions on their notes.
Carefully evaluate their actual answers to detect their true mastery, subtle misconceptions, and blind spots.

Student QA Submissions:
${JSON.stringify(questionsAndAnswers, null, 2)}

Study Notes Reference:
"""
${notes ? String(notes).trim() : ''}
"""

Conduct a rigorous learning gap assessment:
1. "understandingScore": An accurate mastery percentage from 0 to 100 based strictly on their actual answers.
2. "whatYouUnderstand": 2 to 4 bullet points of topics, definitions, or mechanisms the student has firmly understood.
3. "learningGaps": 2 to 4 bullet points of missing information, partial explanations, or areas where the student's answer was incomplete.
4. "misconceptions": 1 to 3 explicit false assumptions, confused terms, or misunderstandings revealed in their answers (or ["No major misconceptions detected - solid conceptual grasp!"] if none).
5. "betterExplanation": A crystal-clear, student-friendly explanation that bridges the identified gaps in simple terms.
6. "whatToRevise": 3 to 5 high-priority topics or definitions to re-read.
7. "fiveMinuteRevisionPlan": 5 sequential 1-minute steps (e.g. "Minute 1: Review definition of X", "Minute 2: ...", "Minute 3: ...", "Minute 4: ...", "Minute 5: ...").
8. "nextBestStep": 1 single, high-leverage immediate study action for the student.`;

      const schema = {
        type: 'object',
        properties: {
          understandingScore: { type: 'number' },
          whatYouUnderstand: { type: 'array', items: { type: 'string' } },
          learningGaps: { type: 'array', items: { type: 'string' } },
          misconceptions: { type: 'array', items: { type: 'string' } },
          betterExplanation: { type: 'string' },
          whatToRevise: { type: 'array', items: { type: 'string' } },
          fiveMinuteRevisionPlan: { type: 'array', items: { type: 'string' } },
          nextBestStep: { type: 'string' },
        },
        required: [
          'understandingScore',
          'whatYouUnderstand',
          'learningGaps',
          'misconceptions',
          'betterExplanation',
          'whatToRevise',
          'fiveMinuteRevisionPlan',
          'nextBestStep',
        ],
      };

      const analysis = await executeStructuredPrompt(prompt, schema);
      return res.json(analysis);
    } catch (err: any) {
      console.error('Error analyzing learning gaps:', err);
      return res.status(500).json({ error: getFriendlyErrorMessage(err, 'Failed to analyze learning gaps.') });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Note Summarizer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
