/**
 * Interactive Physics Lab — Shared Utilities
 * Handles API calls, logging, file manager, and i18n
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function nowStamp() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, "0"))
    .join(":");
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  return res.json();
}

async function apiUpload(path, formData) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  return res.json();
}

// Global DOM Elements
const logList              = $("#logList");
const reportItemsList      = $("#reportItemsList");
const expressionSelect     = $("#expressionSelect");
const reportTitleInput     = $("#reportTitleInput");
const addToReportBtn       = $("#addToReportBtn");
const exportReportBtn      = $("#exportReportBtn");
const exportExcelBtn       = $("#exportExcelBtn");
const reportHint           = $("#reportHint");
const expMenuBtn           = $("#expMenuBtn");
const expMenuList          = $("#expMenuList");

// File Manager Elements
const fileDropZone = $("#fileDropZone");
const fileInput    = $("#fileInput");
const uploadBtn    = $("#uploadBtn");
const fileList     = $("#fileList");

// State
const shared = {
  logs: [],
  activeExpId: window.location.pathname.split("/").pop() || "electrostatics"
};

// Logging
function addLog(message, level = "primary") {
  shared.logs.push({ t: nowStamp(), message, level });
  renderLog();
}

function renderLog() {
  if (!logList) return;
  logList.innerHTML = "";
  for (const entry of shared.logs.slice(-50)) {
    const div = document.createElement("div");
    div.className = entry.level === "info" ? "text-slate-500" : "text-primary font-medium";
    div.innerHTML = `<span class="text-slate-400">[${entry.t}]</span> ${escapeHtml(entry.message)}`;
    logList.appendChild(div);
  }
  logList.scrollTop = logList.scrollHeight;
}

// Experiement Menu Toggle
if (expMenuBtn) {
  expMenuBtn.addEventListener("click", e => { e.stopPropagation(); expMenuList.classList.toggle("hidden"); });
  document.addEventListener("click", () => { expMenuList.classList.add("hidden"); });
}

// Report Builder
async function loadReportItems() {
  if (!reportItemsList) return;
  const items = await api("/api/reports/items");
  renderReportItems(items);
}

function renderReportItems(items) {
  if (!reportItemsList) return;
  reportItemsList.innerHTML = "";
  if (!items || items.length === 0) {
    reportItemsList.innerHTML = `<div class="text-xs text-slate-400 italic p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">${escapeHtml(t("report.noItems") !== "report.noItems" ? t("report.noItems") : "Henüz eklenen kayıt yok.")}</div>`;
    return;
  }
  items.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5";
    row.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs font-bold text-slate-500 mb-1">#${idx + 1} • ${escapeHtml(item.label)}</div>
          <div class="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-words">
            q1=${item.q1} µC, q2=${item.q2} µC, r=${item.r} m → F=${item.force} N
          </div>
          <div class="text-[11px] text-slate-400 mt-1">${escapeHtml(item.created_at)}</div>
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <button data-act="up" data-idx="${idx}" class="rpt-act px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-xs">↑</button>
          <button data-act="down" data-idx="${idx}" class="rpt-act px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-xs">↓</button>
          <button data-act="del" data-id="${item.id}" class="rpt-act px-2 py-1 rounded-md border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs text-red-600">✕</button>
        </div>
      </div>`;
    reportItemsList.appendChild(row);
  });
}

if (addToReportBtn) {
  addToReportBtn.addEventListener("click", async () => {
    const snap = await api(`/api/experiments/${shared.activeExpId}/compute`);
    const st   = snap.state || {};
    const comp = snap.computed || {};
    let payload;
    if (shared.activeExpId === "coulomb_law") {
      payload = {
        expression: "coulomb",
        label: "Coulomb's Law: F = k·|q₁·q₂|/r²",
        q1: st.q1 || 0, q2: st.q2 || 0,
        r:  st.distance || 1,
        force: comp.force || 0,
      };
    } else {
      payload = {
        expression: expressionSelect ? expressionSelect.value : "coulomb",
        label: expressionSelect && expressionSelect.options.length > 0 ? expressionSelect.options[expressionSelect.selectedIndex]?.text : "Coulomb's Law",
        q1: st.glassChargeMicroC || 0, q2: st.plasticChargeMicroC || 0,
        r:  st.distanceMeters    || 1, force: comp.force || 0,
      };
    }
    await api("/api/reports/items/add", { method: "POST", body: JSON.stringify(payload) });
    addLog((t("log.savedToReport") !== "log.savedToReport" ? t("log.savedToReport") : "Rapora eklendi: ") + payload.label, "info");
    loadReportItems();
  });
}

if (exportReportBtn) {
  exportReportBtn.addEventListener("click", () => {
    const title = encodeURIComponent(reportTitleInput ? reportTitleInput.value : t("report.defaultTitle"));
    const lang = getLang();
    window.location.href = `/api/reports/export/html?title=${title}&lang=${lang}`;
  });
}

if (exportExcelBtn) {
  exportExcelBtn.addEventListener("click", () => {
    const title = encodeURIComponent(reportTitleInput ? reportTitleInput.value : t("report.defaultTitle"));
    const lang = getLang();
    window.location.href = `/api/reports/export/xlsx?title=${title}&lang=${lang}`;
  });
}

if (reportItemsList) {
  reportItemsList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".rpt-act");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "del") {
      await api(`/api/reports/items/${btn.dataset.id}`, { method: "DELETE" });
    } else if (act === "up" || act === "down") {
      const idx   = parseInt(btn.dataset.idx, 10);
      const toIdx = act === "up" ? idx - 1 : idx + 1;
      await api("/api/reports/items/reorder", { method: "POST", body: JSON.stringify({ fromIndex: idx, toIndex: toIdx }) });
    }
    loadReportItems();
  });
}

// File Manager
let selectedFile = null;

if (fileDropZone) {
  fileDropZone.addEventListener("click",     () => fileInput.click());
  fileDropZone.addEventListener("dragover",  e => { e.preventDefault(); fileDropZone.classList.add("dragover"); });
  fileDropZone.addEventListener("dragleave", () => fileDropZone.classList.remove("dragover"));
  fileDropZone.addEventListener("drop", e => {
    e.preventDefault(); fileDropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      selectedFile = e.dataTransfer.files[0];
      uploadBtn.disabled = false;
      fileDropZone.querySelector("span:last-child").textContent = selectedFile.name;
    }
  });
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      selectedFile = fileInput.files[0];
      uploadBtn.disabled = false;
      fileDropZone.querySelector("span:last-child").textContent = selectedFile.name;
    }
  });
}

if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    uploadBtn.disabled = true;
    const fd = new FormData();
    fd.append("file", selectedFile);
    const result = await apiUpload("/api/files/upload", fd);
    if (result.error) {
      addLog((t("file.uploadFailed") !== "file.uploadFailed" ? t("file.uploadFailed") : "Yükleme hatası: ") + result.error, "info");
    } else {
      addLog((t("file.uploaded") !== "file.uploaded" ? t("file.uploaded") : "Yüklendi: ") + (result.original_name || selectedFile.name), "primary");
    }
    selectedFile = null; fileInput.value = "";
    fileDropZone.querySelector("span:last-child").textContent = t("file.dropHint") !== "file.dropHint" ? t("file.dropHint") : "Dosya sürükle veya tıkla";
    loadFiles();
  });
}

async function loadFiles() {
  if (!fileList) return;
  try  { const files = await api("/api/files"); renderFiles(files); }
  catch { renderFiles([]); }
}

function renderFiles(files) {
  if (!fileList) return;
  fileList.innerHTML = "";
  if (!files || files.length === 0) {
    fileList.innerHTML = `<div class="text-xs text-slate-400 italic">${escapeHtml(t("file.noFiles") !== "file.noFiles" ? t("file.noFiles") : "Henüz dosya yok.")}</div>`;
    return;
  }
  files.forEach(f => {
    const div = document.createElement("div");
    div.className = "file-item fade-in";
    div.innerHTML = `
      <a href="/api/files/${f.id}" download="${escapeHtml(f.original_name)}" class="file-name hover:text-primary transition-colors cursor-pointer" title="${escapeHtml(f.original_name)}">${escapeHtml(f.original_name)}</a>
      <button class="file-del-btn" data-id="${f.id}" title="Delete">
        <span class="material-symbols-outlined" style="font-size:16px">delete</span>
      </button>`;
    fileList.appendChild(div);
  });
}

if (fileList) {
  fileList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".file-del-btn");
    if (!btn) return;
    await api(`/api/files/${btn.dataset.id}`, { method: "DELETE" });
    addLog(t("file.deleted") !== "file.deleted" ? t("file.deleted") : "Dosya silindi.", "info");
    loadFiles();
  });
}

function initShared() {
  applyI18nDOM();
  loadReportItems();
  loadFiles();
}

window.initShared = initShared;
