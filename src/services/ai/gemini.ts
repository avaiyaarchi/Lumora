import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuizQuestion } from '../../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

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

  const mockTemplates: Record<string, { q: string; o: string[]; c: number; e: string }[]> = {
    'operating systems': [
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
      {
        q: 'What is starvation in process scheduling?',
        o: ['CPU overheating', 'A process waiting indefinitely for resources', 'Memory leak', 'Process termination'],
        c: 1,
        e: 'Starvation (or indefinite blocking) is a problem where a process is ready to run but is perpetually denied resources or CPU execution time due to scheduling priorities.',
      },
      {
        q: 'Which deadlock handling strategy involves ignoring the problem altogether?',
        o: ['Ostrich Algorithm', 'Banker\'s Algorithm', 'Safe State Check', 'Mutual Exclusion Prevention'],
        c: 0,
        e: 'The Ostrich Algorithm is a strategy of ignoring deadlocks based on the assumption that they occur very rarely, named after the myth of ostriches burying their heads in sand.',
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

  const subjectKey = cleanSubject.toLowerCase();
  let selectedQuestions = mockTemplates[subjectKey] || null;

  // Try matching substring in subject
  if (!selectedQuestions) {
    const matchedKey = Object.keys(mockTemplates).find((k) => subjectKey.includes(k) || k.includes(subjectKey));
    if (matchedKey) {
      selectedQuestions = mockTemplates[matchedKey];
    }
  }

  // Generic generator if no template matched
  if (!selectedQuestions) {
    selectedQuestions = Array.from({ length: 5 }, (_, i) => ({
      q: `Question ${i + 1} regarding ${cleanTopic} in ${cleanSubject} (${difficulty} difficulty)`,
      o: [
        `Correct concept answer for ${cleanTopic}`,
        `Incorrect distractor choice A for ${cleanTopic}`,
        `Incorrect distractor choice B for ${cleanTopic}`,
        `Incorrect distractor choice C for ${cleanTopic}`,
      ],
      c: 0,
      e: `This is the mock explanation for question ${i + 1}. In a real setting, Gemini will analyze your notes and files to generate custom questions.`,
    }));
  }

  // Shuffle correct option and slice
  const result: QuizQuestion[] = selectedQuestions.map((item) => {
    // Randomize correct answer index
    const correctIdx = Math.floor(Math.random() * 4);
    const newOptions = [...item.o];
    // Swap correct answer to new index
    const originalCorrect = newOptions[item.c];
    newOptions[item.c] = newOptions[correctIdx];
    newOptions[correctIdx] = originalCorrect;

    return {
      question: item.q,
      options: newOptions,
      correctAnswerIndex: correctIdx,
      explanation: item.e.replace(
        'correct answer',
        `correct answer at option ${['A', 'B', 'C', 'D'][correctIdx]}`
      ),
    };
  });

  return result.slice(0, count);
};

// ==========================================
// PUBLIC AI SERVICE APIS
// ==========================================

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
    // Simulate minor network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateMockQuiz(subject, topic, count, difficulty);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      You are a cute, supportive study companion called Lumora.
      Generate a multiple choice quiz based on the following context:
      Subject: ${subject}
      Topic: ${topic}
      Study Notes: ${notes || 'No notes provided. Use general academic knowledge for this topic.'}
      Number of questions to generate: ${count}
      Difficulty level: ${difficulty}

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
      
      Make the questions challenging but suited for the difficulty. Ground them in the study notes.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse and validate response
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Basic validation check
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
  } catch (error) {
    console.error('Gemini generation failed, falling back to mock quiz:', error);
    return generateMockQuiz(subject, topic, count, difficulty);
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini explanation failed, falling back to local text:', error);
    return `You selected "${selectedAnswerText}". The correct answer is "${correctAnswerText}". Reason: ${question.explanation}`;
  }
};
