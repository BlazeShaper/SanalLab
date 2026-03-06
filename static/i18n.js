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
        "status.running": "Simülasyon: Çalışıyor",
        "status.paused": "Simülasyon: Duraklatıldı",

        // Left sidebar
        "sidebar.experimentControls": "Deney Kontrolleri",
        "sidebar.global": "Genel",
        "btn.pause": "Duraklat",
        "btn.run": "Çalıştır",
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
        "panel.mathExpression": "Matematik İfadesi",

        // Report builder
        "report.title": "Rapor Oluşturucu",
        "report.export": "Raporu Dışa Aktar",
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
        "exp.electrostatics.distance": "Çubuk Mesafesi",
        "exp.electrostatics.showCharges": "Yükleri Göster",
        "exp.electrostatics.showForces": "Kuvvet Oklarını Göster",

        "force.none": "Kuvvet Yok (Nötr)",
        "force.attractive": "Çekme Kuvveti",
        "force.repulsive": "İtme Kuvveti",

        "exp.electrostatics.rubGlassLog": "Cam çubuk ipek ile ovuldu → pozitif yük uygulandı (+5.0 µC)",
        "exp.electrostatics.rubPlasticLog": "Plastik çubuk yün ile ovuldu → negatif yük uygulandı (-5.0 µC)",

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
    },

    // ──────────────────────── ENGLISH ───────────────────────
    en: {
        "header.title": "Interactive Physics Lab",
        "header.experiments": "Experiments",
        "status.running": "Simulation: Running",
        "status.paused": "Simulation: Paused",

        "sidebar.experimentControls": "Experiment Controls",
        "sidebar.global": "Global",
        "btn.pause": "Pause",
        "btn.run": "Run",
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
        "panel.mathExpression": "Math Expression",

        "report.title": "Report Builder",
        "report.export": "Export Report",
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
        "exp.electrostatics.distance": "Rod Distance",
        "exp.electrostatics.showCharges": "Show Charges",
        "exp.electrostatics.showForces": "Show Force Arrows",

        "force.none": "No Force (Neutral)",
        "force.attractive": "Attractive Force",
        "force.repulsive": "Repulsive Force",

        "exp.electrostatics.rubGlassLog": "Glass rod rubbed with silk -> positive charge applied (+5.0 µC)",
        "exp.electrostatics.rubPlasticLog": "Plastic rod rubbed with wool -> negative charge applied (-5.0 µC)",

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
