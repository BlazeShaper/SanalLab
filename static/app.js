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

// ─── DOM Refs ───────────────────────────────────────────────────────
const controlsMount       = $("#controlsMount");
const placeholderOverlay   = $("#placeholderOverlay");
const activeExperimentName = $("#activeExperimentName");
const statusText           = $("#statusText");
const statusPing           = $("#statusPing");
const glassRig             = $("#glassRig");
const plasticRig           = $("#plasticRig");
const forceGroup           = $("#forceGroup");
const forceLabel           = $("#forceLabel");
const forceReadout         = $("#forceReadout");
const q1Readout            = $("#q1Readout");
const q2Readout            = $("#q2Readout");
const logList              = $("#logList");
const pauseBtn             = $("#pauseBtn");
const pauseIcon            = $("#pauseIcon");
const pauseText            = $("#pauseText");
const resetBtn             = $("#resetBtn");
const expMenuBtn           = $("#expMenuBtn");
const expMenuList          = $("#expMenuList");
const expMenuItems         = $("#expMenuItems");
const learningSummary      = $("#learningSummary");
const coreConcepts         = $("#coreConcepts");
const addToReportBtn       = $("#addToReportBtn");
const exportReportBtn      = $("#exportReportBtn");
const reportItemsList      = $("#reportItemsList");
const reportTitleInput     = $("#reportTitleInput");
const expressionSelect     = $("#expressionSelect");
const reportHint           = $("#reportHint");

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
  q1Readout.textContent    = computed.q1Formatted || "+0.0 µC";
  q2Readout.textContent    = computed.q2Formatted || "0.0 µC";
  forceLabel.textContent   = computed.forceLabel || "";

  local.glassTarget   = computed.glassTarget ?? 2;
  local.plasticTarget = computed.plasticTarget ?? -2;
  local.showCharges   = computed.showCharges ?? true;
  local.showForces    = computed.showForces ?? false;

  $(".charge-symbol", undefined)  // handled below
  $$(".charge-symbol").forEach(el => { el.style.display = local.showCharges ? "" : "none"; });
  forceGroup.style.display = local.showForces ? "flex" : "none";
}

// ─── Status ─────────────────────────────────────────────────────────
function setStatusUI() {
  if (local.running) {
    statusText.textContent = "Simulation: Running";
    statusPing.classList.remove("hidden");
    pauseIcon.textContent = "pause_circle";
    pauseText.textContent = "Pause";
  } else {
    statusText.textContent = "Simulation: Paused";
    statusPing.classList.add("hidden");
    pauseIcon.textContent = "play_circle";
    pauseText.textContent = "Run";
  }
}

// ─── Controls rendering (from schema) ───────────────────────────────
function renderControls(schema) {
  controlsMount.innerHTML = "";
  if (!schema || !schema.length) {
    controlsMount.innerHTML = `
      <div class="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <div class="text-sm font-bold">No controls available</div>
        <div class="text-xs text-slate-500 mt-1">This experiment is a placeholder module.</div>
      </div>`;
    return;
  }

  let html = "";
  for (const c of schema) {
    if (c.type === "button") {
      html += `
        <button data-action="${c.action}"
          class="exp-action-btn w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-primary/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all text-left group">
          <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">${c.icon || "play_arrow"}</span>
          <span class="text-sm font-medium">${escapeHtml(c.label)}</span>
        </button>`;
    } else if (c.type === "slider") {
      html += `
        <div class="pt-4 px-1">
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-semibold">${escapeHtml(c.label)}</label>
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
            <span class="text-sm font-medium">${escapeHtml(c.label)}</span>
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
      if (data.log) addLog(data.log, "primary");
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
    learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">Placeholder module. Switch to Electrostatics for content.</p>`;
    coreConcepts.innerHTML = "";
    return;
  }
  learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${learning.summary}</p>`;

  coreConcepts.innerHTML = (learning.concepts || []).map(c => `
    <div class="flex gap-3">
      <div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
        <span class="text-[10px] font-bold">${c.num}</span>
      </div>
      <div>
        <h4 class="text-sm font-bold">${escapeHtml(c.title)}</h4>
        <p class="text-xs text-slate-500">${escapeHtml(c.desc)}</p>
      </div>
    </div>
  `).join("");
}

// ─── Experiment switching ───────────────────────────────────────────
async function mountExperiment(expId) {
  local.activeExpId = expId;
  const data = await api(`/api/experiments/${expId}`);

  activeExperimentName.textContent = data.name || expId;
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
  addLog("Experiment loaded: " + (data.name || expId), "info");

  expMenuList.classList.add("hidden");
}

// ─── Experiments dropdown ───────────────────────────────────────────
async function loadExperimentsList() {
  local.experiments = await api("/api/experiments");
  expMenuItems.innerHTML = local.experiments.map(e => `
    <button data-exp="${e.id}"
      class="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm font-semibold">
      ${escapeHtml(e.name)}
    </button>`).join("");
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
  if (data.log) addLog(data.log, "info");
  setStatusUI();
});

resetBtn.addEventListener("click", async () => {
  const data = await api(`/api/experiments/${local.activeExpId}/action`, {
    method: "POST",
    body: JSON.stringify({ action: "reset" }),
  });
  if (data.log) addLog(data.log, "info");
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
function tick(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  if (local.running && local.activeExpId === "electrostatics") {
    const stiffness = 18, damping = 10;

    const gAcc = stiffness * (local.glassTarget - local.glassAngleDeg) - damping * local.glassVel;
    local.glassVel += gAcc * dt;
    local.glassAngleDeg += local.glassVel * dt;

    const pAcc = stiffness * (local.plasticTarget - local.plasticAngleDeg) - damping * local.plasticVel;
    local.plasticVel += pAcc * dt;
    local.plasticAngleDeg += local.plasticVel * dt;

    glassRig.style.transform   = `rotate(${local.glassAngleDeg}deg)`;
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
        No saved expressions yet. Add one using the button above.
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
    addLog("Report capture available in Electrostatics only.", "info");
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
  addLog(`Saved to report: ${payload.label}`, "info");
  loadReportItems();
});

exportReportBtn.addEventListener("click", () => {
  const title = encodeURIComponent(reportTitleInput.value || "Interactive Physics Lab Report");
  window.location.href = `/api/reports/export/html?title=${title}`;
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
    ? `Tip: Export sonrası dosyayı açıp tarayıcıdan <b>Print → Save as PDF</b> ile PDF alabilirsin.`
    : `Report capture is disabled in placeholder modules. Switch to <b>Electrostatics</b>.`;
}

// ─── Boot ───────────────────────────────────────────────────────────
async function boot() {
  await loadExperimentsList();
  await mountExperiment("electrostatics");
  loadReportItems();
  requestAnimationFrame(tick);
}

boot();
