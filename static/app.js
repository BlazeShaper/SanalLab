/**
 * Interactive Physics Lab — Frontend Logic
 * Coulomb Law Real-Time Kinematic Simulator
 * Communicates with FastAPI backend for state persistence and reports.
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

async function apiUpload(path, formData) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  return res.json();
}

// ─── DOM Refs — Global ───────────────────────────────────────────────
const activeExperimentName = $("#activeExperimentName");
const statusText           = $("#statusText");
const statusPing           = $("#statusPing");
const logList              = $("#logList");
const expMenuBtn           = $("#expMenuBtn");
const expMenuList          = $("#expMenuList");
const expMenuItems         = $("#expMenuItems");
const learningSummary      = $("#learningSummary");
const coreConcepts         = $("#coreConcepts");
const addToReportBtn       = $("#addToReportBtn");
const exportReportBtn      = $("#exportReportBtn");
const exportExcelBtn       = $("#exportExcelBtn");
const reportItemsList      = $("#reportItemsList");
const reportTitleInput     = $("#reportTitleInput");
const expressionSelect     = $("#expressionSelect");
const reportHint           = $("#reportHint");
const forceReadout         = $("#forceReadout");
const q1Readout            = $("#q1Readout");
const q2Readout            = $("#q2Readout");
const forceLabel           = $("#forceLabel");
const forceGroup           = $("#forceGroup");
const placeholderOverlay   = $("#placeholderOverlay");

// Experiment stages
const coulombLawStage    = $("#coulombLawStage");
const electrostaticsStage = $("#electrostaticsStage");

// Electrostatics rigs (for the other experiment)
const glassRig   = $("#glassRig");
const plasticRig = $("#plasticRig");

// File Manager
const fileDropZone = $("#fileDropZone");
const fileInput    = $("#fileInput");
const uploadBtn    = $("#uploadBtn");
const fileList     = $("#fileList");

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

// ─── App State ────────────────────────────────────────────────────────
const local = {
  activeExpId: "coulomb_law",
  running: false,
  experiments: [],
  // Electrostatics spring animation
  glassAngleDeg: 2, plasticAngleDeg: -2,
  glassVel: 0,      plasticVel: 0,
  glassTarget: 2,   plasticTarget: -2,
  showCharges: true, showForces: false,
  logs: [],
};

// ─── Physics Constants ────────────────────────────────────────────────
const CL_K = 8.99e9; // Coulomb constant N·m²/C²
const SPHERE_DIAMETER = 0.04; // 4 cm fiziksel küre çapı (çarpışma için)

// Canvas geometry (percent of canvas width where track starts/ends)
const TRACK_LEFT_PCT  = 8;   // 8%  from left edge
const TRACK_RIGHT_PCT = 92;  // 92% from left edge
const TRACK_SPAN_PCT  = TRACK_RIGHT_PCT - TRACK_LEFT_PCT; // 84%

// What fraction of canvas width represents 1 metre (for visual mapping)
// We use a dynamic scale based on initial distance
let METERS_TO_PCT = 1; // set when sim starts

// ─── Simulation State ─────────────────────────────────────────────────
const sim = {
  active:   false,    // is simulation running
  paused:   false,    // is it paused mid-sim
  done:     false,    // has it reached totalTime

  // Physics state (SI units)
  x1: 0,              // sphere 1 position [m] (positive = right)
  x2: 0,              // sphere 2 position [m]
  v1: 0,              // sphere 1 velocity [m/s]
  v2: 0,              // sphere 2 velocity [m/s]
  elapsed: 0,         // elapsed simulation time [s]

  // Initial conditions (set when Start is clicked)
  x1_0: 0,
  x2_0: 0,
  totalTime: 2,       // [s]
  q1: 0, q2: 0,       // [C]
  m1: 0, m2: 0,       // [kg]

  rafId: null,
  lastFrameTime: null,
};

// ─── Logging ──────────────────────────────────────────────────────────
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

// ─── Read Slider Values ────────────────────────────────────────────────
function readInputs() {
  return {
    q1_uC:  parseFloat(clInputQ1.value) || 0,
    q2_uC:  parseFloat(clInputQ2.value) || 0,
    m1_g:   parseFloat(clInputM1.value) || 10,
    m2_g:   parseFloat(clInputM2.value) || 10,
    r0_cm:  Math.max(5, parseFloat(clInputR.value) || 50),
    t_s:    Math.max(0.5, parseFloat(clInputT.value) || 2),
  };
}

// ─── Physics Engine ───────────────────────────────────────────────────

/**
 * Compute Coulomb force magnitude between two charges at distance r.
 * @returns {number} Force in Newtons (always positive).
 */
function coulombForceMag(q1, q2, r) {
  if (r < 1e-4) r = 1e-4; // prevent singularity
  return CL_K * Math.abs(q1 * q2) / (r * r);
}

/**
 * Integrate one physics step.
 * Uses semi-implicit Euler integration with collision & charge transfer logic.
 * @param {number} dt  Time step [s]
 */
function physicsStep(dt) {
  let r = Math.abs(sim.x2 - sim.x1);

  // Çarpışma ve Yük Paylaşımı
  if (r <= SPHERE_DIAMETER && !sim.collisionOccurred) {
    // Penetration (iç içe geçme) çözümü
    const mx = (sim.x1 + sim.x2) / 2;
    if (sim.x1 < sim.x2) {
      sim.x1 = mx - SPHERE_DIAMETER / 2;
      sim.x2 = mx + SPHERE_DIAMETER / 2;
    } else {
      sim.x1 = mx + SPHERE_DIAMETER / 2;
      sim.x2 = mx - SPHERE_DIAMETER / 2;
    }
    r = SPHERE_DIAMETER;

    // Momentum korunumu ve esnek çarpışma (CR = 0.8)
    const CR = 0.8;
    const v1_new = ((sim.m1 - sim.m2) * sim.v1 + 2 * sim.m2 * sim.v2) / (sim.m1 + sim.m2);
    const v2_new = ((sim.m2 - sim.m1) * sim.v2 + 2 * sim.m1 * sim.v1) / (sim.m1 + sim.m2);
    sim.v1 = v1_new * CR;
    sim.v2 = v2_new * CR;

    // İletken küreler birbirine dokunduğunda toplam yükü eşit paylaşır
    const totalQ = sim.q1 + sim.q2;
    sim.q1 = totalQ / 2;
    sim.q2 = totalQ / 2;

    sim.chargeTransferred = true;
  }

  // Force magnitude
  const F = coulombForceMag(sim.q1, sim.q2, r);

  // Vektörel Kuvvet Yönü
  const dx = sim.x1 - sim.x2; // 2'den 1'e doğru vektör
  const signF = Math.sign(sim.q1 * sim.q2); // (+) itme, (-) çekme
  // Eğer dx sıfırsa (tam üst üsteyseler) rastgele bir yöne ufak bir kuvvet uygulayarak ayır
  const forceDir = dx !== 0 ? Math.sign(dx) : (Math.random() < 0.5 ? 1 : -1); 
  
  const F1x = F * signF * forceDir;
  const F2x = -F1x;

  const a1 = (sim.m1 > 0) ? (F1x / sim.m1) : 0;
  const a2 = (sim.m2 > 0) ? (F2x / sim.m2) : 0;

  // Semi-implicit Euler
  sim.v1 += a1 * dt;
  sim.v2 += a2 * dt;
  sim.x1 += sim.v1 * dt;
  sim.x2 += sim.v2 * dt;

  // Render için ivmeyi doğru yöne çevirme
  return { F, a1, a2, r };
}

// ─── Canvas Rendering ─────────────────────────────────────────────────
/**
 * Map a physics position (metres, absolute) to canvas left-percent.
 * We keep x1_0 → TRACK_LEFT_PCT+8 and x2_0 → TRACK_RIGHT_PCT-8.
 */
function metersToPercent(x, side) {
  // side 1: origin = x1_0, side 2: origin = x2_0
  if (side === 1) {
    return clamp(
      22 + (x - sim.x1_0) * METERS_TO_PCT,
      TRACK_LEFT_PCT, TRACK_RIGHT_PCT - 2
    );
  } else {
    return clamp(
      78 + (x - sim.x2_0) * METERS_TO_PCT,
      TRACK_LEFT_PCT + 2, TRACK_RIGHT_PCT
    );
  }
}

function renderFrame(F, a1, a2) {
  const left1  = metersToPercent(sim.x1, 1);
  const left2  = metersToPercent(sim.x2, 2);
  const midPct = (left1 + left2) / 2;
  const spanPct = Math.max(0, left2 - left1);

  // Sphere positions
  simSphere1Rig.style.left = left1 + "%";
  simSphere2Rig.style.left = left2 + "%";

  // Force arrows & distance ribbon — centred between spheres
  simArrows.style.left     = left1 + "%";
  simArrows.style.width    = spanPct + "%";
  simDistRibbon.style.left = left1 + "%";
  simDistRibbon.style.width = spanPct + "%";

  // Current distance
  const r_m  = Math.abs(sim.x2 - sim.x1);
  const r_cm = r_m * 100;
  simDistLabel.textContent = "r = " + r_cm.toFixed(1) + " cm";

  // Live readout cards
  simElapsed.textContent  = sim.elapsed.toFixed(3) + " s";
  simForce.textContent    = toSI(F) + " N";
  simDistance.textContent = r_cm.toFixed(2) + " cm";

  // Right panel readouts
  forceReadout.textContent = toSI(F) + " N";

  // Kinematics
  const disp1 = sim.x1 - sim.x1_0;
  const disp2 = sim.x2 - sim.x2_0;
  simA1.textContent = toSI(Math.abs(a1)) + " m/s²";
  simA2.textContent = toSI(Math.abs(a2)) + " m/s²";
  simV1.textContent = toSI(Math.abs(sim.v1)) + " m/s";
  simV2.textContent = toSI(Math.abs(sim.v2)) + " m/s";
  simS1.textContent = toSI(Math.abs(disp1)) + " m";
  simS2.textContent = toSI(Math.abs(disp2)) + " m";
}

/** Format a number in compact scientific/SI notation */
function toSI(v) {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1e3 || Math.abs(v) < 1e-3) return v.toExponential(3);
  return v.toFixed(4).replace(/\.?0+$/, "");
}

// ─── Simulation Loop ──────────────────────────────────────────────────
function simLoop(timestamp) {
  if (!sim.active || sim.paused || sim.done) return;

  if (!sim.lastFrameTime) sim.lastFrameTime = timestamp;
  let dt = (timestamp - sim.lastFrameTime) / 1000; // seconds
  sim.lastFrameTime = timestamp;

  // Cap dt to avoid huge jumps after tab switch
  dt = Math.min(dt, 0.05);

  // Sub-step for accuracy (especially at small/collision distances)
  const SUBSTEPS = 32; // Simülasyon kararlılığı artırıldı
  const subDt = dt / SUBSTEPS;
  let F = 0, a1 = 0, a2 = 0;
  
  sim.chargeTransferred = false;
  
  for (let i = 0; i < SUBSTEPS; i++) {
    const res = physicsStep(subDt);
    F = res.F; a1 = res.a1; a2 = res.a2;
    if (sim.collisionOccurred) break;
  }
  
  if (sim.chargeTransferred) {
    const q1_uC = sim.q1 * 1e6;
    const q2_uC = sim.q2 * 1e6;
    updateSphereColors(q1_uC, q2_uC);
    updateSphereLabels(q1_uC, q2_uC);
    
    // UI değerlerini güncelle
    q1Readout.textContent = (q1_uC >= 0 ? "+" : "") + q1_uC.toFixed(1) + " µC";
    q2Readout.textContent = (q2_uC >= 0 ? "+" : "") + q2_uC.toFixed(1) + " µC";
    clInputQ1.value = q1_uC.toFixed(1);
    clInputQ2.value = q2_uC.toFixed(1);
    clValQ1.textContent = q1_uC.toFixed(1);
    clValQ2.textContent = q2_uC.toFixed(1);
    
    // Force tipini ve oklarını iterasyon ortasında güncelle (dokunduktan sonra iterler)
    clForceTypeText.textContent = t("force.repulsive") !== "force.repulsive" ? t("force.repulsive") : "İtme Kuvveti";
    updateArrowVisibility(true, false);
    
    addLog(`Fiziksel Çarpışma! Yükler paylaşıldı: q₁=q₂=${q1_uC.toFixed(2)} µC`, "primary");
    sim.chargeTransferred = false; // Only trigger once
  }

  if (sim.collisionOccurred) {
    sim.done = true;
    renderFrame(F, a1, a2);
    onSimComplete();
    return;
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
  clPauseBtn.disabled = true;
  clStartBtn.disabled = false;
  setSimStatus("done");
  addLog("Simülasyon tamamlandı. t = " + sim.totalTime.toFixed(2) + " s", "primary");
}

// ─── Slider → Preview (static, before simulation) ─────────────────────
function updateSliderPreviews() {
  const inp = readInputs();

  clValQ1.textContent = inp.q1_uC.toFixed(1);
  clValQ2.textContent = inp.q2_uC.toFixed(1);
  clValM1.textContent = inp.m1_g.toString();
  clValM2.textContent = inp.m2_g.toString();
  clValR.textContent  = inp.r0_cm.toString();
  clValT.textContent  = inp.t_s.toFixed(1);

  // Sphere colors by sign
  updateSphereColors(inp.q1_uC, inp.q2_uC);
  updateSphereLabels(inp.q1_uC, inp.q2_uC);

  // Right panel charge readouts
  q1Readout.textContent = (inp.q1_uC >= 0 ? "+" : "") + inp.q1_uC.toFixed(1) + " µC";
  q2Readout.textContent = (inp.q2_uC >= 0 ? "+" : "") + inp.q2_uC.toFixed(1) + " µC";

  // Force type label
  const product = inp.q1_uC * inp.q2_uC;
  if (product === 0) {
    clForceTypeText.textContent = t("force.none") !== "force.none" ? t("force.none") : "Kuvvet Yok";
    updateArrowVisibility(false, false);
  } else if (product < 0) {
    clForceTypeText.textContent = t("force.attractive") !== "force.attractive" ? t("force.attractive") : "Çekme Kuvveti";
    updateArrowVisibility(true, true); // arrows point inward (attract)
  } else {
    clForceTypeText.textContent = t("force.repulsive") !== "force.repulsive" ? t("force.repulsive") : "İtme Kuvveti";
    updateArrowVisibility(true, false); // arrows point outward (repel)
  }

  // Preview sphere positions based on r0
  const span = inp.r0_cm;             // cm
  // Map: 5cm → pair near centre, 200cm → pair at edges
  const spanPct = 12 + (span / 200) * 64; // 12% to 76% of canvas
  const left1 = 50 - spanPct / 2;
  const left2 = 50 + spanPct / 2;

  simSphere1Rig.style.left = left1 + "%";
  simSphere2Rig.style.left = left2 + "%";
  simArrows.style.left     = left1 + "%";
  simArrows.style.width    = spanPct + "%";
  simDistRibbon.style.left = left1 + "%";
  simDistRibbon.style.width = spanPct + "%";

  simDistLabel.textContent = "r = " + inp.r0_cm.toFixed(1) + " cm";
  simDistance.textContent  = inp.r0_cm.toFixed(2) + " cm";
}

function updateSphereColors(q1, q2) {
  const cls1 = q1 > 0 ? "positive" : q1 < 0 ? "negative" : "neutral";
  const cls2 = q2 > 0 ? "positive" : q2 < 0 ? "negative" : "neutral";
  simSphere1.className = `sim-sphere ${cls1}`;
  simSphere2.className = `sim-sphere ${cls2}`;
}

function updateSphereLabels(q1, q2) {
  simQ1Label.textContent = (q1 >= 0 ? "+" : "") + q1.toFixed(1) + " µC";
  simQ2Label.textContent = (q2 >= 0 ? "+" : "") + q2.toFixed(1) + " µC";
}

/**
 * @param {boolean} visible  - show/hide arrows
 * @param {boolean} inward   - true = arrows face each other (attraction)
 *                             false = arrows face outward (repulsion)
 */
function updateArrowVisibility(visible, inward) {
  simArrowLeft.style.opacity  = visible ? "0.85" : "0";
  simArrowRight.style.opacity = visible ? "0.85" : "0";
  if (visible) {
    // inward attraction: → on left, ← on right  (arrow_forward / arrow_back)
    // outward repulsion: ← on left, → on right
    simArrowLeft.textContent  = inward ? "arrow_forward" : "arrow_back";
    simArrowRight.textContent = inward ? "arrow_back"    : "arrow_forward";
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
  clStatusMsg.textContent = msgs[state] || msgs.idle;

  // Header status chip
  if (state === "running") {
    statusText.textContent = t("status.running") !== "status.running" ? t("status.running") : "Simülasyon: Çalışıyor";
    statusPing.classList.remove("hidden");
  } else if (state === "paused") {
    statusText.textContent = t("status.paused") !== "status.paused" ? t("status.paused") : "Duraklatıldı";
    statusPing.classList.add("hidden");
  } else {
    statusText.textContent = t("status.ready") !== "status.ready" ? t("status.ready") : "Hazır";
    statusPing.classList.add("hidden");
  }
}

// ─── Start Simulation ──────────────────────────────────────────────────
function startSim() {
  const inp = readInputs();

  // Convert to SI
  const q1 = inp.q1_uC * 1e-6;
  const q2 = inp.q2_uC * 1e-6;
  const m1 = inp.m1_g  * 1e-3;
  const m2 = inp.m2_g  * 1e-3;
  const r0 = inp.r0_cm * 1e-2;  // metres

  // Set initial positions centred on canvas: x1 to left, x2 to right
  sim.q1 = q1; sim.q2 = q2;
  sim.m1 = m1; sim.m2 = m2;
  sim.totalTime = inp.t_s;

  // x1 at -r0/2 and x2 at +r0/2 (relative to canvas centre)
  sim.x1_0 = -r0 / 2;
  sim.x2_0 =  r0 / 2;
  sim.x1 = sim.x1_0;
  sim.x2 = sim.x2_0;
  sim.v1 = 0; sim.v2 = 0;
  sim.elapsed = 0;

  // Compute scale: initial r0 maps to the initial visual span
  const spanPct = 12 + (inp.r0_cm / 200) * 64;
  // spanPct% of canvas = r0 metres
  METERS_TO_PCT = spanPct / r0; // % per metre

  sim.active = true;
  sim.paused = false;
  sim.done   = false;
  sim.collisionOccurred = false;
  sim.lastFrameTime = null;

  // Update buttons
  clStartBtn.disabled = true;
  clPauseBtn.disabled = false;
  clPauseIcon.textContent = "pause";
  clPauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";

  setSimStatus("running");
  addLog(`Simülasyon başlatıldı: q₁=${inp.q1_uC} µC, q₂=${inp.q2_uC} µC, r₀=${inp.r0_cm} cm, t=${inp.t_s} s`, "primary");

  sim.rafId = requestAnimationFrame(simLoop);
}

// ─── Pause / Resume ────────────────────────────────────────────────────
function togglePause() {
  if (!sim.active) return;
  sim.paused = !sim.paused;

  if (sim.paused) {
    clPauseIcon.textContent = "play_arrow";
    clPauseText.textContent = t("btn.run") !== "btn.run" ? t("btn.run") : "Devam Et";
    setSimStatus("paused");
    addLog("Simülasyon duraklatıldı.", "info");
  } else {
    clPauseIcon.textContent = "pause";
    clPauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";
    setSimStatus("running");
    sim.lastFrameTime = null; // reset dt clock to avoid jump
    sim.rafId = requestAnimationFrame(simLoop);
    addLog("Simülasyon devam ediyor.", "info");
  }
}

// ─── Reset ─────────────────────────────────────────────────────────────
function resetSim() {
  // Stop loop
  if (sim.rafId) { cancelAnimationFrame(sim.rafId); sim.rafId = null; }

  sim.active = false; sim.paused = false; sim.done = false; sim.collisionOccurred = false;
  sim.x1 = 0; sim.x2 = 0; sim.v1 = 0; sim.v2 = 0; sim.elapsed = 0;

  // Restore button states
  clStartBtn.disabled = false;
  clPauseBtn.disabled = true;
  clPauseIcon.textContent = "pause";
  clPauseText.textContent = t("btn.pause") !== "btn.pause" ? t("btn.pause") : "Duraklat";

  // Zero readouts
  simElapsed.textContent  = "0.000 s";
  simForce.textContent    = "0.00 N";
  simA1.textContent       = "0 m/s²";
  simA2.textContent       = "0 m/s²";
  simV1.textContent       = "0 m/s";
  simV2.textContent       = "0 m/s";
  simS1.textContent       = "0.000 m";
  simS2.textContent       = "0.000 m";
  forceReadout.textContent = "0.000 N";

  setSimStatus("idle");
  updateSliderPreviews(); // restore positions and labels
  addLog("Simülasyon sıfırlandı.", "info");
}

// ─── Wire Simulator Controls ───────────────────────────────────────────
clStartBtn.addEventListener("click", () => {
  if (sim.active && !sim.done) return; // prevent double-start
  resetSim(); // clean slate first
  startSim();
});

clPauseBtn.addEventListener("click", togglePause);
clResetBtn.addEventListener("click", resetSim);

// Wire sliders to live preview
[clInputQ1, clInputQ2, clInputM1, clInputM2, clInputR, clInputT].forEach(inp => {
  inp.addEventListener("input", () => {
    updateSliderPreviews();
    // Sync backend state (fire-and-forget)
    const fieldMap = {
      clInputQ1: "q1",    clInputQ2: "q2",
      clInputM1: "mass1", clInputM2: "mass2",
      clInputR:  "distance", clInputT: "time",
    };
    const field = fieldMap[inp.id];
    const val   = parseFloat(inp.value);
    const expId = local.activeExpId;
    if (expId && !isNaN(val)) {
      api(`/api/experiments/${expId}/update`, {
        method: "POST",
        body: JSON.stringify({ field, value: val }),
      }).then(data => {
        if (data.computed) applyComputed(data.computed);
      }).catch(() => {});
    }
  });
});

// ─── Stage switching ───────────────────────────────────────────────────
function showStage(expId) {
  electrostaticsStage.classList.add("hidden");
  coulombLawStage.classList.remove("hidden");

  if (expId !== "coulomb_law") {
    electrostaticsStage.classList.remove("hidden");
    coulombLawStage.classList.add("hidden");
  }
}

// ─── Readouts from backend (electrostatics) ───────────────────────────
function applyComputed(computed) {
  if (!computed) return;
  forceReadout.textContent = computed.forceFormatted || "0.000 N";
  q1Readout.textContent    = computed.q1Formatted    || "+0.0 µC";
  q2Readout.textContent    = computed.q2Formatted    || "0.0 µC";
  if (forceLabel) {
    const flKey = computed.forceLabel || "";
    forceLabel.textContent = t(flKey) !== flKey ? t(flKey) : flKey;
  }
  local.glassTarget = computed.glassTarget ?? 2;
  local.plasticTarget = computed.plasticTarget ?? -2;
  local.showCharges = computed.showCharges ?? true;
  local.showForces  = computed.showForces  ?? false;
  $$(".charge-symbol").forEach(el => { el.style.display = local.showCharges ? "" : "none"; });
  if (forceGroup) forceGroup.style.display = local.showForces ? "flex" : "none";

  // Dynamic arrowheads for electrostatics
  const arrowL = $("#forceArrowLeft");
  const arrowR = $("#forceArrowRight");
  if (arrowL && arrowR) {
    const isAttr = computed.forceLabel === "force.attractive";
    arrowL.style.transform = isAttr ? "rotate(225deg)" : "rotate(45deg)";
    arrowR.style.transform = isAttr ? "rotate(315deg)" : "rotate(135deg)";
  }
}

// ─── Learning panel ───────────────────────────────────────────────────
function renderLearning(learning) {
  if (!learning || !learning.summary) {
    learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(t("learning.placeholder") !== "learning.placeholder" ? t("learning.placeholder") : "Bir deney seçin.")}</p>`;
    coreConcepts.innerHTML = "";
    return;
  }
  const summaryKey = learning.summary;
  const translated = t(summaryKey);
  learningSummary.innerHTML = `<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">${translated !== summaryKey ? translated : learning.summary}</p>`;
  coreConcepts.innerHTML = (learning.concepts || []).map(c => {
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

// ─── Experiment mounting ───────────────────────────────────────────────
async function mountExperiment(expId) {
  local.activeExpId = expId;
  const data = await api(`/api/experiments/${expId}`);

  const nameKey = data.name || expId;
  activeExperimentName.textContent = t(nameKey) !== nameKey ? t(nameKey) : nameKey;
  placeholderOverlay.classList.toggle("hidden", expId === "coulomb_law" || !!data.implemented);

  showStage(expId);
  renderLearning(data.learning || {});
  applyComputed(data.computed || {});
  setReportUIEnabled(expId === "electrostatics" || expId === "coulomb_law");

  if (expId === "coulomb_law" && data.state) {
    // Restore sliders from server state
    if (data.state.q1        != null) clInputQ1.value = data.state.q1;
    if (data.state.q2        != null) clInputQ2.value = data.state.q2;
    if (data.state.mass1     != null) clInputM1.value = data.state.mass1;
    if (data.state.mass2     != null) clInputM2.value = data.state.mass2;
    if (data.state.distance  != null) clInputR.value  = data.state.distance;
    if (data.state.time      != null) clInputT.value  = data.state.time;
    updateSliderPreviews();
  }

  // Reset animation for electrostatics
  local.glassAngleDeg = 2; local.plasticAngleDeg = -2;
  local.glassVel = 0; local.plasticVel = 0;

  local.logs = [];
  addLog(t("log.expLoaded") + (t(nameKey) !== nameKey ? t(nameKey) : nameKey), "info");
  expMenuList.classList.add("hidden");
}

// ─── Experiments dropdown ──────────────────────────────────────────────
async function loadExperimentsList() {
  local.experiments = await api("/api/experiments");
  expMenuItems.innerHTML = local.experiments.map(e => {
    const nameKey = e.name;
    const displayName = t(nameKey) !== nameKey ? t(nameKey) : nameKey;
    return `<button data-exp="${e.id}"
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

// ─── Electrostatics animation loop ────────────────────────────────────
let lastT = performance.now();
function tick(frameT) {
  const dt = Math.min(0.05, (frameT - lastT) / 1000);
  lastT = frameT;
  if (local.activeExpId === "electrostatics" && glassRig && plasticRig) {
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

// ─── Report Builder ────────────────────────────────────────────────────
async function loadReportItems() {
  const items = await api("/api/reports/items");
  renderReportItems(items);
}

function renderReportItems(items) {
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

addToReportBtn.addEventListener("click", async () => {
  if (local.activeExpId !== "electrostatics" && local.activeExpId !== "coulomb_law") {
    addLog(t("log.reportOnly") !== "log.reportOnly" ? t("log.reportOnly") : "Rapor yalnızca Coulomb deneyi için geçerlidir.", "info");
    return;
  }
  const snap = await api(`/api/experiments/${local.activeExpId}/compute`);
  const st   = snap.state || {};
  const comp = snap.computed || {};
  let payload;
  if (local.activeExpId === "coulomb_law") {
    payload = {
      expression: "coulomb",
      label: "Coulomb's Law: F = k·|q₁·q₂|/r²",
      q1: st.q1 || 0, q2: st.q2 || 0,
      r:  st.distance || 1,
      force: comp.force || 0,
    };
  } else {
    payload = {
      expression: expressionSelect.value,
      label: expressionSelect.options[expressionSelect.selectedIndex]?.text || "Coulomb's Law",
      q1: st.glassChargeMicroC || 0, q2: st.plasticChargeMicroC || 0,
      r:  st.distanceMeters    || 1, force: comp.force || 0,
    };
  }
  await api("/api/reports/items/add", { method: "POST", body: JSON.stringify(payload) });
  addLog((t("log.savedToReport") !== "log.savedToReport" ? t("log.savedToReport") : "Rapora eklendi: ") + payload.label, "info");
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
    const idx   = parseInt(btn.dataset.idx, 10);
    const toIdx = act === "up" ? idx - 1 : idx + 1;
    await api("/api/reports/items/reorder", { method: "POST", body: JSON.stringify({ fromIndex: idx, toIndex: toIdx }) });
  }
  loadReportItems();
});

function setReportUIEnabled(isEnabled) {
  addToReportBtn.disabled = !isEnabled;
  addToReportBtn.classList.toggle("opacity-50", !isEnabled);
  addToReportBtn.classList.toggle("cursor-not-allowed", !isEnabled);
  expressionSelect.disabled = !isEnabled;
  expressionSelect.classList.toggle("opacity-50", !isEnabled);
  reportHint.innerHTML = isEnabled ? t("report.hint") : t("report.hintDisabled");
}

// ─── File Manager ─────────────────────────────────────────────────────
let selectedFile = null;

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
    addLog((t("file.uploadFailed") !== "file.uploadFailed" ? t("file.uploadFailed") : "Yükleme hatası: ") + result.error, "info");
  } else {
    addLog((t("file.uploaded") !== "file.uploaded" ? t("file.uploaded") : "Yüklendi: ") + (result.original_name || selectedFile.name), "primary");
  }
  selectedFile = null; fileInput.value = "";
  fileDropZone.querySelector("span:last-child").textContent = t("file.dropHint") !== "file.dropHint" ? t("file.dropHint") : "Dosya sürükle veya tıkla";
  loadFiles();
});

async function loadFiles() {
  try  { const files = await api("/api/files"); renderFiles(files); }
  catch { renderFiles([]); }
}

function renderFiles(files) {
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

fileList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".file-del-btn");
  if (!btn) return;
  await api(`/api/files/${btn.dataset.id}`, { method: "DELETE" });
  addLog(t("file.deleted") !== "file.deleted" ? t("file.deleted") : "Dosya silindi.", "info");
  loadFiles();
});

// ─── Language change callback ──────────────────────────────────────────
function onLangChanged() {
  setReportUIEnabled(local.activeExpId === "electrostatics" || local.activeExpId === "coulomb_law");
  updateSliderPreviews();
  mountExperiment(local.activeExpId);
}

// ─── Boot ───────────────────────────────────────────────────────────────
async function boot() {
  try {
    applyI18nDOM();
    await loadExperimentsList();
    await mountExperiment("coulomb_law");
    loadReportItems();
    loadFiles();
    requestAnimationFrame(tick);
  } catch (err) {
    console.error("Boot error:", err);
    addLog(t("log.bootFailed") !== "log.bootFailed" ? t("log.bootFailed") : "Başlatma hatası.", "info");
  }
}

boot();
