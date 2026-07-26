import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Placeholder configuration using Expo environment variables
// Users can configure these in a .env file:
// EXPO_PUBLIC_FIREBASE_API_KEY=...
// EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
// EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
// EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
// EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
// EXPO_PUBLIC_FIREBASE_APP_ID=...

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock-auth-domain.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock-storage-bucket.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isFirebaseEnabled = false;

// Only initialize if we have actual configured values (not our mock fallbacks)
const hasRealCredentials =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== 'mock-api-key';

if (hasRealCredentials) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseEnabled = true;
    console.log('Firebase initialized successfully.');
  } catch (error) {
    console.warn('Firebase initialization failed, running in Mock/Offline mode:', error);
    isFirebaseEnabled = false;
  }
} else {
  console.log('No Firebase credentials found. Running Lumora in Mock/Offline mode.');
  isFirebaseEnabled = false;
}

export { app, auth, db, storage, isFirebaseEnabled };
