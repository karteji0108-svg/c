import {
  db,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "./firebase-config.js";
import { ROLE_LABELS } from "./main.js";

async function initMembersManagement() {
  const tbody = document.getElementById("members-table-body");
  if (!tbody) return;

  async function load() {
    const snap = await getDocs(collection(db, "users"));
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const role = d.role || "anggota";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2 pr-4 text-xs">${d.name || "-"}</td>
        <td class="py-2 pr-4 text-xs text-slate-300">${d.email || "-"}</td>
        <td class="py-2 pr-4 text-xs">
          <select data-role-select="${docSnap.id}" class="form-input text-xs py-1">
            ${Object.entries(ROLE_LABELS)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${value === role ? "selected" : ""}>${label}</option>`
              )
              .join("")}
          </select>
        </td>
        <td class="py-2 pr-0 text-right text-xs">
          <button class="btn-ghost px-3 py-1" data-save-role="${docSnap.id}">Simpan</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-save-role]");
    if (!btn) return;
    const uid = btn.dataset.saveRole;
    const select = tbody.querySelector(`select[data-role-select="${uid}"]`);
    if (!select) return;
    const role = select.value;
    if (!confirm(`Ubah role anggota menjadi ${ROLE_LABELS[role] || role}?`)) return;
    try {
      await updateDoc(doc(db, "users", uid), { role });
      alert("Role berhasil diperbarui.");
    } catch (e2) {
      console.error(e2);
      alert("Gagal mengubah role.");
    }
  });

  load();
}

document.addEventListener("DOMContentLoaded", () => {
  initMembersManagement();
});
