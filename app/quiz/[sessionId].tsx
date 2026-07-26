import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { generateQuiz, explainMistakes } from '../../src/services/ai/gemini';
import { saveQuiz } from '../../src/services/firebase/firestore';
import { QuizQuestion } from '../../src/types';
import { Brain, Sparkles, AlertTriangle, ArrowRight, Check, X, Award } from 'lucide-react-native';

type QuizState = 'loading' | 'error' | 'active' | 'review';

export default function QuizScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);
  const addXP = useAuthStore((state) => state.addXP);
  const { subject, topic, notes, completeQuiz } = useFocusStore();

  // Quiz States
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(0);
  
  // Custom API-generated explanations for wrong answers
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<Record<number, boolean>>({});

  // Generate Quiz on mount
  useEffect(() => {
    let active = true;
    const fetchQuiz = async () => {
      try {
        setQuizState('loading');
        const generated = await generateQuiz(
          subject || 'General Studies',
          topic || 'Core concepts',
          notes,
          undefined,
          5, // 5 questions default
          'medium'
        );
        if (active) {
          setQuestions(generated);
          setSelectedAnswers(new Array(generated.length).fill(-1));
          setQuizState('active');
        }
      } catch (err) {
        console.error('Failed to load quiz:', err);
        if (active) setQuizState('error');
      }
    };

    fetchQuiz();
    return () => {
      active = false;
    };
  }, [subject, topic, notes]);

  const handleSelectOption = (optIdx: number) => {
    const updated = [...selectedAnswers];
    updated[currentIdx] = optIdx;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmit = async () => {
    if (selectedAnswers.includes(-1)) {
      // Prompt user that they missed questions
      return;
    }

    setQuizState('loading');

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (q.correctAnswerIndex === selectedAnswers[idx]) {
        correctCount += 1;
      }
    });

    // XP calculation
    // +5 XP per correct answer, +20 XP for perfect quiz
    const normalXp = correctCount * 5;
    const perfectXp = correctCount === questions.length ? 20 : 0;
    const totalXp = normalXp + perfectXp;

    setScore(correctCount);
    setXpAwarded(totalXp);

    // Save to database
    if (user) {
      // Award XP to store
      await addXP(totalXp);

      const quizData = {
        id: 'quiz-' + Math.random().toString(36).substr(2, 9),
        sessionId: Array.isArray(sessionId) ? sessionId[0] : sessionId || 'no-session-id',
        userId: user.uid,
        subject: subject || 'General Studies',
        topic: topic || 'Core concepts',
        questions: questions,
        score: correctCount,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString(),
      };
      await saveQuiz(quizData);
    }

    setQuizState('review');
  };

  // Request detailed explanation of mistake from Gemini
  const handleLoadAiExplanation = async (qIdx: number, questionObj: QuizQuestion, selectedIdx: number) => {
    if (aiExplanations[qIdx]) return; // already loaded
    
    setLoadingExplanation((prev) => ({ ...prev, [qIdx]: true }));
    try {
      const explanationText = await explainMistakes(questionObj, selectedIdx);
      setAiExplanations((prev) => ({ ...prev, [qIdx]: explanationText }));
    } catch (err) {
      console.log('Error loading AI explanation:', err);
    } finally {
      setLoadingExplanation((prev) => ({ ...prev, [qIdx]: false }));
    }
  };

  const handleFinish = () => {
    completeQuiz();
    router.replace('/(tabs)' as any);
  };

  // RENDER LOADING STATE
  if (quizState === 'loading') {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
            Lumora is generating your revision quiz...
          </Text>
          <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
            Sourcing questions from what you studied!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // RENDER ERROR STATE
  if (quizState === 'error') {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Card style={styles.errorCard} bordered>
          <AlertTriangle size={48} color={colors.error} style={{ marginBottom: 16 }} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Quiz Generation Failed</Text>
          <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>
            We couldn't connect to the AI service. Would you like to skip the quiz and proceed to your break?
          </Text>
          <View style={{ width: '100%', gap: 12 }}>
            <Button
              title="Skip Quiz to Break"
              onPress={handleFinish}
            />
            <Button
              title="Retry Generation"
              variant="secondary"
              onPress={() => {
                setQuizState('loading');
                router.replace(`/quiz/${sessionId}` as any);
              }}
            />
          </View>
        </Card>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIdx];
  const userSelection = selectedAnswers[currentIdx];

  // RENDER ACTIVE QUIZ VIEW
  if (quizState === 'active') {
    const isCompleted = !selectedAnswers.includes(-1);

    return (
      <SafeAreaView style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Brain size={22} color={colors.primary} />
            <Text style={[styles.quizSubject, { color: colors.textPrimary }]}>
              {subject || 'Revision Quiz'}
            </Text>
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Question {currentIdx + 1} of {questions.length}
          </Text>
        </View>

        {/* ProgressBar */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.progressBg }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${((currentIdx + 1) / questions.length) * 100}%`,
              },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.questionCard} bordered>
            <Text style={[styles.questionText, { color: colors.textPrimary }]}>
              {currentQuestion.question}
            </Text>
          </Card>

          {/* Options List */}
          <View style={styles.optionsList}>
            {currentQuestion.options.map((option, idx) => {
              const isSelected = userSelection === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleSelectOption(idx)}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.secondary : colors.card,
                    },
                  ]}
                >
                  <View style={[styles.optionIndicator, { backgroundColor: isSelected ? colors.primary : colors.border }]}>
                    <Text style={[styles.optionIndexText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>
                      {['A', 'B', 'C', 'D'][idx]}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary, fontWeight: isSelected ? '700' : '500' }]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Navigation bottom buttons */}
        <View style={styles.navigationRow}>
          <Button
            title="Prev"
            variant="ghost"
            onPress={handlePrev}
            disabled={currentIdx === 0}
            style={styles.navBtn}
          />

          {currentIdx === questions.length - 1 ? (
            <Button
              title="Submit"
              onPress={handleSubmit}
              disabled={!isCompleted}
              style={styles.navBtnSubmit}
            />
          ) : (
            <Button
              title="Next"
              onPress={handleNext}
              disabled={userSelection === -1}
              style={styles.navBtnSubmit}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // RENDER REVIEW VIEW (AFTER SUBMISSION)
  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.reviewScroll}>
        
        {/* Review Header card */}
        <Card style={styles.scoreCard} bordered>
          <Award size={48} color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.scoreTitle, { color: colors.textPrimary }]}>Session Review</Text>
          <Text style={[styles.scoreStats, { color: colors.primary }]}>
            Score: {score} / {questions.length} Correct
          </Text>
          <View style={[styles.xpRow, { backgroundColor: colors.secondary }]}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={[styles.xpText, { color: colors.primary }]}>
              +{xpAwarded} XP Earned
            </Text>
          </View>
        </Card>

        {/* Detailed Question Review List */}
        <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
          Review Answers
        </Text>

        {questions.map((q, idx) => {
          const selected = selectedAnswers[idx];
          const correct = q.correctAnswerIndex;
          const isCorrect = selected === correct;

          return (
            <Card key={idx} style={styles.reviewQuestionCard}>
              <View style={styles.reviewQuestionHeader}>
                <View style={[styles.statusIconCircle, { backgroundColor: isCorrect ? colors.success + '20' : colors.error + '20' }]}>
                  {isCorrect ? (
                    <Check size={18} color={colors.success} strokeWidth={3} />
                  ) : (
                    <X size={18} color={colors.error} strokeWidth={3} />
                  )}
                </View>
                <Text style={[styles.reviewQuestionNum, { color: colors.textSecondary }]}>
                  Question {idx + 1}
                </Text>
              </View>

              <Text style={[styles.reviewQuestionText, { color: colors.textPrimary }]}>
                {q.question}
              </Text>

              {/* Options status */}
              <View style={styles.reviewOptionsList}>
                {q.options.map((opt, optIdx) => {
                  let chipBg = colors.card;
                  let chipBorder = colors.border;
                  let showBadge = null;

                  if (optIdx === correct) {
                    chipBg = colors.success + '15';
                    chipBorder = colors.success;
                    showBadge = <Check size={16} color={colors.success} strokeWidth={3} />;
                  } else if (optIdx === selected) {
                    chipBg = colors.error + '15';
                    chipBorder = colors.error;
                    showBadge = <X size={16} color={colors.error} strokeWidth={3} />;
                  }

                  return (
                    <View
                      key={optIdx}
                      style={[
                        styles.reviewOptionChip,
                        {
                          backgroundColor: chipBg,
                          borderColor: chipBorder,
                          borderWidth: optIdx === correct || optIdx === selected ? 2 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.reviewOptionText, { color: colors.textPrimary, flex: 1 }]}>
                        {opt}
                      </Text>
                      {showBadge}
                    </View>
                  );
                })}
              </View>

              {/* Pre-generated Explanation */}
              <View style={[styles.explanationBox, { backgroundColor: colors.progressBg }]}>
                <Text style={[styles.explanationLabel, { color: colors.primary }]}>Explanation</Text>
                <Text style={[styles.explanationTextContent, { color: colors.textSecondary }]}>
                  {q.explanation}
                </Text>
              </View>

              {/* Call to request custom AI breakdown if incorrect */}
              {!isCorrect && (
                <View style={{ marginTop: 12 }}>
                  {aiExplanations[idx] ? (
                    <View style={[styles.aiExplanationBox, { borderColor: colors.primary, borderWidth: 1.5 }]}>
                      <Text style={[styles.aiExplanationLabel, { color: colors.primary }]}>Lumora's Mistake Breakdown</Text>
                      <Text style={[styles.aiExplanationText, { color: colors.textPrimary }]}>
                        {aiExplanations[idx]}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title={loadingExplanation[idx] ? "Asking AI..." : "Explain My Mistake"}
                      variant="secondary"
                      size="small"
                      onPress={() => handleLoadAiExplanation(idx, q, selected)}
                      loading={loadingExplanation[idx]}
                    />
                  )}
                </View>
              )}
            </Card>
          );
        })}

        <Button
          title="Back to Study"
          onPress={handleFinish}
          style={styles.finishBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
  },
  loadingWrapper: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  quizSubject: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  questionCard: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  optionsList: {
    gap: 12,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2.5,
    padding: 16,
  },
  optionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIndexText: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionText: {
    fontSize: 15,
    flex: 1,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navBtn: {
    width: 90,
  },
  navBtnSubmit: {
    width: 140,
  },
  // Review Styles
  reviewScroll: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 60,
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 28,
  },
  scoreTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  scoreStats: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 14,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 6,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    marginLeft: 4,
  },
  reviewQuestionCard: {
    padding: 18,
    marginBottom: 20,
  },
  reviewQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewQuestionNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewQuestionText: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 16,
  },
  reviewOptionsList: {
    gap: 8,
    marginBottom: 14,
  },
  reviewOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  reviewOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  explanationBox: {
    padding: 14,
    borderRadius: 14,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  explanationTextContent: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  aiExplanationBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  aiExplanationLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  aiExplanationText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  finishBtn: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
});
