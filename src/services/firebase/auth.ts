import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, isFirebaseEnabled } from './config';
import { createUserProfile, getUserProfile } from './firestore';
import { UserProfile } from '../../types';

// Standard Firebase SDK Auth imports
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

// Simulated Auth state listener callbacks
type AuthListener = (user: UserProfile | null) => void;
const listeners: Set<AuthListener> = new Set();
let activeUser: UserProfile | null = null;

// Safe parser helper
const safeParse = (val: string | null, fallback: any) => {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

// Initialize simulated authentication state from AsyncStorage
const initSimulatedAuth = async () => {
  if (isFirebaseEnabled) return;
  
  try {
    const activeUid = await AsyncStorage.getItem('lumora_simulated_active_uid');
    if (activeUid) {
      const profile = await getUserProfile(activeUid);
      activeUser = profile;
      notifyListeners();
    }
  } catch (err) {
    console.error('Error initializing simulated auth:', err);
  }
};

const notifyListeners = () => {
  listeners.forEach((listener) => listener(activeUser));
};

// Start initialization immediately
initSimulatedAuth();

// ==========================================
// AUTHENTICATION INTERFACES
// ==========================================

export const subscribeToAuthChanges = (callback: AuthListener) => {
  if (isFirebaseEnabled && auth) {
    // Firebase implementation
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        callback(profile);
      } else {
        callback(null);
      }
    });
  }

  // Simulated implementation
  listeners.add(callback);
  callback(activeUser); // Call immediately with current state
  
  return () => {
    listeners.delete(callback);
  };
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  semester: string
): Promise<UserProfile> => {
  const formattedEmail = email.toLowerCase().trim();

  if (isFirebaseEnabled && auth) {
    const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
    const newProfile: UserProfile = {
      uid: userCredential.user.uid,
      name,
      email: formattedEmail,
      semester,
      level: 1,
      xp: 0,
      streak: 1,
      lastStudyDate: new Date().toISOString().split('T')[0],
      joinedDate: new Date().toLocaleDateString(),
      unlockedThemes: ['lavender', 'pink', 'cream', 'sky', 'sage'],
      equippedAvatar: 'cat',
      equippedAccessories: [],
      unlockedAvatars: ['cat', 'rabbit'], // Default starters
      unlockedAccessories: ['glasses'], // Default starter accessory
    };
    await createUserProfile(newProfile);
    return newProfile;
  }

  // Simulated registration
  const localUsersRaw = await AsyncStorage.getItem('lumora_simulated_users');
  const localUsers: Record<string, { profile: UserProfile; passwordHash: string }> = safeParse(localUsersRaw, {});

  if (localUsers[formattedEmail]) {
    throw new Error('auth/email-already-in-use');
  }

  const generatedUid = 'local-uid-' + Math.random().toString(36).substr(2, 9);
  const newProfile: UserProfile = {
    uid: generatedUid,
    name,
    email: formattedEmail,
    semester,
    level: 1,
    xp: 0,
    streak: 1,
    lastStudyDate: new Date().toISOString().split('T')[0],
    joinedDate: new Date().toLocaleDateString(),
    unlockedThemes: ['lavender', 'pink', 'cream', 'sky', 'sage'],
    equippedAvatar: 'cat',
    equippedAccessories: [],
    unlockedAvatars: ['cat', 'rabbit'],
    unlockedAccessories: ['glasses'],
  };

  // Save to simulated user database
  localUsers[formattedEmail] = {
    profile: newProfile,
    passwordHash: password, // In mock, plaintext is fine
  };
  await AsyncStorage.setItem('lumora_simulated_users', JSON.stringify(localUsers));
  await AsyncStorage.setItem(`lumora_profile_${generatedUid}`, JSON.stringify(newProfile));

  // Set active session
  activeUser = newProfile;
  await AsyncStorage.setItem('lumora_simulated_active_uid', generatedUid);
  notifyListeners();

  return newProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const formattedEmail = email.toLowerCase().trim();

  if (isFirebaseEnabled && auth) {
    const userCredential = await signInWithEmailAndPassword(auth, formattedEmail, password);
    const profile = await getUserProfile(userCredential.user.uid);
    if (!profile) {
      throw new Error('user-profile-not-found');
    }
    return profile;
  }

  // Simulated login
  const localUsersRaw = await AsyncStorage.getItem('lumora_simulated_users');
  const localUsers: Record<string, { profile: UserProfile; passwordHash: string }> = safeParse(localUsersRaw, {});

  const matchedUser = localUsers[formattedEmail];
  if (!matchedUser || matchedUser.passwordHash !== password) {
    throw new Error('auth/invalid-credential');
  }

  const profile = matchedUser.profile;
  activeUser = profile;
  await AsyncStorage.setItem('lumora_simulated_active_uid', profile.uid);
  notifyListeners();

  return profile;
};

export const logoutUser = async (): Promise<void> => {
  if (isFirebaseEnabled && auth) {
    await firebaseSignOut(auth);
    return;
  }

  // Simulated logout
  activeUser = null;
  await AsyncStorage.removeItem('lumora_simulated_active_uid');
  notifyListeners();
};

export const resetPassword = async (email: string): Promise<void> => {
  const formattedEmail = email.toLowerCase().trim();

  if (isFirebaseEnabled && auth) {
    await sendPasswordResetEmail(auth, formattedEmail);
    return;
  }

  // Simulated password reset
  const localUsersRaw = await AsyncStorage.getItem('lumora_simulated_users');
  const localUsers = safeParse(localUsersRaw, {});
  if (!localUsers[formattedEmail]) {
    throw new Error('auth/user-not-found');
  }
  // In simulation, we just succeed silently
  console.log(`Simulated password reset email sent to ${formattedEmail}`);
  return;
};
