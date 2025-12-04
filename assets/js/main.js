import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "./firebase-config.js";
import "./auth.js";
import "./activities.js";
import "./finances.js";
import "./members.js";
import "./announcements.js";
import "./gallery.js";

async function loadComponent(id, path) {
  const container = document.getElementById(id);
  if (!container) return;
  try {
    const res = await fetch(path);
    container.innerHTML = await res.text();
  } catch (e) {
    console.error("Gagal load component", path, e);
  }
}

function detectDepth() {
  const seg = window.location.pathname.split("/").filter(Boolean);
  const folder = seg.length > 1 ? seg.slice(0, -1) : [];
  return folder.length;
}

function prefix() {
  return "../".repeat(detectDepth());
}

async function initLayout() {
  const p = prefix();
  await Promise.all([
    loadComponent("navbar", p + "components/navbar.html"),
    loadComponent("footer", p + "components/footer.html"),
    loadComponent("back-button", p + "components/back-button.html"),
  ]);

  await Promise.all([
    loadComponent("sidebar-admin", p + "components/sidebar-admin.html"),
    loadComponent("sidebar-member", p + "components/sidebar-member.html"),
  ]);

  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

  initNavbarInteractions();
  initThemeToggle();
}

function initNavbarInteractions() {
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }

  const path = window.location.pathname;
  const mapping = [
    { key: "home", match: "/index.html" },
    { key: "about", match: "/about.html" },
    { key: "activities", match: "/activities.html" },
    { key: "announcements", match: "/announcements.html" },
    { key: "gallery", match: "/gallery.html" },
    { key: "contact", match: "/contact.html" },
  ];
  const activeKey =
    mapping.find((m) => path.endsWith(m.match))?.key || (path === "/" ? "home" : null);
  if (activeKey) {
    document.querySelectorAll(`[data-nav="${activeKey}"]`).forEach((el) =>
      el.classList.add("active")
    );
  }
}

function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("theme-alt");
  });
}

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  ketua: "Ketua",
  wakil: "Wakil Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  sie: "Koordinator Sie",
  anggota: "Anggota",
};

export function formatCurrency(amount) {
  if (typeof amount !== "number") return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const { doc, getDoc } = await import("./firebase-config.js");
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function handleAuthGuard(user) {
  const path = window.location.pathname;
  const isMember = path.includes("/member/");
  const isDashboard = path.includes("/dashboard/");
  const isAuthPage = path.endsWith("/login.html") || path.endsWith("/register.html");

  if (!user && (isMember || isDashboard)) {
    window.location.href = prefix() + "login.html";
    return;
  }

  if (user) {
    const profile = await getUserProfile(user.uid);
    const role = profile?.role || "anggota";

    const loginBtn = document.getElementById("navbar-login-btn");
    const mobileLoginBtn = document.getElementById("mobile-login-btn");
    const navbarUser = document.getElementById("navbar-user-menu");
    const mobileUser = document.getElementById("mobile-user-menu");
    const label = ROLE_LABELS[role] || role;

    if (loginBtn) loginBtn.classList.add("hidden");
    if (mobileLoginBtn) mobileLoginBtn.classList.add("hidden");
    if (navbarUser) {
      navbarUser.classList.remove("hidden");
      navbarUser.textContent = label;
      navbarUser.onclick = () => {
        if (role === "anggota") {
          window.location.href = prefix() + "member/profile.html";
        } else {
          window.location.href = prefix() + "dashboard/index.html";
        }
      };
    }
    if (mobileUser) {
      mobileUser.classList.remove("hidden");
      mobileUser.textContent = label;
      mobileUser.onclick = () => {
        if (role === "anggota") {
          window.location.href = prefix() + "member/profile.html";
        } else {
          window.location.href = prefix() + "dashboard/index.html";
        }
      };
    }

    if (isAuthPage) {
      if (role === "anggota") {
        window.location.href = prefix() + "member/activities.html";
      } else {
        window.location.href = prefix() + "dashboard/index.html";
      }
      return;
    }

    if (isDashboard && role === "anggota") {
      window.location.href = prefix() + "member/activities.html";
      return;
    }

    const adminLogout = document.getElementById("sidebar-admin-logout");
    if (adminLogout) {
      adminLogout.addEventListener("click", async () => {
        const { signOut } = await import("./firebase-config.js");
        await signOut(auth);
      });
    }
    const memberLogout = document.getElementById("sidebar-member-logout");
    if (memberLogout) {
      memberLogout.addEventListener("click", async () => {
        const { signOut } = await import("./firebase-config.js");
        await signOut(auth);
      });
    }
  }
}

async function loadStats() {
  const path = window.location.pathname;
  const isHome = path.endsWith("/index.html") || path === "/";
  const isDash = path.includes("/dashboard/index.html");
  if (!isHome && !isDash) return;

  try {
    const activitiesSnap = await getDocs(
      query(collection(db, "activities"), where("status", "in", ["approved", "done"]))
    );
    const announcementsSnap = await getDocs(
      query(collection(db, "announcements"), orderBy("created_at", "desc"), limit(5))
    );
    const financesSnap = await getDocs(
      query(collection(db, "financial_records"), orderBy("date", "desc"), limit(20))
    );

    const activitiesCount = activitiesSnap.size;
    const announcementsCount = announcementsSnap.size;
    let balance = 0;
    financesSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const amt = d.amount || 0;
      balance += d.type === "in" ? amt : -amt;
    });

    const statA = document.getElementById("stat-active-activities");
    const statAnn = document.getElementById("stat-announcements");
    const statBal = document.getElementById("stat-latest-balance");
    if (statA) statA.textContent = activitiesCount.toString();
    if (statAnn) statAnn.textContent = announcementsCount.toString();
    if (statBal) statBal.textContent = formatCurrency(balance);

    const dashA = document.getElementById("dash-stat-activities");
    const dashAnn = document.getElementById("dash-stat-announcements");
    const dashBal = document.getElementById("dash-stat-balance");
    if (dashA) dashA.textContent = activitiesCount.toString();
    if (dashAnn) dashAnn.textContent = announcementsCount.toString();
    if (dashBal) dashBal.textContent = formatCurrency(balance);

    const upcoming = document.getElementById("home-upcoming-activities");
    if (upcoming) {
      upcoming.innerHTML = "";
      activitiesSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const li = document.createElement("li");
        li.className = "flex justify-between gap-2 text-[0.7rem]";
        li.innerHTML = `<span>${d.name || "Kegiatan"}</span><span class="text-slate-400">${d.date || ""}</span>`;
        upcoming.appendChild(li);
      });
      if (!activitiesSnap.size) {
        upcoming.innerHTML =
          '<li class="text-[0.7rem] text-slate-500">Belum ada kegiatan.</li>';
      }
    }
  } catch (e) {
    console.error("Gagal load stats", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initLayout();
  await loadStats();
  onAuthStateChanged(auth, (user) => handleAuthGuard(user));
});
