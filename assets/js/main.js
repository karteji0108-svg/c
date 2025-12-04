// =======================================
// Firebase KARTEJI - main.js
// Dipakai di semua halaman (home, login, register, dashboard, dst.)
// =======================================

// Import Firebase modular via CDN (bukan "firebase/app" biasa)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ==========================
// Firebase Config (punyamu)
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyAQxpD7ea9gHWGiU3wYXr0XHyl-SNyFYNs",
  authDomain: "katar-9cac3.firebaseapp.com",
  projectId: "katar-9cac3",
  storageBucket: "katar-9cac3.firebasestorage.app",
  messagingSenderId: "1017734829960",
  appId: "1:1017734829960:web:6b02b7176f08a23ce28c3d",
  measurementId: "G-M4F9J10TTE",
};

// Init Firebase
const app = initializeApp(firebaseConfig);

// Analytics hanya jalan di https/localhost, jadi kita bungkus try-catch
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn(
    "Analytics tidak aktif (biasanya karena belum di-host via https/localhost)",
    e
  );
}

// Init Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// ====================================================================================
// Helper: deteksi halaman (pakai attribute data-page di <body>)
// ====================================================================================
const body = document.body;
const currentPage = body?.dataset?.page || "";

// ====================================================================================
// Helper: cek apakah ini user pertama (untuk Super Admin pertama)
// ====================================================================================
async function isFirstUser() {
  const snap = await getDocs(collection(db, "users"));
  return snap.empty; // true kalau koleksi users masih kosong
}

// ====================================================================================
// Helper: ambil profil user dari Firestore
// ====================================================================================
async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ====================================================================================
// AUTH: REGISTER PAGE (register.html)
// ====================================================================================
const registerForm = document.getElementById("register-form");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (!name || !email || !password) {
      alert("Mohon lengkapi semua data pendaftaran.");
      return;
    }

    try {
      // 1) Buat akun di Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) Cek apakah ini user pertama di koleksi "users"
      const first = await isFirstUser();
      const role = first ? "super_admin" : "anggota";

      // 3) Simpan profil user di Firestore (users/{uid})
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

      // 4) Redirect ke halaman login
      window.location.href = "login.html";
    } catch (err) {
      console.error("Register error:", err);
      alert(err.message || "Terjadi kesalahan saat daftar. Coba lagi.");
    }
  });
}

// ====================================================================================
// AUTH: LOGIN PAGE (login.html)
// ====================================================================================
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

      // TODO: nanti bisa cek role di sini kalau mau redirect beda halaman
      // const profile = await getUserProfile(cred.user.uid);
      // if (profile.role === "super_admin") { ... }

      // Sekarang cukup redirect ke dashboard utama
      window.location.href = "dashboard/index.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("Email atau password salah, atau akun belum terdaftar.");
    }
  });
}

// ====================================================================================
// (Opsional) Listener status login global - bisa dipakai di navbar/dashboard
// ====================================================================================
onAuthStateChanged(auth, async (user) => {
  // Di sini bisa dipakai untuk:
  // - update navbar login/logout
  // - proteksi halaman dashboard (kalau user harus login)
  // Sekarang kita hanya log untuk debugging ringan.
  if (user) {
    console.log("User login:", user.uid);
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        console.log("Role:", profile.role);
      }
    } catch (e) {
      console.warn("Gagal ambil profil user:", e);
    }
  } else {
    console.log("Belum login / sudah logout");

    // Contoh proteksi minimal:
    // kalau lagi di halaman dashboard dan tidak login, balikin ke login
    if (currentPage.startsWith("dashboard")) {
      window.location.href = "../login.html";
    }
  }
});

// ====================================================================================
// (Opsional) Logout button handler (kalau kamu punya tombol dengan id="logout-btn")
// ====================================================================================
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "../login.html";
    } catch (err) {
      console.error("Logout error:", err);
      alert("Gagal logout. Coba lagi.");
    }
  });
}

// ====================================================================================
// TODO: Di bawah ini bisa kamu tambah:
// - fungsi load navbar/footer dari partial
// - inisialisasi halaman dashboard, dll.
// ====================================================================================
