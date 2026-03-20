/**
 * SwapSkills - Chat Module
 * Real-time chat using Firebase Realtime Database
 * Chat rooms are created per match
 */

import {
  rtdb,
  ref, push, onChildAdded, set, onValue, off, rtdbTimestamp
} from './firebase-config.js';

// ============================================================
// Send a message to a chat room
// ============================================================
export function sendMessage(matchId, senderId, senderName, text) {
  const chatRef = ref(rtdb, `chats/${matchId}`);
  const newMsgRef = push(chatRef);
  return set(newMsgRef, {
    senderId,
    senderName,
    text,
    timestamp: Date.now()
  });
}

// ============================================================
// Listen for new messages in a chat room (realtime)
// ============================================================
export function listenToChat(matchId, callback) {
  const chatRef = ref(rtdb, `chats/${matchId}`);
  onChildAdded(chatRef, (snapshot) => {
    const msg = snapshot.val();
    callback(msg);
  });
  return chatRef; // return ref to detach later
}

// ============================================================
// Stop listening to a chat room
// ============================================================
export function stopListeningToChat(chatRef) {
  off(chatRef);
}

// ============================================================
// Get all messages once
// ============================================================
export function getAllMessages(matchId, callback) {
  const chatRef = ref(rtdb, `chats/${matchId}`);
  onValue(chatRef, (snapshot) => {
    const messages = [];
    snapshot.forEach(child => {
      messages.push(child.val());
    });
    callback(messages);
  }, { onlyOnce: true });
}
