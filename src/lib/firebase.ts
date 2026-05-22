// ============================================
// VITO DELIVERY - Firebase Configuration
// ============================================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyDjreiaFyPfIznFRorkoH4Ko68kPGHU6i4",
  authDomain: "vito-ebb90.firebaseapp.com",
  projectId: "vito-ebb90",
  storageBucket: "vito-ebb90.firebasestorage.app",
  messagingSenderId: "176330093483",
  appId: "1:176330093483:web:9289f18febbad978cbd8ee",
  measurementId: "G-6BJSS9DGDV",
};

// Prevent multiple initialization (important for Next.js hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
