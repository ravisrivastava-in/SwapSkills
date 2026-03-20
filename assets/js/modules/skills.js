/**
 * SwapSkills - Skills Management Module
 * Add, edit, delete skills for users
 */

import {
  db,
  doc, updateDoc, getDoc, arrayUnion, arrayRemove
} from './firebase-config.js';

// ============================================================
// Add a skill to user's offered or wanted list
// type: 'offered' or 'wanted'
// ============================================================
export async function addSkill(uid, skill, type) {
  try {
    const field = type === 'offered' ? 'skillsOffered' : 'skillsWanted';
    const skillObj = {
      id: Date.now().toString(),
      name: skill.name,
      category: skill.category,
      level: skill.level || 'Beginner',
      description: skill.description || ''
    };
    await updateDoc(doc(db, 'users', uid), {
      [field]: arrayUnion(skillObj)
    });
    return { success: true, skill: skillObj };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Remove a skill from user's list
// ============================================================
export async function removeSkill(uid, skillObj, type) {
  try {
    const field = type === 'offered' ? 'skillsOffered' : 'skillsWanted';
    await updateDoc(doc(db, 'users', uid), {
      [field]: arrayRemove(skillObj)
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================
// Get user's skills
// ============================================================
export async function getUserSkills(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        offered: data.skillsOffered || [],
        wanted: data.skillsWanted || []
      };
    }
    return { offered: [], wanted: [] };
  } catch (error) {
    console.error('Error fetching skills:', error);
    return { offered: [], wanted: [] };
  }
}
