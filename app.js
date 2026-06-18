// ============================================================
//  MediConnect — Application Logic (app.js)
//  Single-Page Application Router & Workflow Manager
// ============================================================

"use strict";

// ── App State ────────────────────────────────────────────────
const AppState = {
  currentView: "home",
  redirectAfterLogin: null,
  currentHistoryFilter: "all",
  doctorWorkflow: {
    step: 1,
    area: "",
    mode: null,           // "profile" | "symptoms"
    filteredDoctors: [],
    selectedDoctor: null,
    selectedSpecialty: null,
    selectedSlot: null,
    selectedDate: null,
  },
  pharmacyWorkflow: {
    area: "",
    filteredPharmacies: [],
    selectedPharmacy: null,
    mapPinX: 50,
    mapPinY: 50,
  },
  doctorMapPin: { x: 50, y: 45 },
};

// ── Profile Helpers ───────────────────────────────────────────
function getSavedArea() {
  return (UserStore.getProfile().area || "").trim();
}

function getSavedProfile() {
  return UserStore.getProfile();
}

function updateNavbarProfile() {
  const loggedIn = UserStore.isLoggedIn();
  const p = getSavedProfile();
  const profileBtn = document.getElementById("navbar-profile-btn");
  const logoutBtn = document.getElementById("navbar-logout-btn");
  const historyLink = document.getElementById("nav-history-link");

  if (historyLink) {
    historyLink.style.display = loggedIn ? "block" : "none";
  }
  if (logoutBtn) {
    logoutBtn.style.display = loggedIn ? "inline-flex" : "none";
  }

  if (profileBtn) {
    if (loggedIn && p.name) {
      profileBtn.innerHTML = `<i class="bi bi-person-check-fill"></i> ${p.name.split(" ")[0]}`;
      profileBtn.style.background = "linear-gradient(135deg,var(--secondary),var(--secondary-dark))";
      profileBtn.style.color = "white";
    } else {
      profileBtn.innerHTML = `<i class="bi bi-box-arrow-in-right"></i> Login`;
      profileBtn.style.background = "";
      profileBtn.style.color = "";
    }
  }
}

// ── View Router ──────────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll(".mc-view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add("active");
    AppState.currentView = viewId;
    window.scrollTo({ top: 0, behavior: "smooth" });
    updateNavLinks(viewId);
  }
}

function updateNavLinks(viewId) {
  document.querySelectorAll(".mc-nav-links a[data-view]").forEach((a) => {
    a.classList.toggle("active", a.dataset.view === viewId);
  });
}

// ── Map Mock Component ───────────────────────────────────────
function initMap(containerId, pinCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.addEventListener("click", function (e) {
    const rect = this.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    let pin = this.querySelector(".mc-map-pin");
    if (!pin) {
      pin = document.createElement("div");
      pin.className = "mc-map-pin";
      pin.innerHTML = '<i class="bi bi-geo-alt-fill"></i>';
      this.appendChild(pin);
    }
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
    if (pinCallback) pinCallback(x, y);
  });
}

// ── Render Stars ─────────────────────────────────────────────
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "";
  for (let i = 0; i < full; i++) stars += '<i class="bi bi-star-fill mc-star"></i>';
  if (half) stars += '<i class="bi bi-star-half mc-star"></i>';
  return `<span class="mc-star-rating">${stars} <span class="text-muted ms-1">${rating}</span></span>`;
}

// ── Doctor Workflow ───────────────────────────────────────────
async function initDoctorWorkflow() {
  if (!UserStore.isLoggedIn()) {
    AppState.redirectAfterLogin = "doctor";
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "warning",
      title: "Please log in to continue.",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    navigateTo("login");
    return;
  }
  showView("doctor");
  AppState.doctorWorkflow = {
    step: 1,
    area: getSavedArea(),  // ← pre-fill from localStorage
    mode: null,
    filteredDoctors: [],
    selectedDoctor: null,
    selectedSpecialty: null,
    selectedSlot: null,
    selectedDate: null,
  };
  renderDoctorStep1();
  updateDoctorSidebar(1);
  updateDoctorHistorySidebar();
}

function updateDoctorSidebar(activeStep) {
  document.querySelectorAll("#view-doctor .mc-sidebar-step").forEach((el) => {
    const step = parseInt(el.dataset.step);
    el.classList.remove("active", "done");
    if (step === activeStep) el.classList.add("active");
    else if (step < activeStep) el.classList.add("done");
  });
}

// Step 1: Location entry
function renderDoctorStep1() {
  const content = document.getElementById("doctor-workflow-content");
  const savedArea = getSavedArea();
  const profile   = getSavedProfile();
  const autoFillNote = savedArea
    ? `<div class="mc-info-box" style="background:var(--primary-light);border-color:rgba(15,111,255,0.25);margin-bottom:1rem;">
        <i class="bi bi-person-check-fill" style="color:var(--primary);"></i>
        <div><strong>Auto-filled from your profile:</strong> Living area set to <strong>${profile.area}</strong>. You can change it below.</div>
       </div>`
    : "";

  content.innerHTML = `
    <div class="mc-step-panel">
      <div class="mc-step-badge"><i class="bi bi-geo-alt"></i> Step 1 of 3</div>
      <h3 class="mc-step-title">Enter Your Location</h3>
      <p class="mc-step-subtitle">We'll find doctors near you. Enter your area or use the map.</p>
      <div class="mc-breadcrumb">
        <span class="mc-breadcrumb-item active"><i class="bi bi-house-door me-1"></i>Location</span>
      </div>

      ${autoFillNote}

      <div class="row g-3 mb-3">
        <div class="col-md-8">
          <label class="mc-label">Area / Locality</label>
          <div class="mc-input-wrap">
            <i class="bi bi-geo-alt"></i>
            <input id="doc-area-input" class="mc-input" type="text"
              placeholder="e.g. Gulberg, DHA, Johar Town, Model Town"
              value="${savedArea}" />
          </div>
        </div>
        <div class="col-md-4 d-flex align-items-end">
          <button class="mc-btn mc-btn-primary mc-btn-full" onclick="submitDoctorLocation()">
            <i class="bi bi-search"></i> Find Doctors
          </button>
        </div>
      </div>

      <div class="mc-divider">or pick on map</div>

      <label class="mc-label mb-2"><i class="bi bi-map me-1"></i>Select via Map <span class="text-muted fs-sm">(click to place pin)</span></label>
      <div class="mc-map-container" id="doctor-map">
        <div class="mc-map-bg"></div>
        <svg class="mc-map-roads" viewBox="0 0 400 220">
          <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(15,111,255,0.15)" stroke-width="8"/>
          <line x1="0" y1="160" x2="400" y2="160" stroke="rgba(15,111,255,0.1)" stroke-width="5"/>
          <line x1="120" y1="0" x2="120" y2="220" stroke="rgba(15,111,255,0.15)" stroke-width="8"/>
          <line x1="280" y1="0" x2="280" y2="220" stroke="rgba(15,111,255,0.1)" stroke-width="5"/>
          <rect x="130" y="15" width="60" height="55" rx="4" fill="rgba(15,111,255,0.06)" stroke="rgba(15,111,255,0.1)" stroke-width="1"/>
          <rect x="210" y="15" width="55" height="55" rx="4" fill="rgba(0,201,167,0.06)" stroke="rgba(0,201,167,0.1)" stroke-width="1"/>
          <rect x="130" y="90" width="40" height="60" rx="4" fill="rgba(15,111,255,0.06)" stroke="rgba(15,111,255,0.1)" stroke-width="1"/>
          <rect x="295" y="90" width="50" height="45" rx="4" fill="rgba(0,201,167,0.06)" stroke="rgba(0,201,167,0.1)" stroke-width="1"/>
          <text x="155" y="48" text-anchor="middle" fill="rgba(15,111,255,0.4)" font-size="8" font-family="Inter">Hospital</text>
          <text x="237" y="44" text-anchor="middle" fill="rgba(0,201,167,0.5)" font-size="8" font-family="Inter">Clinic</text>
        </svg>
        <div class="mc-map-label"><i class="bi bi-cursor text-primary"></i> Click anywhere to set your location</div>
      </div>

      <div class="mc-info-box mt-3">
        <i class="bi bi-info-circle-fill"></i>
        <div><strong>Tip:</strong> Try "Gulberg", "DHA", "Johar Town", or "Model Town" to see available doctors.
          ${!savedArea ? ' Save your area in <strong>My Profile</strong> to auto-fill it next time.' : ''}
        </div>
      </div>
    </div>
  `;
  initMap("doctor-map", (x, y) => {
    AppState.doctorMapPin = { x, y };
    const areas = ["Gulberg", "DHA Phase 5", "Johar Town", "Model Town"];
    const picked = areas[Math.floor((x / 100) * areas.length)];
    document.getElementById("doc-area-input").value = picked;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `📍 Location set to ${picked}`,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  });
  document.getElementById("doc-area-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitDoctorLocation();
  });
}

async function submitDoctorLocation() {
  const area = document.getElementById("doc-area-input").value.trim();
  if (!area) {
    Swal.fire({
      icon: "warning",
      title: "Location Required",
      text: "Please enter your area or select it on the map.",
      confirmButtonColor: "#0f6fff",
    });
    return;
  }
  AppState.doctorWorkflow.area = area;
  AppState.doctorWorkflow.step = 2;
  updateDoctorSidebar(2);
  renderDoctorStep2Options();
}

// Step 2: Choose mode
function renderDoctorStep2Options() {
  const content = document.getElementById("doctor-workflow-content");
  content.innerHTML = `
    <div class="mc-step-panel">
      <div class="mc-step-badge"><i class="bi bi-stethoscope"></i> Step 2 of 3</div>
      <h3 class="mc-step-title">How would you like to find a Doctor?</h3>
      <p class="mc-step-subtitle">Area: <strong>${AppState.doctorWorkflow.area}</strong></p>
      <div class="mc-breadcrumb">
        <span class="mc-breadcrumb-item"><a onclick="renderDoctorStep1(); updateDoctorSidebar(1);">Location</a></span>
        <span class="mc-breadcrumb-sep"><i class="bi bi-chevron-right"></i></span>
        <span class="mc-breadcrumb-item active">Search Method</span>
      </div>

      <div class="mc-option-grid mt-2">
        <button class="mc-option-btn" id="opt-profile" onclick="selectDoctorMode('profile')">
          <span class="mc-option-icon">👨‍⚕️</span>
          <span class="mc-option-label">Search by Doctor Profile</span>
          <span class="mc-option-desc">Browse doctors, specialties & ratings</span>
        </button>
        <button class="mc-option-btn" id="opt-symptoms" onclick="selectDoctorMode('symptoms')">
          <span class="mc-option-icon">🩺</span>
          <span class="mc-option-label">Search by Symptoms</span>
          <span class="mc-option-desc">Describe what you're feeling</span>
        </button>
      </div>
    </div>
    <div id="doctor-mode-content" class="mt-0"></div>
  `;
}

async function selectDoctorMode(mode) {
  AppState.doctorWorkflow.mode = mode;
  document.querySelectorAll(".mc-option-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(`opt-${mode}`).classList.add("active");

  if (mode === "profile") {
    await renderDoctorProfileList();
  } else {
    renderSymptomsForm();
  }
}

async function renderDoctorProfileList(specialtyFilter = null) {
  const modeContent = document.getElementById("doctor-mode-content");
  modeContent.innerHTML = `
    <div class="mc-step-panel mt-3">
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 class="mc-step-title mb-0">Available Doctors Near You</h4>
          ${specialtyFilter ? `<span class="mc-specialty-badge mt-1 d-inline-block" style="background:var(--primary-light);color:var(--primary);padding:2px 10px;border-radius:999px;font-size:0.78rem;font-weight:700;">Filtered: ${specialtyFilter}</span>` : ""}
        </div>
        <div class="mc-input-wrap" style="width:220px;">
          <i class="bi bi-funnel"></i>
          <select class="mc-select" id="specialty-filter" onchange="applySpecialtyFilter(this.value)" style="padding-left:38px;">
            <option value="">All Specialties</option>
            <option value="General Physician" ${specialtyFilter === "General Physician" ? "selected" : ""}>General Physician</option>
            <option value="Cardiologist" ${specialtyFilter === "Cardiologist" ? "selected" : ""}>Cardiologist</option>
            <option value="Dermatologist" ${specialtyFilter === "Dermatologist" ? "selected" : ""}>Dermatologist</option>
            <option value="Neurologist" ${specialtyFilter === "Neurologist" ? "selected" : ""}>Neurologist</option>
            <option value="Pediatrician" ${specialtyFilter === "Pediatrician" ? "selected" : ""}>Pediatrician</option>
            <option value="Orthopedist" ${specialtyFilter === "Orthopedist" ? "selected" : ""}>Orthopedist</option>
            <option value="Gynecologist" ${specialtyFilter === "Gynecologist" ? "selected" : ""}>Gynecologist</option>
          </select>
        </div>
      </div>
      <div class="mc-loading-state" id="doctor-list-loader">
        <div class="mc-spinner-dark"></div>
        <p class="mb-0 mt-2">Searching nearby doctors…</p>
      </div>
      <div class="mc-doctor-grid" id="doctor-card-list"></div>
    </div>
  `;

  const doctors = await Database.getDoctors(AppState.doctorWorkflow.area);
  let filtered = doctors;
  if (specialtyFilter) {
    filtered = doctors.filter((d) => d.specialty === specialtyFilter);
    if (!filtered.length) filtered = DB_DOCTORS.filter((d) => d.specialty === specialtyFilter);
  }
  AppState.doctorWorkflow.filteredDoctors = filtered;

  document.getElementById("doctor-list-loader").style.display = "none";
  const grid = document.getElementById("doctor-card-list");

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="mc-empty-state" style="grid-column:1/-1">
        <i class="bi bi-search"></i>
        <p>No doctors found. Try a different area or specialty.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (d) => `
    <div class="mc-doctor-card" onclick="selectDoctorForBooking(${d.id})" id="doc-card-${d.id}">
      <div class="d-flex align-items-start gap-3 mb-3">
        <div class="mc-doctor-avatar">👨‍⚕️</div>
        <div class="flex-grow-1">
          <div class="mc-doctor-name">${d.name}</div>
          <span class="mc-doctor-specialty"><i class="bi bi-heart-pulse"></i> ${d.specialty}</span>
        </div>
      </div>
      <div class="mc-doctor-meta">
        <div class="mc-doctor-meta-item"><i class="bi bi-briefcase"></i> ${d.experience} yrs exp</div>
        <div class="mc-doctor-meta-item"><i class="bi bi-geo-alt"></i> ${d.location}</div>
      </div>
      <div class="d-flex align-items-center justify-content-between mt-3">
        ${renderStars(d.rating)}
        <span style="font-size:0.82rem;font-weight:700;color:var(--primary);">Rs. ${d.fee.toLocaleString()}</span>
      </div>
      <div class="mt-3">
        <button class="mc-btn mc-btn-primary mc-btn-sm mc-btn-full">
          <i class="bi bi-calendar-check"></i> Book Appointment
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

function applySpecialtyFilter(specialty) {
  renderDoctorProfileList(specialty || null);
}

function renderSymptomsForm() {
  const modeContent = document.getElementById("doctor-mode-content");
  modeContent.innerHTML = `
    <div class="mc-step-panel mt-3">
      <h4 class="mc-step-title">Describe Your Symptoms</h4>
      <p class="mc-step-subtitle">We'll identify the right specialist for you.</p>

      <div class="row g-3">
        <div class="col-12">
          <label class="mc-label">Symptoms Description *</label>
          <textarea id="sym-text" class="mc-textarea" placeholder="e.g. I have fever, headache and body ache for 3 days..."></textarea>
        </div>
        <div class="col-md-6">
          <label class="mc-label">Age *</label>
          <div class="mc-input-wrap">
            <i class="bi bi-person-badge"></i>
            <input id="sym-age" class="mc-input" type="number" min="1" max="120" placeholder="e.g. 35" />
          </div>
        </div>
        <div class="col-md-6">
          <label class="mc-label">Gender *</label>
          <div class="mc-input-wrap">
            <i class="bi bi-gender-ambiguous"></i>
            <select id="sym-gender" class="mc-select">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="col-12">
          <button class="mc-btn mc-btn-primary" onclick="analyzeSymptoms()">
            <i class="bi bi-cpu"></i> Analyze Symptoms
          </button>
        </div>
      </div>

      <div id="symptom-result" class="mt-3"></div>
    </div>
  `;
}

async function analyzeSymptoms() {
  const symptoms = document.getElementById("sym-text").value.trim();
  const age = document.getElementById("sym-age").value;
  const gender = document.getElementById("sym-gender").value;

  if (!symptoms || !age || !gender) {
    Swal.fire({
      icon: "warning",
      title: "Incomplete Information",
      text: "Please fill in all fields — symptoms, age, and gender.",
      confirmButtonColor: "#0f6fff",
    });
    return;
  }

  const specialty = Database.getSymptomSpecialty(symptoms);
  AppState.doctorWorkflow.selectedSpecialty = specialty;

  const resultEl = document.getElementById("symptom-result");
  resultEl.innerHTML = `
    <div class="mc-specialist-result">
      <div class="mc-specialist-result-icon"><i class="bi bi-activity"></i></div>
      <div>
        <div style="font-size:0.8rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Recommended Specialist</div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--primary);margin:2px 0;">${specialty}</div>
        <div style="font-size:0.82rem;color:var(--text-secondary);">Based on: <em>${symptoms.substring(0, 60)}${symptoms.length > 60 ? "…" : ""}</em></div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">Patient: ${gender}, Age ${age}</div>
      </div>
    </div>
    <div class="mt-3 d-flex gap-2 flex-wrap">
      <button class="mc-btn mc-btn-primary" onclick="goToFilteredDoctors('${specialty}')">
        <i class="bi bi-people"></i> View ${specialty}s Near Me
      </button>
      <button class="mc-btn mc-btn-ghost mc-btn-sm" onclick="selectDoctorMode('symptoms')">
        <i class="bi bi-arrow-counterclockwise"></i> Re-analyze
      </button>
    </div>
  `;
}

async function goToFilteredDoctors(specialty) {
  AppState.doctorWorkflow.mode = "profile";
  // Rebuild step 2 with profile mode selected
  renderDoctorStep2Options();
  document.getElementById("opt-profile").classList.add("active");
  await renderDoctorProfileList(specialty);
}

async function selectDoctorForBooking(doctorId) {
  const doc = await Database.getDoctorById(doctorId);
  if (!doc) return;
  AppState.doctorWorkflow.selectedDoctor = doc;
  AppState.doctorWorkflow.step = 3;
  updateDoctorSidebar(3);
  renderAppointmentPage(doc);
}

// Step 3: Book Appointment
function renderAppointmentPage(doc) {
  const content = document.getElementById("doctor-workflow-content");
  const profile = getSavedProfile();

  content.innerHTML = `
    <div class="mc-breadcrumb">
      <span class="mc-breadcrumb-item"><a onclick="initDoctorWorkflow()"><i class="bi bi-house-door me-1"></i>Home</a></span>
      <span class="mc-breadcrumb-sep"><i class="bi bi-chevron-right"></i></span>
      <span class="mc-breadcrumb-item"><a onclick="renderDoctorStep2Options(); updateDoctorSidebar(2);">Find Doctor</a></span>
      <span class="mc-breadcrumb-sep"><i class="bi bi-chevron-right"></i></span>
      <span class="mc-breadcrumb-item active">Book Appointment</span>
    </div>

    <div class="mc-step-panel">
      <div class="mc-step-badge"><i class="bi bi-calendar-check"></i> Step 3 of 3</div>
      <h3 class="mc-step-title">Book Your Appointment</h3>

      <!-- Doctor Header -->
      <div class="mc-doctor-profile-header">
        <div class="mc-doctor-profile-avatar">👨‍⚕️</div>
        <div>
          <h4 class="mb-0" style="font-size:1.1rem;">${doc.name}</h4>
          <div class="mt-1"><span class="mc-doctor-specialty">${doc.specialty}</span></div>
          <div class="mc-doctor-meta mt-2">
            <div class="mc-doctor-meta-item"><i class="bi bi-briefcase"></i> ${doc.experience} yrs experience</div>
            <div class="mc-doctor-meta-item"><i class="bi bi-geo-alt"></i> ${doc.location}</div>
            <div class="mc-doctor-meta-item"><i class="bi bi-telephone"></i> ${doc.phone}</div>
          </div>
          <div class="d-flex align-items-center gap-2 mt-2">
            ${renderStars(doc.rating)}
            <span style="font-size:0.85rem;font-weight:700;color:var(--primary);">Consultation Fee: Rs. ${doc.fee.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Patient Details — pre-filled from localStorage profile -->
      <h5 class="fw-700 mb-3" style="font-size:0.95rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Patient Information</h5>
      ${profile.name ? `<div class="mc-info-box" style="margin-bottom:1rem;"><i class="bi bi-person-check-fill" style="color:var(--primary);"></i><div><strong>Profile auto-filled</strong> from your saved profile. Edit if needed.</div></div>` : ''}
      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <label class="mc-label">Full Name *</label>
          <div class="mc-input-wrap">
            <i class="bi bi-person"></i>
            <input id="pt-name" class="mc-input" type="text" placeholder="Your full name"
              value="${profile.name || ''}" oninput="checkPatientHistory()" />
          </div>
        </div>
        <div class="col-md-4">
          <label class="mc-label">Gender *</label>
          <div class="mc-input-wrap">
            <i class="bi bi-gender-ambiguous"></i>
            <select id="pt-gender" class="mc-select" onchange="checkPatientHistory()">
              <option value="">Select Gender</option>
              <option ${profile.gender==='Male'?'selected':''}>Male</option>
              <option ${profile.gender==='Female'?'selected':''}>Female</option>
              <option ${profile.gender==='Other'?'selected':''}>Other</option>
            </select>
          </div>
        </div>
        <div class="col-md-4">
          <label class="mc-label">Your Area *</label>
          <div class="mc-input-wrap">
            <i class="bi bi-geo-alt"></i>
            <input id="pt-area" class="mc-input" type="text" placeholder="e.g. Gulberg"
              oninput="checkPatientHistory()"
              value="${AppState.doctorWorkflow.area || profile.area || ''}" />
          </div>
        </div>
        <div class="col-md-6">
          <label class="mc-label">Phone Number *</label>
          <div class="mc-input-wrap">
            <i class="bi bi-telephone"></i>
            <input id="pt-phone" class="mc-input" type="tel" placeholder="+92-300-0000000"
              value="${profile.phone || ''}" />
          </div>
        </div>
        <div class="col-md-6">
          <label class="mc-label">Email (Optional)</label>
          <div class="mc-input-wrap">
            <i class="bi bi-envelope"></i>
            <input id="pt-email" class="mc-input" type="email" placeholder="your@email.com"
              value="${profile.email || ''}" />
          </div>
        </div>
        <div class="col-12">
          <label class="mc-label">
            <i class="bi bi-file-medical me-1"></i>Medical History
            <span id="history-badge" style="display:none;background:var(--success);color:white;font-size:0.72rem;" class="ms-2 px-2 py-1 rounded-pill">Auto-filled</span>
          </label>
          <div id="history-status" class="mb-2"></div>
          <textarea id="pt-history" class="mc-textarea" placeholder="Enter any known medical history, allergies, or current medications..."></textarea>
        </div>
      </div>

      <!-- Booking Method -->
      <h5 class="fw-700 mb-3" style="font-size:0.95rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Choose Booking Method</h5>
      <div class="mc-option-grid mb-4">
        <button class="mc-option-btn" onclick="selectBookingMethod('call', ${doc.id})">
          <span class="mc-option-icon">📞</span>
          <span class="mc-option-label">Call to Book</span>
          <span class="mc-option-desc">${doc.phone}</span>
        </button>
        <button class="mc-option-btn" onclick="selectBookingMethod('online', ${doc.id})" id="book-online-btn">
          <span class="mc-option-icon">💻</span>
          <span class="mc-option-label">Book Online</span>
          <span class="mc-option-desc">Select date & time slot</span>
        </button>
      </div>

      <div id="online-booking-section" class="hidden"></div>
    </div>
  `;

  setTimeout(checkPatientHistory, 400);
}

let historyCheckTimeout;
async function checkPatientHistory() {
  clearTimeout(historyCheckTimeout);
  historyCheckTimeout = setTimeout(async () => {
    const name   = document.getElementById("pt-name")?.value.trim();
    const gender = document.getElementById("pt-gender")?.value;
    const area   = document.getElementById("pt-area")?.value.trim();
    const docId  = AppState.doctorWorkflow.selectedDoctor?.id;

    if (!name || !gender || !area) return;

    const statusEl = document.getElementById("history-status");
    const badge    = document.getElementById("history-badge");
    if (!statusEl) return;

    statusEl.innerHTML = `<div class="text-muted" style="font-size:0.8rem;"><i class="bi bi-hourglass-split me-1"></i>Checking patient records…</div>`;

    const record = await Database.getPatientHistory(name, gender, area, docId);
    if (record) {
      document.getElementById("pt-history").value = record.history;
      badge.style.display = "inline-block";
      const source = record.source === "localStorage" ? "your appointment history" : "our database";
      statusEl.innerHTML = `
        <div class="mc-info-box" style="background:#d1fae5;border-color:rgba(16,185,129,0.4);color:#065f46;">
          <i class="bi bi-check-circle-fill" style="color:var(--success);"></i>
          <div><strong>Record found!</strong> Medical history auto-filled from <strong>${source}</strong>.</div>
        </div>
      `;
    } else {
      badge.style.display = "none";
      statusEl.innerHTML = ``;
    }
  }, 800);
}

function selectBookingMethod(method, docId) {
  const section = document.getElementById("online-booking-section");

  if (method === "call") {
    const doc = AppState.doctorWorkflow.selectedDoctor;
    Swal.fire({
      icon: "info",
      title: "📞 Call to Book",
      html: `
        <p>Please call the doctor's clinic directly to schedule your appointment.</p>
        <div style="background:#f0f4ff;padding:16px;border-radius:12px;margin-top:12px;">
          <div style="font-size:1.5rem;font-weight:800;color:#0f6fff;">${doc.phone}</div>
          <div style="font-size:0.85rem;color:#475569;margin-top:4px;">${doc.name} — ${doc.location}</div>
        </div>
      `,
      confirmButtonText: "Got it!",
      confirmButtonColor: "#0f6fff",
    });
    section.classList.add("hidden");
  } else {
    section.classList.remove("hidden");
    renderOnlineBookingSection(docId);
  }
}

function renderOnlineBookingSection(docId) {
  const doc = AppState.doctorWorkflow.selectedDoctor;
  const today = new Date().toISOString().split("T")[0];
  const slotsHTML = doc.slots
    .map((s) => {
      const isBooked = doc.bookedSlots.includes(s);
      return `<div class="mc-slot ${isBooked ? "mc-slot-booked" : ""}" ${
        !isBooked ? `onclick="selectSlot(this, '${s}')"` : "title='Slot already booked'"
      } data-slot="${s}">${s}${isBooked ? '<br><small>Taken</small>' : ""}</div>`;
    })
    .join("");

  const section = document.getElementById("online-booking-section");
  section.innerHTML = `
    <hr style="border-color:var(--border);margin:1.5rem 0;">
    <h5 class="fw-700 mb-3" style="font-size:0.95rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">
      <i class="bi bi-calendar3 me-1"></i>Schedule Your Visit
    </h5>

    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="mc-label">Select Date *</label>
        <input type="date" id="appt-date" min="${today}" value="${today}" onchange="AppState.doctorWorkflow.selectedDate = this.value" />
      </div>
    </div>

    <label class="mc-label mb-2">Select Time Slot *</label>
    <div class="mc-slot-grid mb-4" id="slot-grid">${slotsHTML}</div>

    <div class="d-flex gap-2 flex-wrap">
      <button class="mc-btn mc-btn-primary" onclick="confirmBooking(${docId})" id="confirm-booking-btn">
        <i class="bi bi-check-circle"></i> Confirm Booking
      </button>
      <button class="mc-btn mc-btn-ghost mc-btn-sm" onclick="postponeAppointment()" title="Move to next available slot">
        <i class="bi bi-arrow-right-circle"></i> Postpone
      </button>
      <button class="mc-btn mc-btn-ghost mc-btn-sm" onclick="preponeAppointment()" title="Move to earliest available slot">
        <i class="bi bi-arrow-left-circle"></i> Prepone
      </button>
      <button class="mc-btn mc-btn-danger mc-btn-sm" onclick="cancelBookingFlow()">
        <i class="bi bi-x-circle"></i> Cancel
      </button>
    </div>

    <div class="mc-policy-banner mt-4">
      <i class="bi bi-shield-check"></i>
      <div><strong>Payment Policy:</strong> Payment is made directly at the hospital/clinic during your visit. No online payment required.</div>
    </div>
  `;

  AppState.doctorWorkflow.selectedDate = today;
}

function selectSlot(el, slot) {
  document.querySelectorAll(".mc-slot:not(.mc-slot-booked)").forEach((s) => s.classList.remove("mc-slot-selected"));
  el.classList.add("mc-slot-selected");
  AppState.doctorWorkflow.selectedSlot = slot;
}

function postponeAppointment() {
  const doc = AppState.doctorWorkflow.selectedDoctor;
  const available = doc.slots.filter((s) => !doc.bookedSlots.includes(s));
  const current = AppState.doctorWorkflow.selectedSlot;
  const idx = available.indexOf(current);
  if (idx < available.length - 1) {
    const next = available[idx + 1];
    AppState.doctorWorkflow.selectedSlot = next;
    document.querySelectorAll(".mc-slot:not(.mc-slot-booked)").forEach((el) => {
      el.classList.toggle("mc-slot-selected", el.dataset.slot === next);
    });
    Swal.fire({ toast: true, position: "top-end", icon: "info", title: `Slot moved to ${next}`, showConfirmButton: false, timer: 2000 });
  } else {
    Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "No later slot available", showConfirmButton: false, timer: 2000 });
  }
}

function preponeAppointment() {
  const doc = AppState.doctorWorkflow.selectedDoctor;
  const available = doc.slots.filter((s) => !doc.bookedSlots.includes(s));
  const current = AppState.doctorWorkflow.selectedSlot;
  const idx = available.indexOf(current);
  if (idx > 0) {
    const prev = available[idx - 1];
    AppState.doctorWorkflow.selectedSlot = prev;
    document.querySelectorAll(".mc-slot:not(.mc-slot-booked)").forEach((el) => {
      el.classList.toggle("mc-slot-selected", el.dataset.slot === prev);
    });
    Swal.fire({ toast: true, position: "top-end", icon: "info", title: `Slot moved to ${prev}`, showConfirmButton: false, timer: 2000 });
  } else {
    Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "No earlier slot available", showConfirmButton: false, timer: 2000 });
  }
}

function cancelBookingFlow() {
  Swal.fire({
    icon: "question",
    title: "Cancel Booking?",
    text: "Are you sure you want to cancel this booking process?",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    confirmButtonText: "Yes, Cancel",
    cancelButtonText: "Keep Booking",
  }).then((res) => {
    if (res.isConfirmed) {
      AppState.doctorWorkflow.selectedSlot = null;
      document.getElementById("online-booking-section").classList.add("hidden");
      Swal.fire({ toast: true, position: "top-end", icon: "info", title: "Booking cancelled", showConfirmButton: false, timer: 1800 });
    }
  });
}

async function confirmBooking(docId) {
  const name    = document.getElementById("pt-name")?.value.trim();
  const gender  = document.getElementById("pt-gender")?.value;
  const area    = document.getElementById("pt-area")?.value.trim();
  const phone   = document.getElementById("pt-phone")?.value.trim();
  const email   = document.getElementById("pt-email")?.value.trim();
  const history = document.getElementById("pt-history")?.value.trim();
  const slot    = AppState.doctorWorkflow.selectedSlot;
  const date    = AppState.doctorWorkflow.selectedDate;

  if (!name || !phone) {
    Swal.fire({ icon: "warning", title: "Missing Details", text: "Please fill in your name and phone number.", confirmButtonColor: "#0f6fff" });
    return;
  }
  if (!slot) {
    Swal.fire({ icon: "warning", title: "No Slot Selected", text: "Please select an available time slot.", confirmButtonColor: "#0f6fff" });
    return;
  }

  const btn = document.getElementById("confirm-booking-btn");
  btn.disabled = true;
  btn.innerHTML = '<span class="mc-spinner"></span> Checking availability…';

  const availability = await Database.checkSlotAvailability(docId, slot);
  if (!availability.available) {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm Booking';
    Swal.fire({
      icon: "warning",
      title: "Slot Unavailable",
      html: `<p>The <strong>${slot}</strong> slot is no longer available. Please select another time slot.</p>`,
      confirmButtonColor: "#0f6fff",
    });
    return;
  }

  const result = await Database.bookSlot(docId, slot);
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm Booking';

  if (result.success) {
    const doc = AppState.doctorWorkflow.selectedDoctor;

    // ── Save to localStorage appointment history ──────────────
    UserStore.addAppointment({
      doctorId:      doc.id,
      doctorName:    doc.name,
      specialty:     doc.specialty,
      location:      doc.location,
      slot,
      date,
      patientName:   name,
      patientGender: gender,
      patientArea:   area,
      patientPhone:  phone,
      patientEmail:  email,
      medicalHistory: history,
    });
    // ── Update profile if fields are richer than saved ────────
    const saved = getSavedProfile();
    if (!saved.name && name) {
      UserStore.saveProfile({ ...saved, name, gender, area, phone, email });
      updateNavbarProfile();
    }
    // Update sidebar history panel
    updateDoctorHistorySidebar();

    Swal.fire({
      icon: "success",
      title: "🎉 Appointment Booked Successfully!",
      html: `
        <div style="text-align:left;background:#f0f4ff;padding:16px;border-radius:12px;margin:12px 0;">
          <div style="margin-bottom:8px;"><strong>Doctor:</strong> ${doc.name}</div>
          <div style="margin-bottom:8px;"><strong>Specialty:</strong> ${doc.specialty}</div>
          <div style="margin-bottom:8px;"><strong>Date:</strong> ${new Date(date).toDateString()}</div>
          <div style="margin-bottom:8px;"><strong>Time:</strong> ${slot}</div>
          <div><strong>Patient:</strong> ${name}</div>
        </div>
        <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:10px;padding:12px;font-size:0.88rem;">
          <i class="bi bi-info-circle" style="color:#d97706;"></i>
          <strong>Note:</strong> Payment is to be made directly at the hospital during your visit.
        </div>
        <div style="margin-top:10px;font-size:0.82rem;color:var(--text-muted);"><i class="bi bi-save me-1"></i>Appointment saved to your history.</div>
      `,
      confirmButtonText: "View My Booking",
      confirmButtonColor: "#0f6fff",
    }).then(() => {
      document.querySelectorAll(`[data-slot="${slot}"]`).forEach((el) => {
        el.classList.remove("mc-slot-selected");
        el.classList.add("mc-slot-booked");
        el.innerHTML = `${slot}<br><small>Booked</small>`;
        el.onclick = null;
      });
    });
  } else {
    Swal.fire({ icon: "error", title: "Booking Failed", text: result.message, confirmButtonColor: "#0f6fff" });
  }
}

// ── Pharmacy Workflow ─────────────────────────────────────────
function initPharmacyWorkflow() {
  showView("pharmacy");
  AppState.pharmacyWorkflow = {
    area: getSavedArea(),   // ← pre-fill from localStorage
    filteredPharmacies: [],
    selectedPharmacy: null,
    mapPinX: 50,
    mapPinY: 50,
  };
  renderPharmacyStep1();
  updatePharmacySidebar(1);
}

function updatePharmacySidebar(activeStep) {
  document.querySelectorAll("#view-pharmacy .mc-sidebar-step").forEach((el) => {
    const step = parseInt(el.dataset.step);
    el.classList.remove("active", "done");
    if (step === activeStep) el.classList.add("active");
    else if (step < activeStep) el.classList.add("done");
  });
}

function renderPharmacyStep1() {
  const content   = document.getElementById("pharmacy-workflow-content");
  const savedArea = AppState.pharmacyWorkflow.area || getSavedArea();
  const profile   = getSavedProfile();
  const autoNote  = savedArea
    ? `<div class="mc-info-box" style="background:var(--primary-light);border-color:rgba(15,111,255,0.25);margin-bottom:1rem;">
        <i class="bi bi-person-check-fill" style="color:var(--primary);"></i>
        <div><strong>Auto-filled from your profile:</strong> Area set to <strong>${savedArea}</strong>. You can change it below.</div>
       </div>`
    : "";

  content.innerHTML = `
    <div class="mc-step-panel">
      <div class="mc-step-badge"><i class="bi bi-geo-alt"></i> Step 1 of 2</div>
      <h3 class="mc-step-title">Find Pharmacies Near You</h3>
      <p class="mc-step-subtitle">Enter your area to find nearby pharmacies and order medicines.</p>

      ${autoNote}

      <div class="row g-3 mb-3">
        <div class="col-md-8">
          <label class="mc-label">Area / Locality</label>
          <div class="mc-input-wrap">
            <i class="bi bi-geo-alt"></i>
            <input id="ph-area-input" class="mc-input" type="text"
              placeholder="e.g. Gulberg, DHA, Johar Town, Model Town"
              value="${savedArea}" />
          </div>
        </div>
        <div class="col-md-4 d-flex align-items-end">
          <button class="mc-btn mc-btn-secondary mc-btn-full" onclick="searchPharmacies()">
            <i class="bi bi-search"></i> Search Pharmacies
          </button>
        </div>
      </div>

      <div class="mc-divider">or pick on map</div>

      <label class="mc-label mb-2"><i class="bi bi-map me-1"></i>Select via Map</label>
      <div class="mc-map-container" id="pharmacy-map">
        <div class="mc-map-bg"></div>
        <svg class="mc-map-roads" viewBox="0 0 400 220">
          <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(0,201,167,0.15)" stroke-width="8"/>
          <line x1="0" y1="160" x2="400" y2="160" stroke="rgba(0,201,167,0.1)" stroke-width="5"/>
          <line x1="120" y1="0" x2="120" y2="220" stroke="rgba(0,201,167,0.15)" stroke-width="8"/>
          <line x1="280" y1="0" x2="280" y2="220" stroke="rgba(0,201,167,0.1)" stroke-width="5"/>
          <text x="60" y="50" text-anchor="middle" fill="rgba(0,201,167,0.5)" font-size="10" font-family="Inter">Pharmacy</text>
          <circle cx="60" cy="60" r="6" fill="rgba(0,201,167,0.4)"/>
          <text x="200" y="110" text-anchor="middle" fill="rgba(0,201,167,0.5)" font-size="10" font-family="Inter">Pharmacy</text>
          <circle cx="200" cy="120" r="6" fill="rgba(0,201,167,0.4)"/>
          <text x="320" y="50" text-anchor="middle" fill="rgba(0,201,167,0.5)" font-size="10" font-family="Inter">Pharmacy</text>
          <circle cx="320" cy="60" r="6" fill="rgba(0,201,167,0.4)"/>
        </svg>
        <div class="mc-map-label"><i class="bi bi-cursor text-success"></i> Click to set your location</div>
      </div>

      <div class="mc-info-box mt-3">
        <i class="bi bi-info-circle-fill"></i>
        <div><strong>Coverage Areas:</strong> Gulberg, DHA Phase 5, Johar Town, Model Town. Pharmacies are sorted by distance from your location.</div>
      </div>
    </div>
    <div id="pharmacy-list-content"></div>
  `;

  initMap("pharmacy-map", (x, y) => {
    AppState.pharmacyWorkflow.mapPinX = x;
    AppState.pharmacyWorkflow.mapPinY = y;
    const areas = ["Gulberg", "DHA Phase 5", "Johar Town", "Model Town"];
    const picked = areas[Math.floor((x / 100) * areas.length)];
    document.getElementById("ph-area-input").value = picked;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `📍 Location set to ${picked}`,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  });

  document.getElementById("ph-area-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchPharmacies();
  });
}

async function searchPharmacies() {
  const area = document.getElementById("ph-area-input").value.trim();
  if (!area) {
    Swal.fire({ icon: "warning", title: "Location Required", text: "Please enter your area.", confirmButtonColor: "#0f6fff" });
    return;
  }
  AppState.pharmacyWorkflow.area = area;
  updatePharmacySidebar(2);

  const listContent = document.getElementById("pharmacy-list-content");
  listContent.innerHTML = `
    <div class="mc-step-panel mt-3">
      <div class="mc-loading-state">
        <div class="mc-spinner-dark"></div>
        <p class="mb-0 mt-2">Finding nearby pharmacies…</p>
      </div>
    </div>
  `;

  const pharmacies = await Database.getPharmacies(area);
  AppState.pharmacyWorkflow.filteredPharmacies = pharmacies;

  if (!pharmacies.length) {
    listContent.innerHTML = `
      <div class="mc-step-panel mt-3">
        <div class="mc-empty-state">
          <i class="bi bi-shop"></i>
          <p>No pharmacies found in <strong>${area}</strong>. Try a different area.</p>
        </div>
      </div>
    `;
    return;
  }

  listContent.innerHTML = `
    <div class="mc-step-panel mt-3">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="mc-step-title mb-0">${pharmacies.length} Pharmacies Found</h4>
        <span style="font-size:0.8rem;color:var(--text-muted);">Sorted by distance from ${area}</span>
      </div>
      <div class="mc-pharmacy-list">
        ${pharmacies.map((p) => renderPharmacyCard(p)).join("")}
      </div>
    </div>
  `;
}

function renderPharmacyCard(p) {
  const outOfStock = p.inventory.filter((i) => !i.inStock);
  const inStock = p.inventory.filter((i) => i.inStock);
  return `
    <div class="mc-pharmacy-card" id="ph-card-${p.id}">
      <div class="mc-pharmacy-icon">💊</div>
      <div class="mc-pharmacy-info">
        <div class="mc-pharmacy-name">${p.name}</div>
        <div class="mc-pharmacy-address"><i class="bi bi-geo-alt me-1"></i>${p.address}</div>
        <div class="mc-pharmacy-meta">
          <span class="mc-pharmacy-badge mc-badge-distance"><i class="bi bi-signpost-2 me-1"></i>${p.distance} km away</span>
          <span class="mc-pharmacy-badge ${p.open24h ? "mc-badge-open" : "mc-badge-closed"}">
            <i class="bi bi-clock me-1"></i>${p.open24h ? "Open 24 Hours" : "Limited Hours"}
          </span>
          ${renderStars(p.rating)}
        </div>
        <div class="mc-inventory mt-2">
          ${inStock.map((i) => `<span class="mc-inventory-tag mc-inventory-in"><i class="bi bi-check-circle me-1"></i>${i.name}</span>`).join("")}
          ${outOfStock.map((i) => `<span class="mc-inventory-tag mc-inventory-out"><i class="bi bi-x-circle me-1"></i>${i.name}</span>`).join("")}
        </div>
      </div>
      <div class="d-flex flex-column gap-2 ms-auto">
        <button class="mc-btn mc-btn-secondary mc-btn-sm" onclick="showDeliveryModal(${p.id})">
          <i class="bi bi-truck"></i> Online Delivery
        </button>
        <a href="tel:${p.phone}" class="mc-btn mc-btn-ghost mc-btn-sm">
          <i class="bi bi-telephone"></i> Call
        </a>
      </div>
    </div>
  `;
}

function showDeliveryModal(pharmacyId) {
  const pharmacy = AppState.pharmacyWorkflow.filteredPharmacies.find((p) => p.id === pharmacyId) ||
    DB_PHARMACIES.find((p) => p.id === pharmacyId);
  if (!pharmacy) return;
  AppState.pharmacyWorkflow.selectedPharmacy = pharmacy;

  const profile    = getSavedProfile();
  const outOfStock = pharmacy.inventory.filter((i) => !i.inStock);
  const outOfStockWarning = outOfStock.length
    ? `<div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:10px;padding:12px;margin-bottom:16px;font-size:0.85rem;">
        <i class="bi bi-exclamation-triangle" style="color:#d97706;"></i>
        <strong>Note:</strong> The following medicines are currently out of stock at this pharmacy:
        <strong>${outOfStock.map((m) => m.name).join(", ")}</strong>.
        If you order these, an SMS will be sent to your registered number.
      </div>`
    : "";

  Swal.fire({
    title: `<i class="bi bi-truck" style="color:#00c9a7;"></i> Online Delivery — ${pharmacy.name}`,
    html: `
      ${outOfStockWarning}
      <form id="delivery-form" style="text-align:left;">
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:#475569;margin-bottom:6px;">Full Name *</label>
          <input id="del-name" type="text" placeholder="Your full name"
            value="${profile.name || ''}"
            style="width:100%;padding:11px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;font-family:Inter,sans-serif;outline:none;" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:#475569;margin-bottom:6px;">Phone Number *</label>
          <input id="del-phone" type="tel" placeholder="+92-300-0000000"
            value="${profile.phone || ''}"
            style="width:100%;padding:11px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;font-family:Inter,sans-serif;outline:none;" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:#475569;margin-bottom:6px;">Delivery Address *</label>
          <textarea id="del-address" placeholder="House #, Street, Area, City" rows="3"
            style="width:100%;padding:11px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.9rem;font-family:Inter,sans-serif;outline:none;resize:vertical;">${profile.address || ''}</textarea>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:700;color:#475569;margin-bottom:6px;">Medical Slip / Prescription (Upload) *</label>
          <div style="border:2px dashed #e2e8f0;border-radius:10px;padding:20px;text-align:center;cursor:pointer;position:relative;background:#f8fafc;" onclick="document.getElementById('del-slip').click()">
            <input id="del-slip" type="file" accept="image/*,.pdf" style="display:none;" onchange="updateFileLabel(this)"/>
            <i class="bi bi-cloud-upload" style="font-size:1.6rem;color:#0f6fff;display:block;margin-bottom:6px;"></i>
            <div id="file-label" style="font-size:0.85rem;color:#475569;">Click to upload prescription or medical slip</div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">Supported: JPG, PNG, PDF (max 5MB)</div>
          </div>
        </div>
        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,201,167,0.06));border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px;font-size:0.82rem;color:#065f46;">
          <i class="bi bi-shield-check" style="color:#10b981;"></i>
          <strong>Payment Option:</strong> Cash on Delivery / Pay when medicine is delivered.
        </div>
      </form>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-check-circle"></i> Place Order',
    cancelButtonText: "Cancel",
    confirmButtonColor: "#00c9a7",
    cancelButtonColor: "#94a3b8",
    width: "550px",
    preConfirm: () => {
      const name    = document.getElementById("del-name").value.trim();
      const phone   = document.getElementById("del-phone").value.trim();
      const address = document.getElementById("del-address").value.trim();
      const slip    = document.getElementById("del-slip").files[0];
      if (!name || !phone || !address) {
        Swal.showValidationMessage("Please fill in all required fields.");
        return false;
      }
      if (!slip) {
        Swal.showValidationMessage("Please upload your medical prescription/slip.");
        return false;
      }
      // Persist delivery address to profile
      const p = getSavedProfile();
      UserStore.saveProfile({ ...p, address });
      return { name, phone, address, slip };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      await placeDeliveryOrder(pharmacy, result.value);
    }
  });
}

function updateFileLabel(input) {
  const label = document.getElementById("file-label");
  if (input.files[0]) {
    label.innerHTML = `<i class="bi bi-file-earmark-check" style="color:#10b981;margin-right:4px;"></i><strong style="color:#065f46;">${input.files[0].name}</strong>`;
  }
}

async function placeDeliveryOrder(pharmacy, data) {
  const outOfStock = pharmacy.inventory.filter((i) => !i.inStock);

  // Simulate processing
  Swal.fire({
    title: "Processing Order…",
    html: '<div style="text-align:center;"><div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#00c9a7;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;"></div><p style="color:#475569;">Please wait…</p></div>',
    allowOutsideClick: false,
    showConfirmButton: false,
    timer: 1800,
  });

  await new Promise((r) => setTimeout(r, 1900));

  if (outOfStock.length) {
    // Show SMS notification for out-of-stock items
    await Swal.fire({
      icon: "info",
      title: "📱 SMS Notification Sent",
      html: `
        <p>An <strong>SMS notification</strong> has been sent to your registered mobile number regarding the following unavailable medicines at <strong>${pharmacy.name}</strong>:</p>
        <div style="background:#fee2e2;border-radius:10px;padding:12px;margin:10px 0;font-size:0.88rem;color:#991b1b;">
          ${outOfStock.map((m) => `<div><i class="bi bi-x-circle me-1"></i>${m.name} — Out of Stock</div>`).join("")}
        </div>
        <p style="font-size:0.85rem;color:#475569;">The pharmacy will contact you with alternatives or an estimated restock date.</p>
      `,
      confirmButtonText: "Continue",
      confirmButtonColor: "#0f6fff",
    });
  }

  Swal.fire({
    icon: "success",
    title: "🎉 Order Placed Successfully!",
    html: `
      <div style="text-align:left;">
        <div style="background:#f0fdf4;padding:16px;border-radius:12px;margin-bottom:12px;">
          <div style="margin-bottom:6px;"><strong>Pharmacy:</strong> ${pharmacy.name}</div>
          <div style="margin-bottom:6px;"><strong>Delivery To:</strong> ${data.address}</div>
          <div style="margin-bottom:6px;"><strong>Contact:</strong> ${data.phone}</div>
          <div><strong>Estimated Delivery:</strong> 30–60 minutes</div>
        </div>
        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,201,167,0.06));border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px;font-size:0.85rem;color:#065f46;">
          <i class="bi bi-shield-check" style="color:#10b981;"></i>
          <strong>Payment Option:</strong> Cash on Delivery — Pay when your medicine is delivered at your doorstep.
        </div>
      </div>
    `,
    confirmButtonText: "Done",
    confirmButtonColor: "#00c9a7",
  });
}

// ── Profile Modal ─────────────────────────────────────────────
function openProfileModal() {
  const p = getSavedProfile();
  const hist = UserStore.getUserHistory();
  const histRows = hist.length
    ? hist.slice(0, 5).map(a => `
        <tr>
          <td style="font-size:0.8rem;padding:6px 4px;">${new Date(a.bookedAt).toLocaleDateString()}</td>
          <td style="font-size:0.8rem;padding:6px 4px;">${a.doctorName}</td>
          <td style="font-size:0.8rem;padding:6px 4px;">${a.slot} · ${a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
          <td style="font-size:0.8rem;padding:6px 4px;">
            <span style="background:${a.cancelled?'#fee2e2':'#d1fae5'};color:${a.cancelled?'#991b1b':'#065f46'};padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:700;">${a.cancelled?'Cancelled':'Active'}</span>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:16px;font-size:0.85rem;">No appointments yet.</td></tr>`;

  Swal.fire({
    title: '<i class="bi bi-person-circle" style="color:#0f6fff;"></i> My Profile & History',
    html: `
      <div style="text-align:left;">
        <!-- Profile form -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="grid-column:1/-1;">
            <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Full Name</label>
            <input id="prof-name" type="text" value="${p.name||''}" placeholder="Your full name"
              style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-family:Inter,sans-serif;font-size:0.9rem;outline:none;"/>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Gender</label>
            <select id="prof-gender" style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-family:Inter,sans-serif;font-size:0.9rem;outline:none;">
              <option value="">Select</option>
              <option ${p.gender==='Male'?'selected':''}>Male</option>
              <option ${p.gender==='Female'?'selected':''}>Female</option>
              <option ${p.gender==='Other'?'selected':''}>Other</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Living Area</label>
            <input id="prof-area" type="text" value="${p.area||''}" placeholder="e.g. Gulberg"
              style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-family:Inter,sans-serif;font-size:0.9rem;outline:none;"/>
          </div>
          <div>
            <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Phone</label>
            <input id="prof-phone" type="tel" value="${p.phone||''}" placeholder="+92-300-0000000"
              style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-family:Inter,sans-serif;font-size:0.9rem;outline:none;"/>
          </div>
          <div style="grid-column:1/-1;">
            <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Email</label>
            <input id="prof-email" type="email" value="${p.email||''}" placeholder="your@email.com"
              style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-family:Inter,sans-serif;font-size:0.9rem;outline:none;"/>
          </div>
        </div>
        <!-- Appointment History -->
        <div style="margin-top:8px;">
          <div style="font-size:0.8rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;"><i class="bi bi-clock-history me-1"></i>Appointment History (last 5)</div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f0f4ff;">
                <th style="font-size:0.72rem;padding:6px 4px;text-align:left;color:#475569;">Booked On</th>
                <th style="font-size:0.72rem;padding:6px 4px;text-align:left;color:#475569;">Doctor</th>
                <th style="font-size:0.72rem;padding:6px 4px;text-align:left;color:#475569;">Slot / Date</th>
                <th style="font-size:0.72rem;padding:6px 4px;text-align:left;color:#475569;">Status</th>
              </tr></thead>
              <tbody>${histRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-save"></i> Save Profile',
    cancelButtonText: 'Close',
    confirmButtonColor: '#0f6fff',
    cancelButtonColor: '#94a3b8',
    width: '600px',
    preConfirm: () => {
      const name   = document.getElementById('prof-name').value.trim();
      const gender = document.getElementById('prof-gender').value;
      const area   = document.getElementById('prof-area').value.trim();
      const phone  = document.getElementById('prof-phone').value.trim();
      const email  = document.getElementById('prof-email').value.trim();
      UserStore.saveProfile({ name, gender, area, phone, email });
      return { name, gender, area, phone, email };
    },
  }).then(result => {
    if (result.isConfirmed) {
      updateNavbarProfile();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Profile saved!',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  });
}

// ── Doctor History Sidebar ────────────────────────────────────
function updateDoctorHistorySidebar() {
  const container = document.getElementById('doctor-history-sidebar');
  if (!container) return;

  // If not logged in, show a prompt
  if (!UserStore.isLoggedIn()) {
    container.innerHTML = `
      <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 8px;">
        <i class="bi bi-lock me-1"></i>Log in to see your booking history.
      </p>
      <button class="mc-btn mc-btn-primary mc-btn-sm" onclick="navigateTo('login')" style="font-size:0.75rem;padding:4px 12px;">
        Log In
      </button>`;
    return;
  }

  const hist = UserStore.getUserHistory().filter(a => !a.cancelled).slice(0, 5);

  if (!hist.length) {
    container.innerHTML = `<p style="font-size:0.78rem;color:var(--text-muted);margin:0;">You have no past appointments.</p>`;
    return;
  }

  container.innerHTML = hist.map(a => {
    const dateStr = a.date ? new Date(a.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
    return `
      <div style="padding:8px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);">${a.doctorName}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);">${a.specialty || ''}</div>
        <div style="font-size:0.73rem;color:var(--primary);margin-top:2px;">
          <i class="bi bi-clock me-1"></i>${a.slot} &nbsp;·&nbsp;
          <i class="bi bi-calendar2 me-1"></i>${dateStr}
        </div>
      </div>`;
  }).join('') + `
    <div style="margin-top:10px;text-align:center;">
      <a href="#" onclick="navigateTo('history');return false;" style="font-size:0.75rem;color:var(--primary);font-weight:600;text-decoration:none;">
        <i class="bi bi-list-ul me-1"></i>View All Bookings
      </a>
    </div>`;
}

// ── Navigation ────────────────────────────────────────────────
function navigateTo(viewId) {
  // Guard protected routes
  const protectedViews = ["doctor", "history", "profile"];
  if (protectedViews.includes(viewId) && !UserStore.isLoggedIn()) {
    AppState.redirectAfterLogin = viewId;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "warning",
      title: "Please log in to continue.",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    navigateTo("login");
    return;
  }

  if (viewId === "doctor") {
    initDoctorWorkflow();
  } else if (viewId === "pharmacy") {
    initPharmacyWorkflow();
  } else if (viewId === "profile") {
    openProfileModal();
  } else if (viewId === "history") {
    initHistoryWorkflow();
  } else if (viewId === "login") {
    initLoginWorkflow();
  } else if (viewId === "logout") {
    handleLogout();
  } else {
    showView(viewId);
  }
}

// ── Authentication Views and Logics ───────────────────────────
function initLoginWorkflow() {
  showView("login");
  document.getElementById("login-form").classList.remove("hidden");
  document.getElementById("register-form").classList.add("hidden");
  document.getElementById("login-card-title").textContent = "Welcome Back";
  document.getElementById("login-card-subtitle").textContent = "Log in to manage appointments & pharmacy orders";
  document.getElementById("login-toggle-text").textContent = "Don't have an account?";
  document.getElementById("login-toggle-link").textContent = "Sign Up";
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
  document.getElementById("login-alert-container").innerHTML = "";
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const title = document.getElementById("login-card-title");
  const subtitle = document.getElementById("login-card-subtitle");
  const toggleText = document.getElementById("login-toggle-text");
  const toggleLink = document.getElementById("login-toggle-link");
  const alertContainer = document.getElementById("login-alert-container");

  alertContainer.innerHTML = "";

  if (loginForm.classList.contains("hidden")) {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    title.textContent = "Welcome Back";
    subtitle.textContent = "Log in to manage appointments & pharmacy orders";
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = "Sign Up";
  } else {
    loginForm.classList.add("hidden");
    regForm.classList.remove("hidden");
    title.textContent = "Create Account";
    subtitle.textContent = "Sign up to book appointments and track pharmacy orders";
    toggleText.textContent = "Already have an account?";
    toggleLink.textContent = "Log In";
    document.getElementById("reg-name").value = "";
    document.getElementById("reg-gender").value = "";
    document.getElementById("reg-area").value = "";
    document.getElementById("reg-phone").value = "";
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-password").value = "";
  }
}

function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  const alertContainer = document.getElementById("login-alert-container");

  const res = UserStore.validateLogin(email, pass);
  if (res.success) {
    UserStore.setLoggedIn(true, res.user);
    updateNavbarProfile();
    Swal.fire({
      icon: "success",
      title: "Logged In Successfully!",
      text: `Welcome back, ${res.user.name}!`,
      confirmButtonColor: "#0f6fff",
      timer: 2000,
      timerProgressBar: true
    }).then(() => {
      const redirectTarget = AppState.redirectAfterLogin || "home";
      AppState.redirectAfterLogin = null;
      navigateTo(redirectTarget);
    });
  } else {
    alertContainer.innerHTML = `
      <div class="alert alert-danger" role="alert" style="font-size:0.85rem;padding:8px 12px;margin-bottom:12px;">
        <i class="bi bi-exclamation-triangle-fill me-2"></i> ${res.message}
      </div>
    `;
  }
}

function handleRegisterSubmit(e) {
  if (e) e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const gender = document.getElementById("reg-gender").value;
  const area = document.getElementById("reg-area").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const alertContainer = document.getElementById("login-alert-container");

  const newUser = { email, password, name, gender, area, phone };
  const res = UserStore.registerUser(newUser);

  if (res.success) {
    UserStore.setLoggedIn(true, newUser);
    updateNavbarProfile();
    Swal.fire({
      icon: "success",
      title: "Account Created!",
      text: `Welcome to MediConnect, ${name}!`,
      confirmButtonColor: "#0f6fff",
      timer: 2000,
      timerProgressBar: true
    }).then(() => {
      const redirectTarget = AppState.redirectAfterLogin || "home";
      AppState.redirectAfterLogin = null;
      navigateTo(redirectTarget);
    });
  } else {
    alertContainer.innerHTML = `
      <div class="alert alert-danger" role="alert" style="font-size:0.85rem;padding:8px 12px;margin-bottom:12px;">
        <i class="bi bi-exclamation-triangle-fill me-2"></i> ${res.message}
      </div>
    `;
  }
}

function handleLogout() {
  Swal.fire({
    title: "Confirm Logout",
    text: "Are you sure you want to log out of your session?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    confirmButtonText: "Logout",
    cancelButtonText: "Cancel"
  }).then((result) => {
    if (result.isConfirmed) {
      UserStore.setLoggedIn(false);
      updateNavbarProfile();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Logged out successfully.",
        showConfirmButton: false,
        timer: 2000
      });
      navigateTo("home");
    }
  });
}

// ── Show / Hide Password Toggle ───────────────────────────────
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  if (input.type === "password") {
    input.type = "text";
    icon.classList.replace("bi-eye", "bi-eye-slash");
  } else {
    input.type = "password";
    icon.classList.replace("bi-eye-slash", "bi-eye");
  }
}

function forgotPassword(e) {
  if (e) e.preventDefault();
  Swal.fire({
    title: "Password Recovery",
    text: "Enter your registered email address to receive a password reset link.",
    input: "email",
    inputPlaceholder: "your@email.com",
    showCancelButton: true,
    confirmButtonColor: "#0f6fff",
    cancelButtonColor: "#94a3b8",
    confirmButtonText: "Send Link",
    preConfirm: (email) => {
      if (!email) {
        Swal.showValidationMessage("Please enter your email.");
      }
      return email;
    }
  }).then((res) => {
    if (res.isConfirmed) {
      Swal.fire({
        icon: "success",
        title: "Email Sent!",
        text: `A password reset link has been sent to ${res.value}. (Mock check: if using demo, password is 'password123')`,
        confirmButtonColor: "#0f6fff"
      });
    }
  });
}

// ── Appointment History Workflow ──────────────────────────────
function initHistoryWorkflow() {
  showView("history");
  AppState.currentHistoryFilter = "all";
  renderHistoryPage();
}

function renderHistoryPage() {
  const tbody = document.getElementById("history-table-body");
  const emptyState = document.getElementById("history-empty-state");
  const filter = AppState.currentHistoryFilter;

  const filters = ["all", "active", "cancelled"];
  filters.forEach(f => {
    const btn = document.getElementById(`history-filter-${f}`);
    if (btn) {
      btn.classList.toggle("active", f === filter);
    }
  });

  if (!tbody) return;

  const appts = UserStore.getUserHistory();
  let filtered = appts;
  if (filter === "active") {
    filtered = appts.filter(a => !a.cancelled);
  } else if (filter === "cancelled") {
    filtered = appts.filter(a => a.cancelled);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tbody.innerHTML = filtered.map(a => {
    const statusBadge = a.cancelled
      ? `<span class="mc-badge mc-badge-cancelled"><i class="bi bi-x-circle-fill"></i> Cancelled</span>`
      : `<span class="mc-badge mc-badge-active"><i class="bi bi-check-circle-fill"></i> Active</span>`;

    const actionButton = a.cancelled
      ? `<button class="mc-btn mc-btn-ghost mc-btn-sm" disabled style="opacity: 0.5;">No Actions</button>`
      : `<button class="mc-btn mc-btn-danger mc-btn-sm" onclick="cancelHistoryAppointment(${a.id})"><i class="bi bi-x-circle"></i> Cancel</button>`;

    return `
      <tr id="history-row-${a.id}">
        <td style="font-weight: 700; padding: 12px 10px;">${a.doctorName}</td>
        <td style="padding: 12px 10px;"><span class="mc-doctor-specialty">${a.specialty}</span></td>
        <td style="padding: 12px 10px;">
          <div style="font-weight: 600;">${new Date(a.date).toDateString()}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary);"><i class="bi bi-clock"></i> ${a.slot}</div>
        </td>
        <td style="font-size: 0.82rem; padding: 12px 10px;">${a.location}</td>
        <td style="padding: 12px 10px;">
          <div style="font-weight: 600;">${a.patientName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${a.patientPhone}</div>
        </td>
        <td style="padding: 12px 10px;">${statusBadge}</td>
        <td style="text-align: center; padding: 12px 10px;">${actionButton}</td>
      </tr>
    `;
  }).join("");
}

function filterHistory(type) {
  AppState.currentHistoryFilter = type;
  renderHistoryPage();
}

function cancelHistoryAppointment(apptId) {
  Swal.fire({
    title: "Cancel Appointment?",
    text: "Are you sure you want to cancel this scheduled appointment? This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#94a3b8",
    confirmButtonText: "Yes, Cancel It",
    cancelButtonText: "No, Keep It"
  }).then((res) => {
    if (res.isConfirmed) {
      UserStore.cancelAppointment(apptId);
      const appts = UserStore.getHistory();
      const appt = appts.find(a => a.id === apptId);
      if (appt) {
        const doc = DB_DOCTORS.find(d => d.id === appt.doctorId);
        if (doc) {
          doc.bookedSlots = doc.bookedSlots.filter(s => s !== appt.slot);
          const slotsObj = UserStore.getBookedSlots();
          if (slotsObj[appt.doctorId]) {
            slotsObj[appt.doctorId] = slotsObj[appt.doctorId].filter(s => s !== appt.slot);
            localStorage.setItem("mc_booked_slots", JSON.stringify(slotsObj));
          }
        }
      }

      Swal.fire({
        icon: "success",
        title: "Appointment Cancelled",
        text: "The appointment has been successfully cancelled.",
        confirmButtonColor: "#0f6fff"
      });
      renderHistoryPage();
      updateDoctorHistorySidebar();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  showView("home");
  updateNavbarProfile();   // ← reflect any saved profile on load

  // Nav links
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(el.dataset.view);
    });
  });

  // Mobile nav toggle
  const navToggle = document.getElementById("mc-nav-toggle");
  const navMenu   = document.getElementById("mc-nav-menu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("show");
    });
  }

  // Animate hero stats on load
  animateCounters();
});

function animateCounters() {
  const counters = document.querySelectorAll("[data-count]");
  counters.forEach((el) => {
    const target = parseInt(el.dataset.count);
    let count = 0;
    const step = Math.ceil(target / 60);
    const interval = setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = count.toLocaleString() + (el.dataset.suffix || "");
      if (count >= target) clearInterval(interval);
    }, 20);
  });
}

// Expose to global for inline onclick
window.showView = showView;
window.navigateTo = navigateTo;
window.initDoctorWorkflow = initDoctorWorkflow;
window.initPharmacyWorkflow = initPharmacyWorkflow;
window.submitDoctorLocation = submitDoctorLocation;
window.renderDoctorStep1 = renderDoctorStep1;
window.renderDoctorStep2Options = renderDoctorStep2Options;
window.selectDoctorMode = selectDoctorMode;
window.renderDoctorProfileList = renderDoctorProfileList;
window.applySpecialtyFilter = applySpecialtyFilter;
window.renderSymptomsForm = renderSymptomsForm;
window.analyzeSymptoms = analyzeSymptoms;
window.goToFilteredDoctors = goToFilteredDoctors;
window.selectDoctorForBooking = selectDoctorForBooking;
window.checkPatientHistory = checkPatientHistory;
window.selectBookingMethod = selectBookingMethod;
window.selectSlot = selectSlot;
window.postponeAppointment = postponeAppointment;
window.preponeAppointment = preponeAppointment;
window.cancelBookingFlow = cancelBookingFlow;
window.confirmBooking = confirmBooking;
window.renderPharmacyStep1 = renderPharmacyStep1;
window.searchPharmacies = searchPharmacies;
window.showDeliveryModal = showDeliveryModal;
window.updateFileLabel = updateFileLabel;
window.updateDoctorSidebar = updateDoctorSidebar;
window.updatePharmacySidebar = updatePharmacySidebar;
window.updateDoctorHistorySidebar = updateDoctorHistorySidebar;
window.openProfileModal = openProfileModal;
window.getSavedProfile = getSavedProfile;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.toggleAuthMode = toggleAuthMode;
window.forgotPassword = forgotPassword;
window.togglePasswordVisibility = togglePasswordVisibility;
window.filterHistory = filterHistory;
window.cancelHistoryAppointment = cancelHistoryAppointment;
window.handleLogout = handleLogout;
window.AppState = AppState;
