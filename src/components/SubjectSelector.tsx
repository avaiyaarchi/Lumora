import { AlertCircle, BookOpen, Check, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { findDuplicateSubject, useSubjectStore } from '../store/subjectStore';
import { useThemeStore } from '../store/themeStore';

interface SubjectSelectorProps {
  value: string;
  onChange: (subject: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  allowCustom?: boolean;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  value,
  onChange,
  error,
  label = 'Subject / Course',
  placeholder = 'Add new subject',
  containerStyle,
  allowCustom = true,
}) => {
  const colors = useThemeStore((state) => state.getColors());
  const { subjects, addSubject } = useSubjectStore();

  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'error' | 'info' | 'success';
  } | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleAddNewSubject = () => {
    const trimmed = newSubjectInput.trim();

    if (!trimmed) {
      setFeedbackMessage({
        text: 'Please enter a subject name first.',
        type: 'error',
      });
      return;
    }

    // Check for case-insensitive duplicate in current subjects
    const existing = findDuplicateSubject(subjects, trimmed);
    if (existing) {
      // Friendly message and automatically select the existing one
      onChange(existing);
      setNewSubjectInput('');
      setFeedbackMessage({
        text: `"${existing}" is already available and selected!`,
        type: 'info',
      });
      return;
    }

    // Add to shared store
    const result = addSubject(trimmed);
    if (result.success && result.subject) {
      onChange(result.subject);
      setNewSubjectInput('');
      setFeedbackMessage({
        text: `Added and selected "${result.subject}"!`,
        type: 'success',
      });
    } else {
      setFeedbackMessage({
        text: result.error || 'Failed to add subject.',
        type: 'error',
      });
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label and Selected Info */}
      <View style={styles.headerRow}>
        <View style={styles.labelGroup}>
          <BookOpen size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        {value ? (
          <View style={[styles.activeBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.activeBadgeText, { color: colors.primary }]} numberOfLines={1}>
              Selected: {value}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Available Subject Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContent}
        >
          {subjects.map((subj) => {
            const isSelected = value.trim().toLowerCase() === subj.trim().toLowerCase();
            return (
              <Pressable
                key={subj}
                onPress={() => {
                  onChange(subj);
                  setFeedbackMessage(null);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? (colors.secondary || colors.primary + '20') : colors.card,
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
              >
                {isSelected && (
                  <Check
                    size={14}
                    color={colors.primary}
                    strokeWidth={3}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {subj}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Add Custom Subject Input & Button */}
      {allowCustom && (
        <View style={styles.addSection}>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: isFocused ? colors.primary : colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary + '80'}
              value={newSubjectInput}
              onChangeText={(text) => {
                setNewSubjectInput(text);
                if (feedbackMessage) setFeedbackMessage(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              returnKeyType="done"
              onSubmitEditing={handleAddNewSubject}
            />
            <Pressable
              onPress={handleAddNewSubject}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Feedback message (Duplicate warning or success notification) */}
      {feedbackMessage && (
        <View style={styles.feedbackRow}>
          <AlertCircle
            size={13}
            color={
              feedbackMessage.type === 'error'
                ? colors.error
                : feedbackMessage.type === 'success'
                  ? colors.success
                  : colors.primary
            }
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.feedbackText,
              {
                color:
                  feedbackMessage.type === 'error'
                    ? colors.error
                    : feedbackMessage.type === 'success'
                      ? colors.success
                      : colors.primary,
              },
            ]}
          >
            {feedbackMessage.text}
          </Text>
        </View>
      )}

      {/* Form Validation Error message */}
      {error && !feedbackMessage && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '55%',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipsContainer: {
    marginBottom: 10,
    width: '100%',
  },
  chipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
  },
  addSection: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
    paddingVertical: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    marginLeft: 4,
  },
});
