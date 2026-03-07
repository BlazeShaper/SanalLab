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

// Experiment stages
const electrostaticsStage = $("#electrostaticsStage");
const coulombLawStage = $("#coulombLawStage");

// Coulomb's Law DOM refs
const clInputQ1 = $("#clInputQ1");
const clInputQ2 = $("#clInputQ2");
const clInputM1 = $("#clInputM1");
const clInputM2 = $("#clInputM2");
const clInputR = $("#clInputR");
const clInputT = $("#clInputT");
const clForcePreview = $("#clForcePreview");
const clAccel1 = $("#clAccel1");
const clAccel2 = $("#clAccel2");
const clQ1Label = $("#clQ1Label");
const clQ2Label = $("#clQ2Label");
const clForceType = $("#clForceType");
const clSphere1 = $("#clSphere1");
const clSphere2 = $("#clSphere2");

// New Coulomb Simulation DOM refs
const clHudTime = $("#clHudTime");
const clHudDist = $("#clHudDist");
const clHudVel1 = $("#clHudVel1");
const clHudVel2 = $("#clHudVel2");
const clConsQ1 = $("#clConsQ1");
const clConsQ2 = $("#clConsQ2");
const clConsTotal = $("#clConsTotal");
const clConservedBadge = $("#clConservedBadge");
const clSimStartBtn = $("#clSimStartBtn");
const clSimStartIcon = $("#clSimStartIcon");
const clSimStartText = $("#clSimStartText");
const clSimResetBtn = $("#clSimResetBtn");

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
    } else if (c.type === "number_input") {
      html += `
        <div class="flex flex-col gap-1 pt-2">
          <label class="text-xs font-semibold text-slate-500">${escapeHtml(label)}</label>
          <input data-field="${c.field}" id="ninput_${c.id}"
            class="ctrl-ninput bg-white dark:bg-slate-800 border border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-xs p-2 font-mono"
            placeholder="${c.placeholder || ""}" type="text" />
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

  // Number inputs (sidebar)
  $$(".ctrl-ninput").forEach(ni => {
    const field = ni.dataset.field;
    if (currentState && field in currentState) ni.value = currentState[field];
  });
  $$(".ctrl-ninput").forEach(ni => {
    ni.addEventListener("input", async () => {
      const field = ni.dataset.field;
      const val = parseFloat(ni.value);
      if (isNaN(val)) return;
      // Sync with center stage inputs
      const syncMap = { q1: clInputQ1, q2: clInputQ2, mass1: clInputM1, mass2: clInputM2, distance: clInputR, time: clInputT };
      if (syncMap[field]) { syncMap[field].value = ni.value; updateCoulombPreview(); }
      const data = await api(`/api/experiments/${local.activeExpId}/update`, {
        method: "POST",
        body: JSON.stringify({ field, value: val }),
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

// ─── Stage switching ────────────────────────────────────────────────
function showStage(expId) {
  // Hide all experiment stages
  electrostaticsStage.classList.add("hidden");
  coulombLawStage.classList.add("hidden");

  if (expId === "coulomb_law") {
    coulombLawStage.classList.remove("hidden");
  } else {
    electrostaticsStage.classList.remove("hidden");
  }
}

// ─── Experiment switching ───────────────────────────────────────────
async function mountExperiment(expId) {
  local.activeExpId = expId;
  const data = await api(`/api/experiments/${expId}`);

  // Translate experiment name via key
  const nameKey = data.name || expId;
  activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : nameKey;
  placeholderOverlay.classList.toggle("hidden", !!data.implemented);

  // Show correct stage
  showStage(expId);

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
  setReportUIEnabled(expId === "electrostatics" || expId === "coulomb_law");

  // Coulomb's Law specific init
  if (expId === "coulomb_law" && data.state) {
    clInputQ1.value = data.state.q1 ?? 5.0;
    clInputQ2.value = data.state.q2 ?? -5.0;
    clInputM1.value = data.state.mass1 ?? 10.0;
    clInputM2.value = data.state.mass2 ?? 10.0;
    clInputR.value = data.state.distance ?? 50.0;
    clInputT.value = data.state.time ?? 10.0;
    initCoulombSim();
  }

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

// ─── Coulomb's Law Real-Time Simulation ─────────────────────────────
const CL_K = 8.99e9;
const CL_RADIUS = 0.05; // 5cm visual radius for collision

let clSimState = {
  running: false,
  t: 0,
  targetT: 10,
  q1: 0, q2: 0,
  m1: 10, m2: 10,
  p1: -0.25, p2: 0.25, // meters
  v1: 0, v2: 0,
  totalQ: 0,
  collided: false,
  r0: 0.5
};

function initCoulombSim() {
  clSimState.running = false;
  clSimState.t = 0;
  clSimState.collided = false;
  if(clSimStartIcon) clSimStartIcon.textContent = "play_arrow";
  if(clSimStartText) clSimStartText.textContent = t("exp.coulomb_law.startSim") !== "exp.coulomb_law.startSim" ? t("exp.coulomb_law.startSim") : "Start Sim";

  clSimState.q1 = (parseFloat(clInputQ1.value) || 0) * 1e-6;
  clSimState.q2 = (parseFloat(clInputQ2.value) || 0) * 1e-6;
  clSimState.m1 = (parseFloat(clInputM1.value) || 10) * 1e-3;
  clSimState.m2 = (parseFloat(clInputM2.value) || 10) * 1e-3;
  clSimState.r0 = Math.max(0.05, Math.abs(parseFloat(clInputR.value) || 50) * 1e-2);
  clSimState.targetT = Math.max(0.1, parseFloat(clInputT.value) || 10);

  clSimState.p1 = -clSimState.r0 / 2;
  clSimState.p2 = clSimState.r0 / 2;
  clSimState.v1 = 0;
  clSimState.v2 = 0;
  clSimState.totalQ = clSimState.q1 + clSimState.q2;

  // Update badges in UI form
  if ($("#clValQ1")) $("#clValQ1").textContent = (clSimState.q1 * 1e6).toFixed(1);
  if ($("#clValQ2")) $("#clValQ2").textContent = (clSimState.q2 * 1e6).toFixed(1);
  if ($("#clValM1")) $("#clValM1").textContent = (clSimState.m1 * 1e3).toFixed(1);
  if ($("#clValM2")) $("#clValM2").textContent = (clSimState.m2 * 1e3).toFixed(1);
  if ($("#clValR")) $("#clValR").textContent = (clSimState.r0 * 100).toFixed(1);
  if ($("#clValT")) $("#clValT").textContent = clSimState.targetT.toFixed(1);

  renderCoulombHUD();
}

function renderCoulombHUD() {
  const r = Math.abs(clSimState.p2 - clSimState.p1);
  let F = 0;
  if (r > 0.001) F = CL_K * Math.abs(clSimState.q1 * clSimState.q2) / (r * r);

  if (clHudTime) clHudTime.textContent = clSimState.t.toFixed(2) + " s";
  if (clHudDist) clHudDist.textContent = (r * 100).toFixed(1) + " cm";
  if (clForcePreview) clForcePreview.textContent = F.toExponential(2) + " N";
  if (clHudVel1) clHudVel1.textContent = clSimState.v1.toFixed(3) + " m/s";
  if (clHudVel2) clHudVel2.textContent = clSimState.v2.toFixed(3) + " m/s";
  if (clAccel1) clAccel1.textContent = (clSimState.m1 ? (F / clSimState.m1) : 0).toExponential(2) + " m/s²";
  if (clAccel2) clAccel2.textContent = (clSimState.m2 ? (F / clSimState.m2) : 0).toExponential(2) + " m/s²";

  // Conservation Panel
  if (clConsQ1) clConsQ1.textContent = (clSimState.q1 * 1e6).toFixed(2) + " µC";
  if (clConsQ2) clConsQ2.textContent = (clSimState.q2 * 1e6).toFixed(2) + " µC";
  if (clConsTotal) clConsTotal.textContent = (clSimState.totalQ * 1e6).toFixed(2) + " µC";

  // Visuals - map 1 meter to 80% screen width (span = 80 * pos)
  const left1 = 50 + (clSimState.p1 * 80);
  const left2 = 50 + (clSimState.p2 * 80);
  
  if (clSphere1Rig) clSphere1Rig.style.left = `${left1}%`;
  if (clSphere2Rig) clSphere2Rig.style.left = `${left2}%`;
  
  // Force Arrows visually centered between them
  if (clForceArrows) {
     clForceArrows.style.left = `${Math.min(left1, left2)}%`;
     clForceArrows.style.width = `${Math.abs(left2 - left1)}%`;
  }

  // Charge scaling and colors
  const scale1 = 0.8 + (Math.abs(clSimState.q1 * 1e6) / 10) * 0.5;
  const scale2 = 0.8 + (Math.abs(clSimState.q2 * 1e6) / 10) * 0.5;
  if (clSphere1) clSphere1.style.transform = `scale(${scale1})`;
  if (clSphere2) clSphere2.style.transform = `scale(${scale2})`;
  
  if (clQ1Label) clQ1Label.textContent = (clSimState.q1 > 0 ? "+" : "") + (clSimState.q1 * 1e6).toFixed(1) + " µC";
  if (clQ2Label) clQ2Label.textContent = (clSimState.q2 > 0 ? "+" : "") + (clSimState.q2 * 1e6).toFixed(1) + " µC";

  const colorCls = (q) => q > 0 ? "bg-primary text-white shadow-primary/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : (q < 0 ? "bg-slate-600 text-white shadow-slate-600/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : "bg-slate-200 text-slate-500 shadow-none");
  if (clSphere1) clSphere1.className = `size-14 rounded-full flex items-center justify-center font-bold transition-colors duration-150 ${colorCls(clSimState.q1)}`;
  if (clSphere2) clSphere2.className = `size-14 rounded-full flex items-center justify-center font-bold transition-colors duration-150 ${colorCls(clSimState.q2)}`;

  // Arrow rendering logic
  const leftArrow = $("#clForceArrowLeft");
  const rightArrow = $("#clForceArrowRight");
  if (clSimState.q1 === 0 || clSimState.q2 === 0) {
    if (clForceType) clForceType.textContent = "—";
    if (leftArrow) leftArrow.style.opacity = 0;
    if (rightArrow) rightArrow.style.opacity = 0;
  } else {
    if (leftArrow) leftArrow.style.opacity = 0.8;
    if (rightArrow) rightArrow.style.opacity = 0.8;
    const f_scale = Math.min(2.5, Math.max(0.6, 0.6 + Math.log10(F + 1) / 2));
    const product = clSimState.q1 * clSimState.q2;
    if (product < 0) {
      if (clForceType) clForceType.textContent = t("force.attractive") !== "force.attractive" ? t("force.attractive") : "Elektrostatik Çekme";
      if (leftArrow) leftArrow.style.transform = `scaleX(${f_scale}) scaleY(${f_scale})`;
      if (rightArrow) rightArrow.style.transform = `scaleX(${-f_scale}) scaleY(${f_scale})`;
    } else {
      if (clForceType) clForceType.textContent = t("force.repulsive") !== "force.repulsive" ? t("force.repulsive") : "Elektrostatik İtme";
      if (leftArrow) leftArrow.style.transform = `scaleX(${-f_scale}) scaleY(${f_scale})`;
      if (rightArrow) rightArrow.style.transform = `scaleX(${f_scale}) scaleY(${f_scale})`;
    }
  }
}

function clPhysicsStep(dt) {
  if (!clSimState.running) return;
  if (clSimState.t >= clSimState.targetT) {
    clSimState.running = false;
    if(clSimStartIcon) clSimStartIcon.textContent = "replay";
    if(clSimStartText) clSimStartText.textContent = t("btn.reset") !== "btn.reset" ? t("btn.reset") : "Done";
    addLog("Simülasyon tamamlandı.", "info");
    return;
  }

  // Multiply visual dt by speed multiplier or run multiple substeps
  const substeps = 10;
  const subDt = dt / substeps;

  for (let i = 0; i < substeps; i++) {
    clSimState.t += subDt;
    let r = Math.abs(clSimState.p2 - clSimState.p1);

    // Collision & Conservation Check
    if (r <= CL_RADIUS && !clSimState.collided) {
      // Inelastic collision momentum transfer
      const totalP = clSimState.m1 * clSimState.v1 + clSimState.m2 * clSimState.v2;
      const v_final = totalP / (clSimState.m1 + clSimState.m2);
      clSimState.v1 = v_final;
      clSimState.v2 = v_final;

      // Charge redistribution (Conservation of Charge)
      const newQ = (clSimState.q1 + clSimState.q2) / 2;
      clSimState.q1 = newQ;
      clSimState.q2 = newQ;
      clSimState.collided = true;
      
      // Bump the position slightly so they don't get stuck
      const midpoint = (clSimState.p1 + clSimState.p2) / 2;
      clSimState.p1 = midpoint - (CL_RADIUS / 2.01);
      clSimState.p2 = midpoint + (CL_RADIUS / 2.01);

      // Flash conservation badge
      if (clConservedBadge) {
        clConservedBadge.classList.replace("bg-green-500", "bg-indigo-500");
        clConservedBadge.classList.add("scale-125", "shadow-lg");
        setTimeout(() => {
          clConservedBadge.classList.replace("bg-indigo-500", "bg-green-500");
          clConservedBadge.classList.remove("scale-125", "shadow-lg");
        }, 500);
      }
      addLog(`Yük Korundu! Aktarım tamamlandı.`, "primary");
    }

    // Forces
    r = Math.max(CL_RADIUS, Math.abs(clSimState.p2 - clSimState.p1));
    const F = CL_K * Math.abs(clSimState.q1 * clSimState.q2) / (r * r);
    
    // Direction logic 
    const dir1To2 = Math.sign(clSimState.p2 - clSimState.p1) || 1;
    const attract = (clSimState.q1 * clSimState.q2) < 0;

    const F1 = attract ? F * dir1To2 : -F * dir1To2;
    const F2 = attract ? -F * dir1To2 : F * dir1To2;

    clSimState.v1 += (F1 / clSimState.m1) * subDt;
    clSimState.v2 += (F2 / clSimState.m2) * subDt;
    clSimState.p1 += clSimState.v1 * subDt;
    clSimState.p2 += clSimState.v2 * subDt;
    
    // Hard boundaries (-0.5m to +0.5m) to prevent them flying off screen entirely
    if (clSimState.p1 < -0.6) { clSimState.p1 = -0.6; clSimState.v1 *= -0.5; }
    if (clSimState.p1 > 0.6) { clSimState.p1 = 0.6; clSimState.v1 *= -0.5; }
    if (clSimState.p2 < -0.6) { clSimState.p2 = -0.6; clSimState.v2 *= -0.5; }
    if (clSimState.p2 > 0.6) { clSimState.p2 = 0.6; clSimState.v2 *= -0.5; }
  }
  
  renderCoulombHUD();
}

// Input wiring: If not running, typing/sliding updates start configuration directly
[clInputQ1, clInputQ2, clInputM1, clInputM2, clInputR, clInputT].forEach(inp => {
  if (inp) inp.addEventListener("input", () => {
    if (!clSimState.running && clSimState.t === 0) {
      initCoulombSim(); 
      // Optionally notify backend for sync if needed, but not strictly required for local sim
      const val = parseFloat(inp.value);
      if (!isNaN(val)) api(`/api/experiments/coulomb_law/update`, { method: "POST", body: JSON.stringify({ field: inp.id.replace('clInput', '').toLowerCase(), value: val }) });
    }
  });
});

if (clSimStartBtn) {
  clSimStartBtn.addEventListener("click", () => {
    if (clSimState.t >= clSimState.targetT) {
      initCoulombSim();
      clSimState.running = true;
    } else {
      clSimState.running = !clSimState.running;
    }
    clSimStartIcon.textContent = clSimState.running ? "pause" : "play_arrow";
    clSimStartText.textContent = clSimState.running ? (t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat") : (t("btn.run") !== "btn.run" ? t("btn.run") : "Devam");
  });
}

if (clSimResetBtn) {
  clSimResetBtn.addEventListener("click", () => {
    initCoulombSim();
  });
}

// ─── Animation loop (client-side spring physics for smooth visuals) ─
let lastT = performance.now();
function tick(frameT) {
  const dt = Math.min(0.05, (frameT - lastT) / 1000);
  lastT = frameT;

  if (local.activeExpId === "coulomb_law") {
     clPhysicsStep(dt);
  }

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
  if (local.activeExpId !== "electrostatics" && local.activeExpId !== "coulomb_law") {
    addLog(t("log.reportOnly"), "info");
    return;
  }

  // grab current computed values from server
  const snap = await api(`/api/experiments/${local.activeExpId}/compute`);
  const st = snap.state || {};
  const comp = snap.computed || {};

  let payload;
  if (local.activeExpId === "coulomb_law") {
    payload = {
      expression: "coulomb",
      label: "Coulomb's Law: F = k·|q₁·q₂|/r²",
      q1: st.q1 || 0,
      q2: st.q2 || 0,
      r: st.distance || 1,
      force: comp.force || 0,
    };
  } else {
    payload = {
      expression: expressionSelect.value,
      label: expressionSelect.options[expressionSelect.selectedIndex]?.text || "Coulomb's Law",
      q1: st.glassChargeMicroC || 0,
      q2: st.plasticChargeMicroC || 0,
      r: st.distanceMeters || 1,
      force: comp.force || 0,
    };
  }

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

function onLangChangedCoulomb() {
  if (local.activeExpId === "coulomb_law") {
    updateCoulombPreview();
    updateCoulombStep(local.clStep || 1);
  }
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
  setReportUIEnabled(local.activeExpId === "electrostatics" || local.activeExpId === "coulomb_law");
  onLangChangedCoulomb();
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
