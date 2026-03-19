/**
 * SwapSkills - Matching Algorithm Module
 * Peer-to-peer skill matching: If User A offers X & wants Y,
 * and User B offers Y & wants X → create a match
 */

import {
  db,
  collection, getDocs, doc, setDoc, getDoc, updateDoc, query, where, serverTimestamp, onSnapshot
} from './firebase-config.js';

// ============================================================
// Find potential matches for a user
// ============================================================
export async function findMatches(currentUid) {
  try {
    // Get current user's profile
    const currentSnap = await getDoc(doc(db, 'users', currentUid));
    if (!currentSnap.exists()) return [];

    const currentUser = currentSnap.data();
    const myOffered = (currentUser.skillsOffered || []).map(s => s.name.toLowerCase());
    const myWanted = (currentUser.skillsWanted || []).map(s => s.name.toLowerCase());

    if (myOffered.length === 0 || myWanted.length === 0) return [];

    // Fetch all other users
    const usersSnap = await getDocs(collection(db, 'users'));
    const matches = [];

    usersSnap.forEach(userDoc => {
      if (userDoc.id === currentUid) return; // skip self

      const other = userDoc.data();
      const theirOffered = (other.skillsOffered || []).map(s => s.name.toLowerCase());
      const theirWanted = (other.skillsWanted || []).map(s => s.name.toLowerCase());

      // Match logic: I offer what they want AND they offer what I want
      const iCanTeachThem = myOffered.filter(s => theirWanted.includes(s));
      const theyCanTeachMe = theirOffered.filter(s => myWanted.includes(s));

      if (iCanTeachThem.length > 0 && theyCanTeachMe.length > 0) {
        matches.push({
          userId: userDoc.id,
          displayName: other.displayName,
          email: other.email,
          bio: other.bio,
          averageRating: other.averageRating || 0,
          iCanTeachThem,
          theyCanTeachMe,
          matchScore: iCanTeachThem.length + theyCanTeachMe.length
        });
      }
    });

    // Sort by match score (most skills matched first)
    matches.sort((a, b) => b.matchScore - a.matchScore);
    return matches;
  } catch (error) {
    console.error('Error finding matches:', error);
    return [];
  }
}

// ============================================================
// Create / send a match request
// ============================================================
export async function createMatchRequest(fromUid, toUid, skillsExchange) {
  try {
    // Create a unique match ID (sorted UIDs to prevent duplicates)
    const matchId = [fromUid, toUid].sort().join('_');

    // Check if match already exists
    const existingSnap = await getDoc(doc(db, 'matches', matchId));
    if (existingSnap.exists()) {
      return { success: false, error: 'Match request already exists.' };
    }

    await setDoc(doc(db, 'matches', matchId), {
      matchId,
      users: [fromUid, toUid],
      initiator: fromUid,
      receiver: toUid,
      skillsExchange: {
        [fromUid]: skillsExchange.iTeach,
        [toUid]: skillsExchange.theyTeach
      },
      status: 'pending', // pending, accepted, rejected
      sessions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, matchId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Accept or reject a match
// ============================================================
export async function updateMatchStatus(matchId, status) {
  try {
    await updateDoc(doc(db, 'matches', matchId), {
      status,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Get all matches for a user (realtime listener)
// ============================================================
export function listenToMatches(uid, callback) {
  const q = query(
    collection(db, 'matches'),
    where('users', 'array-contains', uid)
  );
  return onSnapshot(q, (snapshot) => {
    const matches = [];
    snapshot.forEach(d => matches.push(d.data()));
    callback(matches);
  });
}

// ============================================================
// Get a single match
// ============================================================
export async function getMatch(matchId) {
  try {
    const snap = await getDoc(doc(db, 'matches', matchId));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error('Error fetching match:', error);
    return null;
  }
}
