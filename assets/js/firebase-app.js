/**
 * ============================================================
 * SwapSkills — firebase-app.js (v4 — env-based config)
 * ============================================================
 * Fetches Firebase config from /api/config (Cloudflare Function
 * that reads environment variables). Falls back to hardcoded
 * config for local development.
 * ============================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getDatabase, ref, push, onChildAdded, set as rtSet, onValue, off } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ════════════════════════════════════════════
   LOAD CONFIG — from Cloudflare env or fallback
   ════════════════════════════════════════════ */
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyCbZjbvUBDZAcifp_vQN3WQzn_1Uail01c",
  authDomain: "swapskills-in.firebaseapp.com",
  projectId: "swapskills-in",
  storageBucket: "swapskills-in.appspot.com",
  messagingSenderId: "792354505254",
  appId: "1:792354505254:web:8329d79feb97e7f4af1ce7",
  databaseURL: "https://swapskills-in-default-rtdb.firebaseio.com"
};

async function loadFirebaseConfig() {
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!isLocal) {
    try {
      console.log("[SS] Fetching config from /api/config…");
      const res = await fetch("/api/config");
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.apiKey) { console.log("[SS] Config from Cloudflare env ✅"); return cfg; }
      }
    } catch (e) { console.warn("[SS] /api/config failed:", e.message); }
  }
  console.log("[SS] Using local fallback config");
  return LOCAL_FALLBACK;
}

const firebaseConfig = await loadFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const CATS = ["Technology","Design","Language","Music","Business","Science","Art","Fitness","Cooking","Photography","Writing","Other"];

/* ── AUTH ── */
function observeAuth(cb) { return onAuthStateChanged(auth, cb); }
async function signUp(email, pw, name) {
  try { const c = await createUserWithEmailAndPassword(auth, email, pw); await updateProfile(c.user, { displayName: name }); await setDoc(doc(db, "users", c.user.uid), { uid: c.user.uid, displayName: name, email, bio: "", skillsOffered: [], skillsWanted: [], averageRating: 0, createdAt: serverTimestamp() }); return { success: true, user: c.user }; }
  catch (e) { return { success: false, error: e.message }; }
}
async function login(email, pw) { try { return { success: true, user: (await signInWithEmailAndPassword(auth, email, pw)).user }; } catch (e) { return { success: false, error: e.message }; } }
async function logoutUser() { try { await signOut(auth); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
async function loginWithGoogle() {
  try { const c = await signInWithPopup(auth, new GoogleAuthProvider()); const u = c.user; const s = await getDoc(doc(db, "users", u.uid)); if (!s.exists()) await setDoc(doc(db, "users", u.uid), { uid: u.uid, displayName: u.displayName || "User", email: u.email || "", bio: "", skillsOffered: [], skillsWanted: [], averageRating: 0, createdAt: serverTimestamp() }); return { success: true, user: u }; }
  catch (e) { return { success: false, error: e.message }; }
}
async function loginAnonymously() {
  try { const c = await signInAnonymously(auth); const u = c.user, gn = "Guest_" + u.uid.slice(0, 6); const s = await getDoc(doc(db, "users", u.uid)); if (!s.exists()) await setDoc(doc(db, "users", u.uid), { uid: u.uid, displayName: gn, email: "", bio: "Demo user", skillsOffered: [], skillsWanted: [], averageRating: 0, isAnonymous: true, createdAt: serverTimestamp() }); return { success: true, user: u }; }
  catch (e) { return { success: false, error: e.message }; }
}

/* ── PROFILE ── */
async function getUserProfile(uid) { try { const s = await getDoc(doc(db, "users", uid)); return s.exists() ? s.data() : null; } catch (e) { return null; } }
async function updateUserProfile(uid, data) { try { await setDoc(doc(db, "users", uid), data, { merge: true }); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
function isProfileIncomplete(p) { if (!p) return true; return !(p.bio && p.bio.trim()) && !(p.skillsOffered?.length) && !(p.skillsWanted?.length); }

/* ── SKILLS ── */
async function addSkill(uid, sk, type) { const f = type === "offered" ? "skillsOffered" : "skillsWanted"; const o = { id: Date.now().toString(), name: sk.name, category: sk.category, level: sk.level || "Beginner", description: sk.description || "" }; await updateDoc(doc(db, "users", uid), { [f]: arrayUnion(o) }); return o; }
async function removeSkill(uid, obj, type) { await updateDoc(doc(db, "users", uid), { [type === "offered" ? "skillsOffered" : "skillsWanted"]: arrayRemove(obj) }); }
async function getUserSkills(uid) { const s = await getDoc(doc(db, "users", uid)); if (s.exists()) { const d = s.data(); return { offered: d.skillsOffered || [], wanted: d.skillsWanted || [] }; } return { offered: [], wanted: [] }; }

/* ── MATCHING ── */
async function findMatches(uid) {
  const me = await getUserProfile(uid); if (!me) return [];
  const mo = (me.skillsOffered || []).map(s => s.name.toLowerCase()), mw = (me.skillsWanted || []).map(s => s.name.toLowerCase());
  if (!mo.length || !mw.length) return [];
  const all = await getDocs(collection(db, "users")); const res = [];
  all.forEach(d => { if (d.id === uid) return; const o = d.data(), to = (o.skillsOffered || []).map(s => s.name.toLowerCase()), tw = (o.skillsWanted || []).map(s => s.name.toLowerCase()); const iT = mo.filter(s => tw.includes(s)), tT = to.filter(s => mw.includes(s)); if (iT.length && tT.length) res.push({ userId: d.id, displayName: o.displayName, bio: o.bio || "", averageRating: o.averageRating || 0, iTeach: iT, theyTeach: tT, score: iT.length + tT.length }); });
  return res.sort((a, b) => b.score - a.score);
}
async function createMatchRequest(from, to, ex) { const mid = [from, to].sort().join("_"); const e = await getDoc(doc(db, "matches", mid)); if (e.exists()) return "Already exists"; await setDoc(doc(db, "matches", mid), { matchId: mid, users: [from, to], initiator: from, receiver: to, skillsExchange: { [from]: ex.iTeach, [to]: ex.theyTeach }, status: "pending", sessions: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return null; }
async function updateMatchStatus(mid, st) { await updateDoc(doc(db, "matches", mid), { status: st, updatedAt: serverTimestamp() }); }
function listenToMatches(uid, cb) { return onSnapshot(query(collection(db, "matches"), where("users", "array-contains", uid)), s => { const a = []; s.forEach(d => a.push(d.data())); cb(a); }); }

/* ── SESSIONS & RATINGS ── */
async function scheduleSession(mid, d) { const s = { id: Date.now().toString(), matchId: mid, scheduledBy: d.scheduledBy, dateTime: d.dt, duration: d.dur || 60, topic: d.topic || "", status: "scheduled", createdAt: new Date().toISOString() }; await updateDoc(doc(db, "matches", mid), { sessions: arrayUnion(s), updatedAt: serverTimestamp() }); }
async function submitRating(tuid, fuid, mid, r, fb) { await addDoc(collection(db, "ratings"), { targetUid: tuid, fromUid: fuid, matchId: mid, rating: r, feedback: fb, createdAt: serverTimestamp() }); const rq = query(collection(db, "ratings"), where("targetUid", "==", tuid)); const sn = await getDocs(rq); let t = 0, c = 0; sn.forEach(d => { t += d.data().rating; c++; }); await updateDoc(doc(db, "users", tuid), { averageRating: Math.round(t / c * 10) / 10 }); }
async function searchUsersBySkill(q) { const sn = await getDocs(collection(db, "users")); const res = []; const t = q.toLowerCase(); sn.forEach(d => { const u = d.data(); if ((u.skillsOffered || []).some(s => s.name.toLowerCase().includes(t))) res.push(u); }); return res; }

/* ── CHAT ── */
function sendMessage(mid, uid, name, txt) { rtSet(push(ref(rtdb, `chats/${mid}`)), { senderId: uid, senderName: name, text: txt, timestamp: Date.now() }); }
function listenToChat(mid, cb) { const r = ref(rtdb, `chats/${mid}`); onChildAdded(r, s => cb(s.val())); return r; }
function stopListeningToChat(r) { off(r); }

/* ── CHAT NOTIFICATIONS ── */
let _nL = [], _uc = {}, _nCb = null, _aC = null;
function initChatNotifications(uid, acc, cb) {
  _nL.forEach(r => off(r)); _nL = []; _uc = {}; _nCb = cb;
  acc.forEach(m => { _uc[m.matchId] = 0; let init = true; const r = ref(rtdb, `chats/${m.matchId}`); onValue(r, () => {}, { onlyOnce: true }); onChildAdded(r, snap => { if (init) return; const msg = snap.val(); if (msg.senderId !== uid && m.matchId !== _aC) { _uc[m.matchId] = (_uc[m.matchId] || 0) + 1; _fn(); } }); _nL.push(r); setTimeout(() => { init = false; }, 2000); });
}
function setActiveChatForNotif(mid) { _aC = mid; if (mid && _uc[mid]) { _uc[mid] = 0; _fn(); } }
function _fn() { if (!_nCb) return; const total = Object.values(_uc).reduce((a, b) => a + b, 0); _nCb(total, { ..._uc }); }

/* ── AUTO-LOGOUT ── */
let _it = null;
function resetIdleTimer() { if (_it) clearTimeout(_it); _it = setTimeout(async () => { if (auth.currentUser) { await signOut(auth); sessionStorage.setItem("ss-auto-logout", "true"); location.href = "auth.html"; } }, 5 * 60 * 1000); }
["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"].forEach(e => document.addEventListener(e, resetIdleTimer, { passive: true }));
resetIdleTimer();

/* ── DARK MODE ── */
function initDarkMode() { if (localStorage.getItem("ss-dark") === "true") document.body.classList.add("dark-mode"); }
function toggleDarkMode() { document.body.classList.toggle("dark-mode"); localStorage.setItem("ss-dark", document.body.classList.contains("dark-mode")); }
initDarkMode();

/* ── EXPOSE ── */
window.SS = { CATS, auth, db, rtdb, observeAuth, signUp, login, logoutUser, loginWithGoogle, loginAnonymously, getUserProfile, updateUserProfile, isProfileIncomplete, addSkill, removeSkill, getUserSkills, findMatches, createMatchRequest, updateMatchStatus, listenToMatches, scheduleSession, submitRating, searchUsersBySkill, sendMessage, listenToChat, stopListeningToChat, initChatNotifications, setActiveChatForNotif, initDarkMode, toggleDarkMode, resetIdleTimer };

console.log("✅ firebase-app.js loaded (project:", firebaseConfig.projectId, ")");