/**
 * Interactive Physics Lab — Frontend Logic
 * Electrostatics Stage
 * Communicates exclusively with FastAPI backend for all state mutations.
 */

// ─── DOM Refs ────────────────────────────────────────────────────────
const controlsMount = $("#controlsMount");
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
const pauseBtn = $("#pauseBtn");
const pauseIcon = $("#pauseIcon");
const pauseText = $("#pauseText");
const resetBtn = $("#resetBtn");
const learningSummary = $("#learningSummary");
const coreConcepts = $("#coreConcepts");

// ─── App State (client-side mirror) ──────────────────────────────────
const local = {
  running: true,
  // animation
  glassAngleDeg: 2,
  plasticAngleDeg: -2,
  glassVel: 0,
  plasticVel: 0,
  glassTarget: 2,
  plasticTarget: -2,

  showCharges: true,
  showForces: false,
};

// ─── Readouts ────────────────────────────────────────────────────────
function applyComputed(computed) {
  if (!computed) return;

  if (forceReadout) forceReadout.textContent = computed.forceFormatted || "0.000 N";
  if (q1Readout) q1Readout.textContent = computed.q1Formatted || "+0.0 µC";
  if (q2Readout) q2Readout.textContent = computed.q2Formatted || "0.0 µC";

  if (forceLabel) {
    const flKey = computed.forceLabel || "";
    forceLabel.textContent = t(flKey) !== flKey ? t(flKey) : flKey;
  }

  local.glassTarget = computed.glassTarget ?? 2;
  local.plasticTarget = computed.plasticTarget ?? -2;
  local.showCharges = computed.showCharges ?? true;
  local.showForces = computed.showForces ?? false;

  $$(".charge-symbol").forEach(el => { el.style.display = local.showCharges ? "" : "none"; });
  if (forceGroup) forceGroup.style.display = local.showForces ? "flex" : "none";
}

// ─── Status ──────────────────────────────────────────────────────────
function setStatusUI() {
  if (local.running) {
    if (statusText) statusText.textContent = t("status.running") !== "status.running" ? t("status.running") : "Simülasyon: Çalışıyor";
    if (statusPing) statusPing.classList.remove("hidden");
    if (pauseIcon) pauseIcon.textContent = "pause_circle";
    if (pauseText) pauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";
  } else {
    if (statusText) statusText.textContent = t("status.paused") !== "status.paused" ? t("status.paused") : "Duraklatıldı";
    if (statusPing) statusPing.classList.add("hidden");
    if (pauseIcon) pauseIcon.textContent = "play_circle";
    if (pauseText) pauseText.textContent = t("btn.run") !== "btn.run" ? t("btn.run") : "Devam";
  }
}

// ─── Controls rendering (from schema) ────────────────────────────────
function renderControls(schema) {
  if (!controlsMount) return;
  controlsMount.innerHTML = "";
  if (!schema || !schema.length) {
    controlsMount.innerHTML = `
      <div class="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <div class="text-sm font-bold">${escapeHtml(t("controls.noControls") !== "controls.noControls" ? t("controls.noControls") : "Kontrol Yok")}</div>
        <div class="text-xs text-slate-500 mt-1">${escapeHtml(t("controls.noControlsDesc") !== "controls.noControlsDesc" ? t("controls.noControlsDesc") : "Bu deney için kontrol bulunmuyor.")}</div>
      </div>`;
    return;
  }

  let html = "";
  for (const c of schema) {
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

  $$(".exp-action-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const data = await api(`/api/experiments/electrostatics/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (data.log && typeof addLog === "function") 
        addLog(t(data.log) !== data.log ? t(data.log) : data.log, "primary");
      applyComputed(data.computed);
    });
  });

  $$(".ctrl-slider").forEach(sl => {
    sl.addEventListener("input", async () => {
      const field = sl.dataset.field;
      const value = parseFloat(sl.value);
      const badge = $(`#badge_${sl.id.replace("slider_", "")}`);
      if (badge) badge.textContent = `${value.toFixed(1)}${sl.dataset.unit || ""}`;

      const data = await api(`/api/experiments/electrostatics/update`, {
        method: "POST",
        body: JSON.stringify({ field, value }),
      });
      applyComputed(data.computed);
    });
  });

  $$(".ctrl-toggle").forEach(tg => {
    tg.addEventListener("change", async () => {
      const field = tg.dataset.field;
      const value = tg.checked;
      const data = await api(`/api/experiments/electrostatics/update`, {
        method: "POST",
        body: JSON.stringify({ field, value }),
      });
      applyComputed(data.computed);
    });
  });

  $$(".ctrl-ninput").forEach(ni => {
    const field = ni.dataset.field;
    if (currentState && field in currentState) ni.value = currentState[field];
    ni.addEventListener("input", async () => {
      const val = parseFloat(ni.value);
      if (isNaN(val)) return;
      const data = await api(`/api/experiments/electrostatics/update`, {
        method: "POST",
        body: JSON.stringify({ field, value: val }),
      });
      applyComputed(data.computed);
    });
  });
}

// ─── Learning panel ──────────────────────────────────────────────────
function renderLearning(learning) {
  if (!learningSummary) return;
  if (!learning || !learning.summary) {
    learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(t("learning.placeholder") !== "learning.placeholder" ? t("learning.placeholder") : "Deney seçildi.")}</p>`;
    coreConcepts.innerHTML = "";
    return;
  }

  const summaryKey = learning.summary;
  const translated = t(summaryKey);
  learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${translated !== summaryKey ? translated : learning.summary}</p>`;

  if (coreConcepts) {
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
}

// ─── Global controls ─────────────────────────────────────────────────
if (pauseBtn) {
  pauseBtn.addEventListener("click", async () => {
    const data = await api(`/api/experiments/electrostatics/action`, {
      method: "POST",
      body: JSON.stringify({ action: "togglePause" }),
    });
    if (data.state) local.running = data.state.running !== false;
    if (data.log && typeof addLog === "function") {
      const logKey = data.log;
      addLog(t(logKey) !== logKey ? t(logKey) : logKey, "info");
    }
    setStatusUI();
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const data = await api(`/api/experiments/electrostatics/action`, {
      method: "POST",
      body: JSON.stringify({ action: "reset" }),
    });
    if (data.log && typeof addLog === "function") {
      const logKey = data.log;
      addLog(t(logKey) !== logKey ? t(logKey) : logKey, "info");
    }
    applyComputed(data.computed);

    local.glassAngleDeg = 2; local.plasticAngleDeg = -2;
    local.glassVel = 0; local.plasticVel = 0;
    local.running = true;
    setStatusUI();
    wireControls(data.state || {});
  });
}

// ─── Animation loop (client-side spring physics) ─────────────────────
let lastT = performance.now();
function tick(frameT) {
  const dt = Math.min(0.05, (frameT - lastT) / 1000);
  lastT = frameT;

  if (local.running && glassRig && plasticRig) {
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

// ─── Language change callback & Boot ─────────────────────────────────
function onLangChanged() {
  const nameKey = "exp.electrostatics.title";
  if (activeExperimentName) activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : "Elektriklenme";
}
window.onLangChanged = onLangChanged;

async function bootElectrostatics() {
  if (typeof window.initShared === "function") window.initShared();

  try {
    const data = await api(`/api/experiments/electrostatics`);
    const nameKey = data.name || "electrostatics";
  
    if (activeExperimentName) activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : "Elektriklenme";
  
    renderControls(data.controls || []);
    wireControls(data.state || {});
    renderLearning(data.learning || {});
    applyComputed(data.computed || {});
  
    local.glassAngleDeg = 2; local.plasticAngleDeg = -2;
    local.glassVel = 0; local.plasticVel = 0;
  
    if (data.state) {
      local.running = data.state.running !== false;
    }
    setStatusUI();
  
    if (typeof addLog === "function") addLog(t("log.expLoaded") + (t(nameKey) !== nameKey ? t(nameKey) : "Elektriklenme"), "info");
    
    requestAnimationFrame(tick);
  } catch (err) {
    console.error("Boot error:", err);
  }
}

document.addEventListener("DOMContentLoaded", bootElectrostatics);
