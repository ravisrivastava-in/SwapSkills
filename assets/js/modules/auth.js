/**
 * SwapSkills - Authentication Module
 * Handles user signup, login, logout, and auth state
 */

import {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged,
  doc, setDoc, getDoc, serverTimestamp
} from './firebase-config.js';

// ============================================================
// Skill Categories - shared across the app
// ============================================================
export const SKILL_CATEGORIES = [
  'Technology', 'Design', 'Language', 'Music',
  'Business', 'Science', 'Art', 'Fitness',
  'Cooking', 'Photography', 'Writing', 'Other'
];

// ============================================================
// Auth State Observer
// ============================================================
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ============================================================
// Sign Up - creates user + Firestore profile
// ============================================================
export async function signUp(email, password, displayName) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });

    // Create Firestore user profile document
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      displayName,
      email,
      bio: '',
      skillsOffered: [],
      skillsWanted: [],
      ratings: [],
      averageRating: 0,
      createdAt: serverTimestamp()
    });

    return { success: true, user: cred.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Login
// ============================================================
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Logout
// ============================================================
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Get current user profile from Firestore
// ============================================================
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// ============================================================
// Update user profile
// ============================================================
export async function updateUserProfile(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Get current auth user
// ============================================================
export function getCurrentUser() {
  return auth.currentUser;
}
