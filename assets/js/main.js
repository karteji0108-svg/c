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
  addDoc,
  deleteDoc,
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

// Analytics (opsional)
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics tidak aktif (biasanya karena bukan https/localhost)", e);
}

// Init Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Simpan user global kalau perlu
window.KARTEJI_USER = null;

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

// Format tanggal singkat
function formatDateShort(value) {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
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
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      let role = "anggota";

      try {
        const first = await isFirstUser();
        if (first) {
          role = "super_admin";
        }
      } catch (eInner) {
        console.warn("Gagal cek user pertama, pakai role default 'anggota'", eInner);
      }

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        active: true,
        createdAt: new Date().toISOString(),
      });

      alert(
        role === "super_admin"
          ? "Pendaftaran berhasil. Kamu menjadi Super Admin pertama KARTEJI."
          : "Pendaftaran berhasil. Akun kamu terdaftar sebagai anggota."
      );

      window.location.href = "login.html";
    } catch (err) {
      console.error("Register error:", err);
      alert(err.message || "Terjadi kesalahan saat daftar.");
    }
  });
}

// =====================================================
// LOGIN (role-aware redirect)
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

      const role = await fetchCurrentUserRole(cred.user);

      if (role === "anggota" || !role) {
        window.location.href = "member/index.html";
      } else {
        window.location.href = "dashboard/index.html";
      }
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
// DASHBOARD STATS (dipakai banyak halaman)
// =====================================================
async function fetchDashboardStats() {
  try {
    const [activitiesSnap, announcementsSnap, financesSnap] = await Promise.all([
      getDocs(collection(db, "activities")),
      getDocs(collection(db, "announcements")),
      getDocs(collection(db, "financial_records")),
    ]);

    // Hitung kegiatan aktif
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

    // Hitung saldo kas
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

// =====================================================
// Auth state listener (dipakai di semua halaman)
// =====================================================
onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;
  const isDashboard = path.includes("/dashboard/");
  const isMemberHome = path.includes("/member/");
  const dataPage = document.body.dataset.page || "";

  if (!user) {
    if (isDashboard || isMemberHome) {
      window.location.href = "../login.html";
    }
    return;
  }

  window.KARTEJI_USER = user;

  const role = await fetchCurrentUserRole(user);
  window.KARTEJI_ROLE = role;

  applyRoleToSidebarUI(role);

  if (isDashboard && role === "anggota") {
    alert("Dashboard ini khusus pengurus. Akun kamu adalah anggota biasa.");
    window.location.href = "../member/index.html";
    return;
  }

  // Inisialisasi per halaman
  if (dataPage === "dashboard-home") {
    initDashboardHome(role);
  }

  if (dataPage === "dashboard-members") {
    initMembersPage(role);
  }

  if (dataPage === "dashboard-activities") {
    initActivitiesPage(role);
  }

  if (dataPage === "member-home") {
    initMemberHome(user, role);
  }

  if (dataPage === "home") {
    initPublicHome(user, role);
  }
});

// =====================================================
// DASHBOARD HOME: statistik kegiatan, pengumuman, kas
// =====================================================
async function initDashboardHome(role) {
  const activitiesEl = document.getElementById("dash-stat-activities");
  const announcementsEl = document.getElementById("dash-stat-announcements");
  const balanceEl = document.getElementById("dash-stat-balance");

  if (!activitiesEl || !announcementsEl || !balanceEl) return;

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
// HOMEPAGE ANGGOTA
// =====================================================
async function initMemberHome(user, role) {
  const nameEl = document.getElementById("member-greeting-name");
  const roleLabelEl = document.getElementById("member-role-value");
  const activitiesStatEl = document.getElementById("member-stat-activities");
  const announcementsStatEl = document.getElementById("member-stat-announcements");
  const balanceStatEl = document.getElementById("member-stat-balance");
  const activitiesListEl = document.getElementById("member-upcoming-activities");
  const announcementsListEl = document.getElementById("member-latest-announcements");

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      if (nameEl) nameEl.textContent = data.name || "Anggota KARTEJI";
    } else if (nameEl) {
      nameEl.textContent = "Anggota KARTEJI";
    }
  } catch (e) {
    console.error("Gagal ambil profil anggota:", e);
    if (nameEl) nameEl.textContent = "Anggota KARTEJI";
  }

  if (roleLabelEl) roleLabelEl.textContent = ROLE_LABELS[role] || role || "Anggota";

  if (activitiesStatEl) activitiesStatEl.textContent = "...";
  if (announcementsStatEl) announcementsStatEl.textContent = "...";
  if (balanceStatEl) balanceStatEl.textContent = "...";

  try {
    const stats = await fetchDashboardStats();
    if (activitiesStatEl) activitiesStatEl.textContent = stats.activeActivities;
    if (announcementsStatEl) announcementsStatEl.textContent = stats.announcementsCount;
    if (balanceStatEl) balanceStatEl.textContent = formatRupiah(stats.balance);
  } catch (e) {
    console.error("Gagal ambil stats untuk member:", e);
    if (activitiesStatEl) activitiesStatEl.textContent = "-";
    if (announcementsStatEl) announcementsStatEl.textContent = "-";
    if (balanceStatEl) balanceStatEl.textContent = "-";
  }

  // Agenda
  if (activitiesListEl) {
    activitiesListEl.innerHTML = `
      <li class="text-[0.75rem] text-slate-500">
        Memuat agenda kegiatan...
      </li>
    `;

    try {
      const snap = await getDocs(collection(db, "activities"));
      const activities = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        activities.push({
          id: docSnap.id,
          title: data.name || data.title || "Kegiatan Tanpa Judul",
          location: data.location || data.tempat || "",
          status: (data.status || "").toString(),
          rawDate: data.date || data.tanggal || data.createdAt || null,
        });
      });

      if (!activities.length) {
        activitiesListEl.innerHTML = `
          <li class="text-[0.75rem] text-slate-500">
            Belum ada kegiatan yang tercatat.
          </li>
        `;
      } else {
        activities.sort((a, b) => {
          const da = a.rawDate ? new Date(a.rawDate) : new Date(0);
          const db = b.rawDate ? new Date(b.rawDate) : new Date(0);
          return da - db;
        });

        const limited = activities.slice(0, 3);
        activitiesListEl.innerHTML = "";

        limited.forEach((act) => {
          const li = document.createElement("li");
          li.className =
            "flex flex-col gap-0.5 border-b border-slate-800/80 last:border-none pb-3 last:pb-0";

          const statusLower = act.status.toLowerCase();
          const activeStatuses = ["planned", "ongoing", "active", "aktif", "berjalan"];
          const isActive = activeStatuses.includes(statusLower);

          li.innerHTML = `
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium text-slate-50 text-xs md:text-sm">
                ${act.title}
              </p>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-700/70 text-slate-200 border border-slate-600"
              }">
                ${act.status || "Info"}
              </span>
            </div>
            <p class="text-[0.7rem] text-slate-400">
              ${formatDateShort(act.rawDate)}${act.location ? " • " + act.location : ""}
            </p>
          `;

          activitiesListEl.appendChild(li);
        });
      }
    } catch (e) {
      console.error("Gagal load activities untuk member:", e);
      activitiesListEl.innerHTML = `
        <li class="text-[0.75rem] text-red-400">
          Gagal memuat agenda. Coba muat ulang halaman.
        </li>
      `;
    }
  }

  // Pengumuman
  if (announcementsListEl) {
    announcementsListEl.innerHTML = `
      <li class="text-[0.75rem] text-slate-500">
        Memuat pengumuman...
      </li>
    `;

    try {
      const snap = await getDocs(collection(db, "announcements"));
      const ann = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        ann.push({
          id: docSnap.id,
          title: data.title || data.judul || "Pengumuman Tanpa Judul",
          excerpt: data.content || data.isi || "",
          rawDate: data.createdAt || data.date || data.tanggal || null,
        });
      });

      if (!ann.length) {
        announcementsListEl.innerHTML = `
          <li class="text-[0.75rem] text-slate-500">
            Belum ada pengumuman yang ditampilkan.
          </li>
        `;
      } else {
        ann.sort((a, b) => {
          const da = a.rawDate ? new Date(a.rawDate) : new Date(0);
          const db = b.rawDate ? new Date(b.rawDate) : new Date(0);
          return db - da;
        });

        const limited = ann.slice(0, 3);
        announcementsListEl.innerHTML = "";

        limited.forEach((an) => {
          const li = document.createElement("li");
          li.className =
            "flex flex-col gap-0.5 border-b border-slate-800/80 last:border-none pb-3 last:pb-0";

          const shortContent =
            (an.excerpt || "").length > 110
              ? an.excerpt.slice(0, 110) + "..."
              : an.excerpt || "Tidak ada isi pengumuman.";

          li.innerHTML = `
            <p class="font-medium text-slate-50 text-xs md:text-sm">
              ${an.title}
            </p>
            <p class="text-[0.7rem] text-slate-400">
              ${formatDateShort(an.rawDate)}
            </p>
            <p class="text-[0.75rem] text-slate-300">
              ${shortContent}
            </p>
          `;

          announcementsListEl.appendChild(li);
        });
      }
    } catch (e) {
      console.error("Gagal load announcements untuk member:", e);
      announcementsListEl.innerHTML = `
        <li class="text-[0.75rem] text-red-400">
          Gagal memuat pengumuman. Coba muat ulang halaman.
        </li>
      `;
    }
  }
}

// =====================================================
// HOMEPAGE PUBLIC (index.html)
// =====================================================
async function initPublicHome(user, role) {
  const activitiesEl = document.getElementById("stat-active-activities");
  const announcementsEl = document.getElementById("stat-announcements");
  const balanceEl = document.getElementById("stat-latest-balance");
  const agendaListEl = document.getElementById("home-upcoming-activities");

  if (activitiesEl) activitiesEl.textContent = "...";
  if (announcementsEl) announcementsEl.textContent = "...";
  if (balanceEl) balanceEl.textContent = "...";

  try {
    const stats = await fetchDashboardStats();
    if (activitiesEl) activitiesEl.textContent = stats.activeActivities;
    if (announcementsEl) announcementsEl.textContent = stats.announcementsCount;
    if (balanceEl) balanceEl.textContent = formatRupiah(stats.balance);
  } catch (e) {
    console.error("Gagal ambil stats untuk homepage:", e);
    if (activitiesEl) activitiesEl.textContent = "-";
    if (announcementsEl) announcementsEl.textContent = "-";
    if (balanceEl) balanceEl.textContent = "-";
  }

  if (agendaListEl) {
    agendaListEl.innerHTML = `
      <li class="text-[0.7rem] text-slate-500">
        Memuat agenda...
      </li>
    `;

    try {
      const snap = await getDocs(collection(db, "activities"));
      const activities = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        activities.push({
          id: docSnap.id,
          title: data.name || data.title || "Kegiatan Tanpa Judul",
          rawDate: data.date || data.tanggal || data.createdAt || null,
        });
      });

      if (!activities.length) {
        agendaListEl.innerHTML = `
          <li class="text-[0.7rem] text-slate-500">
            Belum ada agenda terdekat.
          </li>
        `;
      } else {
        activities.sort((a, b) => {
          const da = a.rawDate ? new Date(a.rawDate) : new Date(0);
          const db = b.rawDate ? new Date(b.rawDate) : new Date(0);
          return da - db;
        });

        const limited = activities.slice(0, 3);
        agendaListEl.innerHTML = "";

        limited.forEach((act) => {
          const li = document.createElement("li");
          li.className = "flex items-center justify-between gap-2 text-[0.7rem]";

          li.innerHTML = `
            <span class="text-slate-200 truncate max-w-[70%]">
              ${act.title}
            </span>
            <span class="text-slate-400">
              ${formatDateShort(act.rawDate)}
            </span>
          `;

          agendaListEl.appendChild(li);
        });
      }
    } catch (e) {
      console.error("Gagal load activities untuk homepage:", e);
      agendaListEl.innerHTML = `
        <li class="text-[0.7rem] text-red-400">
          Gagal memuat agenda. Coba muat ulang halaman.
        </li>
      `;
    }
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

// Ubah Role
async function openRoleChangePrompt(memberId, memberName, currentRole, currentUserRole) {
  let availableRoles = [...ROLE_OPTIONS];

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

// =====================================================
// Halaman: dashboard/activities/list.html (CRUD)
// =====================================================
async function initActivitiesPage(currentUserRole) {
  const tableBody = document.getElementById("activities-table-body");
  const btnOpenModal = document.getElementById("btn-open-activity-modal");
  const modal = document.getElementById("activity-modal");
  const modalTitle = document.getElementById("activity-modal-title");
  const form = document.getElementById("activity-form");

  const fieldId = document.getElementById("activity-id");
  const fieldName = document.getElementById("activity-name");
  const fieldDate = document.getElementById("activity-date");
  const fieldTime = document.getElementById("activity-time");
  const fieldLocation = document.getElementById("activity-location");
  const fieldOwner = document.getElementById("activity-owner");
  const fieldStatus = document.getElementById("activity-status");
  const fieldDesc = document.getElementById("activity-description");
  const fieldImage = document.getElementById("activity-image");

  if (!tableBody || !modal || !form) return;

  const canCreate = ["super_admin", "sekretaris", "sie"].includes(currentUserRole);
  const canEdit = ["super_admin", "sekretaris", "ketua", "wakil", "sie"].includes(currentUserRole);
  const canDelete = ["super_admin", "ketua", "wakil"].includes(currentUserRole);

  if (!canCreate && btnOpenModal) {
    btnOpenModal.classList.add("hidden");
  }

  let activitiesCache = [];

  function openModal(mode = "create", activity = null) {
    if (mode === "create") {
      modalTitle.textContent = "Tambah Kegiatan";
      fieldId.value = "";
      fieldName.value = "";
      fieldDate.value = "";
      fieldTime.value = "";
      fieldLocation.value = "";
      fieldOwner.value = "";
      fieldStatus.value = "draft";
      fieldDesc.value = "";
      if (fieldImage) fieldImage.value = "";
    } else if (mode === "edit" && activity) {
      modalTitle.textContent = "Edit Kegiatan";
      fieldId.value = activity.id || "";
      fieldName.value = activity.name || "";
      fieldDate.value = activity.date || "";
      fieldTime.value = activity.time || "";
      fieldLocation.value = activity.location || "";
      fieldOwner.value = activity.owner || "";
      fieldStatus.value = activity.status || "draft";
      fieldDesc.value = activity.description || "";
      if (fieldImage) fieldImage.value = "";
    }

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  async function loadActivities() {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-4 text-center text-xs text-slate-500">
          Memuat data kegiatan...
        </td>
      </tr>
    `;

    try {
      const snap = await getDocs(collection(db, "activities"));
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        list.push({
          id: docSnap.id,
          name: data.name || data.title || "Tanpa Judul",
          date: data.date || "",
          time: data.time || "",
          status: data.status || "draft",
          location: data.location || "",
          owner: data.owner || data.pic || "",
          description: data.description || "",
        });
      });

      activitiesCache = list;
      renderActivities(list);
    } catch (e) {
      console.error("Gagal memuat kegiatan:", e);
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-4 text-center text-xs text-red-400">
            Gagal memuat data kegiatan. Cek koneksi atau Firestore rules.
          </td>
        </tr>
      `;
    }
  }

  function renderActivities(list) {
    tableBody.innerHTML = "";

    if (!list.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-4 text-center text-xs text-slate-500">
            Belum ada kegiatan tercatat.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach((act) => {
      const tr = document.createElement("tr");
      tr.dataset.id = act.id;

      const statusClassMap = {
        draft: "bg-slate-700/70 text-slate-200 border-slate-500",
        proposed: "bg-sky-500/15 text-sky-300 border-sky-400/60",
        reviewed: "bg-amber-500/15 text-amber-300 border-amber-400/60",
        approved: "bg-emerald-500/15 text-emerald-300 border-emerald-400/60",
        done: "bg-emerald-600/15 text-emerald-200 border-emerald-500/70",
      };

      const statusKey = (act.status || "draft").toLowerCase();
      const statusClass = statusClassMap[statusKey] || statusClassMap.draft;

      tr.innerHTML = `
        <td class="py-2 pr-4 align-top">
          <div class="flex flex-col">
            <span class="font-medium text-slate-50 text-xs md:text-sm">${act.name}</span>
            <span class="text-[0.7rem] text-slate-400 line-clamp-2">${act.description || ""}</span>
          </div>
        </td>
        <td class="py-2 pr-4 align-top text-[0.75rem] text-slate-300">
          ${act.date ? formatDateShort(act.date) : "-"}<br />
          <span class="text-slate-400">${act.time || ""}</span>
        </td>
        <td class="py-2 pr-4 align-top">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] border ${statusClass}">
            ${act.status}
          </span>
        </td>
        <td class="py-2 pr-4 align-top text-[0.75rem] text-slate-200">
          <span class="block">${act.owner || "-"}</span>
          <span class="block text-slate-400 text-[0.7rem]">${act.location || ""}</span>
        </td>
        <td class="py-2 pr-0 align-top text-right">
          <div class="inline-flex gap-2 text-[0.7rem]">
            ${
              canEdit
                ? `<button
                     class="px-2 py-1 rounded-md bg-slate-800/70 border border-slate-600 hover:bg-slate-700/80 transition-colors"
                     data-action="edit-activity"
                   >Edit</button>`
                : ""
            }
            ${
              canDelete
                ? `<button
                     class="px-2 py-1 rounded-md bg-rose-600/20 border border-rose-500/60 text-rose-200 hover:bg-rose-600/30 transition-colors"
                     data-action="delete-activity"
                   >Hapus</button>`
                : ""
            }
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  }

  // Event: buka modal tambah
  if (btnOpenModal && canCreate) {
    btnOpenModal.addEventListener("click", () => openModal("create"));
  }

  // Event: close modal
  modal.querySelectorAll("[data-close-modal], .modal-backdrop").forEach((el) => {
    el.addEventListener("click", () => closeModal());
  });

  // Submit form (create/update)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = fieldId.value || null;
    const name = fieldName.value.trim();
    const date = fieldDate.value;
    const time = fieldTime.value;
    const location = fieldLocation.value.trim();
    const owner = fieldOwner.value.trim();
    const status = fieldStatus.value || "draft";
    const description = fieldDesc.value.trim();

    if (!name || !date || !time) {
      alert("Nama, tanggal, dan waktu wajib diisi.");
      return;
    }

    const payload = {
      name,
      date,
      time,
      location,
      owner,
      status,
      description,
      updatedAt: new Date().toISOString(),
    };

    if (window.KARTEJI_USER) {
      payload.updatedBy = window.KARTEJI_USER.uid;
      if (!id) {
        payload.createdAt = new Date().toISOString();
        payload.createdBy = window.KARTEJI_USER.uid;
      }
    }

    // TODO: upload gambar ke Storage dan simpan imageUrl di payload
    // jika fieldImage.files[0] ada.

    try {
      if (id) {
        await updateDoc(doc(db, "activities", id), payload);
      } else {
        await addDoc(collection(db, "activities"), payload);
      }

      closeModal();
      await loadActivities();
    } catch (e) {
      console.error("Gagal menyimpan kegiatan:", e);
      alert("Gagal menyimpan data kegiatan. Cek koneksi atau Firestore rules.");
    }
  });

  // Event aksi di tabel (edit / delete)
  tableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-action='edit-activity']");
    const deleteBtn = e.target.closest("[data-action='delete-activity']");
    const row = e.target.closest("tr");
    if (!row) return;
    const id = row.dataset.id;

    if (editBtn && canEdit) {
      const act = activitiesCache.find((a) => a.id === id);
      if (!act) return;
      openModal("edit", act);
    }

    if (deleteBtn && canDelete) {
      const act = activitiesCache.find((a) => a.id === id);
      const name = act?.name || "kegiatan ini";
      const ok = confirm(`Yakin ingin menghapus ${name}?`);
      if (!ok) return;

      try {
        await deleteDoc(doc(db, "activities", id));
        await loadActivities();
      } catch (e) {
        console.error("Gagal menghapus kegiatan:", e);
        alert("Gagal menghapus kegiatan. Cek koneksi atau Firestore rules.");
      }
    }
  });

  // Load awal
  loadActivities();
}
