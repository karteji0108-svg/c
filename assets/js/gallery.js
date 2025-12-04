import {
  db,
  storage,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
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

function initPublicAlbums() {
  const grid =
    document.getElementById("albums-grid") ||
    document.getElementById("member-gallery-grid");
  if (!grid) return;
  const q = query(collection(db, "albums"), orderBy("created_at", "desc"));
  onSnapshot(q, (snap) => {
    grid.innerHTML = "";
    if (snap.empty) {
      grid.innerHTML = '<p class="text-xs text-slate-400">Belum ada album.</p>';
      return;
    }
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const card = document.createElement("article");
      card.className = "feature-card p-0 overflow-hidden";
      card.innerHTML = `
        <div class="aspect-video bg-slate-800 overflow-hidden">
          ${
            d.cover_url
              ? `<img src="${d.cover_url}" alt="${d.name || "Album"}" class="w-full h-full object-cover" />`
              : ""
          }
        </div>
        <div class="p-3 space-y-1">
          <h3 class="feature-title">${d.name || "Album"}</h3>
          <p class="feature-text line-clamp-2">${d.description || ""}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  });
}

function initDashboardAlbums() {
  const grid = document.getElementById("dashboard-albums-grid");
  const modal = document.getElementById("album-modal");
  const btnOpen = document.getElementById("btn-open-album-modal");
  if (!grid || !modal) return;

  btnOpen?.addEventListener("click", () => {
    document.getElementById("album-id").value = "";
    document.getElementById("album-form").reset();
    document.getElementById("album-modal-title").textContent = "Buat Album";
    openModal("album-modal");
  });

  modal.querySelectorAll("[data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => closeModal("album-modal"))
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("album-modal");
  });

  const q = query(collection(db, "albums"), orderBy("created_at", "desc"));
  onSnapshot(q, (snap) => {
    grid.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const card = document.createElement("article");
      card.className = "feature-card p-0 overflow-hidden relative";
      card.innerHTML = `
        <div class="aspect-video bg-slate-800 overflow-hidden">
          ${
            d.cover_url
              ? `<img src="${d.cover_url}" alt="${d.name || "Album"}" class="w-full h-full object-cover" />`
              : ""
          }
        </div>
        <div class="p-3 space-y-1">
          <h3 class="feature-title">${d.name || "Album"}</h3>
          <p class="feature-text line-clamp-2">${d.description || ""}</p>
        </div>
        <div class="absolute top-2 right-2 flex gap-2 text-[0.65rem]">
          <button class="btn-ghost px-3 py-1" data-action="edit" data-id="${docSnap.id}">Edit</button>
          <button class="btn-ghost px-3 py-1" data-action="delete" data-id="${docSnap.id}">Hapus</button>
        </div>
      `;
      grid.appendChild(card);
    });
  });

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "edit") {
      openEdit(id);
    } else if (btn.dataset.action === "delete") {
      if (confirm("Hapus album ini?")) {
        deleteDoc(doc(db, "albums", id));
      }
    }
  });

  async function openEdit(id) {
    const { getDoc } = await import("./firebase-config.js");
    const snap = await getDoc(doc(db, "albums", id));
    if (!snap.exists()) return;
    const d = snap.data();
    document.getElementById("album-id").value = id;
    document.getElementById("album-name").value = d.name || "";
    document.getElementById("album-description").value = d.description || "";
    document.getElementById("album-modal-title").textContent = "Edit Album";
    openModal("album-modal");
  }

  const form = document.getElementById("album-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("album-id").value;
    const name = document.getElementById("album-name").value;
    const description = document.getElementById("album-description").value;
    const coverInput = document.getElementById("album-cover");
    let coverUrl = null;
    try {
      if (coverInput.files[0]) {
        const file = coverInput.files[0];
        const ref = storageRef(storage, `albums/${Date.now()}-${file.name}`);
        await uploadBytes(ref, file);
        coverUrl = await getDownloadURL(ref);
      }
      const payload = {
        name,
        description,
        updated_at: new Date().toISOString(),
      };
      if (coverUrl) payload.cover_url = coverUrl;
      if (id) {
        await updateDoc(doc(db, "albums", id), payload);
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, "albums"), payload);
      }
      closeModal("album-modal");
      form.reset();
    } catch (e2) {
      console.error(e2);
      alert("Gagal menyimpan album.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initPublicAlbums();
  initDashboardAlbums();
});
