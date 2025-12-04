// Firebase configuration & initialization for KARTEJI

// Import Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your Firebase config — already valid 👍
const firebaseConfig = {
  apiKey: "AIzaSyAQxpD7ea9gHWGiU3wYXr0XHyl-SNyFYNs",
  authDomain: "katar-9cac3.firebaseapp.com",
  projectId: "katar-9cac3",
  storageBucket: "katar-9cac3.appspot.com",
  messagingSenderId: "1017734829960",
  appId: "1:1017734829960:web:6b02b7176f08a23ce28c3d",
  measurementId: "G-M4F9J10TTE"
};

// Initialize Firebase core
export const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
