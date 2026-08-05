import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { QuizQuestion } from '../../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
console.log("Gemini Key Loaded:", !!GEMINI_API_KEY);
console.log("Key Prefix:", GEMINI_API_KEY?.substring(0, 8));
console.log("Gemini Key:", GEMINI_API_KEY);
console.log("Starts with AIza/AQ:", GEMINI_API_KEY?.startsWith("AIza") || GEMINI_API_KEY?.startsWith("AQ"));

// Initialize Gemini client if API key is provided
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'mock-key') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('Gemini API initialized successfully.');
  } catch (error) {
    console.warn('Gemini API client initialization failed, using mock AI mode:', error);
  }
} else {
  console.log('No EXPO_PUBLIC_GEMINI_API_KEY found. Lumora is running in Mock AI Mode.');
}

// ==========================================
// MOCK AI GENERATOR FALLBACKS
// ==========================================

const generateMockQuiz = (
  subject: string,
  topic: string,
  count: number = 5,
  difficulty: string = 'medium'
): QuizQuestion[] => {
  const cleanSubject = subject.trim() || 'General Studies';
  const cleanTopic = topic.trim() || 'Core concepts';

  // Split topics by comma and trim
  const topicsList = cleanTopic.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  const activeTopics = topicsList.length > 0 ? topicsList : ['Core concepts'];

  const mockTemplates: Record<string, { q: string; o: string[]; c: number; e: string }[]> = {
    'deadlocks': [
      {
        q: 'Which of the following is NOT one of the four necessary conditions for a deadlock to occur?',
        o: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'],
        c: 2,
        e: 'Preemption is not a condition for deadlock; in fact, allowing preemption is a way to resolve deadlocks. The four necessary conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.',
      },
      {
        q: 'What is the primary purpose of the Banker\'s Algorithm in operating systems?',
        o: ['Deadlock Detection', 'Deadlock Avoidance', 'Deadlock Recovery', 'Mutual Exclusion Enforcement'],
        c: 1,
        e: 'The Banker\'s Algorithm is a classic deadlock avoidance algorithm that checks if allocating resources keeps the system in a safe state.',
      },
      {
        q: 'In a resource allocation graph, what does a directed cycle usually indicate?',
        o: ['A system crash', 'An infinite loop', 'A possible deadlock state', 'Excellent resource utilization'],
        c: 2,
        e: 'In a resource allocation graph with single-unit resource types, a cycle indicates a deadlock. If there are multiple resource units, it only implies a potential deadlock.',
      },
    ],
    'scheduling': [
      {
        q: 'Which scheduling algorithm is non-preemptive and selects the process with the shortest CPU burst time?',
        o: ['Round Robin', 'Shortest Job First (SJF)', 'First-Come, First-Served (FCFS)', 'Priority Scheduling'],
        c: 1,
        e: 'Shortest Job First (SJF) is a scheduling policy that selects the waiting process with the smallest execution time.',
      },
      {
        q: 'What is the primary drawback of the First-Come, First-Served (FCFS) scheduling algorithm?',
        o: ['High CPU overhead', 'Convoy Effect', 'Starvation of short processes', 'Complex implementation'],
        c: 1,
        e: 'The Convoy Effect occurs when smaller processes wait for a long process to release the CPU, leading to poor device utilization.',
      },
    ],
    'synchronization': [
      {
        q: 'What is a critical section in concurrent programming?',
        o: ['A part of code that executes slowly', 'A code block accessing shared resources that must not be concurrently accessed by multiple threads', 'A system validation layer', 'A hardware lock'],
        c: 1,
        e: 'A critical section is a code segment that accesses shared variables and must be executed atomically to prevent race conditions.',
      },
      {
        q: 'Which mechanism is a synchronization tool that does not require busy waiting?',
        o: ['Spinlock', 'Semaphore with a waiting queue', 'Strict alternation', 'Peterson\'s solution'],
        c: 1,
        e: 'Semaphores implemented with a wait queue block the process and put it in a waiting queue, avoiding CPU-wasting spinlocks (busy waiting).',
      },
    ],
    'database systems': [
      {
        q: 'Which normal form is concerned with eliminating transitive dependencies?',
        o: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
        c: 2,
        e: 'Third Normal Form (3NF) requires the relation to be in 2NF and that no non-prime attribute is transitively dependent on the primary key.',
      },
      {
        q: 'What does the "I" represent in ACID properties of transactions?',
        o: ['Inheritance', 'Isolation', 'Integrity', 'Indexation'],
        c: 1,
        e: 'Isolation ensures that concurrent execution of transactions leaves the database in the same state as if transactions were executed sequentially.',
      },
      {
        q: 'Which database index structure is commonly used for range queries?',
        o: ['Hash Map', 'B+ Tree', 'Linked List', 'Binary Search Tree'],
        c: 1,
        e: 'B+ Trees maintain sorted data, which makes searching, sequential access, and range queries highly efficient in database systems.',
      },
    ],
  };

  const questionsList: QuizQuestion[] = [];
  const questionsPerTopic = Math.max(1, Math.ceil(count / activeTopics.length));

  activeTopics.forEach((topicName) => {
    const topicKey = topicName.toLowerCase();
    let templateList = mockTemplates[topicKey] || null;

    if (!templateList) {
      const matchedKey = Object.keys(mockTemplates).find((k) => topicKey.includes(k) || k.includes(topicKey));
      if (matchedKey) {
        templateList = mockTemplates[matchedKey];
      }
    }

    if (templateList) {
      const shuffled = [...templateList].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, questionsPerTopic);
      selected.forEach((item) => {
        const correctIdx = Math.floor(Math.random() * 4);
        const newOptions = [...item.o];
        const originalCorrect = newOptions[item.c];
        newOptions[item.c] = newOptions[correctIdx];
        newOptions[correctIdx] = originalCorrect;

        questionsList.push({
          question: item.q,
          options: newOptions,
          correctAnswerIndex: correctIdx,
          explanation: item.e.replace(
            'correct answer',
            `correct answer at option ${['A', 'B', 'C', 'D'][correctIdx]}`
          ),
        });
      });
    } else {
      // Dynamic fallback for unrecognized mock topic
      for (let i = 0; i < questionsPerTopic; i++) {
        questionsList.push({
          question: `Regarding "${topicName}" within ${cleanSubject}, which option best explains its core concept?`,
          options: [
            `The primary definition or mechanism associated with ${topicName}.`,
            `An alternative distractor choice related to ${cleanSubject}.`,
            `An irrelevant concept from another area of computer science.`,
            `A basic description that doesn't accurately cover ${topicName}.`,
          ],
          correctAnswerIndex: 0,
          explanation: `This is a mock question generated dynamically for the topic "${topicName}" under "${cleanSubject}".`,
        });
      }
    }
  });

  // Randomize questions across the selected topics rather than focusing on only one
  return questionsList.sort(() => 0.5 - Math.random()).slice(0, count);
};

// ==========================================
// PUBLIC AI SERVICE APIS
// ==========================================

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

// In-memory set of models that have permanently failed (e.g., 404) to avoid repeated retries
const disabledModels = new Set<string>();

// Preferred models to check in priority order
const PREFERRED_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];

/**
 * Categorizes raw API and SDK errors into structured GeminiError objects.
 */
const categorizeGeminiError = (error: any, modelName?: string): GeminiError => {
  const status = error?.status;
  const message = error?.message || '';
  const errorDetailsString = JSON.stringify(error?.errorDetails || error || '');

  // 1. Invalid API Key (Status 400/401/403 with key-related message, or reason: "API_KEY_INVALID")
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

  // 2. Quota Exceeded (Status 429 or messages/reasons including Resource Exhausted / Quota exceeded / rate limit)
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

  // 3. Model Unavailable / Deprecated (Status 404 or message indicating model no longer available / not found)
  if (
    status === 404 ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('no longer available') ||
    message.includes('not supported')
  ) {
    const modelInfo = modelName ? ` (${modelName})` : '';
    return new GeminiError(
      'MODEL_UNAVAILABLE',
      `The selected AI model${modelInfo} is unavailable or has been deprecated.`,
      true, // Retryable (we can try another model in the list)
      status
    );
  }

  // 4. Network Error (e.g. Failed to fetch, DNS issue, network connection timeout)
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connect') ||
    message.includes('timeout') ||
    error instanceof TypeError
  ) {
    return new GeminiError(
      'NETWORK_ERROR',
      'Network connection issue. Please check your internet connection and try again.',
      true, // Retryable
      status
    );
  }

  // 5. Unknown/Other
  return new GeminiError(
    'UNKNOWN_ERROR',
    message || 'An unexpected error occurred while generating AI content.',
    true,
    status
  );
};

/**
 * Helper to strip markdown formatting and clean dynamic JSON output before parsing.
 */
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

/**
 * Generates content using a list of model fallbacks in case of regional restrictions or deprecations.
 */
const generateWithFallback = async (
  prompt: string,
  responseMimeType?: string,
  responseSchema?: Schema
): Promise<string> => {
  if (!genAI) throw new Error('Gemini API client not initialized');

  // Filter out models that are permanently disabled
  const modelsToTry = PREFERRED_MODELS.filter(m => !disabledModels.has(m));

  if (modelsToTry.length === 0) {
    throw new GeminiError(
      'MODEL_UNAVAILABLE',
      'All configured Gemini AI models are currently unavailable.',
      false
    );
  }

  let lastError: GeminiError | null = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting content generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: responseMimeType ? { 
          responseMimeType,
          responseSchema
        } : undefined,
      });
      console.log("Trying model:", modelName);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) {
        console.log(`Successfully generated content using model: ${modelName}`);
        return text;
      }
    } catch (rawError: any) {
      const categorized = categorizeGeminiError(rawError, modelName);
      console.log("====================");
      console.log("Model:", modelName);
      console.log("Error Type:", categorized.type);
      console.log("Error Message:", categorized.message);
      console.log("====================");

      // Cache 404 / unavailable models so we don't try them next time
      if (categorized.type === 'MODEL_UNAVAILABLE') {
        disabledModels.add(modelName);
        console.log(`Disabled model permanently for this session: ${modelName}`);
      }

      // If it's a non-retryable error (invalid key, quota exceeded, etc.), throw it immediately
      if (!categorized.isRetryable) {
        throw categorized;
      }

      lastError = categorized;
      continue;
    }
  }

  throw lastError || new GeminiError('UNKNOWN_ERROR', 'All model fallbacks failed', false);
};

/**
 * Generates MCQs from study subject, topic, and notes or documents
 */
export const generateQuiz = async (
  subject: string,
  topic: string,
  notes?: string,
  fileUri?: string,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive' = 'medium'
): Promise<QuizQuestion[]> => {
  // If Gemini client is not initialized, run mock generation instantly
  if (!genAI) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateMockQuiz(subject, topic, count, difficulty);
  }

  // Split and clean topics
  const topicsList = topic.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
  const activeTopics = topicsList.length > 0 ? topicsList : ['Core concepts'];

  try {
    // Implement priority rules:
    // Priority 1: Ground questions in uploaded study material (notes)
    // Priority 2: Use Subject + Topic general knowledge if no uploaded study material
    const hasUploadedMaterial = notes && notes.trim().length > 0;

    let groundingInstructions = '';
    if (hasUploadedMaterial) {
      groundingInstructions = `
        PRIMARY SOURCE GOUNDING (Priority 1): Focus exclusively on the uploaded study material provided below. 
        Analyze the text content and generate questions ONLY from the facts, concepts, and materials described within.
        Verify that the questions align with the requested topic(s): ${activeTopics.join(', ')}.
        
        [Uploaded Study Material Content]
        """
        ${notes}
        """
      `;
    } else {
      groundingInstructions = `
        PRIMARY SOURCE GROUNDING (Priority 2): No uploaded study material was provided. 
        Generate highly accurate and educational questions using your general academic knowledge based on:
        Subject: ${subject}
        Topic(s): ${activeTopics.join(', ')}
      `;
    }

    const prompt = `
      You are a cute, supportive study companion called Lumora.
      Generate a multiple choice quiz based on the following instructions:
      
      ${groundingInstructions}
      
      Number of questions to generate: ${count}
      Difficulty level: ${difficulty}
      
      Topic instructions:
      - Cleanly split topics: ${activeTopics.join(', ')}.
      - Treat each topic as a separate study topic.
      - Generate a balanced quiz covering all entered topics.
      - Randomize questions across the selected topics rather than focusing on only one.

      Your task is to generate exactly ${count} multiple choice questions.
      You must respond with a JSON array containing objects matching this schema:
      [
        {
          "question": "string (the MCQ question)",
          "options": ["string", "string", "string", "string"], // exactly 4 choices
          "correctAnswerIndex": number, // 0, 1, 2, or 3 representing the index of the correct option
          "explanation": "string (a short, cute, concise explanation under 3 sentences of why this is correct and why the others are wrong. Do not use emoji.)"
        }
      ]
      
      Make the questions challenging but suited for the difficulty. Ground them strictly according to the grounding rules above.
    `;

    // Define standard JSON schema to guarantee format and prevent parser syntax errors
    const quizSchema: Schema = {
      type: SchemaType.ARRAY,
      description: "List of generated multiple choice questions",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING, description: "The MCQ question" },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Exactly 4 options"
          },
          correctAnswerIndex: { 
            type: SchemaType.INTEGER, 
            description: "Index of correct option in options array (0, 1, 2, or 3)" 
          },
          explanation: { 
            type: SchemaType.STRING, 
            description: "Concise explanation under 3 sentences of why this is correct and why others are wrong." 
          }
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"]
      }
    };

    const responseText = await generateWithFallback(prompt, 'application/json', quizSchema);
    const cleanedText = cleanJsonString(responseText);

    // Parse and validate response
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validated: QuizQuestion[] = parsed.map((item: any) => {
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
        throw new Error('Malformed question schema from AI');
      });
      return validated;
    }
    throw new Error('AI response is not a valid JSON array');
  } catch (error: any) {
    console.error('Gemini quiz generation failed:', error);
    
    // If it's a structured GeminiError, propagate the friendly message
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new Error(error?.message || 'An unexpected error occurred during quiz generation.');
  }
};

/**
 * Verifies which answers are correct.
 * Currently uses simple client-side index matching, but structured to support server-side AI evaluation if needed.
 */
export const verifyAnswers = async (
  questions: QuizQuestion[],
  selectedAnswers: number[]
): Promise<boolean[]> => {
  // Simple index matching is 100% accurate for multiple choice.
  // We mock a delay if it is routed as a service call.
  return questions.map((q, idx) => q.correctAnswerIndex === selectedAnswers[idx]);
};

/**
 * Explains mistakes on quiz questions.
 * Returns a custom written string explaining the user's mistake.
 */
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
    // Simulated explanation fallback
    return `You selected "${selectedAnswerText}". The correct answer is actually "${correctAnswerText}". ${question.explanation}`;
  }

  try {
    const prompt = `
      You are a cute, helpful study companion called Lumora.
      The student answered a multiple choice question incorrectly. Explain their mistake concisely.
      Question: ${question.question}
      Options:
      0: ${question.options[0]}
      1: ${question.options[1]}
      2: ${question.options[2]}
      3: ${question.options[3]}
      Correct Option Index: ${question.correctAnswerIndex} ("${correctAnswerText}")
      Student Selected Option Index: ${userSelectedIndex} ("${selectedAnswerText}")
      
      Give a short, friendly explanation (under 3 sentences, no emoji) explaining why their choice is incorrect and how they can think about the correct answer.
    `;

    const responseText = await generateWithFallback(prompt);
    return responseText.trim();
  } catch (error: any) {
    console.error('Gemini explanation failed:', error);
    if (error instanceof GeminiError) {
      throw error;
    }
    throw new Error(error?.message || 'Failed to load AI explanation.');
  }
};
