// Import Firebase modular via CDN (bukan "firebase/app")
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ============ FIREBASE CONFIG ============
// pakai config yang kamu kirim
const firebaseConfig = {
  apiKey: "AIzaSyAQxpD7ea9gHWGiU3wYXr0XHyl-SNyFYNs",
  authDomain: "katar-9cac3.firebaseapp.com",
  projectId: "katar-9cac3",
  storageBucket: "katar-9cac3.firebasestorage.app",
  messagingSenderId: "1017734829960",
  appId: "1:1017734829960:web:6b02b7176f08a23ce28c3d",
  measurementId: "G-M4F9J10TTE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics hanya akan jalan kalau domain HTTPS / localhost
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics tidak aktif (biasanya karena tidak di-host via https/localhost)", e);
}

// Init Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// ===============================
// Helper: cek apakah user pertama
// ===============================
async function isFirstUser() {
  const snap = await getDocs(collection(db, "users"));
  return snap.empty; // true kalau belum ada dokumen user sama sekali
}

// ===============================
// REGISTER LOGIC
// ===============================
const registerForm = document.getElementById("register-form");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // JANGAN lupa ini

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (!name || !email || !password) {
      alert("Mohon lengkapi semua data.");
      return;
    }

    try {
      // 1) buat akun auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) cek apakah ini user pertama
      const first = await isFirstUser();
      const role = first ? "super_admin" : "anggota";

      // 3) simpan profil ke Firestore -> koleksi "users"
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        active: true,
        createdAt: new Date().toISOString(),
      });

      alert(
        first
          ? "Pendaftaran berhasil. Kamu menjadi Super Admin pertama KARTEJI."
          : "Pendaftaran berhasil. Akun kamu terdaftar sebagai anggota."
      );

      // 4) redirect ke login
      window.location.href = "login.html";
    } catch (err) {
      console.error("Register error:", err);
      alert(err.message || "Terjadi kesalahan saat daftar.");
    }
  });
}

// ===============================
// LOGIN LOGIC
// ===============================
const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      alert("Email dan password wajib diisi.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login berhasil:", cred.user.uid);

      // TODO: nanti bisa cek role di /users/{uid} lalu redirect beda-beda
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("Email atau password salah, atau akun belum terdaftar.");
    }
  });
}

// ===============================
// (Opsional) fungsi lain: navbar, dll
// ===============================
// ...di sini nanti kamu bisa lanjut kode lain (load navbar, footer, dsb.)
