import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Award, Brain, Check, Sparkles, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { SubjectSelector } from '../../src/components/SubjectSelector';
import { LumoraLogo } from '../../src/components/LumoraLogo';
import { explainMistakes, generateQuiz, getSampleQuiz } from '../../src/services/ai/gemini';
import { saveQuiz } from '../../src/services/firebase/firestore';
import { useAuthStore } from '../../src/store/authStore';
import { useFocusStore } from '../../src/store/focusStore';
import { useThemeStore } from '../../src/store/themeStore';
import { QuizQuestion } from '../../src/types';

type QuizState = 'setup' | 'loading' | 'error' | 'active' | 'summary';

export default function QuizScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);
  const addXP = useAuthStore((state) => state.addXP);
  const { subject, topic, notes, completeQuiz, setContext } = useFocusStore();

  // Opacity pulsing for loading states
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
  }, []);
  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Initial setup state
  const hasStudyData = subject.trim() !== '' && topic.trim() !== '';
  const [needsSetup, setNeedsSetup] = useState(!hasStudyData);
  const [skipModalVisible, setSkipModalVisible] = useState(false);

  // Quiz States
  const [quizState, setQuizState] = useState<QuizState>('setup');
  const [setupSubject, setSetupSubject] = useState(subject);
  const [setupTopic, setSetupTopic] = useState(topic);

  // Quiz Data
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [isSampleMode, setIsSampleMode] = useState(false);

  // Custom Gemini explanation states
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<Record<number, boolean>>({});

  // Generate Quiz
  useEffect(() => {
    if (needsSetup) {
      setQuizState('setup');
      return;
    }

    let active = true;
    const fetchQuizData = async () => {
      try {
        setQuizState('loading');
        setErrorMessage('');
        const generated = await generateQuiz(
          subject || setupSubject,
          topic || setupTopic,
          notes,
          undefined,
          5, // 5 questions default
          'medium'
        );
        if (active) {
          setIsSampleMode(false);
          setQuestions(generated);
          setQuizState('active');
          setCurrentIdx(0);
          setUserAnswers({});
          setScore(0);
        }
      } catch (err: any) {
        console.error('Failed to load quiz:', err);
        if (active) {
          setErrorMessage(err?.message || "AI quiz generation is temporarily unavailable. You can retry, load demo sample questions, or proceed to your break.");
          setQuizState('error');
        }
      }
    };

    fetchQuizData();
    return () => {
      active = false;
    };
  }, [needsSetup, retryTrigger]);

  const handleUseSampleQuiz = () => {
    const currentSub = subject || setupSubject || 'Operating Systems';
    const currentTop = topic || setupTopic || 'Deadlocks';
    const samples = getSampleQuiz(currentSub, currentTop, 5, 'medium');
    setQuestions(samples);
    setIsSampleMode(true);
    setQuizState('active');
    setCurrentIdx(0);
    setUserAnswers({});
    setScore(0);
  };

  // Handle Form Submission for Setup
  const handleStartSetupQuiz = () => {
    if (setupSubject.trim() === '' || setupTopic.trim() === '') {
      return;
    }
    setContext({
      subject: setupSubject,
      topic: setupTopic,
    });
    setNeedsSetup(false);
  };

  // Option selection - gives instant feedback
  const handleSelectOption = (optIdx: number) => {
    // If already answered this question, do not allow changing answer
    if (userAnswers[currentIdx] !== undefined) return;

    const correctIndex = questions[currentIdx].correctAnswerIndex;
    const isCorrect = optIdx === correctIndex;

    setUserAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  // Explanation mistake breakdown from Gemini
  const handleLoadAiExplanation = async (qIdx: number, questionObj: QuizQuestion, selectedIdx: number) => {
    if (aiExplanations[qIdx]) return; // already loaded

    setLoadingExplanation((prev) => ({ ...prev, [qIdx]: true }));
    try {
      const explanationText = await explainMistakes(questionObj, selectedIdx);
      setAiExplanations((prev) => ({ ...prev, [qIdx]: explanationText }));
    } catch (err: any) {
      console.log('Error loading AI explanation:', err);
      setAiExplanations((prev) => ({ ...prev, [qIdx]: err?.message || 'Failed to load AI explanation.' }));
    } finally {
      setLoadingExplanation((prev) => ({ ...prev, [qIdx]: false }));
    }
  };

  // Next or Submit Question
  const handleNextOrFinish = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Last question - submit quiz results
      setQuizState('loading');

      // Calculate XP
      const normalXp = score * 2;
      const perfectXp = score === questions.length ? 20 : 0;
      const totalXp = normalXp + perfectXp;
      setXpAwarded(totalXp);

      if (user) {
        await addXP(totalXp);

        const quizData = {
          id: 'quiz-' + Math.random().toString(36).substr(2, 9),
          sessionId: Array.isArray(sessionId) ? sessionId[0] : sessionId || 'no-session-id',
          userId: user.uid,
          subject: subject || setupSubject,
          topic: topic || setupTopic,
          questions: questions,
          score: score,
          totalQuestions: questions.length,
          timestamp: new Date().toISOString(),
        };
        await saveQuiz(quizData);
      }

      setQuizState('summary');
    }
  };

  const handleFinish = () => {
    completeQuiz();
    router.replace('/(tabs)' as any);
  };

  if (quizState === 'setup') {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 10 }}>
          <Pressable onPress={() => setSkipModalVisible(true)} style={{ padding: 8 }}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.setupScrollView}
          contentContainerStyle={styles.setupScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.setupCard} bordered>
            <View style={styles.setupHeader}>
              <Brain size={42} color={colors.primary} />
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>Let's prepare your quiz ✨</Text>
              <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
                I need to know what you studied so I can create a personalized quiz.
              </Text>
            </View>

            <SubjectSelector
              label="Subject / Course"
              value={setupSubject}
              onChange={setSetupSubject}
              placeholder="Add subject (e.g. Operating Systems)"
            />

            <Input
              label="Topic(s)"
              placeholder="Example: Deadlocks, Scheduling, Synchronization"
              value={setupTopic}
              onChangeText={setSetupTopic}
              containerStyle={{ width: '100%', marginBottom: 18 }}
            />

            <Button
              title="Generate Quiz"
              onPress={handleStartSetupQuiz}
              disabled={setupSubject.trim() === '' || setupTopic.trim() === ''}
              style={{ marginTop: 8, width: '100%' }}
            />
          </Card>
        </ScrollView>

        {/* SKIP CONFIRMATION MODAL */}
        <Modal visible={skipModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Brain size={48} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Skip this Quiz? 🤔</Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                Skipping this check-in means you won't earn any XP for this study check-in, and no progress updates will be recorded. We recommend taking 2 minutes to test your recall!
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  title="Keep Testing"
                  onPress={() => setSkipModalVisible(false)}
                  variant="primary"
                  style={styles.modalActionBtn}
                />
                <Button
                  title="Skip Quiz"
                  onPress={() => {
                    setSkipModalVisible(false);
                    handleFinish();
                  }}
                  variant="ghost"
                  style={[styles.modalActionBtn, styles.dangerOutlineBtn]}
                  textStyle={{ color: colors.error }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER LOADING STATE
  // ==========================================
  if (quizState === 'loading') {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrapper}>
          <Animated.View style={[pulseAnimatedStyle, { marginBottom: 20 }]}>
            <LumoraLogo size={48} />
          </Animated.View>
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

  // ==========================================
  // RENDER ERROR STATE
  // ==========================================
  if (quizState === 'error') {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Card style={styles.errorCard} bordered>
          <AlertTriangle size={48} color={colors.error} style={{ marginBottom: 16 }} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Quiz Generation Failed</Text>
          <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>
            {errorMessage}
          </Text>
          <View style={{ width: '100%', gap: 10 }}>
            <Button
              title="Retry AI Generation"
              variant="primary"
              onPress={() => {
                setNeedsSetup(false);
                setQuizState('loading');
                setRetryTrigger((prev) => prev + 1);
              }}
            />
            <Button
              title="Load Demo Sample MCQs"
              variant="secondary"
              onPress={handleUseSampleQuiz}
            />
            <Button
              title="Skip Quiz to Break"
              variant="secondary"
              onPress={handleFinish}
            />
          </View>
        </Card>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER ACTIVE QUIZ STATE
  // ==========================================
  if (quizState === 'active') {
    const currentQuestion = questions[currentIdx];
    const userSelection = userAnswers[currentIdx];
    const isAnswered = userSelection !== undefined;
    const correctIndex = currentQuestion.correctAnswerIndex;

    return (
      <SafeAreaView style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Brain size={22} color={colors.primary} />
            <Text style={[styles.quizSubject, { color: colors.textPrimary }]} numberOfLines={1}>
              {subject || setupSubject}
            </Text>
            {isSampleMode && (
              <View style={[styles.sampleBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sampleBadgeText, { color: colors.primary }]}>
                  Demo Sample
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={() => setSkipModalVisible(true)} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} />
          </Pressable>
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

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.quizHeaderTitle, { color: colors.textPrimary }]}>✨ Knowledge Check</Text>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Question {currentIdx + 1} of {questions.length}
            </Text>
          </View>
          <Text style={[styles.quizSubtitleText, { color: colors.textSecondary }]}>Let's see what you remember.</Text>

          <Card style={styles.questionCard} bordered>
            <Text style={[styles.questionText, { color: colors.textPrimary }]}>
              {currentQuestion.question}
            </Text>
          </Card>

          {/* Options List */}
          <View style={styles.optionsList}>
            {currentQuestion.options.map((option, idx) => {
              const isSelected = userSelection === idx;
              const isCorrectOpt = idx === correctIndex;

              // Define style states
              let chipBorder = colors.border;
              let chipBg = colors.card;
              let indicatorBg = colors.border;
              let textWeight = '500';

              if (isAnswered) {
                if (isSelected) {
                  if (isCorrectOpt) {
                    chipBorder = colors.success;
                    chipBg = colors.success + '15';
                    indicatorBg = colors.success;
                  } else {
                    chipBorder = colors.error;
                    chipBg = colors.error + '15';
                    indicatorBg = colors.error;
                  }
                  textWeight = '700';
                } else if (isCorrectOpt) {
                  chipBorder = colors.success;
                  chipBg = colors.success + '10';
                  indicatorBg = colors.success;
                }
              } else if (isSelected) {
                chipBorder = colors.primary;
                chipBg = colors.secondary;
                indicatorBg = colors.primary;
                textWeight = '700';
              }

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  style={[
                    styles.optionChip,
                    {
                      borderColor: chipBorder,
                      backgroundColor: chipBg,
                      borderWidth: isSelected || (isAnswered && isCorrectOpt) ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[styles.optionIndicator, { backgroundColor: indicatorBg }]}>
                    <Text style={[styles.optionIndexText, { color: '#FFF' }]}>
                      {['A', 'B', 'C', 'D'][idx]}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: colors.textPrimary, fontWeight: textWeight as any }]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Instant Feedback Panel */}
          {isAnswered && (
            <Card style={[styles.feedbackCard, { borderColor: userSelection === correctIndex ? colors.success : colors.error }]} bordered>
              <View style={styles.feedbackHeader}>
                {userSelection === correctIndex ? (
                  <View style={[styles.feedbackBadge, { backgroundColor: colors.success + '20' }]}>
                    <Check size={18} color={colors.success} strokeWidth={3} />
                    <Text style={[styles.feedbackBadgeText, { color: colors.success }]}>Correct</Text>
                  </View>
                ) : (
                  <View style={[styles.feedbackBadge, { backgroundColor: colors.error + '20' }]}>
                    <X size={18} color={colors.error} strokeWidth={3} />
                    <Text style={[styles.feedbackBadgeText, { color: colors.error }]}>Incorrect</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.explanationContent, { color: colors.textSecondary }]}>
                {currentQuestion.explanation}
              </Text>

              {/* Gemini custom evaluation */}
              {userSelection !== correctIndex && (
                <View style={{ marginTop: 12 }}>
                  {aiExplanations[currentIdx] ? (
                    <View style={[styles.aiExplanationBox, { borderColor: colors.primary, borderWidth: 1.5 }]}>
                      <Text style={[styles.aiExplanationLabel, { color: colors.primary }]}>Lumora's Mistake Breakdown</Text>
                      <Text style={[styles.aiExplanationText, { color: colors.textPrimary }]}>
                        {aiExplanations[currentIdx]}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title={loadingExplanation[currentIdx] ? "Asking AI..." : "Explain My Mistake"}
                      variant="secondary"
                      size="small"
                      onPress={() => handleLoadAiExplanation(currentIdx, currentQuestion, userSelection)}
                      loading={loadingExplanation[currentIdx]}
                    />
                  )}
                </View>
              )}
            </Card>
          )}
        </ScrollView>

        {/* Bottom Button Row */}
        {isAnswered && (
          <View style={styles.bottomBar}>
            <Button
              title={currentIdx === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              onPress={handleNextOrFinish}
              style={{ flex: 1 }}
            />
          </View>
        )}
        {/* SKIP CONFIRMATION MODAL */}
        <Modal visible={skipModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Brain size={48} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Skip this Quiz? 🤔</Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                Skipping this check-in means you won't earn any XP for this study check-in, and no progress updates will be recorded. We recommend taking 2 minutes to test your recall!
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  title="Keep Testing"
                  onPress={() => setSkipModalVisible(false)}
                  variant="primary"
                  style={styles.modalActionBtn}
                />
                <Button
                  title="Skip Quiz"
                  onPress={() => {
                    setSkipModalVisible(false);
                    handleFinish();
                  }}
                  variant="ghost"
                  style={[styles.modalActionBtn, styles.dangerOutlineBtn]}
                  textStyle={{ color: colors.error }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER SUMMARY STATE
  // ==========================================
  const renderSummaryMessage = () => {
    const ratio = score / questions.length;
    if (ratio === 1) return "Perfect score! You're mastering this topic!";
    if (ratio >= 0.7) return "Great job! You have a solid grasp of this material.";
    return "Keep going! Reviewing your notes will help reinforce this topic.";
  };

  return (
    <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
      <Card style={styles.scoreCard} bordered>
        <Award size={52} color={colors.primary} style={{ marginBottom: 12 }} />
        <Text style={[styles.scoreTitle, { color: colors.textPrimary }]}>Knowledge Check Complete</Text>

        <Text style={[styles.scoreStats, { color: colors.primary }]}>
          Score: {score} / {questions.length} Correct
        </Text>

        <Text style={[styles.encouragementMsg, { color: colors.textSecondary }]}>
          {renderSummaryMessage()}
        </Text>

        <View style={[styles.xpRow, { backgroundColor: colors.secondary }]}>
          <Sparkles size={18} color={colors.primary} />
          <Text style={[styles.xpText, { color: colors.primary }]}>
            +{xpAwarded} XP Earned
          </Text>
        </View>

        <Button
          title="Return to Home"
          onPress={handleFinish}
          style={{ width: '100%', marginTop: 8 }}
        />
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
  },
  setupScrollView: {
    width: '100%',
    flex: 1,
  },
  setupScroll: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
  setupCard: {
    padding: 22,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 6,
  },
  setupSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
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
    maxWidth: 200,
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
    paddingBottom: 110,
  },
  quizHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  quizSubtitleText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  questionCard: {
    padding: 20,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  optionIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIndexText: {
    fontSize: 12,
    fontWeight: '800',
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  feedbackCard: {
    padding: 16,
    borderWidth: 1.5,
    marginTop: 8,
  },
  feedbackHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  feedbackBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  explanationContent: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  aiExplanationBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 117, 200, 0.05)',
    marginTop: 10,
  },
  aiExplanationLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  aiExplanationText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 10,
  },
  scoreCard: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  scoreTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  scoreStats: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  encouragementMsg: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    marginBottom: 24,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  modalActionBtn: {
    width: '100%',
  },
  dangerOutlineBtn: {
    borderWidth: 2,
  },
  sampleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
  },
  sampleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
