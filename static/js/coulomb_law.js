/**
 * Interactive Physics Lab — Coulomb's Law Stage Logic
 * Handles real-time kinematics simulation and UI interactions specifically for this experiment.
 */

// ─── DOM Refs — Coulomb Simulator ───────────────────────────────────
const clInputQ1   = $("#clInputQ1");
const clInputQ2   = $("#clInputQ2");
const clInputM1   = $("#clInputM1");
const clInputM2   = $("#clInputM2");
const clInputR    = $("#clInputR");
const clInputT    = $("#clInputT");

const clValQ1 = $("#clValQ1");
const clValQ2 = $("#clValQ2");
const clValM1 = $("#clValM1");
const clValM2 = $("#clValM2");
const clValR  = $("#clValR");
const clValT  = $("#clValT");

const clStartBtn  = $("#clStartBtn");
const clPauseBtn  = $("#clPauseBtn");
const clPauseIcon = $("#clPauseIcon");
const clPauseText = $("#clPauseText");
const clResetBtn  = $("#clResetBtn");
const clStatusMsg = $("#clStatusMsg");

const activeExperimentName = $("#activeExperimentName");
const statusText           = $("#statusText");
const statusPing           = $("#statusPing");
const forceReadout         = $("#forceReadout");
const q1Readout            = $("#q1Readout");
const q2Readout            = $("#q2Readout");

// Simulation canvas elements
const simSphere1Rig    = $("#simSphere1Rig");
const simSphere2Rig    = $("#simSphere2Rig");
const simSphere1       = $("#simSphere1");
const simSphere2       = $("#simSphere2");
const simQ1Label       = $("#simQ1Label");
const simQ2Label       = $("#simQ2Label");
const simArrows        = $("#simArrows");
const simArrowLeft     = $("#simArrowLeft");
const simArrowRight    = $("#simArrowRight");
const simDistRibbon    = $("#simDistRibbon");
const simDistLine      = $("#simDistLine");
const simDistLabel     = $("#simDistLabel");
const simElapsed       = $("#simElapsed");
const simForce         = $("#simForce");
const simDistance      = $("#simDistance");
const simA1 = $("#simA1"); const simA2 = $("#simA2");
const simV1 = $("#simV1"); const simV2 = $("#simV2");
const simS1 = $("#simS1"); const simS2 = $("#simS2");
const clForceTypeText  = $("#clForceTypeText");

// ─── Physics Constants & Geometry ─────────────────────────────────────
const CL_K = 8.99e9; // Coulomb constant N·m²/C²

const TRACK_LEFT_PCT  = 8;
const TRACK_RIGHT_PCT = 92;
let METERS_TO_PCT = 1;

// ─── Simulation State ─────────────────────────────────────────────────
const sim = {
  active:   false,
  paused:   false,
  done:     false,

  x1: 0, x2: 0,
  v1: 0, v2: 0,
  elapsed: 0,

  x1_0: 0, x2_0: 0,
  totalTime: 2,
  q1: 0, q2: 0,
  m1: 0, m2: 0,

  rafId: null,
  lastFrameTime: null,
};

// ─── Read Slider Values ────────────────────────────────────────────────
function readInputs() {
  return {
    q1_uC:  parseFloat(clInputQ1 ? clInputQ1.value : 0) || 0,
    q2_uC:  parseFloat(clInputQ2 ? clInputQ2.value : 0) || 0,
    m1_g:   parseFloat(clInputM1 ? clInputM1.value : 10) || 10,
    m2_g:   parseFloat(clInputM2 ? clInputM2.value : 10) || 10,
    r0_cm:  Math.max(5, parseFloat(clInputR ? clInputR.value : 50) || 50),
    t_s:    Math.max(0.5, parseFloat(clInputT ? clInputT.value : 2) || 2),
  };
}

// ─── Physics Engine ───────────────────────────────────────────────────
const SPHERE_DIAMETER = 0.04;

function coulombForceMag(q1, q2, r) {
  if (r < 1e-4) r = 1e-4; // prevent singularity
  return CL_K * Math.abs(q1 * q2) / (r * r);
}

function physicsStep(dt) {
  let r = Math.abs(sim.x2 - sim.x1);

  if (r <= SPHERE_DIAMETER) {
    const mx = (sim.x1 + sim.x2) / 2;
    if (sim.x1 < sim.x2) {
      sim.x1 = mx - SPHERE_DIAMETER / 2;
      sim.x2 = mx + SPHERE_DIAMETER / 2;
    } else {
      sim.x1 = mx + SPHERE_DIAMETER / 2;
      sim.x2 = mx - SPHERE_DIAMETER / 2;
    }
    r = SPHERE_DIAMETER;

    const CR = 0.8;
    const v1_new = ((sim.m1 - sim.m2) * sim.v1 + 2 * sim.m2 * sim.v2) / (sim.m1 + sim.m2);
    const v2_new = ((sim.m2 - sim.m1) * sim.v2 + 2 * sim.m1 * sim.v1) / (sim.m1 + sim.m2);
    sim.v1 = v1_new * CR;
    sim.v2 = v2_new * CR;

    const totalQ = sim.q1 + sim.q2;
    sim.q1 = totalQ / 2;
    sim.q2 = totalQ / 2;

    sim.chargeTransferred = true;
  }

  const F = coulombForceMag(sim.q1, sim.q2, r);

  const dx = sim.x1 - sim.x2; // 2'den 1'e vektör
  const signF = Math.sign(sim.q1 * sim.q2); // (+) itme, (-) çekme
  const forceDir = dx !== 0 ? Math.sign(dx) : (Math.random() < 0.5 ? 1 : -1); 
  
  const F1x = F * signF * forceDir;
  const F2x = -F1x;

  const a1 = (sim.m1 > 0) ? (F1x / sim.m1) : 0;
  const a2 = (sim.m2 > 0) ? (F2x / sim.m2) : 0;

  sim.v1 += a1 * dt;
  sim.v2 += a2 * dt;
  sim.x1 += sim.v1 * dt;
  sim.x2 += sim.v2 * dt;

  return { F, a1, a2, r };
}

// ─── Canvas Rendering ─────────────────────────────────────────────────
function metersToPercent(x, side) {
  if (side === 1) {
    return clamp(22 + (x - sim.x1_0) * METERS_TO_PCT, TRACK_LEFT_PCT, TRACK_RIGHT_PCT - 2);
  } else {
    return clamp(78 + (x - sim.x2_0) * METERS_TO_PCT, TRACK_LEFT_PCT + 2, TRACK_RIGHT_PCT);
  }
}

function renderFrame(F, a1, a2) {
  const left1  = metersToPercent(sim.x1, 1);
  const left2  = metersToPercent(sim.x2, 2);
  const spanPct = Math.max(0, left2 - left1);

  if (simSphere1Rig) simSphere1Rig.style.left = left1 + "%";
  if (simSphere2Rig) simSphere2Rig.style.left = left2 + "%";

  if (simArrows) {
    simArrows.style.left     = left1 + "%";
    simArrows.style.width    = spanPct + "%";
  }
  if (simDistRibbon) {
    simDistRibbon.style.left = left1 + "%";
    simDistRibbon.style.width = spanPct + "%";
  }

  const r_m  = Math.abs(sim.x2 - sim.x1);
  const r_cm = r_m * 100;
  if (simDistLabel) simDistLabel.textContent = "r = " + r_cm.toFixed(1) + " cm";

  if (simElapsed)  simElapsed.textContent  = sim.elapsed.toFixed(3) + " s";
  if (simForce)    simForce.textContent    = toSI(F) + " N";
  if (simDistance) simDistance.textContent = r_cm.toFixed(2) + " cm";

  if (forceReadout) forceReadout.textContent = toSI(F) + " N";

  const disp1 = sim.x1 - sim.x1_0;
  const disp2 = sim.x2 - sim.x2_0;
  if (simA1) simA1.textContent = toSI(Math.abs(a1)) + " m/s²";
  if (simA2) simA2.textContent = toSI(Math.abs(a2)) + " m/s²";
  if (simV1) simV1.textContent = toSI(Math.abs(sim.v1)) + " m/s";
  if (simV2) simV2.textContent = toSI(Math.abs(sim.v2)) + " m/s";
  if (simS1) simS1.textContent = toSI(Math.abs(disp1)) + " m";
  if (simS2) simS2.textContent = toSI(Math.abs(disp2)) + " m";
}

function toSI(v) {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1e3 || Math.abs(v) < 1e-3) return v.toExponential(3);
  return v.toFixed(4).replace(/\.?0+$/, "");
}

// ─── Simulation Loop ──────────────────────────────────────────────────
function simLoop(timestamp) {
  if (!sim.active || sim.paused || sim.done) return;

  if (!sim.lastFrameTime) sim.lastFrameTime = timestamp;
  let dt = (timestamp - sim.lastFrameTime) / 1000;
  sim.lastFrameTime = timestamp;

  dt = Math.min(dt, 0.05);

  const SUBSTEPS = 32;
  const subDt = dt / SUBSTEPS;
  let F = 0, a1 = 0, a2 = 0;
  
  sim.chargeTransferred = false;
  
  for (let i = 0; i < SUBSTEPS; i++) {
    const res = physicsStep(subDt);
    F = res.F; a1 = res.a1; a2 = res.a2;
  }
  
  if (sim.chargeTransferred) {
    const q1_uC = sim.q1 * 1e6;
    const q2_uC = sim.q2 * 1e6;
    updateSphereColors(q1_uC, q2_uC);
    updateSphereLabels(q1_uC, q2_uC);
    
    if (q1Readout) q1Readout.textContent = (q1_uC >= 0 ? "+" : "") + q1_uC.toFixed(1) + " µC";
    if (q2Readout) q2Readout.textContent = (q2_uC >= 0 ? "+" : "") + q2_uC.toFixed(1) + " µC";
    if (clInputQ1) clInputQ1.value = q1_uC.toFixed(1);
    if (clInputQ2) clInputQ2.value = q2_uC.toFixed(1);
    if (clValQ1) clValQ1.textContent = q1_uC.toFixed(1);
    if (clValQ2) clValQ2.textContent = q2_uC.toFixed(1);
    
    if (clForceTypeText) clForceTypeText.textContent = typeof t === "function" && t("force.repulsive") !== "force.repulsive" ? t("force.repulsive") : "İtme Kuvveti";
    updateArrowVisibility(true, false);
    
    if (typeof addLog === "function") {
      addLog(`Fiziksel Çarpışma! Yükler paylaşıldı: q₁=q₂=${q1_uC.toFixed(2)} µC`, "primary");
    }
  }

  sim.elapsed += dt;

  if (sim.elapsed >= sim.totalTime) {
    sim.elapsed = sim.totalTime;
    sim.done = true;
    renderFrame(F, a1, a2);
    onSimComplete();
    return;
  }

  renderFrame(F, a1, a2);
  sim.rafId = requestAnimationFrame(simLoop);
}

function onSimComplete() {
  sim.active = false;
  if (clPauseBtn) clPauseBtn.disabled = true;
  if (clStartBtn) clStartBtn.disabled = false;
  setSimStatus("done");
  if (typeof addLog === "function") 
    addLog("Simülasyon tamamlandı. t = " + sim.totalTime.toFixed(2) + " s", "primary");
}

// ─── Slider → Preview ─────────────────────────────────────
function updateSliderPreviews() {
  const inp = readInputs();

  if (clValQ1) clValQ1.textContent = inp.q1_uC.toFixed(1);
  if (clValQ2) clValQ2.textContent = inp.q2_uC.toFixed(1);
  if (clValM1) clValM1.textContent = inp.m1_g.toString();
  if (clValM2) clValM2.textContent = inp.m2_g.toString();
  if (clValR)  clValR.textContent  = inp.r0_cm.toString();
  if (clValT)  clValT.textContent  = inp.t_s.toFixed(1);

  updateSphereColors(inp.q1_uC, inp.q2_uC);
  updateSphereLabels(inp.q1_uC, inp.q2_uC);

  if (q1Readout) q1Readout.textContent = (inp.q1_uC >= 0 ? "+" : "") + inp.q1_uC.toFixed(1) + " µC";
  if (q2Readout) q2Readout.textContent = (inp.q2_uC >= 0 ? "+" : "") + inp.q2_uC.toFixed(1) + " µC";

  const product = inp.q1_uC * inp.q2_uC;
  if (clForceTypeText) {
    if (product === 0) {
      clForceTypeText.textContent = t("force.none") !== "force.none" ? t("force.none") : "Kuvvet Yok";
      updateArrowVisibility(false, false);
    } else if (product < 0) {
      clForceTypeText.textContent = t("force.attractive") !== "force.attractive" ? t("force.attractive") : "Çekme Kuvveti";
      updateArrowVisibility(true, true);
    } else {
      clForceTypeText.textContent = t("force.repulsive") !== "force.repulsive" ? t("force.repulsive") : "İtme Kuvveti";
      updateArrowVisibility(true, false);
    }
  }

  const span = inp.r0_cm;
  const spanPct = 12 + (span / 200) * 64;
  const left1 = 50 - spanPct / 2;
  const left2 = 50 + spanPct / 2;

  if (simSphere1Rig) simSphere1Rig.style.left = left1 + "%";
  if (simSphere2Rig) simSphere2Rig.style.left = left2 + "%";
  if (simArrows) {
    simArrows.style.left     = left1 + "%";
    simArrows.style.width    = spanPct + "%";
  }
  if (simDistRibbon) {
    simDistRibbon.style.left = left1 + "%";
    simDistRibbon.style.width = spanPct + "%";
  }

  if (simDistLabel) simDistLabel.textContent = "r = " + inp.r0_cm.toFixed(1) + " cm";
  if (simDistance)  simDistance.textContent  = inp.r0_cm.toFixed(2) + " cm";

  // Also update Force readout
  const r_m = inp.r0_cm * 1e-2;
  const F = coulombForceMag(inp.q1_uC * 1e-6, inp.q2_uC * 1e-6, r_m);
  if (forceReadout) forceReadout.textContent = toSI(F) + " N";
  if (simForce)     simForce.textContent     = toSI(F) + " N";
}

function updateSphereColors(q1, q2) {
  const cls1 = q1 > 0 ? "positive" : q1 < 0 ? "negative" : "neutral";
  const cls2 = q2 > 0 ? "positive" : q2 < 0 ? "negative" : "neutral";
  if (simSphere1) simSphere1.className = `sim-sphere ${cls1}`;
  if (simSphere2) simSphere2.className = `sim-sphere ${cls2}`;
}

function updateSphereLabels(q1, q2) {
  if (simQ1Label) simQ1Label.textContent = (q1 >= 0 ? "+" : "") + q1.toFixed(1) + " µC";
  if (simQ2Label) simQ2Label.textContent = (q2 >= 0 ? "+" : "") + q2.toFixed(1) + " µC";
}

function updateArrowVisibility(visible, inward) {
  if (simArrowLeft)  simArrowLeft.style.opacity  = visible ? "0.85" : "0";
  if (simArrowRight) simArrowRight.style.opacity = visible ? "0.85" : "0";
  if (visible) {
    if (simArrowLeft)  simArrowLeft.textContent  = inward ? "arrow_back"    : "arrow_forward";
    if (simArrowRight) simArrowRight.textContent = inward ? "arrow_forward" : "arrow_back";
  }
}

// ─── Sim Status Helpers ────────────────────────────────────────────────
function setSimStatus(state) {
  const msgs = {
    idle:    t("sim.status.idle")    !== "sim.status.idle"    ? t("sim.status.idle")    : "Parametreleri girin ve simülasyonu başlatın",
    running: t("sim.status.running") !== "sim.status.running" ? t("sim.status.running") : "Simülasyon çalışıyor…",
    paused:  t("sim.status.paused")  !== "sim.status.paused"  ? t("sim.status.paused")  : "Duraklatıldı",
    done:    t("sim.status.done")    !== "sim.status.done"    ? t("sim.status.done")    : "Simülasyon tamamlandı",
  };
  if (clStatusMsg) clStatusMsg.textContent = msgs[state] || msgs.idle;

  if (state === "running") {
    if (statusText) statusText.textContent = t("status.running") !== "status.running" ? t("status.running") : "Simülasyon: Çalışıyor";
    if (statusPing) statusPing.classList.remove("hidden");
  } else if (state === "paused") {
    if (statusText) statusText.textContent = t("status.paused") !== "status.paused" ? t("status.paused") : "Duraklatıldı";
    if (statusPing) statusPing.classList.add("hidden");
  } else {
    if (statusText) statusText.textContent = t("status.ready") !== "status.ready" ? t("status.ready") : "Hazır";
    if (statusPing) statusPing.classList.add("hidden");
  }
}

// ─── Start / Pause / Reset ─────────────────────────────────────────────
function startSim() {
  const inp = readInputs();

  const q1 = inp.q1_uC * 1e-6;
  const q2 = inp.q2_uC * 1e-6;
  const m1 = inp.m1_g  * 1e-3;
  const m2 = inp.m2_g  * 1e-3;
  const r0 = inp.r0_cm * 1e-2;

  sim.q1 = q1; sim.q2 = q2;
  sim.m1 = m1; sim.m2 = m2;
  sim.totalTime = inp.t_s;

  sim.x1_0 = -r0 / 2;
  sim.x2_0 =  r0 / 2;
  sim.x1 = sim.x1_0;
  sim.x2 = sim.x2_0;
  sim.v1 = 0; sim.v2 = 0;
  sim.elapsed = 0;

  const spanPct = 12 + (inp.r0_cm / 200) * 64;
  METERS_TO_PCT = spanPct / r0;

  sim.active = true;
  sim.paused = false;
  sim.done   = false;
  sim.lastFrameTime = null;

  if (clStartBtn) clStartBtn.disabled = true;
  if (clPauseBtn) clPauseBtn.disabled = false;
  if (clPauseIcon) clPauseIcon.textContent = "pause";
  if (clPauseText) clPauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";

  setSimStatus("running");
  if (typeof addLog === "function") 
    addLog(`Simülasyon başlatıldı: q₁=${inp.q1_uC} µC, q₂=${inp.q2_uC} µC, r₀=${inp.r0_cm} cm, t=${inp.t_s} s`, "primary");

  sim.rafId = requestAnimationFrame(simLoop);
}

function togglePause() {
  if (!sim.active) return;
  sim.paused = !sim.paused;

  if (sim.paused) {
    if (clPauseIcon) clPauseIcon.textContent = "play_arrow";
    if (clPauseText) clPauseText.textContent = t("btn.run") !== "btn.run" ? t("btn.run") : "Devam Et";
    setSimStatus("paused");
    if (typeof addLog === "function") addLog("Simülasyon duraklatıldı.", "info");
  } else {
    if (clPauseIcon) clPauseIcon.textContent = "pause";
    if (clPauseText) clPauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";
    setSimStatus("running");
    sim.lastFrameTime = null;
    sim.rafId = requestAnimationFrame(simLoop);
    if (typeof addLog === "function") addLog("Simülasyon devam ediyor.", "info");
  }
}

function resetSim() {
  if (sim.rafId) { cancelAnimationFrame(sim.rafId); sim.rafId = null; }

  sim.active = false; sim.paused = false; sim.done = false;
  sim.x1 = 0; sim.x2 = 0; sim.v1 = 0; sim.v2 = 0; sim.elapsed = 0;

  if (clStartBtn) clStartBtn.disabled = false;
  if (clPauseBtn) clPauseBtn.disabled = true;
  if (clPauseIcon) clPauseIcon.textContent = "pause";
  if (clPauseText) clPauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";

  if (simElapsed)  simElapsed.textContent  = "0.000 s";
  if (simForce)    simForce.textContent    = "0.00 N";
  if (simA1)       simA1.textContent       = "0 m/s²";
  if (simA2)       simA2.textContent       = "0 m/s²";
  if (simV1)       simV1.textContent       = "0 m/s";
  if (simV2)       simV2.textContent       = "0 m/s";
  if (simS1)       simS1.textContent       = "0.000 m";
  if (simS2)       simS2.textContent       = "0.000 m";
  if (forceReadout) forceReadout.textContent = "0.000 N";

  setSimStatus("idle");
  updateSliderPreviews();
  if (typeof addLog === "function") addLog("Simülasyon sıfırlandı.", "info");
}

// ─── Wire Controls ───────────────────────────────────────────
if (clStartBtn) {
  clStartBtn.addEventListener("click", () => {
    if (sim.active && !sim.done) return;
    resetSim();
    startSim();
  });
}

if (clPauseBtn) clPauseBtn.addEventListener("click", togglePause);
if (clResetBtn) clResetBtn.addEventListener("click", resetSim);

[clInputQ1, clInputQ2, clInputM1, clInputM2, clInputR, clInputT].forEach(inp => {
  if (!inp) return;
  inp.addEventListener("input", () => {
    updateSliderPreviews();
    const fieldMap = {
      clInputQ1: "q1",    clInputQ2: "q2",
      clInputM1: "mass1", clInputM2: "mass2",
      clInputR:  "distance", clInputT: "time",
    };
    const field = fieldMap[inp.id];
    const val   = parseFloat(inp.value);
    if (field && !isNaN(val) && typeof api === "function") {
      api("/api/experiments/coulomb_law/update", {
        method: "POST",
        body: JSON.stringify({ field, value: val }),
      }).catch(() => {});
    }
  });
});

// ─── Language change callback & Boot ──────────────────────────────────────────
function onLangChanged() {
  updateSliderPreviews();
  setSimStatus(sim.active ? (sim.paused ? "paused" : "running") : (sim.done ? "done" : "idle"));
  const nameKey = "exp.coulomb_law.title";
  if (activeExperimentName) activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : "Coulomb Yasası";
}
window.onLangChanged = onLangChanged;

async function fetchLearningAndState() {
  try {
    const data = await api("/api/experiments/coulomb_law");
    const learningSummary = $("#learningSummary");
    const coreConcepts = $("#coreConcepts");
    
    if (data.learning && learningSummary && coreConcepts) {
      const summaryKey = data.learning.summary;
      const translated = t(summaryKey);
      learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${translated !== summaryKey ? translated : data.learning.summary}</p>`;
      coreConcepts.innerHTML = (data.learning.concepts || []).map(c => {
        const cTitle = t(c.title) !== c.title ? t(c.title) : c.title;
        const cDesc  = t(c.desc)  !== c.desc  ? t(c.desc)  : c.desc;
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

    if (data.state) {
      if (data.state.q1        != null && clInputQ1) clInputQ1.value = data.state.q1;
      if (data.state.q2        != null && clInputQ2) clInputQ2.value = data.state.q2;
      if (data.state.mass1     != null && clInputM1) clInputM1.value = data.state.mass1;
      if (data.state.mass2     != null && clInputM2) clInputM2.value = data.state.mass2;
      if (data.state.distance  != null && clInputR)  clInputR.value  = data.state.distance;
      if (data.state.time      != null && clInputT)  clInputT.value  = data.state.time;
    }
  } catch (err) {
    console.error("Failed to fetch initial state:", err);
  }
}

async function bootCoulomb() {
  if (typeof window.initShared === "function") window.initShared();
  
  await fetchLearningAndState();
  updateSliderPreviews();
  
  const nameKey = "exp.coulomb_law.title";
  if (activeExperimentName) activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : "Coulomb Yasası";
  
  if (typeof addLog === "function") 
    addLog(t("log.expLoaded") + (t(nameKey) !== nameKey ? t(nameKey) : "Coulomb Yasası"), "info");
}

document.addEventListener("DOMContentLoaded", bootCoulomb);
