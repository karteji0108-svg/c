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
import { formatCurrency } from "./main.js";

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("hidden");
}

function initDashboardFinances() {
  const tbody = document.getElementById("finances-table-body");
  const modal = document.getElementById("finance-modal");
  const btnOpen = document.getElementById("btn-open-finance-modal");
  if (!tbody || !modal) return;

  btnOpen?.addEventListener("click", () => {
    document.getElementById("finance-id").value = "";
    document.getElementById("finance-form").reset();
    document.getElementById("finance-modal-title").textContent = "Catat Transaksi";
    openModal("finance-modal");
  });

  modal.querySelectorAll("[data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => closeModal("finance-modal"))
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("finance-modal");
  });

  const q = query(collection(db, "financial_records"), orderBy("date", "desc"));
  onSnapshot(q, (snap) => {
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2 pr-4">${d.date || "-"}</td>
        <td class="py-2 pr-4 text-xs text-slate-300">${d.description || "-"}</td>
        <td class="py-2 pr-4 text-xs">${d.type === "in" ? "Masuk" : "Keluar"}</td>
        <td class="py-2 pr-0 text-right text-xs">${formatCurrency(d.amount || 0)}</td>
        <td class="py-2 pl-4 text-right text-xs">
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
      if (confirm("Hapus transaksi ini?")) {
        deleteDoc(doc(db, "financial_records", id));
      }
    }
  });

  async function openEdit(id) {
    const { getDoc } = await import("./firebase-config.js");
    const snap = await getDoc(doc(db, "financial_records", id));
    if (!snap.exists()) return;
    const d = snap.data();
    document.getElementById("finance-id").value = id;
    document.getElementById("finance-date").value = d.date || "";
    document.getElementById("finance-description").value = d.description || "";
    document.getElementById("finance-type").value = d.type || "in";
    document.getElementById("finance-amount").value = d.amount || 0;
    document.getElementById("finance-modal-title").textContent = "Edit Transaksi";
    openModal("finance-modal");
  }

  const form = document.getElementById("finance-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("finance-id").value;
    const date = document.getElementById("finance-date").value;
    const description = document.getElementById("finance-description").value;
    const type = document.getElementById("finance-type").value;
    const amount = Number(document.getElementById("finance-amount").value || 0);
    const payload = {
      date,
      description,
      type,
      amount,
      updated_at: new Date().toISOString(),
    };
    try {
      if (id) {
        await updateDoc(doc(db, "financial_records", id), payload);
      } else {
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, "financial_records"), payload);
      }
      closeModal("finance-modal");
      form.reset();
    } catch (e2) {
      console.error(e2);
      alert("Gagal menyimpan transaksi.");
    }
  });
}

function initMemberFinances() {
  const tbody = document.getElementById("member-finances-table");
  if (!tbody) return;
  const q = query(collection(db, "financial_records"), orderBy("date", "desc"));
  onSnapshot(q, (snap) => {
    tbody.innerHTML = "";
    if (snap.empty) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="py-3 text-center text-xs text-slate-400">Belum ada transaksi.</td></tr>';
      return;
    }
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2 pr-4">${d.date || "-"}</td>
        <td class="py-2 pr-4 text-xs text-slate-300">${d.description || "-"}</td>
        <td class="py-2 pr-4 text-xs">${d.type === "in" ? "Masuk" : "Keluar"}</td>
        <td class="py-2 pr-0 text-right text-xs">${formatCurrency(d.amount || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboardFinances();
  initMemberFinances();
});
