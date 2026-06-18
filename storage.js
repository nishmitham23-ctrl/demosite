// ============================================================
//  MediConnect — localStorage Profile & History Manager
//  Added to database.js — handles all persistence layer
// ============================================================

// ── Keys ─────────────────────────────────────────────────────
const LS_PROFILE_KEY = "mc_user_profile";
const LS_HISTORY_KEY = "mc_appointment_history";
const LS_SLOTS_KEY = "mc_booked_slots";   // persisted slot overrides
const LS_LOGGED_IN_KEY = "mc_logged_in";
const LS_USERS_KEY = "mc_registered_users";

// ── Seed Default Users & History ─────────────────────────────
const DEFAULT_USERS = [
  {
    email: "nishmitham23@gmail.com",
    password: "password123",
    name: "Nishmitha",
    gender: "Female",
    area: "Bangalore",
    phone: "+92-300-1234567"
  }
];

const DEFAULT_HISTORY = [
  {
    id: 1001,
    doctorId: 1,
    doctorName: "Dr. Gopinath Rao",
    specialty: "General Physician",
    location: "Gulberg",
    slot: "10:30 AM",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
    bookedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    patientName: "Nishmitha",
    patientGender: "Female",
    patientArea: "Bangalore",
    patientPhone: "+92-300-1234567",
    patientEmail: "nishmitham23@gmail.com",
    medicalHistory: "Seasonal allergies. CETIRIZINE 10mg daily."
  },
  {
    id: 1002,
    doctorId: 5,
    doctorName: "Dr. Priya Sharma",
    specialty: "Pediatrician",
    location: "Gulberg",
    slot: "01:30 PM",
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days ago
    bookedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    patientName: "Nishmitha",
    patientGender: "Female",
    patientArea: "Bangalore",
    patientPhone: "+92-300-1234567",
    patientEmail: "nishmitham23@gmail.com",
    medicalHistory: "Child checkup for seasonal flu. Rec. Panadol syrup."
  }
];

if (!localStorage.getItem(LS_USERS_KEY)) {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(DEFAULT_USERS));
}
if (!localStorage.getItem(LS_HISTORY_KEY)) {
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(DEFAULT_HISTORY));
}

// ── Profile Helpers ───────────────────────────────────────────
const UserStore = {
  isLoggedIn() {
    return localStorage.getItem(LS_LOGGED_IN_KEY) === "true";
  },

  setLoggedIn(status, userObj = null) {
    if (status && userObj) {
      localStorage.setItem(LS_LOGGED_IN_KEY, "true");
      this.saveProfile(userObj);
    } else {
      localStorage.setItem(LS_LOGGED_IN_KEY, "false");
      this.clearProfile();
    }
  },

  getRegisteredUsers() {
    try { return JSON.parse(localStorage.getItem(LS_USERS_KEY)) || DEFAULT_USERS; }
    catch { return DEFAULT_USERS; }
  },

  registerUser(user) {
    const users = this.getRegisteredUsers();
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      return { success: false, message: "Email already registered." };
    }
    users.push(user);
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    return { success: true };
  },

  validateLogin(email, password) {
    const users = this.getRegisteredUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (found) {
      return { success: true, user: found };
    }
    return { success: false, message: "Invalid email or password." };
  },

  getProfile() {
    try { return JSON.parse(localStorage.getItem(LS_PROFILE_KEY)) || {}; }
    catch { return {}; }
  },

  saveProfile(profile) {
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));
  },

  clearProfile() {
    localStorage.removeItem(LS_PROFILE_KEY);
  },

  // ── Appointment History ─────────────────────────────────────
  getHistory() {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY_KEY)) || []; }
    catch { return []; }
  },

  // Returns only appointments belonging to the currently logged-in user
  getUserHistory() {
    const profile = this.getProfile();
    const email = profile?.email?.toLowerCase() || "";
    if (!email) return [];
    return this.getHistory().filter(a =>
      (a.patientEmail || "").toLowerCase() === email
    );
  },

  addAppointment(appt) {
    const hist = UserStore.getHistory();
    hist.unshift({ ...appt, id: Date.now(), bookedAt: new Date().toISOString() });
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(hist));
  },

  cancelAppointment(apptId) {
    const hist = UserStore.getHistory().map(a =>
      a.id === apptId ? { ...a, cancelled: true } : a
    );
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(hist));
  },

  // Find history for a specific patient+doctor combo (localStorage first)
  findPatientRecord(name, gender, area, doctorId) {
    const hist = UserStore.getHistory();
    return hist.find(a =>
      !a.cancelled &&
      a.patientName?.toLowerCase() === name.toLowerCase() &&
      a.patientGender?.toLowerCase() === gender.toLowerCase() &&
      a.patientArea?.toLowerCase().includes(area.toLowerCase()) &&
      a.doctorId === doctorId
    ) || null;
  },

  // ── Persisted Slots ─────────────────────────────────────────
  getBookedSlots() {
    try { return JSON.parse(localStorage.getItem(LS_SLOTS_KEY)) || {}; }
    catch { return {}; }
  },

  addBookedSlot(doctorId, slot) {
    const slots = UserStore.getBookedSlots();
    if (!slots[doctorId]) slots[doctorId] = [];
    if (!slots[doctorId].includes(slot)) slots[doctorId].push(slot);
    localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(slots));
    // Also update in-memory DB so current session respects it
    const doc = DB_DOCTORS.find(d => d.id === doctorId);
    if (doc && !doc.bookedSlots.includes(slot)) doc.bookedSlots.push(slot);
  },

  // Hydrate in-memory DB with persisted slots on page load
  hydrateSlots() {
    const slots = UserStore.getBookedSlots();
    for (const [docId, slotArr] of Object.entries(slots)) {
      const doc = DB_DOCTORS.find(d => d.id === parseInt(docId));
      if (doc) {
        slotArr.forEach(s => { if (!doc.bookedSlots.includes(s)) doc.bookedSlots.push(s); });
      }
    }
  },
};

// Hydrate slots immediately so DB reflects previous sessions
UserStore.hydrateSlots();

// ── Augment Database with localStorage-aware methods ──────────
Database.getPatientHistory = (name, gender, area, doctorId) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 1️⃣ Check localStorage appointment history first
      const lsRecord = UserStore.findPatientRecord(name, gender, area, doctorId);
      if (lsRecord) {
        resolve({
          history: lsRecord.medicalHistory ||
            `Previously booked with this doctor on ${new Date(lsRecord.bookedAt).toDateString()} at ${lsRecord.slot}. Saved from your appointment history.`,
          source: "localStorage",
        });
        return;
      }
      // 2️⃣ Fall back to mock DB
      const record = DB_PATIENT_HISTORY.find(
        p =>
          p.name.toLowerCase() === name.toLowerCase() &&
          p.gender.toLowerCase() === gender.toLowerCase() &&
          p.area.toLowerCase().includes(area.toLowerCase()) &&
          p.doctorId === doctorId
      );
      resolve(record ? { ...record, source: "database" } : null);
    }, 600);
  });
};

Database.bookSlot = (doctorId, slot) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const doc = DB_DOCTORS.find(d => d.id === doctorId);
      if (doc && !doc.bookedSlots.includes(slot)) {
        UserStore.addBookedSlot(doctorId, slot); // persist
        resolve({ success: true });
      } else {
        resolve({ success: false, message: "Slot already taken." });
      }
    }, 500);
  });
};

window.UserStore = UserStore;
