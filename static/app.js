/**
 * Interactive Physics Lab — Frontend Logic
 * Communicates exclusively with FastAPI backend for all state mutations.
 */

// ─── Helpers ────────────────────────────────────────────────────────
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

/** Upload helper — does NOT set Content-Type so browser adds multipart boundary */
async function apiUpload(path, formData) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  return res.json();
}

// ─── DOM Refs ───────────────────────────────────────────────────────
const controlsMount = $("#controlsMount");
const placeholderOverlay = $("#placeholderOverlay");
const activeExperimentName = $("#activeExperimentName");
const statusText = $("#statusText");
const statusPing = $("#statusPing");
const glassRig = $("#glassRig");
const plasticRig = $("#plasticRig");
const forceGroup = $("#forceGroup");
const forceLabel = $("#forceLabel");
const forceReadout = $("#forceReadout");
const q1Readout = $("#q1Readout");
const q2Readout = $("#q2Readout");
const logList = $("#logList");
const pauseBtn = $("#pauseBtn");
const pauseIcon = $("#pauseIcon");
const pauseText = $("#pauseText");
const resetBtn = $("#resetBtn");
const expMenuBtn = $("#expMenuBtn");
const expMenuList = $("#expMenuList");
const expMenuItems = $("#expMenuItems");
const learningSummary = $("#learningSummary");
const coreConcepts = $("#coreConcepts");
const addToReportBtn = $("#addToReportBtn");
const exportReportBtn = $("#exportReportBtn");
const exportExcelBtn = $("#exportExcelBtn");
const reportItemsList = $("#reportItemsList");
const reportTitleInput = $("#reportTitleInput");
const expressionSelect = $("#expressionSelect");
const reportHint = $("#reportHint");

// File Manager
const fileDropZone = $("#fileDropZone");
const fileInput = $("#fileInput");
const uploadBtn = $("#uploadBtn");
const fileList = $("#fileList");

// ─── App State (client-side mirror) ─────────────────────────────────
const local = {
  activeExpId: "electrostatics",
  running: true,
  experiments: [],

  // animation
  glassAngleDeg: 2,
  plasticAngleDeg: -2,
  glassVel: 0,
  plasticVel: 0,
  glassTarget: 2,
  plasticTarget: -2,

  showCharges: true,
  showForces: false,

  // logs
  logs: [],
};

// ─── Logging ────────────────────────────────────────────────────────
function addLog(message, level = "primary") {
  local.logs.push({ t: nowStamp(), message, level });
  renderLog();
}

function renderLog() {
  logList.innerHTML = "";
  for (const entry of local.logs.slice(-50)) {
    const div = document.createElement("div");
    div.className = entry.level === "info" ? "text-slate-500" : "text-primary font-medium";
    div.innerHTML = `<span class="text-slate-400">[${entry.t}]</span> ${escapeHtml(entry.message)}`;
    logList.appendChild(div);
  }
  logList.scrollTop = logList.scrollHeight;
}

// ─── Readouts ───────────────────────────────────────────────────────
function applyComputed(computed) {
  if (!computed) return;

  forceReadout.textContent = computed.forceFormatted || "0.000 N";
  q1Readout.textContent = computed.q1Formatted || "+0.0 µC";
  q2Readout.textContent = computed.q2Formatted || "0.0 µC";

  // Translate force label key
  const flKey = computed.forceLabel || "";
  forceLabel.textContent = t(flKey) !== flKey ? t(flKey) : flKey;

  local.glassTarget = computed.glassTarget ?? 2;
  local.plasticTarget = computed.plasticTarget ?? -2;
  local.showCharges = computed.showCharges ?? true;
  local.showForces = computed.showForces ?? false;

  $$(".charge-symbol").forEach(el => { el.style.display = local.showCharges ? "" : "none"; });
  forceGroup.style.display = local.showForces ? "flex" : "none";
}

// ─── Status ─────────────────────────────────────────────────────────
function setStatusUI() {
  if (local.running) {
    statusText.textContent = t("status.running");
    statusPing.classList.remove("hidden");
    pauseIcon.textContent = "pause_circle";
    pauseText.textContent = t("btn.pause");
  } else {
    statusText.textContent = t("status.paused");
    statusPing.classList.add("hidden");
    pauseIcon.textContent = "play_circle";
    pauseText.textContent = t("btn.run");
  }
}

// ─── Controls rendering (from schema) ───────────────────────────────
function renderControls(schema) {
  controlsMount.innerHTML = "";
  if (!schema || !schema.length) {
    controlsMount.innerHTML = `
      <div class="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <div class="text-sm font-bold">${escapeHtml(t("controls.noControls"))}</div>
        <div class="text-xs text-slate-500 mt-1">${escapeHtml(t("controls.noControlsDesc"))}</div>
      </div>`;
    return;
  }

  let html = "";
  for (const c of schema) {
    // Translate label via i18n key if it exists
    const label = t(c.label) !== c.label ? t(c.label) : c.label;

    if (c.type === "button") {
      html += `
        <button data-action="${c.action}"
          class="exp-action-btn w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-primary/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all text-left group">
          <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">${c.icon || "play_arrow"}</span>
          <span class="text-sm font-medium">${escapeHtml(label)}</span>
        </button>`;
    } else if (c.type === "slider") {
      html += `
        <div class="pt-4 px-1">
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-semibold">${escapeHtml(label)}</label>
            <span id="badge_${c.id}" class="text-xs font-mono text-primary bg-primary/10 px-1.5 rounded">${c.min}${c.unit || ""}</span>
          </div>
          <input data-field="${c.field}" data-unit="${c.unit || ""}" id="slider_${c.id}"
            class="ctrl-slider w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            min="${c.min}" max="${c.max}" step="${c.step}" type="range" value="${c.min}">
          <div class="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>${c.min}${c.unit || ""}</span><span>${c.max}${c.unit || ""}</span>
          </div>
        </div>`;
    } else if (c.type === "toggle") {
      html += `
        <div class="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm font-medium">${escapeHtml(label)}</span>
            <div class="relative inline-flex items-center cursor-pointer">
              <input data-field="${c.field}" id="toggle_${c.id}" class="ctrl-toggle sr-only peer" type="checkbox"/>
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </div>
          </label>
        </div>`;
    }
  }
  controlsMount.innerHTML = html;
}

function wireControls(currentState) {
  // Set initial slider/toggle values from server state
  $$(".ctrl-slider").forEach(sl => {
    const field = sl.dataset.field;
    if (currentState && field in currentState) sl.value = currentState[field];
    const badge = $(`#badge_${sl.id.replace("slider_", "")}`);
    if (badge) badge.textContent = `${parseFloat(sl.value).toFixed(1)}${sl.dataset.unit || ""}`;
  });

  $$(".ctrl-toggle").forEach(tg => {
    const field = tg.dataset.field;
    if (currentState && field in currentState) tg.checked = !!currentState[field];
  });

  // Action buttons
  $$(".exp-action-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const data = await api(`/api/experiments/${local.activeExpId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (data.log) addLog(t(data.log) !== data.log ? t(data.log) : data.log, "primary");
      applyComputed(data.computed);
    });
  });

  // Sliders
  $$(".ctrl-slider").forEach(sl => {
    sl.addEventListener("input", async () => {
      const field = sl.dataset.field;
      const value = parseFloat(sl.value);
      const badge = $(`#badge_${sl.id.replace("slider_", "")}`);
      if (badge) badge.textContent = `${value.toFixed(1)}${sl.dataset.unit || ""}`;

      const data = await api(`/api/experiments/${local.activeExpId}/update`, {
        method: "POST",
        body: JSON.stringify({ field, value }),
      });
      applyComputed(data.computed);
    });
  });

  // Toggles
  $$(".ctrl-toggle").forEach(tg => {
    tg.addEventListener("change", async () => {
      const field = tg.dataset.field;
      const value = tg.checked;
      const data = await api(`/api/experiments/${local.activeExpId}/update`, {
        method: "POST",
        body: JSON.stringify({ field, value }),
      });
      applyComputed(data.computed);
    });
  });
}

// ─── Learning panel ─────────────────────────────────────────────────
function renderLearning(learning) {
  if (!learning || !learning.summary) {
    learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(t("learning.placeholder"))}</p>`;
    coreConcepts.innerHTML = "";
    return;
  }

  // Translate summary key if it is a key, otherwise use raw HTML
  const summaryKey = learning.summary;
  const translated = t(summaryKey);
  if (translated !== summaryKey) {
    learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${translated}</p>`;
  } else {
    learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${learning.summary}</p>`;
  }

  coreConcepts.innerHTML = (learning.concepts || []).map(c => {
    const cTitle = t(c.title) !== c.title ? t(c.title) : c.title;
    const cDesc = t(c.desc) !== c.desc ? t(c.desc) : c.desc;
    return `
    <div class="flex gap-3">
      <div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
        <span class="text-[10px] font-bold">${c.num}</span>
      </div>
      <div>
        <h4 class="text-sm font-bold">${escapeHtml(cTitle)}</h4>
        <p class="text-xs text-slate-500">${escapeHtml(cDesc)}</p>
      </div>
    </div>`;
  }).join("");
}

// ─── Experiment switching ───────────────────────────────────────────
async function mountExperiment(expId) {
  local.activeExpId = expId;
  const data = await api(`/api/experiments/${expId}`);

  // Translate experiment name via key
  const nameKey = data.name || expId;
  activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : nameKey;
  placeholderOverlay.classList.toggle("hidden", !!data.implemented);

  renderControls(data.controls || []);
  wireControls(data.state || {});
  renderLearning(data.learning || {});
  applyComputed(data.computed || {});

  // Reset animation
  local.glassAngleDeg = 2; local.plasticAngleDeg = -2;
  local.glassVel = 0; local.plasticVel = 0;

  if (data.state) {
    local.running = data.state.running !== false;
  }
  setStatusUI();
  setReportUIEnabled(expId === "electrostatics");

  local.logs = [];
  addLog(t("log.expLoaded") + (t(nameKey) !== nameKey ? t(nameKey) : nameKey), "info");

  expMenuList.classList.add("hidden");
}

// ─── Experiments dropdown ───────────────────────────────────────────
async function loadExperimentsList() {
  local.experiments = await api("/api/experiments");
  expMenuItems.innerHTML = local.experiments.map(e => {
    const nameKey = e.name;
    const displayName = t(nameKey) !== nameKey ? t(nameKey) : nameKey;
    return `
    <button data-exp="${e.id}"
      class="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm font-semibold">
      ${escapeHtml(displayName)}
    </button>`;
  }).join("");
}

expMenuBtn.addEventListener("click", e => { e.stopPropagation(); expMenuList.classList.toggle("hidden"); });
document.addEventListener("click", () => { expMenuList.classList.add("hidden"); });
expMenuList.addEventListener("click", e => {
  const btn = e.target.closest("button[data-exp]");
  if (btn) mountExperiment(btn.dataset.exp);
});

// ─── Global controls ────────────────────────────────────────────────
pauseBtn.addEventListener("click", async () => {
  const data = await api(`/api/experiments/${local.activeExpId}/action`, {
    method: "POST",
    body: JSON.stringify({ action: "togglePause" }),
  });
  if (data.state) local.running = data.state.running !== false;
  if (data.log) {
    const logKey = data.log;
    addLog(t(logKey) !== logKey ? t(logKey) : logKey, "info");
  }
  setStatusUI();
});

resetBtn.addEventListener("click", async () => {
  const data = await api(`/api/experiments/${local.activeExpId}/action`, {
    method: "POST",
    body: JSON.stringify({ action: "reset" }),
  });
  if (data.log) {
    const logKey = data.log;
    addLog(t(logKey) !== logKey ? t(logKey) : logKey, "info");
  }
  applyComputed(data.computed);

  local.glassAngleDeg = 2; local.plasticAngleDeg = -2;
  local.glassVel = 0; local.plasticVel = 0;
  local.running = true;
  setStatusUI();
  wireControls(data.state || {});
  loadReportItems();
});

// ─── Animation loop (client-side spring physics for smooth visuals) ─
let lastT = performance.now();
function tick(frameT) {
  const dt = Math.min(0.05, (frameT - lastT) / 1000);
  lastT = frameT;

  if (local.running && local.activeExpId === "electrostatics") {
    const stiffness = 18, damping = 10;

    const gAcc = stiffness * (local.glassTarget - local.glassAngleDeg) - damping * local.glassVel;
    local.glassVel += gAcc * dt;
    local.glassAngleDeg += local.glassVel * dt;

    const pAcc = stiffness * (local.plasticTarget - local.plasticAngleDeg) - damping * local.plasticVel;
    local.plasticVel += pAcc * dt;
    local.plasticAngleDeg += local.plasticVel * dt;

    glassRig.style.transform = `rotate(${local.glassAngleDeg}deg)`;
    plasticRig.style.transform = `rotate(${local.plasticAngleDeg}deg)`;
  }

  requestAnimationFrame(tick);
}

// ─── Report Builder ─────────────────────────────────────────────────
async function loadReportItems() {
  const items = await api("/api/reports/items");
  renderReportItems(items);
}

function renderReportItems(items) {
  reportItemsList.innerHTML = "";

  if (!items || items.length === 0) {
    reportItemsList.innerHTML = `
      <div class="text-xs text-slate-400 italic p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
        ${escapeHtml(t("report.noItems"))}
      </div>`;
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
          <button data-act="up" data-idx="${idx}"
            class="rpt-act px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-xs">↑</button>
          <button data-act="down" data-idx="${idx}"
            class="rpt-act px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-xs">↓</button>
          <button data-act="del" data-id="${item.id}"
            class="rpt-act px-2 py-1 rounded-md border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs text-red-600">✕</button>
        </div>
      </div>`;
    reportItemsList.appendChild(row);
  });
}

addToReportBtn.addEventListener("click", async () => {
  if (local.activeExpId !== "electrostatics") {
    addLog(t("log.reportOnly"), "info");
    return;
  }

  // grab current computed values from server
  const snap = await api(`/api/experiments/${local.activeExpId}/compute`);
  const st = snap.state || {};
  const comp = snap.computed || {};

  const payload = {
    expression: expressionSelect.value,
    label: expressionSelect.options[expressionSelect.selectedIndex]?.text || "Coulomb's Law",
    q1: st.glassChargeMicroC || 0,
    q2: st.plasticChargeMicroC || 0,
    r: st.distanceMeters || 1,
    force: comp.force || 0,
  };

  await api("/api/reports/items/add", { method: "POST", body: JSON.stringify(payload) });
  addLog(t("log.savedToReport") + payload.label, "info");
  loadReportItems();
});

exportReportBtn.addEventListener("click", () => {
  const title = encodeURIComponent(reportTitleInput.value || t("report.defaultTitle"));
  const lang = getLang();
  window.location.href = `/api/reports/export/html?title=${title}&lang=${lang}`;
});

exportExcelBtn.addEventListener("click", () => {
  const title = encodeURIComponent(reportTitleInput.value || t("report.defaultTitle"));
  const lang = getLang();
  window.location.href = `/api/reports/export/xlsx?title=${title}&lang=${lang}`;
});

reportItemsList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".rpt-act");
  if (!btn) return;

  const act = btn.dataset.act;
  if (act === "del") {
    await api(`/api/reports/items/${btn.dataset.id}`, { method: "DELETE" });
  } else if (act === "up" || act === "down") {
    const idx = parseInt(btn.dataset.idx, 10);
    const toIdx = act === "up" ? idx - 1 : idx + 1;
    await api("/api/reports/items/reorder", {
      method: "POST",
      body: JSON.stringify({ fromIndex: idx, toIndex: toIdx }),
    });
  }
  loadReportItems();
});

function setReportUIEnabled(isEnabled) {
  addToReportBtn.disabled = !isEnabled;
  addToReportBtn.classList.toggle("opacity-50", !isEnabled);
  addToReportBtn.classList.toggle("cursor-not-allowed", !isEnabled);
  expressionSelect.disabled = !isEnabled;
  expressionSelect.classList.toggle("opacity-50", !isEnabled);
  reportHint.innerHTML = isEnabled
    ? t("report.hint")
    : t("report.hintDisabled");
}

// ─── File Manager ───────────────────────────────────────────────────
let selectedFile = null;

fileDropZone.addEventListener("click", () => fileInput.click());
fileDropZone.addEventListener("dragover", e => { e.preventDefault(); fileDropZone.classList.add("dragover"); });
fileDropZone.addEventListener("dragleave", () => fileDropZone.classList.remove("dragover"));
fileDropZone.addEventListener("drop", e => {
  e.preventDefault();
  fileDropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    selectedFile = e.dataTransfer.files[0];
    uploadBtn.disabled = false;
    fileDropZone.querySelector("span:last-child").textContent = selectedFile.name;
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    selectedFile = fileInput.files[0];
    uploadBtn.disabled = false;
    fileDropZone.querySelector("span:last-child").textContent = selectedFile.name;
  }
});

uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  uploadBtn.disabled = true;
  const fd = new FormData();
  fd.append("file", selectedFile);
  const result = await apiUpload("/api/files/upload", fd);
  if (result.error) {
    addLog(t("file.uploadFailed") + result.error, "info");
  } else {
    addLog(t("file.uploaded") + (result.original_name || selectedFile.name), "primary");
  }
  selectedFile = null;
  fileInput.value = "";
  fileDropZone.querySelector("span:last-child").textContent = t("file.dropHint");
  loadFiles();
});

async function loadFiles() {
  try {
    const files = await api("/api/files");
    renderFiles(files);
  } catch { renderFiles([]); }
}

function renderFiles(files) {
  fileList.innerHTML = "";
  if (!files || files.length === 0) {
    fileList.innerHTML = `<div class="text-xs text-slate-400 italic">${escapeHtml(t("file.noFiles"))}</div>`;
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

fileList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".file-del-btn");
  if (!btn) return;
  const fileId = btn.dataset.id;
  await api(`/api/files/${fileId}`, { method: "DELETE" });
  addLog(t("file.deleted"), "info");
  loadFiles();
});

// ─── Language change callback ───────────────────────────────────────
/** Called after toggleLang() to refresh dynamic UI parts. */
function onLangChanged() {
  setStatusUI();
  setReportUIEnabled(local.activeExpId === "electrostatics");
  // Re-mount current experiment to refresh labels
  mountExperiment(local.activeExpId);
}

// ─── Boot ───────────────────────────────────────────────────────────
async function boot() {
  try {
    // Apply stored language to DOM
    applyI18nDOM();

    await loadExperimentsList();
    await mountExperiment("electrostatics");
    loadReportItems();
    loadFiles();
    requestAnimationFrame(tick);
  } catch (err) {
    console.error("Boot error:", err);
    addLog(t("log.bootFailed"), "info");
  }
}

boot();
