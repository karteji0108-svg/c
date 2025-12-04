import {
  auth,
  db,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  collection,
  getDocs,
  doc,
  setDoc,
} from "./firebase-config.js";
import { ROLE_LABELS } from "./main.js";

function prefix() {
  const seg = window.location.pathname.split("/").filter(Boolean);
  const depth = seg.length > 1 ? seg.slice(0, -1).length : 0;
  return "../".repeat(depth);
}

async function determineInitialRole() {
  const snap = await getDocs(collection(db, "users"));
  if (snap.empty) return "super_admin";
  return "anggota";
}

function initRegister() {
  const form = document.getElementById("register-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value.trim();
    try {
      const role = await determineInitialRole();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        role,
        created_at: new Date().toISOString(),
      });
      alert(
        role === "super_admin"
          ? "Berhasil daftar. Anda menjadi Super Admin pertama."
          : "Berhasil daftar."
      );
      if (role === "anggota") {
        window.location.href = prefix() + "member/activities.html";
      } else {
        window.location.href = prefix() + "dashboard/index.html";
      }
    } catch (e2) {
      console.error(e2);
      alert(e2.message || "Gagal mendaftar.");
    }
  });
}

function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const { getDoc } = await import("./firebase-config.js");
      const snap = await getDoc(doc(db, "users", uid));
      const role = snap.exists() ? snap.data().role || "anggota" : "anggota";
      if (role === "anggota") {
        window.location.href = prefix() + "member/activities.html";
      } else {
        window.location.href = prefix() + "dashboard/index.html";
      }
    } catch (e2) {
      console.error(e2);
      alert("Email atau password salah.");
    }
  });
}

function initProfile() {
  const nameEl = document.getElementById("profile-name");
  if (!nameEl) return;
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const { getDoc } = await import("./firebase-config.js");
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.data() || {};
    const avatar = document.getElementById("profile-avatar");
    const emailEl = document.getElementById("profile-email");
    const roleEl = document.getElementById("profile-role");
    const uidEl = document.getElementById("profile-uid");

    nameEl.textContent = data.name || "-";
    if (emailEl) emailEl.textContent = data.email || user.email || "-";
    if (roleEl) {
      const label = ROLE_LABELS[data.role || "anggota"] || data.role || "Anggota";
      roleEl.textContent = label;
    }
    if (uidEl) uidEl.textContent = user.uid;
    if (avatar) {
      const initials = (data.name || user.email || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      avatar.textContent = initials;
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = prefix() + "index.html";
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initRegister();
  initLogin();
  initProfile();
});
