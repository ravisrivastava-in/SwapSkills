/**
 * ============================================================
 * SwapSkills — firebase-app.js (v5 — secure config)
 * ============================================================
 * Fetches Firebase config ONLY from /api/config (Cloudflare
 * Pages Function that reads environment secrets).
 * NO hardcoded API keys anywhere in client code.
 * Uses signInWithRedirect to avoid exposing config in popup URL.
 * ============================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile,
  GoogleAuthProvider,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, updateDoc,
  collection, query, where, onSnapshot, arrayUnion, arrayRemove,
  serverTimestamp, addDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
  getDatabase, ref, push, onChildAdded, set as rtSet,
  onValue, off
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

/* ════════════════════════════════════════════
   LOAD CONFIG
   ════════════════════════════════════════════
   Production: fetches from /api/config (Cloudflare Pages Function
               which reads environment secrets — no keys in code).
   Localhost:  reads from env.js in the project root.
               Create env.js with: window.__FIREBASE_CONFIG = { ... };
               Add env.js to .gitignore so keys never get committed.
   ════════════════════════════════════════════ */
const _isLocal = ["localhost","127.0.0.1",""].includes(location.hostname);

async function loadFirebaseConfig() {
  /* ── Production: fetch from Cloudflare Function ── */
  if (!_isLocal) {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.apiKey) { console.log("[SS] Config loaded from server"); return cfg; }
      }
    } catch (e) { console.warn("[SS] /api/config failed:", e.message); }
    // Show error page if production config fails
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px"><div><h2 style="color:#dc3545">Configuration Error</h2><p style="color:#666">Could not load application configuration.<br>Please try refreshing the page or contact support.</p><button onclick="location.reload()" style="padding:10px 24px;background:#10bc69;color:#fff;border:none;border-radius:50px;cursor:pointer;font-size:1rem">Retry</button></div></div>';
    throw new Error("Production config unavailable");
  }

  /* ── Localhost: read from env.js (git-ignored) ── */
  if (window.__FIREBASE_CONFIG) {
    console.log("[SS] Config loaded from env.js");
    return window.__FIREBASE_CONFIG;
  }
  // env.js not loaded — show helpful message
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px;max-width:600px;margin:auto"><div><h2 style="color:#dc3545">Local Config Missing</h2><p style="color:#666">Create an <code>env.js</code> file in your project root with:</p><pre style="background:#f5f5f5;padding:16px;border-radius:8px;text-align:left;font-size:13px;overflow-x:auto">window.__FIREBASE_CONFIG = {\n  apiKey: "YOUR_KEY",\n  authDomain: "YOUR_PROJECT.firebaseapp.com",\n  projectId: "YOUR_PROJECT",\n  storageBucket: "YOUR_PROJECT.appspot.com",\n  messagingSenderId: "...",\n  appId: "...",\n  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com"\n};</pre><p style="color:#666">Then add <code>&lt;script src="env.js"&gt;&lt;/script&gt;</code> before the firebase-app.js module script in your HTML, and add <code>env.js</code> to <code>.gitignore</code>.</p></div></div>';
  throw new Error("Local env.js not found — see instructions on screen");
}

const firebaseConfig = await loadFirebaseConfig();
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const rtdb = getDatabase(app);

const CATS = ["Technology","Design","Language","Music","Business","Science","Art","Fitness","Cooking","Photography","Writing","Other"];

/* ── AUTH ── */
function observeAuth(cb) { return onAuthStateChanged(auth, cb); }

async function signUp(email, pw, name) {
  try {
    const c = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(c.user, { displayName: name });
    await setDoc(doc(db, "users", c.user.uid), {
      uid: c.user.uid, displayName: name, email,
      bio: "", skillsOffered: [], skillsWanted: [],
      averageRating: 0, createdAt: serverTimestamp()
    });
    return { success: true, user: c.user };
  } catch (e) { return { success: false, error: e.message }; }
}

async function login(email, pw) {
  try { return { success: true, user: (await signInWithEmailAndPassword(auth, email, pw)).user }; }
  catch (e) { return { success: false, error: e.message }; }
}

async function logoutUser() {
  try { await signOut(auth); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

/**
 * Google Sign-In using signInWithPopup.
 * Note: signInWithRedirect does NOT work on non-Firebase-hosted domains
 * (like Cloudflare Pages) due to cross-origin iframe restrictions.
 * The API key visible in the popup URL is normal — Firebase API keys
 * are public identifiers, security is enforced by Firebase Security Rules.
 */
async function loginWithGoogle() {
  try {
    const { signInWithPopup } = await import("https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js");
    const provider = new GoogleAuthProvider();
    const c = await signInWithPopup(auth, provider);
    const u = c.user;
    const s = await getDoc(doc(db, "users", u.uid));
    if (!s.exists()) {
      await setDoc(doc(db, "users", u.uid), {
        uid: u.uid, displayName: u.displayName || "User",
        email: u.email || "", bio: "",
        skillsOffered: [], skillsWanted: [],
        averageRating: 0, createdAt: serverTimestamp()
      });
    }
    return { success: true, user: u };
  } catch (e) {
    if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
      return { success: false, error: "Sign-in cancelled" };
    }
    return { success: false, error: e.message };
  }
}

/**
 * No-op on all environments — redirect flow is not used.
 */
async function handleGoogleRedirectResult() {
  return { success: false, error: "N/A" };
}

async function loginAnonymously() {
  try {
    const c = await signInAnonymously(auth);
    const u = c.user, gn = "Guest_" + u.uid.slice(0, 6);
    const s = await getDoc(doc(db, "users", u.uid));
    if (!s.exists()) {
      await setDoc(doc(db, "users", u.uid), {
        uid: u.uid, displayName: gn, email: "", bio: "Demo user",
        skillsOffered: [], skillsWanted: [],
        averageRating: 0, isAnonymous: true, createdAt: serverTimestamp()
      });
    }
    return { success: true, user: u };
  } catch (e) { return { success: false, error: e.message }; }
}

/* ── PROFILE ── */
async function getUserProfile(uid) {
  try { const s = await getDoc(doc(db, "users", uid)); return s.exists() ? s.data() : null; }
  catch (e) { return null; }
}
async function updateUserProfile(uid, data) {
  try { await setDoc(doc(db, "users", uid), data, { merge: true }); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}
function isProfileIncomplete(p) {
  if (!p) return true;
  return !(p.bio && p.bio.trim()) && !(p.skillsOffered?.length) && !(p.skillsWanted?.length);
}

/* ── SKILLS ── */
async function addSkill(uid, sk, type) {
  const f = type === "offered" ? "skillsOffered" : "skillsWanted";
  const o = { id: Date.now().toString(), name: sk.name, category: sk.category, level: sk.level || "Beginner", description: sk.description || "" };
  await updateDoc(doc(db, "users", uid), { [f]: arrayUnion(o) });
  return o;
}
async function removeSkill(uid, obj, type) {
  await updateDoc(doc(db, "users", uid), { [type === "offered" ? "skillsOffered" : "skillsWanted"]: arrayRemove(obj) });
}
async function getUserSkills(uid) {
  const s = await getDoc(doc(db, "users", uid));
  if (s.exists()) { const d = s.data(); return { offered: d.skillsOffered || [], wanted: d.skillsWanted || [] }; }
  return { offered: [], wanted: [] };
}

/* ── MATCHING ── */
async function findMatches(uid) {
  const me = await getUserProfile(uid); if (!me) return [];
  const mo = (me.skillsOffered || []).map(s => s.name.toLowerCase());
  const mw = (me.skillsWanted || []).map(s => s.name.toLowerCase());
  if (!mo.length || !mw.length) return [];
  const all = await getDocs(collection(db, "users")); const res = [];
  all.forEach(d => {
    if (d.id === uid) return;
    const o = d.data();
    const to = (o.skillsOffered || []).map(s => s.name.toLowerCase());
    const tw = (o.skillsWanted || []).map(s => s.name.toLowerCase());
    const iT = mo.filter(s => tw.includes(s));
    const tT = to.filter(s => mw.includes(s));
    if (iT.length && tT.length) res.push({
      userId: d.id, displayName: o.displayName, bio: o.bio || "",
      averageRating: o.averageRating || 0, iTeach: iT, theyTeach: tT,
      score: iT.length + tT.length
    });
  });
  return res.sort((a, b) => b.score - a.score);
}
async function createMatchRequest(from, to, ex) {
  const mid = [from, to].sort().join("_");
  const e = await getDoc(doc(db, "matches", mid));
  if (e.exists()) return "Already exists";
  await setDoc(doc(db, "matches", mid), {
    matchId: mid, users: [from, to], initiator: from, receiver: to,
    skillsExchange: { [from]: ex.iTeach, [to]: ex.theyTeach },
    status: "pending", sessions: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  return null;
}
async function updateMatchStatus(mid, st) {
  await updateDoc(doc(db, "matches", mid), { status: st, updatedAt: serverTimestamp() });
}
function listenToMatches(uid, cb) {
  return onSnapshot(query(collection(db, "matches"), where("users", "array-contains", uid)), s => {
    const a = []; s.forEach(d => a.push(d.data())); cb(a);
  });
}

/* ── SESSIONS & RATINGS ── */
async function scheduleSession(mid, d) {
  const s = { id: Date.now().toString(), matchId: mid, scheduledBy: d.scheduledBy, dateTime: d.dt, duration: d.dur || 60, topic: d.topic || "", status: "scheduled", createdAt: new Date().toISOString() };
  await updateDoc(doc(db, "matches", mid), { sessions: arrayUnion(s), updatedAt: serverTimestamp() });
}
async function submitRating(tuid, fuid, mid, r, fb) {
  await addDoc(collection(db, "ratings"), { targetUid: tuid, fromUid: fuid, matchId: mid, rating: r, feedback: fb, createdAt: serverTimestamp() });
  const rq = query(collection(db, "ratings"), where("targetUid", "==", tuid));
  const sn = await getDocs(rq); let t = 0, c = 0;
  sn.forEach(d => { t += d.data().rating; c++; });
  await updateDoc(doc(db, "users", tuid), { averageRating: Math.round(t / c * 10) / 10 });
}
async function searchUsersBySkill(q) {
  const sn = await getDocs(collection(db, "users")); const res = []; const t = q.toLowerCase();
  sn.forEach(d => { const u = d.data(); if ((u.skillsOffered || []).some(s => s.name.toLowerCase().includes(t))) res.push(u); });
  return res;
}

/* ── CHAT ── */
function sendMessage(mid, uid, name, txt) {
  rtSet(push(ref(rtdb, `chats/${mid}`)), { senderId: uid, senderName: name, text: txt, timestamp: Date.now() });
}
function listenToChat(mid, cb) { const r = ref(rtdb, `chats/${mid}`); onChildAdded(r, s => cb(s.val())); return r; }
function stopListeningToChat(r) { off(r); }

/* ── CHAT NOTIFICATIONS ── */
let _nL = [], _uc = {}, _nCb = null, _aC = null, _nInit = false, _nUid = null;

function _getLastRead(mid) {
  try { return parseInt(localStorage.getItem("ss-lr-" + mid)) || 0; } catch(e) { return 0; }
}
function markChatRead(mid) {
  try { localStorage.setItem("ss-lr-" + mid, Date.now().toString()); } catch(e) {}
}

function initChatNotifications(uid, acc, cb) {
  _nCb = cb;
  if (_nInit && _nUid === uid) {
    // Already initialized — just add listeners for new matches
    const existingMids = _nL.map(x => x._mid);
    const newMatches = acc.filter(m => !existingMids.includes(m.matchId));
    newMatches.forEach(m => _addChatListener(uid, m));
    _fn();
    return;
  }
  _nL.forEach(r => off(r)); _nL = []; _uc = {};
  _nInit = true; _nUid = uid;
  acc.forEach(m => _addChatListener(uid, m));
}

function _addChatListener(uid, m) {
  _uc[m.matchId] = 0;
  const r = ref(rtdb, `chats/${m.matchId}`);
  r._mid = m.matchId;
  const lastRead = _getLastRead(m.matchId);
  let gotInitial = false;

  // First: get all existing messages once to count unread
  onValue(r, snap => {
    if (gotInitial) return;
    gotInitial = true;
    const msgs = snap.val();
    if (msgs) {
      let count = 0;
      Object.values(msgs).forEach(msg => {
        if (msg.senderId !== uid && (msg.timestamp || 0) > lastRead) count++;
      });
      if (m.matchId !== _aC) {
        _uc[m.matchId] = count;
        _fn();
      }
    }
  }, { onlyOnce: true });

  // Then: listen for NEW messages arriving in real-time
  let skipCount = -1; // will be set after initial load
  onChildAdded(r, snap => {
    if (!gotInitial) return; // skip during initial load
    if (skipCount < 0) { skipCount = 0; return; } // skip the trigger right after onValue
    const msg = snap.val();
    if (msg.senderId !== uid && m.matchId !== _aC) {
      _uc[m.matchId] = (_uc[m.matchId] || 0) + 1;
      _fn();
    }
  });

  _nL.push(r);

  // After initial load completes, enable onChildAdded tracking
  setTimeout(() => { skipCount = 0; }, 3000);
}

function setActiveChatForNotif(mid) {
  _aC = mid;
  if (mid) {
    markChatRead(mid);
    if (_uc[mid]) { _uc[mid] = 0; _fn(); }
  }
}
function _fn() { if (!_nCb) return; const total = Object.values(_uc).reduce((a, b) => a + b, 0); _nCb(total, { ..._uc }); }

/* ── AUTO-LOGOUT ── */
let _it = null;
function resetIdleTimer() {
  if (_it) clearTimeout(_it);
  _it = setTimeout(async () => {
    if (auth.currentUser) { await signOut(auth); sessionStorage.setItem("ss-auto-logout", "true"); location.href = "auth.html"; }
  }, 5 * 60 * 1000);
}
["mousedown","mousemove","keydown","scroll","touchstart","click"].forEach(e => document.addEventListener(e, resetIdleTimer, { passive: true }));
resetIdleTimer();

/* ── DARK MODE ── */
function initDarkMode() { if (localStorage.getItem("ss-dark") === "true") document.body.classList.add("dark-mode"); }
function toggleDarkMode() { document.body.classList.toggle("dark-mode"); localStorage.setItem("ss-dark", document.body.classList.contains("dark-mode")); }
initDarkMode();

/* ── EXPOSE ── */
window.SS = {
  CATS, SKILL_CATEGORIES: CATS, auth, db, rtdb,
  observeAuth, signUp, login, logoutUser,
  loginWithGoogle, handleGoogleRedirectResult, loginAnonymously,
  getUserProfile, updateUserProfile, isProfileIncomplete,
  addSkill, removeSkill, getUserSkills,
  findMatches, createMatchRequest, updateMatchStatus, listenToMatches,
  scheduleSession, submitRating, searchUsersBySkill,
  sendMessage, listenToChat, stopListeningToChat,
  initChatNotifications, setActiveChatForNotif,
  initDarkMode, toggleDarkMode, resetIdleTimer
};

console.log("[SS] firebase-app.js loaded (project:", firebaseConfig.projectId, ")");