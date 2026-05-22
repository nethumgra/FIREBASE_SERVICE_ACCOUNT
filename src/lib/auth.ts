// ============================================
// VITO DELIVERY - Firebase Auth Service
// ============================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth, firebaseConfig } from "./firebase";
import { createUserProfile, getUserProfile, createShop, VitoUser, UserRole } from "./db";

/* ============================================
   REGISTER
   ============================================ */

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone1: string;
  phone2?: string;
  address: string;
  city: string;
  role: UserRole;
  shopName?: string; // sellers only
  nic?: string;      // delivery boys
  dob?: string;      // delivery boys
}

/**
 * Register a new user with Firebase Auth + create Firestore profile
 */
export async function registerUser(data: RegisterData): Promise<VitoUser> {
  const { name, email, password, phone1, phone2, address, city, role } = data;

  // 1. Create Firebase Auth user
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  // 2. Update display name in Auth
  await updateProfile(credential.user, { displayName: name });

  // 3. Save profile in Firestore
  await createUserProfile(uid, {
    name,
    email,
    phone1,
    phone2: phone2 || "",
    address,
    city,
    role,
    isActive: true,
  });

  // 4. Return the saved profile
  const profile = await getUserProfile(uid);
  return profile!;
}

/* ============================================
   LOGIN
   ============================================ */

/**
 * Sign in user and return their Firestore profile
 */
export async function loginUser(email: string, password: string): Promise<VitoUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  const profile = await getUserProfile(uid);
  if (!profile) {
    throw new Error("User profile not found. Please contact support.");
  }

  return profile;
}

/**
 * Sign in with Google
 */
export async function loginWithGoogle(): Promise<VitoUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  const uid = user.uid;

  let profile = await getUserProfile(uid);
  
  if (!profile) {
    // Create a new profile if it doesn't exist
    await createUserProfile(uid, {
      name: user.displayName || "Google User",
      email: user.email || "",
      phone1: user.phoneNumber || "",
      phone2: "",
      address: "",
      city: "",
      role: "customer",
      isActive: true,
    });
    profile = await getUserProfile(uid);
  }

  if (!profile) {
    throw new Error("Failed to load user profile.");
  }

  return profile;
}

/* ============================================
   LOGOUT
   ============================================ */

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/* ============================================
   AUTH STATE LISTENER
   ============================================ */

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function.
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/* ============================================
   GET CURRENT USER PROFILE
   ============================================ */

export async function getCurrentUserProfile(): Promise<VitoUser | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await getUserProfile(user.uid);
}

/* ============================================
   ADMIN TOOLS
   ============================================ */

/**
 * Creates a seller account and corresponding shop WITHOUT logging the admin out.
 * Uses a secondary Firebase app instance.
 */
export async function createSellerAccountAndShop(data: RegisterData & { shopName: string, category: string }) {
  const { name, email, password, phone1, address, city, category, shopName } = data;

  // 1. Initialize secondary app
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 2. Create user in Firebase Auth using secondary app
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;

    // 3. Update display name
    await updateProfile(credential.user, { displayName: name });

    // 4. Save profile in Firestore (using PRIMARY app's DB methods)
    await createUserProfile(uid, {
      name,
      email,
      phone1,
      phone2: "",
      address,
      city,
      role: "seller",
      isActive: true,
    });

    // 5. Create Shop document
    await createShop({
      name: shopName,
      ownerId: uid,
      category,
      city,
      address,
      phone: phone1,
      isOpen: false,
      deliveryFee: 0,
      deliveryTime: "30-45",
      tags: [],
    }, true); // auto-approve when created by Admin

    // 6. Sign out the secondary app just to be safe
    await signOut(secondaryAuth);
    
    return uid;
  } finally {
    // 7. Cleanup secondary app to avoid memory leaks
    await deleteApp(secondaryApp);
  }
}

/**
 * Creates a delivery boy account WITHOUT logging the admin out.
 * Uses a secondary Firebase app instance.
 */
export async function createDeliveryBoyAccount(data: RegisterData) {
  const { name, email, password, phone1, address, city, nic, dob } = data;

  // 1. Initialize secondary app
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_Boy_" + Date.now());
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 2. Create user in Firebase Auth using secondary app
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;

    // 3. Update display name
    await updateProfile(credential.user, { displayName: name });

    // 4. Save profile in Firestore (using PRIMARY app's DB methods)
    await createUserProfile(uid, {
      name,
      email,
      phone1,
      phone2: "",
      address,
      city,
      nic,
      dob,
      role: "delivery",
      isActive: true,
    });

    // 5. Sign out the secondary app
    await signOut(secondaryAuth);
    
    return uid;
  } finally {
    // 6. Cleanup secondary app
    await deleteApp(secondaryApp);
  }
}
