/**
 * SwapSkills - Firebase Configuration Module
 * Fetches config from /api/config (Cloudflare Pages Function).
 * NO hardcoded API keys.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, addDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getDatabase, ref, push, onChildAdded, set, onValue, off, serverTimestamp as rtdbTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// Fetch Firebase config from server (Cloudflare Pages Function)
async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.apiKey) return cfg;
    }
    throw new Error("Invalid config response");
  } catch (e) {
    console.error("[SS] Config load failed:", e.message);
    throw e;
  }
}

const firebaseConfig = await loadConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Export everything needed
export {
  app, auth, db, rtdb,
  // Auth functions
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile,
  // Firestore functions
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, addDoc,
  // Realtime DB functions
  ref, push, onChildAdded, set, onValue, off, rtdbTimestamp
};
