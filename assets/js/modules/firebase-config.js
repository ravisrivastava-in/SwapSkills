/**
 * SwapSkills - Firebase Configuration Module
 * Initializes Firebase services: Auth, Firestore, Realtime Database
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, addDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getDatabase, ref, push, onChildAdded, set, onValue, off, serverTimestamp as rtdbTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCbZjbvUBDZAcifp_vQN3WQzn_1Uail01c",
  authDomain: "swapskills-in.firebaseapp.com",
  projectId: "swapskills-in",
  storageBucket: "swapskills-in.firebasestorage.app",
  messagingSenderId: "792354505254",
  appId: "1:792354505254:web:8329d79feb97e7f4af1ce7",
  measurementId: "G-9LFR0ZQY4G",
  databaseURL: "https://swapskills-in-default-rtdb.firebaseio.com"
};

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
