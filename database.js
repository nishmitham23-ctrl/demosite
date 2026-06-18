// ============================================================
//  MediConnect — Mock Online Database
//  Simulates API fetch responses for Doctors & Pharmacies
// ============================================================

// ── Doctors ──────────────────────────────────────────────────
const DB_DOCTORS = [
  {
    id: 1,
    name: "Dr. Gopinath Rao",
    specialty: "General Physician",
    experience: 12,
    rating: 4.8,
    location: "Gulberg",
    area: "gulberg",
    image: "assets/doc1.png",
    slots: ["09:00 AM", "10:30 AM", "02:00 PM", "04:30 PM"],
    bookedSlots: ["10:30 AM"],
    phone: "+92-300-1234567",
    fee: 1500,
  },
  {
    id: 2,
    name: "Dr. Ramesh Shetty",
    specialty: "Cardiologist",
    experience: 18,
    rating: 4.9,
    location: "DHA Phase 5",
    area: "dha",
    image: "assets/doc2.png",
    slots: ["08:00 AM", "11:00 AM", "01:00 PM", "03:30 PM"],
    bookedSlots: ["01:00 PM"],
    phone: "+92-321-9876543",
    fee: 3000,
  },
  {
    id: 3,
    name: "Dr. Nishamth M",
    specialty: "Dermatologist",
    experience: 8,
    rating: 4.7,
    location: "Johar Town",
    area: "johar town",
    image: "assets/doc3.png",
    slots: ["10:00 AM", "12:00 PM", "03:00 PM", "05:00 PM"],
    bookedSlots: [],
    phone: "+92-333-5556789",
    fee: 2000,
  },
  {
    id: 4,
    name: "Dr. Nidhishree Rao",
    specialty: "Neurologist",
    experience: 20,
    rating: 4.9,
    location: "Model Town",
    area: "model town",
    image: "assets/doc4.png",
    slots: ["09:30 AM", "11:30 AM", "02:30 PM", "04:00 PM"],
    bookedSlots: ["09:30 AM", "02:30 PM"],
    phone: "+92-345-2223344",
    fee: 4000,
  },
  {
    id: 5,
    name: "Dr. Priya Sharma",
    specialty: "Pediatrician",
    experience: 15,
    rating: 4.8,
    location: "Gulberg",
    area: "gulberg",
    image: "assets/doc5.png",
    slots: ["08:30 AM", "10:00 AM", "01:30 PM", "03:00 PM"],
    bookedSlots: ["08:30 AM"],
    phone: "+92-300-9998877",
    fee: 2500,
  },
  {
    id: 6,
    name: "Dr. Arjun Nair",
    specialty: "Orthopedist",
    experience: 14,
    rating: 4.6,
    location: "DHA Phase 5",
    area: "dha",
    image: "assets/doc6.png",
    slots: ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"],
    bookedSlots: [],
    phone: "+92-312-7778899",
    fee: 3500,
  },
  {
    id: 7,
    name: "Dr. Kavitha Menon",
    specialty: "Gynecologist",
    experience: 10,
    rating: 4.7,
    location: "Johar Town",
    area: "johar town",
    image: "assets/doc7.png",
    slots: ["10:30 AM", "12:30 PM", "03:30 PM", "05:30 PM"],
    bookedSlots: ["10:30 AM", "03:30 PM"],
    phone: "+92-301-4445566",
    fee: 2800,
  },
  {
    id: 8,
    name: "Dr. Suresh Iyer",
    specialty: "General Physician",
    experience: 6,
    rating: 4.5,
    location: "Model Town",
    area: "model town",
    image: "assets/doc8.png",
    slots: ["08:00 AM", "10:00 AM", "12:00 PM", "03:00 PM"],
    bookedSlots: ["12:00 PM"],
    phone: "+92-322-6667788",
    fee: 1200,
  },
];

// ── Symptom → Specialty Map ───────────────────────────────────
const SYMPTOM_MAP = {
  fever: "General Physician",
  cold: "General Physician",
  cough: "General Physician",
  flu: "General Physician",
  headache: "Neurologist",
  migraine: "Neurologist",
  seizure: "Neurologist",
  "chest pain": "Cardiologist",
  palpitations: "Cardiologist",
  "shortness of breath": "Cardiologist",
  "heart pain": "Cardiologist",
  rash: "Dermatologist",
  acne: "Dermatologist",
  eczema: "Dermatologist",
  "skin irritation": "Dermatologist",
  "joint pain": "Orthopedist",
  "back pain": "Orthopedist",
  fracture: "Orthopedist",
  "bone pain": "Orthopedist",
  "child fever": "Pediatrician",
  "baby rash": "Pediatrician",
  "child cough": "Pediatrician",
  "pregnancy check": "Gynecologist",
  "menstrual pain": "Gynecologist",
  gynecology: "Gynecologist",
};

// ── Patient History ───────────────────────────────────────────
const DB_PATIENT_HISTORY = [
  {
    name: "Nishmitha",
    gender: "Female",
    area: "bangalore",
    doctorId: 1,
    history:
      "Patient has a history of seasonal allergies and recurring upper respiratory infections. Currently on antihistamines (Cetirizine 10mg). Previous visits: 3 times in the last 6 months.",
  },
  {
    name: "Priya Reddy",
    gender: "Female",
    area: "dha",
    doctorId: 2,
    history:
      "Diagnosed with mild hypertension in 2023. On Amlodipine 5mg daily. Regular ECG monitoring advised. Last echo: Normal. No major cardiac events reported.",
  },
  {
    name: "Arjun Verma",
    gender: "Male",
    area: "johar town",
    doctorId: 3,
    history:
      "Chronic psoriasis (moderate). Previously treated with topical corticosteroids. Currently on Methotrexate 7.5mg weekly. Liver function tests normal.",
  },
  {
    name: "Kavitha Pillai",
    gender: "Female",
    area: "model town",
    doctorId: 4,
    history:
      "History of tension headaches, evaluated for possible migraine. MRI scan done — no structural abnormality. On Amitriptyline 10mg as prophylaxis.",
  },
];

// ── Pharmacies ────────────────────────────────────────────────
const DB_PHARMACIES = [
  {
    id: 1,
    name: "MedPlus Pharmacy",
    area: "gulberg",
    distance: 0.5,
    rating: 4.7,
    open24h: true,
    phone: "+92-42-35761234",
    address: "Main Blvd, Gulberg III, Lahore",
    inventory: [
      { name: "Paracetamol 500mg", inStock: true },
      { name: "Amoxicillin 250mg", inStock: true },
      { name: "Cetirizine 10mg", inStock: false },
      { name: "Metformin 500mg", inStock: true },
    ],
  },
  {
    id: 2,
    name: "HealthCare Chemist",
    area: "gulberg",
    distance: 1.2,
    rating: 4.5,
    open24h: false,
    phone: "+92-42-35773456",
    address: "Liberty Market, Gulberg, Lahore",
    inventory: [
      { name: "Ibuprofen 400mg", inStock: true },
      { name: "Pantoprazole 40mg", inStock: true },
      { name: "Insulin Glargine", inStock: false },
      { name: "Azithromycin 500mg", inStock: true },
    ],
  },
  {
    id: 3,
    name: "City Pharmacy",
    area: "dha",
    distance: 0.8,
    rating: 4.6,
    open24h: true,
    phone: "+92-42-35889900",
    address: "Phase 5 Commercial, DHA, Lahore",
    inventory: [
      { name: "Atorvastatin 20mg", inStock: true },
      { name: "Amlodipine 5mg", inStock: true },
      { name: "Methotrexate 7.5mg", inStock: true },
      { name: "Warfarin 5mg", inStock: false },
    ],
  },
  {
    id: 4,
    name: "Apollo Drugs",
    area: "dha",
    distance: 1.5,
    rating: 4.4,
    open24h: false,
    phone: "+92-42-35876543",
    address: "Bukhari Commercial, DHA Phase 6, Lahore",
    inventory: [
      { name: "Paracetamol 500mg", inStock: true },
      { name: "Clopidogrel 75mg", inStock: false },
      { name: "Losartan 50mg", inStock: true },
      { name: "Omeprazole 20mg", inStock: true },
    ],
  },
  {
    id: 5,
    name: "Green Pharmacy",
    area: "johar town",
    distance: 0.3,
    rating: 4.8,
    open24h: true,
    phone: "+92-42-35656789",
    address: "Johar Town Block J, Lahore",
    inventory: [
      { name: "Prednisolone 5mg", inStock: true },
      { name: "Salbutamol Inhaler", inStock: true },
      { name: "Metformin 1000mg", inStock: false },
      { name: "Gabapentin 300mg", inStock: true },
    ],
  },
  {
    id: 6,
    name: "PharmaZone",
    area: "model town",
    distance: 0.6,
    rating: 4.5,
    open24h: false,
    phone: "+92-42-35451234",
    address: "Model Town Extension, Lahore",
    inventory: [
      { name: "Amitriptyline 10mg", inStock: true },
      { name: "Levothyroxine 50mcg", inStock: true },
      { name: "Rifampicin 600mg", inStock: false },
      { name: "Metronidazole 400mg", inStock: true },
    ],
  },
];

// ── Simulated Database API ────────────────────────────────────
const Database = {
  getDoctors: (areaQuery = "") => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = areaQuery.toLowerCase().trim();
        const results = q
          ? DB_DOCTORS.filter((d) => d.area.includes(q) || d.location.toLowerCase().includes(q))
          : DB_DOCTORS;
        resolve(results);
      }, 500);
    });
  },

  getDoctorById: (id) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(DB_DOCTORS.find((d) => d.id === id) || null);
      }, 200);
    });
  },

  getPatientHistory: (name, gender, area, doctorId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const record = DB_PATIENT_HISTORY.find(
          (p) =>
            p.name.toLowerCase() === name.toLowerCase() &&
            p.gender.toLowerCase() === gender.toLowerCase() &&
            p.area.toLowerCase().includes(area.toLowerCase()) &&
            p.doctorId === doctorId
        );
        resolve(record || null);
      }, 600);
    });
  },

  checkSlotAvailability: (doctorId, slot) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const doc = DB_DOCTORS.find((d) => d.id === doctorId);
        if (!doc) return resolve({ available: false });
        resolve({ available: !doc.bookedSlots.includes(slot) });
      }, 400);
    });
  },

  bookSlot: (doctorId, slot) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const doc = DB_DOCTORS.find((d) => d.id === doctorId);
        if (doc && !doc.bookedSlots.includes(slot)) {
          doc.bookedSlots.push(slot);
          resolve({ success: true });
        } else {
          resolve({ success: false, message: "Slot already taken." });
        }
      }, 500);
    });
  },

  getPharmacies: (areaQuery = "") => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = areaQuery.toLowerCase().trim();
        const results = q
          ? DB_PHARMACIES.filter((p) => p.area.includes(q) || p.address.toLowerCase().includes(q))
          : DB_PHARMACIES;
        resolve(results.sort((a, b) => a.distance - b.distance));
      }, 500);
    });
  },

  getSymptomSpecialty: (symptomsText) => {
    const lower = symptomsText.toLowerCase();
    for (const [keyword, specialty] of Object.entries(SYMPTOM_MAP)) {
      if (lower.includes(keyword)) return specialty;
    }
    return "General Physician";
  },
};

window.Database = Database;
window.DB_DOCTORS = DB_DOCTORS;
window.DB_PHARMACIES = DB_PHARMACIES;
window.SYMPTOM_MAP = SYMPTOM_MAP;
