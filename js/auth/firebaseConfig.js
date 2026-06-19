// client/js/auth/firebaseConfig.js
// ─────────────────────────────────────────────
// ตั้งค่า Firebase (ใช้ compat SDK เพื่อให้ใช้ <script> tag ได้ตรงๆ)
// ─────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyBhSVz7Ami9iqTlLn7gkzzn2_pParLkbEw",
  authDomain: "playtown-23d68.firebaseapp.com",
  projectId: "playtown-23d68",
  storageBucket: "playtown-23d68.firebasestorage.app",
  messagingSenderId: "328962474707",
  appId: "1:328962474707:web:5133a009dd3289ab7a4a26"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

