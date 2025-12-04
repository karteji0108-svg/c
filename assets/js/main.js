// assets/js/main.js
// =====================================================
// Firebase setup (CDN, modular v9+)
// =====================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  getDocs,
  getDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// =====================================================
// Firebase config (punya kamu)
// =====================================================
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

// Analytics (opsional, kadang error kalau bukan https/localhost)
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics tidak aktif (biasanya karena bukan https/localhost)", e);
}

// Init Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// =====================================================
// Konstanta Role & Helper UI
// =====================================================
const ROLE_LABELS = {
  super_admin: "Super Admin",
  ketua: "Ketua",
  wakil: "Wakil Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  sie: "Koordinator Sie",
  anggota: "Anggota",
};

const ROLE_OPTIONS = [
  "super_admin",
  "ketua",
  "wakil",
  "sekretaris",
  "bendahara",
  "sie",
  "anggota",
];

// Format Rupiah untuk saldo kas
function formatRupiah(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

// Terapkan tampilan role di sidebar & sembunyikan menu yang tidak boleh
function applyRoleToSidebarUI(role) {
  const badge = document.getElementById("current-role-badge");
  if (badge) {
    badge.textContent = ROLE_LABELS[role] || role || "Anggota";
  }

  const allowedNodes = document.querySelectorAll("[data-role-allowed]");
  allowedNodes.forEach((el) => {
    const allowed = (el.getAttribute("data-role-allowed") || "").split(",");
    const trimmed = allowed.map((r) => r.trim());
    if (!trimmed.includes(role)) {
      el.classList.add("hidden");
    }
  });
}

// =====================================================
// Helper: cek user pertama (untuk Super Admin)
// =====================================================
async function isFirstUser() {
  const snap = await getDocs(collection(db, "users"));
  return snap.empty; // true kalau belum ada dokumen user sama sekali
}

// =====================================================
// REGISTER
// =====================================================
const registerForm = document.getElementById("register-form");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (!name || !email || !password) {
      alert("Mohon lengkapi semua data.");
      return;
    }

    try {
      // 1) Buat akun Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) Cek apakah ini user pertama
      const first = await isFirstUser();
      const role = first ? "super_admin" : "anggota";

      // 3) Simpan profil user di Firestore -> koleksi "users"
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

      // 4) Redirect ke login
      window.location.href = "login.html";
    } catch (err) {
      console.error("Register error:", err);
      alert(err.message || "Terjadi kesalahan saat daftar.");
    }
  });
}

// =====================================================
// LOGIN
// =====================================================
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

      // Arahkan ke dashboard pengurus
      window.location.href = "dashboard/index.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("Email atau password salah, atau akun belum terdaftar.");
    }
  });
}

// =====================================================
// Ambil role user yang sedang login
// =====================================================
async function fetchCurrentUserRole(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return "anggota";
    const data = snap.data();
    return data.role || "anggota";
  } catch (e) {
    console.error("Gagal mengambil role user:", e);
    return "anggota";
  }
}

// =====================================================
// Auth state listener (dipakai di semua halaman)
// =====================================================
onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;
  const isDashboard = path.includes("/dashboard/");

  if (!user) {
    // Tidak login tapi di area dashboard -> lempar ke login
    if (isDashboard) {
      window.location.href = "../login.html";
    }
    return;
  }

  const role = await fetchCurrentUserRole(user);
  window.KARTEJI_ROLE = role;

  // Sesuaikan sidebar/menu
  applyRoleToSidebarUI(role);

  // Kalau cuma anggota biasa & masuk dashboard pengurus
  if (isDashboard && role === "anggota") {
    alert("Dashboard ini khusus pengurus. Akun kamu adalah anggota biasa.");
    window.location.href = "../index.html";
    return;
  }

  // Dashboard home (dashboard/index.html)
  if (document.body.dataset.page === "dashboard-home") {
    initDashboardHome(role);
  }

  // Halaman members
  if (document.body.dataset.page === "dashboard-members") {
    initMembersPage(role);
  }

  // Di sini nanti bisa ditambah:
  // if (document.body.dataset.page === "dashboard-activities") { ... }
  // if (document.body.dataset.page === "dashboard-finances") { ... }
});

// =====================================================
// DASHBOARD HOME: statistik kegiatan, pengumuman, kas
// =====================================================
async function fetchDashboardStats() {
  try {
    // Ambil beberapa data dasar untuk statistik
    const [activitiesSnap, announcementsSnap, financesSnap] = await Promise.all([
      getDocs(collection(db, "activities")),
      getDocs(collection(db, "announcements")),
      getDocs(collection(db, "financial_records")),
    ]);

    // Hitung kegiatan aktif (status planned/ongoing/active/aktif/berjalan)
    let activeActivities = 0;
    activitiesSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const status = (data.status || "").toString().toLowerCase();
      const activeStatuses = ["planned", "ongoing", "active", "aktif", "berjalan"];
      if (activeStatuses.includes(status)) {
        activeActivities += 1;
      }
    });

    // Jumlah pengumuman
    const announcementsCount = announcementsSnap.size || 0;

    // Hitung saldo kas dari financial_records
    let balance = 0;
    financesSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const rawAmount = Number(data.amount) || 0;
      const type = (data.type || "").toString().toLowerCase();

      const isIncome = ["in", "income", "masuk", "pemasukan"].includes(type);
      const isExpense = ["out", "expense", "keluar", "pengeluaran"].includes(type);

      if (isIncome) {
        balance += rawAmount;
      } else if (isExpense) {
        balance -= rawAmount;
      } else {
        // kalau type tidak jelas, bisa di-skip atau dianggap 0
      }
    });

    return {
      activeActivities,
      announcementsCount,
      balance,
    };
  } catch (e) {
    console.error("Gagal mengambil statistik dashboard:", e);
    throw e;
  }
}

async function initDashboardHome(role) {
  const activitiesEl = document.getElementById("dash-stat-activities");
  const announcementsEl = document.getElementById("dash-stat-announcements");
  const balanceEl = document.getElementById("dash-stat-balance");

  if (!activitiesEl || !announcementsEl || !balanceEl) return;

  // Tampilan awal (loading)
  activitiesEl.textContent = "...";
  announcementsEl.textContent = "...";
  balanceEl.textContent = "...";

  try {
    const stats = await fetchDashboardStats();
    activitiesEl.textContent = stats.activeActivities;
    announcementsEl.textContent = stats.announcementsCount;
    balanceEl.textContent = formatRupiah(stats.balance);
  } catch (e) {
    activitiesEl.textContent = "-";
    announcementsEl.textContent = "-";
    balanceEl.textContent = "-";
  }
}

// =====================================================
// Halaman: dashboard/members/list.html
// =====================================================
async function initMembersPage(currentUserRole) {
  const accessMsg = document.getElementById("members-access-message");
  const tableWrapper = document.getElementById("members-table-wrapper");
  const tbody = document.getElementById("members-table-body");
  const searchInput = document.getElementById("members-search");

  if (!accessMsg || !tableWrapper || !tbody) return;

  // Hanya super_admin, ketua, wakil yang boleh lihat daftar anggota
  const canManageMembers = ["super_admin", "ketua", "wakil"].includes(currentUserRole);

  if (!canManageMembers) {
    accessMsg.textContent =
      "Akses daftar anggota penuh hanya untuk Super Admin, Ketua, dan Wakil Ketua. Akun kamu tidak memiliki izin untuk melihat detail seluruh anggota.";
    tableWrapper.classList.add("hidden");
    return;
  }

  accessMsg.textContent =
    "Kamu memiliki akses penuh untuk melihat dan mengelola data anggota.";

  tableWrapper.classList.remove("hidden");

  try {
    const snap = await getDocs(collection(db, "users"));
    const members = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      members.push({
        uid: data.uid,
        name: data.name || "-",
        email: data.email || "-",
        role: data.role || "anggota",
        active: data.active !== false,
      });
    });

    renderMembersTable(members, tbody, currentUserRole);

    // Search sederhana di client
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();
        const filtered = members.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            (m.role || "").toLowerCase().includes(q)
        );
        renderMembersTable(filtered, tbody, currentUserRole);
      });
    }
  } catch (e) {
    console.error("Gagal memuat anggota:", e);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-4 text-center text-xs text-red-400">
          Gagal memuat data anggota. Cek koneksi atau Firestore rules.
        </td>
      </tr>
    `;
  }
}

function renderMembersTable(list, tbody, currentUserRole) {
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-4 text-center text-xs text-slate-500">
          Belum ada data anggota yang tersimpan.
        </td>
      </tr>
    `;
    return;
  }

  const canChangeRole = ["super_admin", "ketua", "wakil"].includes(currentUserRole);

  list.forEach((m) => {
    const tr = document.createElement("tr");
    tr.dataset.memberId = m.uid;
    tr.dataset.memberRole = m.role;
    tr.dataset.memberName = m.name;

    tr.innerHTML = `
      <td class="px-4 py-2 whitespace-nowrap">
        <div class="flex flex-col">
          <span class="text-slate-100 text-xs md:text-sm">${m.name}</span>
          <span class="text-[0.7rem] text-slate-400">${m.uid}</span>
        </div>
      </td>
      <td class="px-4 py-2 text-slate-300">${m.email}</td>
      <td class="px-4 py-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] bg-slate-800/70 text-slate-200 border border-slate-600">
          ${ROLE_LABELS[m.role] || m.role || "Anggota"}
        </span>
      </td>
      <td class="px-4 py-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] ${
          m.active
            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
            : "bg-slate-700/60 text-slate-300 border border-slate-500/50"
        }">
          ${m.active ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td class="px-4 py-2 text-right">
        ${
          canChangeRole
            ? `<button
                 class="text-[0.7rem] px-2 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/40 hover:bg-sky-500/25 transition-colors"
                 data-action="change-role"
               >
                 Ubah Role
               </button>`
            : ""
        }
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Event delegation untuk tombol "Ubah Role"
  tbody.onclick = (e) => {
    const btn = e.target.closest("button[data-action='change-role']");
    if (!btn) return;

    const row = btn.closest("tr");
    if (!row) return;

    const memberId = row.dataset.memberId;
    const memberRole = row.dataset.memberRole;
    const memberName = row.dataset.memberName;

    openRoleChangePrompt(memberId, memberName, memberRole, currentUserRole);
  };
}

// =====================================================
// Ubah Role Anggota (prompt sederhana)
// =====================================================
async function openRoleChangePrompt(memberId, memberName, currentRole, currentUserRole) {
  let availableRoles = [...ROLE_OPTIONS];

  // Ketua & Wakil:
  // - Tidak boleh mengubah siapa pun jadi super_admin
  // - Tidak boleh mengubah role user yang sudah super_admin
  if (currentUserRole !== "super_admin") {
    availableRoles = availableRoles.filter((r) => r !== "super_admin");

    if (currentRole === "super_admin") {
      alert("Role Super Admin hanya dapat diubah oleh Super Admin lain.");
      return;
    }
  }

  const labelList = availableRoles
    .map((r) => `${r} (${ROLE_LABELS[r] || r})`)
    .join(", ");

  const newRole = prompt(
    `Ubah role untuk:\n${memberName}\n\nRole saat ini: ${currentRole} (${ROLE_LABELS[currentRole] || currentRole})\n\nMasukkan role baru (${labelList}):`,
    currentRole
  );

  if (!newRole || newRole === currentRole) return;

  const trimmed = newRole.trim();

  if (!availableRoles.includes(trimmed)) {
    alert("Role tidak dikenal atau tidak diizinkan.");
    return;
  }

  const ok = confirm(
    `Yakin mengubah role ${memberName} dari "${ROLE_LABELS[currentRole] || currentRole}" menjadi "${ROLE_LABELS[trimmed] || trimmed}"?`
  );
  if (!ok) return;

  await updateMemberRole(memberId, trimmed);
}

async function updateMemberRole(memberId, newRole) {
  try {
    await updateDoc(doc(db, "users", memberId), {
      role: newRole,
    });
    alert("Role berhasil diperbarui. Silakan refresh halaman untuk melihat perubahan.");
  } catch (e) {
    console.error("Gagal mengubah role:", e);
    alert("Gagal mengubah role. Cek koneksi atau Firestore rules.");
  }
}
