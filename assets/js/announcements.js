import {
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "./firebase-config.js";

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("hidden");
}

function renderCard(data, id, admin) {
  const card = document.createElement("article");
  card.className = "feature-card space-y-2";
  const dateStr = data.created_at
    ? new Date(data.created_at).toLocaleString("id-ID")
    : "";
  card.innerHTML = `
    <div class="flex items-center justify-between text-[0.7rem] text-slate-400">
      <span>${dateStr}</span>
      <span class="inline-flex px-2 py-0.5 rounded-full bg-slate-800 text-slate-200">${
        data.target === "members" ? "Anggota" : "Publik"
      }</span>
    </div>
    <h3 class="feature-title">${data.title || "Pengumuman"}</h3>
    <p class="feature-text whitespace-pre-line">${data.content || ""}</p>
    ${
      admin
        ? `<div class="flex justify-end gap-2 pt-2 text-[0.7rem]">
            <button class="btn-ghost px-3 py-1" data-action="edit" data-id="${id}">Edit</button>
            <button class="btn-ghost px-3 py-1" data-action="delete" data-id="${id}">Hapus</button>
          </div>`
        : ""
    }
  `;
  return card;
}

function initPublicAnnouncements() {
  const list =
    document.getElementById("announcements-list") ||
    document.getElementById("member-announcements-list");
  if (!list) return;
  const isMember = !!document.getElementById("member-announcements-list");
  const q = query(collection(db, "announcements"), orderBy("created_at", "desc"));
  onSnapshot(q, (snap) => {
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = '<p class="text-xs text-slate-400">Belum ada pengumuman.</p>';
      return;
    }
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (!isMember && d.target === "members") return;
      list.appendChild(renderCard(d, docSnap.id, false));
    });
  });
}

function initDashboardAnnouncements() {
  const list = document.getElementById("dashboard-announcements-list");
  const modal = document.getElementById("announcement-modal");
  const btnOpen = document.getElementById("btn-open-announcement-modal");
  if (!list || !modal) return;

  btnOpen?.addEventListener("click", () => {
    document.getElementById("announcement-id").value = "";
    document.getElementById("announcement-form").reset();
    document.getElementById("announcement-modal-title").textContent = "Buat Pengumuman";
    openModal("announcement-modal");
  });

  modal.querySelectorAll("[data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => closeModal("announcement-modal"))
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("announcement-modal");
  });

  const q = query(collection(db, "announcements"), orderBy("created_at", "desc"));
  onSnapshot(q, (snap) => {
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.appendChild(renderCard(d, docSnap.id, true));
    });
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "edit") {
      openEdit(id);
    } else if (btn.dataset.action === "delete") {
      if (confirm("Hapus pengumuman ini?")) {
        deleteDoc(doc(db, "announcements", id));
      }
    }
  });

  async function openEdit(id) {
    const { getDoc } = await import("./firebase-config.js");
    const snap = await getDoc(doc(db, "announcements", id));
    if (!snap.exists()) return;
    const d = snap.data();
    document.getElementById("announcement-id").value = id;
    document.getElementById("announcement-title").value = d.title || "";
    document.getElementById("announcement-content").value = d.content || "";
    document.getElementById("announcement-target").value = d.target || "public";
    document.getElementById("announcement-modal-title").textContent = "Edit Pengumuman";
    openModal("announcement-modal");
  }

  const form = document.getElementById("announcement-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("announcement-id").value;
    const title = document.getElementById("announcement-title").value;
    const content = document.getElementById("announcement-content").value;
    const target = document.getElementById("announcement-target").value;
    const payload = {
      title,
      content,
      target,
      updated_at: new Date().toISOString(),
    };
    try {
      if (id) {
        await updateDoc(doc(db, "announcements", id), payload);
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, "announcements"), payload);
      }
      closeModal("announcement-modal");
      form.reset();
    } catch (e2) {
      console.error(e2);
      alert("Gagal menyimpan pengumuman.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initPublicAnnouncements();
  initDashboardAnnouncements();
});
