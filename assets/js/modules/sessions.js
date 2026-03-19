/**
 * SwapSkills - Sessions & Ratings Module
 * Schedule learning sessions and leave ratings/feedback
 */

import {
  db,
  doc, updateDoc, getDoc, arrayUnion, addDoc, collection, query, where, getDocs, serverTimestamp
} from './firebase-config.js';

// ============================================================
// Schedule a session for a match
// ============================================================
export async function scheduleSession(matchId, sessionData) {
  try {
    const session = {
      id: Date.now().toString(),
      matchId,
      scheduledBy: sessionData.scheduledBy,
      dateTime: sessionData.dateTime,
      duration: sessionData.duration || 60, // minutes
      topic: sessionData.topic || '',
      notes: sessionData.notes || '',
      status: 'scheduled', // scheduled, completed, cancelled
      createdAt: new Date().toISOString()
    };

    await updateDoc(doc(db, 'matches', matchId), {
      sessions: arrayUnion(session),
      updatedAt: serverTimestamp()
    });

    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Submit a rating for a user after a session
// ============================================================
export async function submitRating(targetUid, fromUid, matchId, ratingData) {
  try {
    // Add rating to the ratings collection
    await addDoc(collection(db, 'ratings'), {
      targetUid,
      fromUid,
      matchId,
      rating: ratingData.rating, // 1-5
      feedback: ratingData.feedback || '',
      createdAt: serverTimestamp()
    });

    // Update user's average rating
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('targetUid', '==', targetUid)
    );
    const ratingsSnap = await getDocs(ratingsQuery);
    let total = 0, count = 0;
    ratingsSnap.forEach(r => {
      total += r.data().rating;
      count++;
    });

    const avg = count > 0 ? (total / count) : 0;
    await updateDoc(doc(db, 'users', targetUid), {
      averageRating: Math.round(avg * 10) / 10
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Get ratings for a user
// ============================================================
export async function getUserRatings(uid) {
  try {
    const q = query(
      collection(db, 'ratings'),
      where('targetUid', '==', uid)
    );
    const snap = await getDocs(q);
    const ratings = [];
    snap.forEach(d => ratings.push(d.data()));
    return ratings;
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return [];
  }
}
