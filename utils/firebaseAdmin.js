// utils/firebaseAdmin.js
// Firebase Admin SDK — verifies phone OTP tokens sent from frontend
// This replaces Africa's Talking OTP entirely

const admin = require("firebase-admin");

// Initialize only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Render stores \n as literal string — convert back to real newlines
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
      })
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Firebase Admin init failed:", err.message);
  }
}

/**
 * Verifies a Firebase ID token from the frontend
 * Frontend calls firebase.auth().currentUser.getIdToken()
 * and sends it to backend — we verify it here
 *
 * @param {string} idToken - Firebase ID token from frontend
 * @returns {object} decoded - contains phone_number, uid, etc.
 * @throws if token is invalid or expired
 */
async function verifyFirebaseToken(idToken) {
  if (!idToken) throw new Error("No ID token provided");
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
}

module.exports = { verifyFirebaseToken };