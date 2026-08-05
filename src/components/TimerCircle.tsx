import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';
import { useFocusStore } from '../store/focusStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerCircleProps {
  timeLeft: number; // in seconds
  totalDuration: number; // in seconds
  mode: 'focus' | 'shortBreak' | 'longBreak' | 'quizReady';
  size?: number;
}

export const TimerCircle: React.FC<TimerCircleProps> = ({
  timeLeft,
  totalDuration,
  mode,
  size = 230,
}) => {
  const colors = useThemeStore((state) => state.getColors());
  const isRunning = useFocusStore((state) => state.isRunning);

  const radius = size * 0.4;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress ratio (0 = empty, 1 = full)
  // When timeLeft = totalDuration, progress = 1 (full ring)
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const targetOffset = circumference - progress * circumference;

  const animatedOffset = useSharedValue(targetOffset);
  const prevTimeLeftRef = React.useRef(timeLeft);
  const prevIsRunningRef = React.useRef(isRunning);

  React.useEffect(() => {
    const prevTime = prevTimeLeftRef.current;
    const prevIsRunning = prevIsRunningRef.current;

    prevTimeLeftRef.current = timeLeft;
    prevIsRunningRef.current = isRunning;

    const timeDifference = prevTime - timeLeft;

    // If it's a regular tick (timeLeft decreased by 1) and the timer is running
    if (isRunning && prevIsRunning && timeDifference === 1) {
      animatedOffset.value = withTiming(targetOffset, {
        duration: 1000,
        easing: Easing.linear,
      });
    } else {
      // If we just started, paused, reset, or skipped, snap immediately or stop animation
      cancelAnimation(animatedOffset);
      animatedOffset.value = targetOffset;
    }
  }, [timeLeft, isRunning, totalDuration, targetOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  // Format time remaining: MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'focus':
        return 'Focus';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      case 'quizReady':
        return 'Quiz Ready';
      default:
        return 'Study';
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {/* Background Track Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.progressBg}
            strokeWidth={strokeWidth}
          />
          {/* Progress Circle with rounded ends */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {/* Absolute text container inside the circle */}
      <View style={styles.textContainer}>
        <Text style={[styles.timerText, { color: colors.textPrimary }]}>
          {formatTime(timeLeft)}
        </Text>
        <Text style={[styles.modeText, { color: colors.primary }]}>
          {getModeLabel()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  modeText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
