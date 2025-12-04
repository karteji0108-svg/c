import {
  db,
  storage,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  storageRef,
  uploadBytes,
  getDownloadURL,
} from "./firebase-config.js";

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("hidden");
}

function initDashboardActivities() {
  const tbody = document.getElementById("activities-table-body");
  const modal = document.getElementById("activity-modal");
  const btnOpen = document.getElementById("btn-open-activity-modal");
  if (!tbody || !modal) return;

  btnOpen?.addEventListener("click", () => {
    document.getElementById("activity-id").value = "";
    document.getElementById("activity-form").reset();
    document.getElementById("activity-modal-title").textContent = "Tambah Kegiatan";
    openModal("activity-modal");
  });

  modal.querySelectorAll("[data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => closeModal("activity-modal"))
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("activity-modal");
  });

  const q = query(collection(db, "activities"), orderBy("date", "desc"));
  onSnapshot(q, (snap) => {
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2 pr-4">${d.name || "-"}</td>
        <td class="py-2 pr-4 text-xs text-slate-300">${d.date || ""} ${d.time || ""}</td>
        <td class="py-2 pr-4 text-xs">
          <span class="inline-flex px-2 py-1 rounded-full bg-slate-800 text-slate-200">${d.status || "draft"}</span>
        </td>
        <td class="py-2 pr-4 text-xs text-slate-300">${d.owner || "-"}</td>
        <td class="py-2 pr-0 text-right text-xs">
          <button class="btn-ghost px-2 py-1 mr-1" data-action="edit" data-id="${docSnap.id}">Edit</button>
          <button class="btn-ghost px-2 py-1" data-action="delete" data-id="${docSnap.id}">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "edit") {
      openEdit(id);
    } else if (btn.dataset.action === "delete") {
      if (confirm("Hapus kegiatan ini?")) {
        deleteDoc(doc(db, "activities", id));
      }
    }
  });

  async function openEdit(id) {
    const { getDoc } = await import("./firebase-config.js");
    const snap = await getDoc(doc(db, "activities", id));
    if (!snap.exists()) return;
    const d = snap.data();
    document.getElementById("activity-id").value = id;
    document.getElementById("activity-name").value = d.name || "";
    document.getElementById("activity-date").value = d.date || "";
    document.getElementById("activity-time").value = d.time || "";
    document.getElementById("activity-location").value = d.location || "";
    document.getElementById("activity-owner").value = d.owner || "";
    document.getElementById("activity-status").value = d.status || "draft";
    document.getElementById("activity-description").value = d.description || "";
    document.getElementById("activity-modal-title").textContent = "Edit Kegiatan";
    openModal("activity-modal");
  }

  const form = document.getElementById("activity-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("activity-id").value;
    const name = document.getElementById("activity-name").value;
    const date = document.getElementById("activity-date").value;
    const time = document.getElementById("activity-time").value;
    const location = document.getElementById("activity-location").value;
    const owner = document.getElementById("activity-owner").value;
    const status = document.getElementById("activity-status").value;
    const description = document.getElementById("activity-description").value;
    const fileInput = document.getElementById("activity-image");
    let imageUrl = null;

    try {
      if (fileInput.files[0]) {
        const file = fileInput.files[0];
        const ref = storageRef(storage, `activities/${Date.now()}-${file.name}`);
        await uploadBytes(ref, file);
        imageUrl = await getDownloadURL(ref);
      }
      const payload = {
        name,
        date,
        time,
        location,
        owner,
        status,
        description,
        updated_at: new Date().toISOString(),
      };
      if (imageUrl) payload.image_url = imageUrl;
      if (id) {
        await updateDoc(doc(db, "activities", id), payload);
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, "activities"), payload);
      }
      closeModal("activity-modal");
      form.reset();
    } catch (e2) {
      console.error(e2);
      alert("Gagal menyimpan kegiatan.");
    }
  });
}

function initPublicActivities() {
  const list = document.getElementById("activities-list") || document.getElementById("member-activities-list");
  if (!list) return;
  const q = query(collection(db, "activities"), orderBy("date", "asc"));
  onSnapshot(q, (snap) => {
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = '<p class="text-xs text-slate-400">Belum ada kegiatan.</p>';
      return;
    }
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.status && !["approved", "done"].includes(d.status)) return;
      const card = document.createElement("article");
      card.className = "feature-card space-y-2";
      card.innerHTML = `
        <div class="flex items-center justify-between text-[0.7rem] text-slate-400">
          <span>${d.date || "-"}</span>
          <span>${d.time || ""}</span>
        </div>
        <h3 class="feature-title">${d.name || "Kegiatan"}</h3>
        <p class="feature-text">${d.description || ""}</p>
        <div class="flex items-center justify-between text-[0.7rem] text-slate-400 mt-2">
          <span>${d.location || "-"}</span>
          <span class="inline-flex px-2 py-1 rounded-full bg-slate-800 text-slate-200">${d.owner || "-"}</span>
        </div>
      `;
      list.appendChild(card);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboardActivities();
  initPublicActivities();
});
