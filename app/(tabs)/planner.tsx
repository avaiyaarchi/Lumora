import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Modal, Pressable, Platform, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar as NativeCalendar } from 'react-native-calendars';
import { useForm, Controller } from 'react-hook-form';
import { useThemeStore } from '../../src/store/themeStore';
import { useAuthStore } from '../../src/store/authStore';
import { usePlannerStore } from '../../src/store/plannerStore';
import { useFocusStore } from '../../src/store/focusStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { SubjectSelector } from '../../src/components/SubjectSelector';
import { Task } from '../../src/types';
import { Plus, Check, Trash2, BookOpen, Star, Calendar as CalendarIcon, Play, X } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

type TaskFormData = {
  subject: string;
  topic: string;
  estimatedSessions: string;
  priority: 'low' | 'medium' | 'high';
  notes: string;
};

export default function PlannerScreen() {
  const router = useRouter();
  const colors = useThemeStore((state) => state.getColors());
  const user = useAuthStore((state) => state.user);
  
  // Stores
  const { tasks, loading, loadTasks, addTask, toggleTaskComplete, removeTask } = usePlannerStore();
  const setContext = useFocusStore((state) => state.setContext);

  // States
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Load tasks on mount or when user changes
  useEffect(() => {
    if (user) {
      loadTasks(user.uid);
    }
  }, [user]);

  // Form setup
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      subject: '',
      topic: '',
      estimatedSessions: '2',
      priority: 'medium',
      notes: '',
    },
  });

  const onSubmitTask = async (data: TaskFormData) => {
    if (!user) return;

    try {
      await addTask({
        id: 'task-' + Math.random().toString(36).substr(2, 9),
        userId: user.uid,
        subject: data.subject,
        topic: data.topic,
        estimatedSessions: parseInt(data.estimatedSessions, 10) || 2,
        priority: data.priority,
        deadline: selectedDate,
        notes: data.notes,
        completed: false,
      });
      
      setCreateModalVisible(false);
      reset();
    } catch (err) {
      console.log('Error adding task:', err);
    }
  };

  // Connect task context to focus session & redirect to Home study screen
  const handleStudyTask = (task: Task) => {
    setContext({
      subject: task.subject,
      topic: task.topic,
      notes: task.notes || '',
      fileUri: null,
      fileName: null,
    });
    router.replace('/(tabs)' as any);
  };

  // Filter tasks based on selected date
  const filteredTasks = tasks.filter((t) => t.deadline === selectedDate);
  const activeTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  // Mark calendar dates with dots for tasks
  const getMarkedDates = () => {
    const marked: Record<string, any> = {};
    tasks.forEach((task) => {
      if (!marked[task.deadline]) {
        marked[task.deadline] = {
          marked: true,
          dotColor: colors.primary,
        };
      }
    });

    // Highlight selected date
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
    };

    return marked;
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    if (priority === 'high') return colors.error;
    if (priority === 'medium') return colors.warning;
    return colors.success;
  };

  const renderTaskCard = (task: Task) => {
    const pColor = getPriorityColor(task.priority);
    return (
      <Card key={task.id} style={styles.taskCard} bordered>
        <View style={styles.taskHeaderRow}>
          <Pressable
            onPress={() => user && toggleTaskComplete(user.uid, task.id)}
            style={[
              styles.checkbox,
              {
                borderColor: task.completed ? colors.success : colors.border,
                backgroundColor: task.completed ? colors.success : colors.card,
              },
            ]}
          >
            {task.completed && <Check size={14} color="#FFF" strokeWidth={3} />}
          </Pressable>

          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={[
                styles.taskSubject,
                {
                  color: colors.textPrimary,
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {task.subject}
            </Text>
            <Text
              style={[
                styles.taskTopic,
                {
                  color: colors.textSecondary,
                  textDecorationLine: task.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {task.topic}
            </Text>
          </View>

          {/* Action Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {!task.completed && (
              <Pressable
                onPress={() => handleStudyTask(task)}
                style={[styles.actionIconBtn, { backgroundColor: colors.secondary }]}
              >
                <Play size={14} color={colors.primary} fill={colors.primary} />
              </Pressable>
            )}

            <Pressable
              onPress={() => user && removeTask(user.uid, task.id)}
              style={[styles.actionIconBtn, { backgroundColor: colors.error + '15' }]}
            >
              <Trash2 size={14} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.taskMetaRow}>
          <View style={[styles.priorityBadge, { backgroundColor: pColor + '15' }]}>
            <Star size={10} color={pColor} fill={pColor} />
            <Text style={[styles.priorityText, { color: pColor }]}>
              {task.priority.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Sessions: {task.actualSessions}/{task.estimatedSessions}
          </Text>
        </View>

        {task.notes ? (
          <Text style={[styles.taskNotesText, { color: colors.textSecondary + 'B0' }]} numberOfLines={2}>
            {task.notes}
          </Text>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={activeTasks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* Header Greeting */}
            <View style={styles.headerBar}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Study Planner</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Schedule focus targets and materials
              </Text>
            </View>

            {/* Calendar Widget */}
            <Card style={styles.calendarCard} bordered>
              <NativeCalendar
                current={selectedDate}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={getMarkedDates()}
                theme={{
                  calendarBackground: colors.card,
                  textSectionTitleColor: colors.textSecondary,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.textPrimary,
                  textDisabledColor: colors.textSecondary + '30',
                  dotColor: colors.primary,
                  selectedDotColor: '#ffffff',
                  arrowColor: colors.primary,
                  monthTextColor: colors.textPrimary,
                  textDayFontWeight: '600',
                  textMonthFontWeight: '800',
                  textDayHeaderFontWeight: '700',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                }}
              />
            </Card>

            {/* Selected Date Header */}
            <View style={styles.dateBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CalendarIcon size={18} color={colors.primary} />
                <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                  {format(parseISO(selectedDate), 'EEEE, MMMM dd')}
                </Text>
              </View>
              <Pressable
                onPress={() => setCreateModalVisible(true)}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
              >
                <Plus size={20} color="#FFF" />
              </Pressable>
            </View>

            {/* Active Tasks Heading */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Active Tasks ({activeTasks.length})
            </Text>

            {activeTasks.length === 0 && (
              <View style={styles.emptyContainer}>
                <BookOpen size={36} color={colors.textSecondary + '50'} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No active tasks for this day. Tap '+' to schedule one!
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => renderTaskCard(item)}
        ListFooterComponent={
          completedTasks.length > 0 ? (
            <View style={[styles.completedSection, { marginBottom: 110 }]}>
              <Pressable
                onPress={() => setShowCompleted(!showCompleted)}
                style={styles.completedHeaderRow}
              >
                <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Completed Tasks ({completedTasks.length})
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  {showCompleted ? 'Hide' : 'Show'}
                </Text>
              </Pressable>

              {showCompleted && (
                <View style={styles.completedList}>
                  {completedTasks.map((task) => renderTaskCard(task))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ height: 110 }} />
          )
        }
        contentContainerStyle={styles.scrollList}
      />

      {/* TASK CREATION MODAL */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create Task</Text>
              <Pressable onPress={() => setCreateModalVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Controller
                control={control}
                name="subject"
                rules={{ required: 'Subject is required' }}
                render={({ field: { onChange, value } }) => (
                  <SubjectSelector
                    value={value}
                    onChange={onChange}
                    error={errors.subject?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="topic"
                rules={{ required: 'Topic is required' }}
                render={({ field: { onChange, onBlur, value } }) => {
                  const selectedSubject = watch('subject');
                  const existingTopics = Array.from(
                    new Set(
                      tasks
                        .filter((t) => t.subject === selectedSubject)
                        .map((t) => t.topic)
                        .filter(Boolean)
                    )
                  );

                  return (
                    <View style={{ marginBottom: 16 }}>
                      <Input
                        label="Topic / Target"
                        placeholder="E.g., Banker's Algorithm"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.topic?.message}
                      />
                      {existingTopics.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                            Or select an existing topic:
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
                            {existingTopics.map((top) => (
                              <Pressable
                                key={top}
                                onPress={() => onChange(top)}
                                style={{
                                  paddingVertical: 6,
                                  paddingHorizontal: 12,
                                  borderRadius: 14,
                                  borderWidth: 1.5,
                                  borderColor: value === top ? colors.primary : colors.border,
                                  backgroundColor: value === top ? colors.secondary : colors.card,
                                  marginRight: 6,
                                }}
                              >
                                <Text style={{ color: value === top ? colors.primary : colors.textPrimary, fontWeight: '700', fontSize: 11 }}>
                                  {top}
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                }}
              />

              <Controller
                control={control}
                name="estimatedSessions"
                rules={{ required: 'Estimated focus count is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Estimated Focus Cycles"
                    placeholder="2"
                    keyboardType="numeric"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.estimatedSessions?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="priority"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.prioritySelectorContainer}>
                    <Text style={[styles.prioritySelectorLabel, { color: colors.textPrimary }]}>
                      Priority Level
                    </Text>
                    <View style={styles.prioritySelectorRow}>
                      {(['low', 'medium', 'high'] as const).map((p) => {
                        const isSelected = value === p;
                        let pColor = colors.success;
                        if (p === 'medium') pColor = colors.warning;
                        if (p === 'high') pColor = colors.error;

                        return (
                          <Pressable
                            key={p}
                            onPress={() => onChange(p)}
                            style={[
                              styles.priorityChip,
                              {
                                borderColor: isSelected ? pColor : colors.border,
                                backgroundColor: isSelected ? pColor + '15' : colors.card,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: isSelected ? pColor : colors.textSecondary,
                                fontWeight: '700',
                                fontSize: 13,
                              }}
                            >
                              {p.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Notes / Materials to Study (Optional)"
                    placeholder="Mention formulas, references, or text summary..."
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={3}
                    inputStyle={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
                  />
                )}
              />

              <Button
                title={`Schedule for ${format(parseISO(selectedDate), 'MMM dd')}`}
                onPress={handleSubmit(onSubmitTask)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollList: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  headerBar: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarCard: {
    padding: 10,
    marginBottom: 24,
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '800',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  taskCard: {
    marginBottom: 14,
    padding: 16,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  taskSubject: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 2,
  },
  taskTopic: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskNotesText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F6F6F6',
    paddingTop: 6,
  },
  completedSection: {
    marginTop: 18,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 4,
  },
  completedList: {
    opacity: 0.75,
  },
  // Modal Styles
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  prioritySelectorContainer: {
    marginBottom: 16,
  },
  prioritySelectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 6,
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 4,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
