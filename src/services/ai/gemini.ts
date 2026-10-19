import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuizQuestion } from '../../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Initialize Gemini client if API key is provided
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'mock-key') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.warn('Gemini API client initialization failed, using mock AI mode:', error);
  }
}

// ==========================================
// MODEL CONFIGURATION: Exactly 1 Primary, 1 Verified Fallback
// ==========================================
// Both models verified against the active Google Generative AI API version.
export const PRIMARY_MODEL = 'gemini-3-flash-preview';
export const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export class GeminiError extends Error {
  status?: number;
  type: 'INVALID_API_KEY' | 'QUOTA_EXCEEDED' | 'MODEL_UNAVAILABLE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  isRetryable: boolean;

  constructor(
    type: 'INVALID_API_KEY' | 'QUOTA_EXCEEDED' | 'MODEL_UNAVAILABLE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR',
    message: string,
    isRetryable: boolean,
    status?: number
  ) {
    super(message);
    this.name = 'GeminiError';
    this.type = type;
    this.isRetryable = isRetryable;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Categorizes raw API and SDK errors into structured GeminiError objects.
 */
export const categorizeGeminiError = (error: any, modelName?: string): GeminiError => {
  const status = error?.status;
  const message = error?.message || '';
  const errorDetailsString = JSON.stringify(error?.errorDetails || error || '');

  // 1. Invalid API Key
  if (
    (status === 400 && (message.includes('API key not valid') || errorDetailsString.includes('API_KEY_INVALID'))) ||
    status === 401 ||
    status === 403
  ) {
    return new GeminiError(
      'INVALID_API_KEY',
      'Invalid Gemini API Key. Please verify your API key in Google AI Studio.',
      false,
      status
    );
  }

  // 2. Quota Exceeded (Status 429)
  if (
    status === 429 ||
    message.includes('429') ||
    message.includes('Quota exceeded') ||
    errorDetailsString.includes('RESOURCE_EXHAUSTED')
  ) {
    return new GeminiError(
      'QUOTA_EXCEEDED',
      'AI service is temporarily busy (Quota Exceeded). Please try again in about a minute.',
      false,
      status
    );
  }

  // 3. Service Unavailable / High Demand (Status 503)
  if (
    status === 503 ||
    message.includes('503') ||
    message.includes('high demand') ||
    message.includes('Service Unavailable')
  ) {
    return new GeminiError(
      'MODEL_UNAVAILABLE',
      'Gemini AI is currently experiencing high demand (503). Retrying with fallback or sample quiz.',
      true,
      503
    );
  }

  // 4. Model Deprecated / Not Found (Status 404)
  if (
    status === 404 ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('no longer available')
  ) {
    return new GeminiError(
      'MODEL_UNAVAILABLE',
      `The model ${modelName || ''} is unavailable.`,
      true,
      404
    );
  }

  // 5. Network / Timeout Error
  if (
    status === 408 ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    error instanceof TypeError
  ) {
    return new GeminiError(
      'NETWORK_ERROR',
      'Network timeout connecting to Gemini. Please check your internet connection.',
      true,
      status || 408
    );
  }

  return new GeminiError(
    'UNKNOWN_ERROR',
    message || 'An unexpected error occurred while communicating with the AI service.',
    true,
    status
  );
};

// ==========================================
// QUIZ CACHING & IN-FLIGHT DEDUPLICATION
// ==========================================
interface CachedQuiz {
  questions: QuizQuestion[];
  timestamp: number;
}

const quizMemoryCache = new Map<string, CachedQuiz>();
const inFlightQuizzes = new Map<string, Promise<QuizQuestion[]>>();

export const getQuizCacheKey = (
  subject: string,
  topic: string,
  count: number = 5,
  difficulty: string = 'medium',
  notes?: string
): string => {
  const cleanSubject = (subject || '').trim().toLowerCase();
  const cleanTopic = (topic || '').trim().toLowerCase();
  const cleanNotes = (notes || '').trim().slice(0, 80).toLowerCase();
  return `${cleanSubject}::${cleanTopic}::${difficulty}::${count}::${cleanNotes}`;
};

export const getCachedQuiz = async (cacheKey: string): Promise<QuizQuestion[] | null> => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // 1. In-memory check (0ms)
  const mem = quizMemoryCache.get(cacheKey);
  if (mem && Date.now() - mem.timestamp < ONE_DAY_MS) {
    return mem.questions;
  }

  // 2. Persistent storage check
  try {
    const raw = await AsyncStorage.getItem(`lumora_qc_${cacheKey}`);
    if (raw) {
      const parsed: CachedQuiz = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < ONE_DAY_MS && Array.isArray(parsed.questions)) {
        quizMemoryCache.set(cacheKey, parsed);
        return parsed.questions;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
};

export const setCachedQuiz = async (cacheKey: string, questions: QuizQuestion[]): Promise<void> => {
  const entry: CachedQuiz = { questions, timestamp: Date.now() };
  quizMemoryCache.set(cacheKey, entry);
  try {
    await AsyncStorage.setItem(`lumora_qc_${cacheKey}`, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
};

// ==========================================
// OPTIMIZED GENERATION WITH TIMEOUT & FALLBACK
// ==========================================
const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
  }
  return cleaned.trim();
};

interface GenerateOptions {
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

const generateFromModelWithTimeout = async (
  modelName: string,
  prompt: string,
  options?: GenerateOptions
): Promise<string> => {
  const timeoutMs = options?.timeoutMs || (modelName === PRIMARY_MODEL ? 9000 : 12000);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new GeminiError('NETWORK_ERROR', `Request to ${modelName} timed out after ${timeoutMs}ms.`, true, 408));
    }, timeoutMs);
  });

  const model = genAI!.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: options?.maxOutputTokens || 1200,
      temperature: options?.temperature ?? 0.2,
      // Disable thinking tokens to eliminate latency overhead
      thinkingConfig: { thinkingBudget: 0 },
    } as any,
  });

  const apiPromise = model.generateContent(prompt).then((res) => {
    const text = res.response.text();
    if (!text) throw new Error('Empty response from model');
    return text;
  });

  return Promise.race([apiPromise, timeoutPromise]);
};

/**
 * Attempts primary model first; if it fails (503, timeout, etc.), switches immediately
 * to the single verified fallback model.
 */
export const generateWithFallback = async (
  prompt: string,
  options?: GenerateOptions
): Promise<{ text: string; modelUsed: string; duration: number; retries: number }> => {
  if (!genAI) throw new Error('Gemini API client not initialized');

  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError: GeminiError | null = null;
  let retries = 0;

  for (let i = 0; i < models.length; i++) {
    const modelName = models[i];
    const isFallback = i > 0;
    const t0 = Date.now();

    try {
      if (isFallback) {
        retries++;
        console.warn(`[AI Fallback] Primary model failed, switching to verified fallback: ${modelName}`);
      }
      const text = await generateFromModelWithTimeout(modelName, prompt, options);
      const duration = Date.now() - t0;
      console.log(`[AI Generation] ${modelName} succeeded in ${duration}ms (retries: ${retries})`);
      return { text, modelUsed: modelName, duration, retries };
    } catch (raw: any) {
      const duration = Date.now() - t0;
      const categorized = categorizeGeminiError(raw, modelName);
      console.warn(`[AI Attempt Failed] ${modelName} failed after ${duration}ms: [${categorized.type}] ${categorized.message}`);

      // If API key is fundamentally invalid, do not retry fallback
      if (categorized.type === 'INVALID_API_KEY') {
        throw categorized;
      }
      lastError = categorized;
    }
  }

  throw lastError || new GeminiError('UNKNOWN_ERROR', 'All model attempts failed', false);
};

// ==========================================
// BUILT-IN SAMPLE / DEMO QUIZ QUESTIONS
// ==========================================
const SAMPLE_TEMPLATES: Record<string, { q: string; o: string[]; c: number; e: string }[]> = {
  deadlocks: [
    {
      q: 'Which of the following is NOT one of the four necessary Coffman conditions for a deadlock?',
      o: ['Mutual Exclusion', 'Hold and Wait', 'Preemption Allowed', 'Circular Wait'],
      c: 2,
      e: 'Allowing preemption prevents deadlocks; the condition is "No Preemption".',
    },
    {
      q: 'What is the primary objective of Dijkstra\'s Banker\'s Algorithm in Operating Systems?',
      o: ['Deadlock Detection', 'Deadlock Avoidance', 'Deadlock Recovery', 'Mutual Exclusion'],
      c: 1,
      e: 'The Banker\'s Algorithm dynamically inspects resource requests to maintain a safe state (Deadlock Avoidance).',
    },
    {
      q: 'In a resource allocation graph with single-unit resource types, what does a directed cycle indicate?',
      o: ['High CPU utilization', 'A system crash', 'A guaranteed deadlock', 'A thread starvation warning'],
      c: 2,
      e: 'With single-unit resources, a cycle is necessary and sufficient to indicate a deadlock.',
    },
    {
      q: 'Which deadlock handling strategy requires processes to request all resources at once?',
      o: ['Circular Wait Prevention', 'Hold and Wait Prevention', 'Mutual Exclusion Elimination', 'Starvation Prevention'],
      c: 1,
      e: 'Requesting all resources at once prevents the "Hold and Wait" condition.',
    },
    {
      q: 'What is the primary difference between deadlock prevention and deadlock avoidance?',
      o: ['Avoidance imposes static ordering; prevention evaluates runtime safe states', 'Prevention restricts resource requests statically; avoidance tracks dynamic safe states', 'Prevention requires rollback; avoidance does not', 'They are identical concepts'],
      c: 1,
      e: 'Prevention invalidates one of the four necessary conditions statically, whereas avoidance checks dynamic safety states at runtime.',
    },
  ],
  scheduling: [
    {
      q: 'Which CPU scheduling algorithm is non-preemptive and selects the process with the shortest execution burst?',
      o: ['Round Robin', 'Shortest Job First (SJF)', 'First-Come, First-Served (FCFS)', 'Multilevel Queue'],
      c: 1,
      e: 'SJF schedules the process with the minimum CPU burst time.',
    },
    {
      q: 'What major drawback does First-Come, First-Served (FCFS) CPU scheduling suffer from?',
      o: ['Priority Inversion', 'Convoy Effect', 'Deadlock cycles', 'High context switch overhead'],
      c: 1,
      e: 'The Convoy Effect occurs when short processes queue behind a long CPU-bound process.',
    },
    {
      q: 'In Round Robin scheduling, what happens if the time quantum is chosen to be extremely large?',
      o: ['It degenerates into Shortest Job First', 'It behaves like First-Come, First-Served', 'Context switches increase exponentially', 'Processes starve indefinitely'],
      c: 1,
      e: 'An excessively large time quantum allows each process to run to completion, matching FCFS behavior.',
    },
  ],
  synchronization: [
    {
      q: 'What is a critical section in concurrent computing?',
      o: ['Code executing in kernel mode', 'A code block accessing shared variables that must execute atomically', 'A thread synchronization lock', 'An interrupt handler routine'],
      c: 1,
      e: 'Critical sections manipulate shared resources and require mutual exclusion to prevent race conditions.',
    },
    {
      q: 'Which synchronization primitive avoids busy-waiting by suspending waiting processes in a sleep queue?',
      o: ['Spinlock', 'Counting Semaphore with wait queue', 'Strict Alternation', 'Peterson\'s Algorithm'],
      c: 1,
      e: 'Semaphores with block/wakeup queues sleep processes rather than wasting CPU cycles in a spin loop.',
    },
  ],
  database: [
    {
      q: 'Which relational database normal form eliminates transitive dependencies on the primary key?',
      o: ['1NF', '2NF', '3NF', 'BCNF'],
      c: 2,
      e: 'Third Normal Form (3NF) requires 2NF and ensures no non-key attribute depends transitively on the primary key.',
    },
    {
      q: 'What does the "I" represent in the ACID properties of database transactions?',
      o: ['Integrity', 'Isolation', 'Inheritance', 'Indexing'],
      c: 1,
      e: 'Isolation ensures concurrent transactions execute without interfering with one another.',
    },
  ],
  algorithms: [
    {
      q: 'What is the worst-case time complexity of finding an element in a balanced Binary Search Tree (AVL / Red-Black)?',
      o: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      c: 1,
      e: 'Balanced BSTs maintain height proportional to log n, giving O(log n) worst-case search time.',
    },
    {
      q: 'Which algorithmic paradigm does Dijkstra\'s Shortest Path Algorithm use?',
      o: ['Divide and Conquer', 'Greedy', 'Dynamic Programming', 'Backtracking'],
      c: 1,
      e: 'Dijkstra greedily chooses the unvisited node with the smallest tentative distance at each step.',
    },
  ],
};

export const hasSampleQuizForTopic = (subject: string, topic: string): boolean => {
  const combined = `${subject} ${topic}`.toLowerCase();
  return Object.keys(SAMPLE_TEMPLATES).some((k) => combined.includes(k));
};

export const getSampleQuiz = (
  subject: string,
  topic: string,
  count: number = 5,
  difficulty: string = 'medium'
): QuizQuestion[] => {
  const cleanSubject = subject.trim() || 'Computer Science';
  const cleanTopic = topic.trim() || 'Core Concepts';
  const combined = `${cleanSubject} ${cleanTopic}`.toLowerCase();

  const matchedKey = Object.keys(SAMPLE_TEMPLATES).find((k) => combined.includes(k)) || 'deadlocks';
  const templates = SAMPLE_TEMPLATES[matchedKey] || SAMPLE_TEMPLATES.deadlocks;

  const shuffled = [...templates].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, templates.length));

  return selected.map((item) => ({
    question: item.q,
    options: item.o,
    correctAnswerIndex: item.c,
    explanation: item.e,
  }));
};

// ==========================================
// PUBLIC: GENERATE QUIZ
// ==========================================
export const generateQuiz = async (
  subject: string,
  topic: string,
  notes?: string,
  fileUri?: string,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive' = 'medium'
): Promise<QuizQuestion[]> => {
  const cleanSubject = (subject || '').trim() || 'General Studies';
  const cleanTopic = (topic || '').trim() || 'Core Concepts';
  const cacheKey = getQuizCacheKey(cleanSubject, cleanTopic, count, difficulty, notes);

  // 1. Check Cache
  const cached = await getCachedQuiz(cacheKey);
  if (cached && cached.length >= count) {
    console.log(`[Quiz Performance] Cache HIT for "${cleanSubject} - ${cleanTopic}" (0ms)`);
    return cached.slice(0, count);
  }

  // 2. In-flight request deduplication
  if (inFlightQuizzes.has(cacheKey)) {
    console.log(`[Quiz Performance] In-flight request reuse for "${cleanSubject} - ${cleanTopic}"`);
    return inFlightQuizzes.get(cacheKey)!;
  }

  // 3. If Gemini is not configured, return sample quiz immediately
  if (!genAI) {
    console.log('[Quiz] No Gemini API key configured. Loading sample demo quiz.');
    const sample = getSampleQuiz(cleanSubject, cleanTopic, count, difficulty);
    return sample;
  }

  // 4. Construct AI Generation Promise
  const generationPromise = (async () => {
    const totalStart = Date.now();
    const hasUploadedNotes = Boolean(notes && notes.trim().length > 0);
    const trimmedNotes = hasUploadedNotes ? notes!.trim().slice(0, 2500) : '';

    const prompt = `Generate exactly ${count} multiple-choice questions.
Subject: "${cleanSubject}"
Topic: "${cleanTopic}"
Difficulty: ${difficulty}
${hasUploadedNotes ? `Source Material:\n"""\n${trimmedNotes}\n"""` : ''}

Respond ONLY with a valid JSON array of ${count} objects matching this exact structure:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswerIndex": 0,
    "explanation": "concise explanation under 2 sentences"
  }
]`;

    const tokenBudget = Math.min(2048, Math.max(900, count * 280));
    const result = await generateWithFallback(prompt, {
      maxOutputTokens: tokenBudget,
      temperature: 0.2,
    });

    const cleanedText = cleanJsonString(result.text);
    const parsed = JSON.parse(cleanedText);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI response is not a valid JSON array of questions');
    }

    const validated: QuizQuestion[] = parsed.slice(0, count).map((item: any, idx: number) => {
      if (
        typeof item.question === 'string' &&
        Array.isArray(item.options) &&
        item.options.length === 4 &&
        typeof item.correctAnswerIndex === 'number' &&
        typeof item.explanation === 'string'
      ) {
        return {
          question: item.question,
          options: item.options,
          correctAnswerIndex: item.correctAnswerIndex,
          explanation: item.explanation,
        };
      }
      throw new Error(`Malformed question schema at index ${idx}`);
    });

    // Store in cache for future instant access
    await setCachedQuiz(cacheKey, validated);

    const totalTime = Date.now() - totalStart;
    console.log(`[Quiz Performance] Completed generation in ${totalTime}ms via ${result.modelUsed} (${validated.length} MCQs, ${result.retries} retries)`);

    return validated;
  })().finally(() => {
    inFlightQuizzes.delete(cacheKey);
  });

  inFlightQuizzes.set(cacheKey, generationPromise);
  return generationPromise;
};

// ==========================================
// EXPLAIN MISTAKES
// ==========================================
export const explainMistakes = async (
  question: QuizQuestion,
  userSelectedIndex: number
): Promise<string> => {
  if (userSelectedIndex === question.correctAnswerIndex) {
    return 'That is correct! Great job!';
  }

  const selectedAnswerText = question.options[userSelectedIndex] || '';
  const correctAnswerText = question.options[question.correctAnswerIndex] || '';

  if (!genAI) {
    return `You selected "${selectedAnswerText}". The correct answer is "${correctAnswerText}". ${question.explanation}`;
  }

  try {
    const prompt = `Student made an error on an MCQ. Explain the mistake in 1-2 friendly sentences.
Question: "${question.question}"
Correct Answer: "${correctAnswerText}"
Student Answer: "${selectedAnswerText}"`;

    const result = await generateWithFallback(prompt, {
      maxOutputTokens: 250,
      temperature: 0.2,
      timeoutMs: 6000,
    });

    return cleanJsonString(result.text);
  } catch (err: any) {
    console.warn('[Explain Mistake] AI explanation unavailable, using built-in explanation:', err?.message);
    return `You selected "${selectedAnswerText}". The correct answer is "${correctAnswerText}". ${question.explanation}`;
  }
};
