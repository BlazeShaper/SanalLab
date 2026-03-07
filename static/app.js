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
const clPrevBtn = $("#clPrevBtn");
const clCalcBtn = $("#clCalcBtn");
const clStepDesc = $("#clStepDesc");
const clProgressDots = $("#clProgressDots");

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
    updateCoulombPreview();
    updateCoulombStep(data.state.currentStep || 1);
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

// ─── Coulomb's Law — client-side preview / input handling ───────────
const CL_K = 8.99e9;

function updateCoulombPreview() {
  const q1_val = parseFloat(clInputQ1.value) || 0;
  const q2_val = parseFloat(clInputQ2.value) || 0;
  const m1_val = parseFloat(clInputM1.value) || 10;
  const m2_val = parseFloat(clInputM2.value) || 10;
  const r_val = Math.max(5, Math.abs(parseFloat(clInputR.value) || 50));
  const t_val = parseFloat(clInputT.value) || 10;

  // Update badges
  if ($("#clValQ1")) $("#clValQ1").textContent = q1_val.toFixed(1);
  if ($("#clValQ2")) $("#clValQ2").textContent = q2_val.toFixed(1);
  if ($("#clValM1")) $("#clValM1").textContent = m1_val.toString();
  if ($("#clValM2")) $("#clValM2").textContent = m2_val.toString();
  if ($("#clValR")) $("#clValR").textContent = r_val.toString();
  if ($("#clValT")) $("#clValT").textContent = t_val.toString();

  // Convert to SI units for math
  const q1 = q1_val * 1e-6;
  const q2 = q2_val * 1e-6;
  const m1 = m1_val * 1e-3;
  const m2 = m2_val * 1e-3;
  const r  = r_val * 1e-2;
  const t  = t_val * 1e-3;

  const force = (q1 !== 0 && q2 !== 0) ? CL_K * Math.abs(q1 * q2) / (r * r) : 0;
  const a1 = m1 !== 0 ? force / Math.abs(m1) : 0;
  const a2 = m2 !== 0 ? force / Math.abs(m2) : 0;

  clForcePreview.textContent = force.toExponential(2) + " N";
  clAccel1.textContent = a1.toExponential(2) + " m/s²";
  clAccel2.textContent = a2.toExponential(2) + " m/s²";

  // Update sphere labels
  clQ1Label.textContent = (q1_val > 0 ? "+" : "") + q1_val.toFixed(1) + " µC";
  clQ2Label.textContent = (q2_val > 0 ? "+" : "") + q2_val.toFixed(1) + " µC";

  // --- Dynamic Visual Updates ---
  // 1. Distance Positioning (r_val: 5-100 -> span 10%-80%)
  const span = 10 + (r_val / 100) * 70;
  if ($("#clSphere1Rig")) $("#clSphere1Rig").style.left = `calc(50% - ${span/2}%)`;
  if ($("#clSphere2Rig")) $("#clSphere2Rig").style.left = `calc(50% + ${span/2}%)`;
  if ($("#clForceArrows")) $("#clForceArrows").style.width = `${span}%`;

  // 2. Charge Scaling
  const scale1 = 0.8 + (Math.abs(q1_val) / 10) * 0.5;
  const scale2 = 0.8 + (Math.abs(q2_val) / 10) * 0.5;
  clSphere1.style.transform = `scale(${scale1})`;
  clSphere2.style.transform = `scale(${scale2})`;

  // 3. Force Polarity and Colors
  const product = q1_val * q2_val;
  const color1 = q1_val > 0 ? "bg-primary text-white shadow-primary/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : (q1_val < 0 ? "bg-slate-600 text-white shadow-slate-600/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : "bg-slate-200 text-slate-500 shadow-none");
  const color2 = q2_val > 0 ? "bg-primary text-white shadow-primary/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : (q2_val < 0 ? "bg-slate-600 text-white shadow-slate-600/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]" : "bg-slate-200 text-slate-500 shadow-none");

  clSphere1.className = `size-14 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${color1}`;
  clSphere2.className = `size-14 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${color2}`;

  const leftArrow = $("#clForceArrowLeft");
  const rightArrow = $("#clForceArrowRight");
  
  if (q1_val === 0 || q2_val === 0) {
    clForceType.textContent = t("force.none") !== "force.none" ? t("force.none") : "No Force";
    if (leftArrow) leftArrow.style.opacity = 0;
    if (rightArrow) rightArrow.style.opacity = 0;
  } else {
    if (leftArrow) leftArrow.style.opacity = 0.8;
    if (rightArrow) rightArrow.style.opacity = 0.8;
    // Logarithmic scale for arrow size (1N -> scale 0.5, 360N -> scale 2.0 approx)
    const f_scale = Math.min(2.5, Math.max(0.6, 0.6 + Math.log10(force + 1) / 2));
    
    if (product < 0) {
      clForceType.textContent = t("force.attractive");
      if (leftArrow) leftArrow.style.transform = `scaleX(${f_scale}) scaleY(${f_scale})`;
      if (rightArrow) rightArrow.style.transform = `scaleX(${-f_scale}) scaleY(${f_scale})`;
    } else {
      clForceType.textContent = t("force.repulsive");
      if (leftArrow) leftArrow.style.transform = `scaleX(${-f_scale}) scaleY(${f_scale})`;
      if (rightArrow) rightArrow.style.transform = `scaleX(${f_scale}) scaleY(${f_scale})`;
    }
  }
}

function updateCoulombStep(step) {
  local.clStep = step;
  // Update progress dots
  $$("#clProgressDots .cl-dot").forEach(dot => {
    const ds = parseInt(dot.dataset.step, 10);
    dot.classList.toggle("bg-primary", ds <= step);
    dot.classList.toggle("bg-primary/30", ds > step);
  });
  // Update step description
  const stepKey = `exp.coulomb_law.step${step}`;
  const translated = t(stepKey);
  clStepDesc.textContent = translated !== stepKey ? translated : `Step ${step}`;
}

// Wire Coulomb's Law inputs for live preview
[clInputQ1, clInputQ2, clInputM1, clInputM2, clInputR, clInputT].forEach(inp => {
  inp.addEventListener("input", () => {
    updateCoulombPreview();
    // Also push the value to backend state
    const fieldMap = {
      clInputQ1: "q1", clInputQ2: "q2",
      clInputM1: "mass1", clInputM2: "mass2",
      clInputR: "distance", clInputT: "time",
    };
    const field = fieldMap[inp.id];
    const val = parseFloat(inp.value);
    if (field && !isNaN(val)) {
      api(`/api/experiments/coulomb_law/update`, {
        method: "POST",
        body: JSON.stringify({ field, value: val }),
      });
    }
  });
});

// Coulomb's Law buttons
clCalcBtn.addEventListener("click", async () => {
  const data = await api(`/api/experiments/coulomb_law/action`, {
    method: "POST",
    body: JSON.stringify({ action: "calculate" }),
  });
  if (data.computed) {
    clForcePreview.textContent = data.computed.forceFormatted || "0 N";
    clAccel1.textContent = data.computed.a1Formatted || "0 m/s²";
    clAccel2.textContent = data.computed.a2Formatted || "0 m/s²";
  }
  if (data.log) addLog(t(data.log) !== data.log ? t(data.log) : data.log, "primary");
  // Advance step
  const nextData = await api(`/api/experiments/coulomb_law/action`, {
    method: "POST",
    body: JSON.stringify({ action: "nextStep" }),
  });
  if (nextData.state) updateCoulombStep(nextData.state.currentStep);
});

clPrevBtn.addEventListener("click", async () => {
  const data = await api(`/api/experiments/coulomb_law/action`, {
    method: "POST",
    body: JSON.stringify({ action: "prevStep" }),
  });
  if (data.state) updateCoulombStep(data.state.currentStep);
});

// Progress dot clicks
if (clProgressDots) {
  clProgressDots.addEventListener("click", async (e) => {
    const dot = e.target.closest(".cl-dot");
    if (!dot) return;
    const step = parseInt(dot.dataset.step, 10);
    const data = await api(`/api/experiments/coulomb_law/action`, {
      method: "POST",
      body: JSON.stringify({ action: "setStep", params: { step } }),
    });
    if (data.state) updateCoulombStep(data.state.currentStep);
  });
}

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
