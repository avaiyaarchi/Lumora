import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detect if we are running on the web or in the Expo Go client on Android
// Web does not support native Expo notifications, and Expo Go Android throws a crash error.
const isUnsupported = Platform.OS === 'web' || (Platform.OS === 'android' && Constants.appOwnership === 'expo');

let expoNotifications: any = null;

if (!isUnsupported) {
  try {
    // Lazy load to prevent DevicePushTokenAutoRegistration side-effect from executing
    expoNotifications = require('expo-notifications');
  } catch (error) {
    console.warn('Failed to load expo-notifications dynamically:', error);
  }
} else {
  console.log('Running in unsupported notification environment (Web / Android Expo Go). Notification alerts will fall back to local mock triggers.');
}

export const setNotificationHandler = (handler: any) => {
  if (expoNotifications?.setNotificationHandler) {
    expoNotifications.setNotificationHandler(handler);
  }
};

export const getPermissionsAsync = async () => {
  if (expoNotifications?.getPermissionsAsync) {
    return await expoNotifications.getPermissionsAsync();
  }
  return { status: 'granted' };
};

export const requestPermissionsAsync = async () => {
  if (expoNotifications?.requestPermissionsAsync) {
    return await expoNotifications.requestPermissionsAsync();
  }
  return { status: 'granted' };
};

export const scheduleNotificationAsync = async (request: any) => {
  if (expoNotifications?.scheduleNotificationAsync) {
    return await expoNotifications.scheduleNotificationAsync(request);
  }
  console.log('Scheduled mock local alert (Expo Go Android):', request.content.title, '-', request.content.body);
  return 'mock-notification-id';
};

export const cancelScheduledNotificationAsync = async (identifier: string) => {
  if (expoNotifications?.cancelScheduledNotificationAsync) {
    return await expoNotifications.cancelScheduledNotificationAsync(identifier);
  }
  console.log('Cancelled mock local alert:', identifier);
};

export enum SchedulableTriggerInputTypes {
  CALENDAR = "calendar",
  DAILY = "daily",
  DATE = "date",
  MONTHLY = "monthly",
  TIME_INTERVAL = "timeInterval",
  WEEKLY = "weekly"
}
