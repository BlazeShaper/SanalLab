/**
 * i18n — Lightweight internationalisation for Interactive Physics Lab.
 * Provides `t(key)` translation, `setLang()`, and auto-DOM translation
 * via `data-i18n` attributes.
 */

const TRANSLATIONS = {
    // ──────────────────────── TÜRKÇE ────────────────────────
    tr: {
        // Header
        "header.title": "İnteraktif Fizik Laboratuvarı",
        "header.experiments": "Deneyler",
        "status.ready": "Hazır",
        "status.running": "Simülasyon: Çalışıyor",
        "status.paused": "Simülasyon: Duraklatıldı",
        "status.done": "Simülasyon Tamamlandı",

        // Left sidebar
        "sidebar.experimentControls": "Deney Kontrolleri",
        "sidebar.global": "Genel",
        "btn.startSim": "Simülasyonu Başlat",
        "btn.pause": "Duraklat",
        "btn.run": "Devam Et",
        "btn.reset": "Sıfırla",

        // File manager
        "sidebar.fileManager": "Dosya Yöneticisi",
        "file.dropHint": "Dosya sürükle veya tıkla",
        "file.upload": "Seçili Dosyayı Yükle",
        "file.noFiles": "Yüklenmiş dosya yok.",
        "file.deleted": "Dosya silindi.",
        "file.uploaded": "Dosya yüklendi: ",
        "file.uploadFailed": "Yükleme başarısız: ",
        "sidebar.footer": "Tüm işlemler FastAPI backend ile gerçekleştirilir.",

        // Center stage — placeholder
        "placeholder.title": "Deney modülü henüz uygulanmadı",
        "placeholder.desc": "Bu bir yer tutucudur. Çalışan bir simülasyon görmek için Elektrostatik'i seçin.",

        // Labels on rods & cloths
        "label.glassRod": "Cam Çubuk",
        "label.plasticRod": "Plastik Çubuk",
        "label.silk": "İpek",
        "label.wool": "Yün",

        // System log
        "log.title": "Sistem Günlüğü",

        // Right panel — learning
        "panel.learning": "Öğrenme Paneli",
        "panel.coreConcepts": "Temel Kavramlar",
        "panel.liveReadouts": "Canlı Okumalar",
        "readout.totalForce": "Toplam Kuvvet (F)",
        "readout.glassCharge": "Cam Yükü (Q1)",
        "readout.plasticCharge": "Plastik Yükü (Q2)",
        "readout.elapsed": "Geçen Süre",
        "readout.distance": "Anlık Mesafe",
        "panel.mathExpression": "Matematik İfadesi",

        // Report builder
        "report.title": "Rapor Oluşturucu",
        "report.export": "Raporu Dışa Aktar",
        "report.exportExcel": "Excel",
        "report.exportHtml": "HTML",
        "report.titleLabel": "Rapor Başlığı",
        "report.defaultTitle": "İnteraktif Fizik Lab Raporu",
        "report.chooseExpression": "İfade Seçin",
        "report.addCurrent": "Mevcut değerleri rapora ekle",
        "report.hint": 'İpucu: Export sonrası dosyayı açıp tarayıcıdan <b>Print → Save as PDF</b> ile PDF alabilirsin.',
        "report.hintDisabled": 'Rapor yakalama yer tutucu modüllerde devre dışı. <b>Elektrostatik</b> modülüne geçin.',
        "report.noItems": "Henüz kaydedilmiş ifade yok. Yukarıdaki butonu kullanarak ekleyin.",

        // Controls (no controls)
        "controls.noControls": "Kullanılabilir kontrol yok",
        "controls.noControlsDesc": "Bu deney bir yer tutucu modüldür.",

        // Learning placeholder
        "learning.placeholder": "Yer tutucu modül. İçerik için Elektrostatik'e geçin.",
        "learning.loading": "Yükleniyor…",

        // Boot / log messages
        "log.expLoaded": "Deney yüklendi: ",
        "log.bootFailed": "Başlatma başarısız — backend bağlantısını kontrol edin.",
        "log.reportOnly": "Rapor yakalama sadece Elektrostatik'te kullanılabilir.",
        "log.savedToReport": "Rapora kaydedildi: ",
        "log.simPaused": "Simülasyon duraklatıldı.",
        "log.simResumed": "Simülasyon devam ettirildi.",
        "log.simReset": "Simülasyon ortamı sıfırlandı.",

        // Electrostatics experiment
        "exp.electrostatics.name": "Elektrostatik: Cam vs Plastik (İpek & Yün)",
        "exp.electrostatics.rubGlass": "Cam Çubuğu İpek ile Ov",
        "exp.electrostatics.rubPlastic": "Plastik Çubuğu Yün ile Ov",
        "exp.electrostatics.glassCharge": "Cam Yükü (Q1)",
        "exp.electrostatics.plasticCharge": "Plastik Yükü (Q2)",
        "exp.electrostatics.distance": "Çubuk Mesafesi",
        "exp.electrostatics.showCharges": "Yükleri Göster",
        "exp.electrostatics.showForces": "Kuvvet Oklarını Göster",

        "force.none": "Kuvvet Yok (Nötr)",
        "force.attractive": "Çekme Kuvveti",
        "force.repulsive": "İtme Kuvveti",

        "exp.electrostatics.rubGlassLog": "Cam çubuk ipek ile ovuldu → +1.0 µC yük eklendi",
        "exp.electrostatics.rubPlasticLog": "Plastik çubuk yün ile ovuldu → -1.0 µC yük eklendi",

        // Learning content
        "learning.summary": 'Malzemeleri birbirine ovduğunuzda elektronlar hareket eder. '
            + '<span class="font-bold text-sky-600 dark:text-sky-400">Camı ipek ile</span> '
            + 'ovmak camı pozitif (+) yüklü bırakır. '
            + '<span class="font-bold text-amber-700 dark:text-amber-500">Plastiği yün ile</span> '
            + 'ovmak plastiği negatif (-) yüklü bırakır.',
        "learning.concept1.title": "Sürtünme ile Yükleme",
        "learning.concept1.desc": "Elektronların bir yüksüz cisimden diğerine aktarılması.",
        "learning.concept2.title": "Coulomb Yasası",
        "learning.concept2.desc": "İki yük arasındaki kuvvet, çarpımlarıyla orantılı ve mesafenin karesiyle ters orantılıdır.",

        // Report export HTML
        "export.createdAt": "Oluşturulma tarihi: ",
        "export.savedExpressions": "Kaydedilmiş İfadeler",
        "export.expression": "İfade",
        "export.timestamp": "Zaman Damgası",
        "export.noItems": "Kaydedilmiş öğe yok.",
        "export.hint": 'PDF olarak dışa aktar: Tarayıcı Yazdır → "PDF olarak Kaydet".',
        "lang.toggle": "EN",

        // Coulomb's Law experiment
        "exp.coulomb_law.name": "Coulomb Yasası: Adım Adım",
        "exp.coulomb_law.title": "Coulomb Yasası Deneyi",
        "exp.coulomb_law.stepDesc": "Parametreleri girin",
        "exp.coulomb_law.q1": "Yük q₁ (µC)",
        "exp.coulomb_law.q2": "Yük q₂ (µC)",
        "exp.coulomb_law.mass1": "Kütle m₁ (g)",
        "exp.coulomb_law.mass2": "Kütle m₂ (g)",
        "exp.coulomb_law.distance": "Mesafe r (cm)",
        "exp.coulomb_law.time": "Süre t (s)",
        "exp.coulomb_law.calcPreview": "Kinematik Simülasyon",
        "exp.coulomb_law.elecForce": "Elektrostatik Kuvvet (F)",
        "exp.coulomb_law.accel1": "İvme a₁",
        "exp.coulomb_law.accel2": "İvme a₂",
        "exp.coulomb_law.vel1": "Hız v₁",
        "exp.coulomb_law.vel2": "Hız v₂",
        "exp.coulomb_law.disp1": "Yer Değiştirme s₁",
        "exp.coulomb_law.disp2": "Yer Değiştirme s₂",
        "exp.coulomb_law.prev": "Önceki",
        "exp.coulomb_law.calculate": "Simüle Et",
        "exp.coulomb_law.step1": "Adım 1: Yük değerlerini girin",
        "exp.coulomb_law.step2": "Adım 2: Kütle değerlerini girin",
        "exp.coulomb_law.step3": "Adım 3: Mesafe ve zamanı ayarlayın",
        "exp.coulomb_law.step4": "Adım 4: Kuvveti hesaplayın",
        "exp.coulomb_law.step5": "Adım 5: İvme ve hızı gözlemleyin",
        "exp.coulomb_law.step6": "Adım 6: Sonuçları rapora ekleyin",
        "exp.coulomb_law.stepChanged": "Adım değiştirildi.",
        "exp.coulomb_law.calculated": "Sonuçlar hesaplandı.",

        // Simulator status messages
        "sim.status.idle": "Parametreleri girin ve simülasyonu başlatın",
        "sim.status.running": "Simülasyon çalışıyor…",
        "sim.status.paused": "Duraklatıldı",
        "sim.status.done": "Simülasyon tamamlandı",

        "learning.coulomb.summary": 'Coulomb Yasası, iki nokta yükü arasındaki '
            + 'elektrostatik kuvveti tanımlar. '
            + 'Kuvvet, yüklerin çarpımıyla doğru orantılı '
            + 've aralarındaki mesafenin karesiyle ters orantılıdır.',
        "learning.coulomb.concept1.title": "Coulomb Yasası",
        "learning.coulomb.concept1.desc": "F = k · |q₁·q₂| / r²  formülü ile hesaplanır. k = 8.99×10⁹ N·m²/C².",
        "learning.coulomb.concept2.title": "Çekme ve İtme",
        "learning.coulomb.concept2.desc": "Zıt işaretli yükler birbirini çeker, aynı işaretli yükler birbirini iter.",
        "learning.coulomb.concept3.title": "Newton'un İkinci Yasası",
        "learning.coulomb.concept3.desc": "F = m·a ilişkisi ile kuvvetten ivme, hız ve yer değiştirme hesaplanır.",
    },

    // ──────────────────────── ENGLISH ───────────────────────
    en: {
        "header.title": "Interactive Physics Lab",
        "header.experiments": "Experiments",
        "status.ready": "Ready",
        "status.running": "Simulation: Running",
        "status.paused": "Simulation: Paused",
        "status.done": "Simulation Complete",

        "sidebar.experimentControls": "Experiment Controls",
        "sidebar.global": "Global",
        "btn.startSim": "Start Simulation",
        "btn.pause": "Pause",
        "btn.run": "Resume",
        "btn.reset": "Reset",

        "sidebar.fileManager": "File Manager",
        "file.dropHint": "Click or drag a file here",
        "file.upload": "Upload Selected File",
        "file.noFiles": "No uploaded files.",
        "file.deleted": "File deleted.",
        "file.uploaded": "File uploaded: ",
        "file.uploadFailed": "Upload failed: ",
        "sidebar.footer": "All operations powered by FastAPI backend.",

        "placeholder.title": "Experiment module not implemented yet",
        "placeholder.desc": "This is a placeholder. Select Electrostatics to see a working simulation.",

        "label.glassRod": "Glass Rod",
        "label.plasticRod": "Plastic Rod",
        "label.silk": "Silk",
        "label.wool": "Wool",

        "log.title": "System Log",

        "panel.learning": "Learning Panel",
        "panel.coreConcepts": "Core Concepts",
        "panel.liveReadouts": "Live Readouts",
        "readout.totalForce": "Total Force (F)",
        "readout.glassCharge": "Glass Charge (Q1)",
        "readout.plasticCharge": "Plastic Charge (Q2)",
        "readout.elapsed": "Elapsed Time",
        "readout.distance": "Live Distance",
        "panel.mathExpression": "Math Expression",

        "report.title": "Report Builder",
        "report.export": "Export Report",
        "report.exportExcel": "Excel",
        "report.exportHtml": "HTML",
        "report.titleLabel": "Report Title",
        "report.defaultTitle": "Interactive Physics Lab Report",
        "report.chooseExpression": "Choose Expression",
        "report.addCurrent": "Add current values to report",
        "report.hint": 'Tip: Export sonrası dosyayı açıp tarayıcıdan <b>Print → Save as PDF</b> ile PDF alabilirsin.',
        "report.hintDisabled": 'Report capture is disabled in placeholder modules. Switch to <b>Electrostatics</b>.',
        "report.noItems": "No saved expressions yet. Add one using the button above.",

        "controls.noControls": "No controls available",
        "controls.noControlsDesc": "This experiment is a placeholder module.",

        "learning.placeholder": "Placeholder module. Switch to Electrostatics for content.",
        "learning.loading": "Loading…",

        "log.expLoaded": "Experiment loaded: ",
        "log.bootFailed": "Failed to initialize — check backend connection.",
        "log.reportOnly": "Report capture available in Electrostatics only.",
        "log.savedToReport": "Saved to report: ",
        "log.simPaused": "Simulation paused.",
        "log.simResumed": "Simulation resumed.",
        "log.simReset": "Simulation environment reset.",

        "exp.electrostatics.name": "Electrostatics: Glass vs Plastic (Silk & Wool)",
        "exp.electrostatics.rubGlass": "Rub Glass Rod with Silk",
        "exp.electrostatics.rubPlastic": "Rub Plastic Rod with Wool",
        "exp.electrostatics.glassCharge": "Glass Charge (Q1)",
        "exp.electrostatics.plasticCharge": "Plastic Charge (Q2)",
        "exp.electrostatics.distance": "Rod Distance",
        "exp.electrostatics.showCharges": "Show Charges",
        "exp.electrostatics.showForces": "Show Force Arrows",

        "force.none": "No Force (Neutral)",
        "force.attractive": "Attractive Force",
        "force.repulsive": "Repulsive Force",

        "exp.electrostatics.rubGlassLog": "Glass rod rubbed with silk → +1.0 µC charge added",
        "exp.electrostatics.rubPlasticLog": "Plastic rod rubbed with wool → -1.0 µC charge added",

        "learning.summary": 'When you rub materials together, electrons move. '
            + 'Rubbing <span class="font-bold text-sky-600 dark:text-sky-400">glass with silk</span> '
            + 'leaves the glass positively charged (+). Rubbing '
            + '<span class="font-bold text-amber-700 dark:text-amber-500">plastic with wool</span> '
            + 'leaves the plastic negatively charged (-).',
        "learning.concept1.title": "Charging by Friction",
        "learning.concept1.desc": "The transfer of electrons from one uncharged object to another.",
        "learning.concept2.title": "Coulomb's Law",
        "learning.concept2.desc": "Force between two charges is proportional to their product and inverse to distance².",

        "export.createdAt": "Created at: ",
        "export.savedExpressions": "Saved Expressions",
        "export.expression": "Expression",
        "export.timestamp": "Timestamp",
        "export.noItems": "No items saved.",
        "export.hint": 'Export as PDF: Browser Print → "Save as PDF".',
        "lang.toggle": "TR",

        // Coulomb's Law experiment
        "exp.coulomb_law.name": "Coulomb's Law: Step by Step",
        "exp.coulomb_law.title": "Coulomb's Law Experiment",
        "exp.coulomb_law.stepDesc": "Input Parameters",
        "exp.coulomb_law.q1": "Charge q₁ (µC)",
        "exp.coulomb_law.q2": "Charge q₂ (µC)",
        "exp.coulomb_law.mass1": "Mass m₁ (g)",
        "exp.coulomb_law.mass2": "Mass m₂ (g)",
        "exp.coulomb_law.distance": "Distance r (cm)",
        "exp.coulomb_law.time": "Duration t (s)",
        "exp.coulomb_law.calcPreview": "Kinematic Simulation",
        "exp.coulomb_law.elecForce": "Electrostatic Force (F)",
        "exp.coulomb_law.accel1": "Acceleration a₁",
        "exp.coulomb_law.accel2": "Acceleration a₂",
        "exp.coulomb_law.vel1": "Velocity v₁",
        "exp.coulomb_law.vel2": "Velocity v₂",
        "exp.coulomb_law.disp1": "Displacement s₁",
        "exp.coulomb_law.disp2": "Displacement s₂",
        "exp.coulomb_law.prev": "Previous",
        "exp.coulomb_law.calculate": "Simulate",
        "exp.coulomb_law.step1": "Step 1: Enter charge values",
        "exp.coulomb_law.step2": "Step 2: Enter mass values",
        "exp.coulomb_law.step3": "Step 3: Set distance and time",
        "exp.coulomb_law.step4": "Step 4: Calculate the force",
        "exp.coulomb_law.step5": "Step 5: Observe acceleration and velocity",
        "exp.coulomb_law.step6": "Step 6: Add results to report",
        "exp.coulomb_law.stepChanged": "Step changed.",
        "exp.coulomb_law.calculated": "Results calculated.",

        // Simulator status messages
        "sim.status.idle": "Enter parameters and start the simulation",
        "sim.status.running": "Simulation running…",
        "sim.status.paused": "Paused",
        "sim.status.done": "Simulation complete",

        "learning.coulomb.summary": "Coulomb's Law describes the electrostatic force "
            + "between two point charges. The force is directly proportional to "
            + "the product of charges and inversely proportional to the square of their distance.",
        "learning.coulomb.concept1.title": "Coulomb's Law",
        "learning.coulomb.concept1.desc": "Calculated using F = k · |q₁·q₂| / r². k = 8.99×10⁹ N·m²/C².",
        "learning.coulomb.concept2.title": "Attraction and Repulsion",
        "learning.coulomb.concept2.desc": "Opposite charges attract, like charges repel each other.",
        "learning.coulomb.concept3.title": "Newton's Second Law",
        "learning.coulomb.concept3.desc": "Using F = m·a, we can derive acceleration, velocity and displacement from the force.",
    },
};

let currentLang = localStorage.getItem("physlab_lang") || "tr";

/**
 * Get translation for a key.
 * Falls back to English, then returns the key itself.
 */
function t(key) {
    return TRANSLATIONS[currentLang]?.[key]
        ?? TRANSLATIONS["en"]?.[key]
        ?? key;
}

/**
 * Apply translations to all elements with `data-i18n` attribute.
 * Supports `data-i18n-html` for elements needing innerHTML.
 */
function applyI18nDOM() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        el.innerHTML = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        el.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-value]").forEach(el => {
        const key = el.getAttribute("data-i18n-value");
        el.value = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
        const key = el.getAttribute("data-i18n-title");
        el.title = t(key);
    });
    document.documentElement.lang = currentLang;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem("physlab_lang", lang);
    applyI18nDOM();
}

function toggleLang() {
    setLang(currentLang === "tr" ? "en" : "tr");
}

function getLang() {
    return currentLang;
}
