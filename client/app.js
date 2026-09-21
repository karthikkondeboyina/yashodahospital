// ==========================================
// CareConnect AI — Client Application Script
// ==========================================

// Automatically connect to backend port 3000 if opened via Live Server (port 5500)
const API_BASE = (window.location.port === '3000' || window.location.port === '')
  ? '/api' 
  : 'http://localhost:3000/api';

// Global Client State
let currentMode = 'patient';
let currentPatientPage = 'home';
let currentAdminPage = 'dashboard';

let departmentsData = [];
let campusesData = [];
let doctorsData = [];
let bookingsData = [];
let currentAvailability = null;

let sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now();
let bookingState = {
  step: 0,
  department: null,
  doctor: null,
  campus: null,
  date: null,
  time: null,
  patientName: '',
  patientPhone: '',
  patientEmail: '',
  patientAge: ''
};

const bookingSteps = ['Department', 'Doctor', 'Campus', 'Date & Time', 'Patient Details', 'Review', 'Confirm'];

// ===== INITIALIZATION =====
async function initApp() {
  updateClock();
  setInterval(updateClock, 1000);

  await loadMasterData();
  renderDepartmentsGrid();
  renderDoctorsGrid();
  populateDoctorFilters();

  restartChat();
  refreshStats();
}

async function loadMasterData() {
  try {
    const [deptsRes, campusesRes, docsRes] = await Promise.all([
      fetch(`${API_BASE}/departments`),
      fetch(`${API_BASE}/campuses`),
      fetch(`${API_BASE}/doctors`)
    ]);

    departmentsData = await deptsRes.json();
    campusesData = await campusesRes.json();
    doctorsData = await docsRes.json();
  } catch (err) {
    console.warn('API call failed, loading approved fallback directory data:', err);
    // Instant fallback to approved hospital data so UI never shows empty
    departmentsData = [
      { id:'gen', name:'General Medicine', icon:'🩺', desc:'Primary care, preventive health, and general medical consultations' },
      { id:'card', name:'Cardiology', icon:'❤️', desc:'Heart conditions, ECG, echocardiography, and cardiac care' },
      { id:'ortho', name:'Orthopaedics', icon:'🦴', desc:'Bone, joint, spine injuries and musculoskeletal conditions' },
      { id:'neuro', name:'Neurology', icon:'🧠', desc:'Brain, spine, and nervous system disorders' },
      { id:'gastro', name:'Gastroenterology', icon:'🫁', desc:'Digestive system, liver, stomach, and intestinal disorders' },
      { id:'derma', name:'Dermatology', icon:'🧴', desc:'Skin, hair, and nail conditions' },
      { id:'ent', name:'ENT', icon:'👂', desc:'Ear, nose, and throat conditions and treatments' },
      { id:'gynae', name:'Gynaecology', icon:'👩‍⚕️', desc:'Women\'s health, reproductive system, and prenatal care' },
      { id:'paedia', name:'Paediatrics', icon:'👶', desc:'Child healthcare, vaccinations, and developmental assessments' },
      { id:'pulmo', name:'Pulmonology', icon:'🫁', desc:'Lung and respiratory system conditions' },
      { id:'uro', name:'Urology', icon:'⚕️', desc:'Urinary tract and male reproductive system conditions' },
      { id:'onco', name:'Oncology', icon:'🎗️', desc:'Cancer diagnosis, treatment, and supportive care' }
    ];

    campusesData = [
      { id:'somajiguda', name:'Somajiguda' },
      { id:'hitec_city', name:'Hitec City' },
      { id:'secunderabad', name:'Secunderabad' },
      { id:'malakpet', name:'Malakpet' }
    ];

    doctorsData = [
      { id:1, name:'Dr. Ravi Teja', department_id:'gen', department_name:'General Medicine', campus_name:'Somajiguda', consultation_days:['Mon','Tue','Wed','Thu','Fri','Sat'], fee:800, avatar:'RT' },
      { id:2, name:'Dr. Meena Iyer', department_id:'gen', department_name:'General Medicine', campus_name:'Hitec City', consultation_days:['Mon','Tue','Wed','Thu','Fri'], fee:800, avatar:'MI' },
      { id:3, name:'Dr. Anil Kumar Reddy', department_id:'card', department_name:'Cardiology', campus_name:'Somajiguda', consultation_days:['Mon','Wed','Fri'], fee:1200, avatar:'AR' },
      { id:4, name:'Dr. Sunita Rao', department_id:'card', department_name:'Cardiology', campus_name:'Secunderabad', consultation_days:['Tue','Thu','Sat'], fee:1200, avatar:'SR' },
      { id:5, name:'Dr. Vikram Singh', department_id:'ortho', department_name:'Orthopaedics', campus_name:'Hitec City', consultation_days:['Mon','Tue','Wed','Thu','Fri','Sat'], fee:1000, avatar:'VS' },
      { id:6, name:'Dr. P. Srinivas', department_id:'ortho', department_name:'Orthopaedics', campus_name:'Malakpet', consultation_days:['Mon','Wed','Fri'], fee:1000, avatar:'PS' },
      { id:7, name:'Dr. Kavitha Nair', department_id:'neuro', department_name:'Neurology', campus_name:'Somajiguda', consultation_days:['Tue','Thu','Sat'], fee:1200, avatar:'KN' },
      { id:8, name:'Dr. Farhan Ali', department_id:'gastro', department_name:'Gastroenterology', campus_name:'Somajiguda', consultation_days:['Mon','Tue','Wed','Thu','Fri'], fee:1000, avatar:'FA' },
      { id:9, name:'Dr. Ananya Sharma', department_id:'derma', department_name:'Dermatology', campus_name:'Hitec City', consultation_days:['Mon','Wed','Fri'], fee:800, avatar:'AS' },
      { id:10, name:'Dr. Suresh Babu', department_id:'ent', department_name:'ENT', campus_name:'Secunderabad', consultation_days:['Mon','Tue','Wed','Thu','Fri','Sat'], fee:800, avatar:'SB' },
      { id:11, name:'Dr. Lakshmi Prasanna', department_id:'gynae', department_name:'Gynaecology', campus_name:'Somajiguda', consultation_days:['Mon','Tue','Wed','Thu','Fri','Sat'], fee:1000, avatar:'LP' },
      { id:12, name:'Dr. Rohit Menon', department_id:'paedia', department_name:'Paediatrics', campus_name:'Hitec City', consultation_days:['Mon','Tue','Wed','Thu','Fri','Sat'], fee:800, avatar:'RM' },
      { id:13, name:'Dr. G. Ramesh', department_id:'pulmo', department_name:'Pulmonology', campus_name:'Malakpet', consultation_days:['Tue','Thu','Sat'], fee:1000, avatar:'GR' },
      { id:14, name:'Dr. Aditya Verma', department_id:'uro', department_name:'Urology', campus_name:'Secunderabad', consultation_days:['Mon','Wed','Fri'], fee:1200, avatar:'AV' },
      { id:15, name:'Dr. Nandini Kulkarni', department_id:'onco', department_name:'Oncology', campus_name:'Somajiguda', consultation_days:['Tue','Thu'], fee:1500, avatar:'NK' }
    ];
  } finally {
    renderDepartmentsGrid();
    renderDoctorsGrid();
    populateDoctorFilters();
    renderAdminDepartments();
    renderAdminDoctors();
  }
}

// ===== MODE SWITCHING (PATIENT <-> FRONTDESK) =====
function switchMode(mode) {
  currentMode = mode;
  document.getElementById('patient-section').classList.toggle('active', mode === 'patient');
  document.getElementById('admin-section').classList.toggle('active', mode === 'admin');

  document.getElementById('btn-mode-patient').className = mode === 'patient' 
    ? 'px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-primary-600 text-white shadow-sm' 
    : 'px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-500 hover:text-slate-700';

  document.getElementById('btn-mode-admin').className = mode === 'admin' 
    ? 'px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-primary-600 text-white shadow-sm' 
    : 'px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-500 hover:text-slate-700';

  if (mode === 'admin') {
    refreshAdminDashboard();
  }
}

// ===== PATIENT NAVIGATION =====
function showPatientPage(page) {
  // Hide only inner patient pages, keep #patient-section active
  document.querySelectorAll('#patient-section > .page-section').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  currentPatientPage = page;

  document.querySelectorAll('.nav-link').forEach(link => {
    link.className = link.dataset.nav === page
      ? 'nav-link text-sm font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded transition'
      : 'nav-link text-sm font-medium text-slate-500 hover:text-primary-600 px-2 py-1 rounded transition';
  });

  const patientNav = document.getElementById('patient-nav');
  if (['home', 'help', 'emergency'].includes(page)) {
    patientNav.style.display = page === 'emergency' ? 'none' : '';
  } else {
    patientNav.style.display = '';
  }

  // If navigating to doctors or departments, make sure grids are populated
  if (page === 'doctors') renderDoctorsGrid();
  if (page === 'departments') renderDepartmentsGrid();
  if (page === 'booking') renderBookingStep();

  window.scrollTo(0, 0);
}

function startDirectBooking() {
  bookingState.step = 0;
  hideConflictAlert();
  showPatientPage('booking');
  renderBookingStep();
}

// ===== RENDER DEPARTMENTS =====
function renderDepartmentsGrid() {
  const grid = document.getElementById('departments-grid');
  if (!grid) return;

  grid.innerHTML = departmentsData.map(d => `
    <div class="dept-card bg-white rounded-2xl p-6 border border-surface-200 cursor-pointer booking-card hover-lift" onclick="selectDepartmentById('${d.id}')">
      <div class="dept-icon w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center text-2xl mb-4">${d.icon}</div>
      <h3 class="font-semibold text-slate-800 text-lg mb-2">${d.name}</h3>
      <p class="text-sm text-slate-500 mb-4 leading-relaxed">${d.desc}</p>
      <button class="text-primary-600 hover:text-primary-700 text-sm font-semibold flex items-center gap-1 transition">
        Book Department
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  `).join('');
}

// ===== RENDER DOCTORS =====
function renderDoctorsGrid(list = null) {
  const docs = list || doctorsData;
  const grid = document.getElementById('doctors-grid');
  if (!grid) return;

  grid.innerHTML = docs.map(d => `
    <div class="bg-white rounded-2xl p-5 border border-surface-200 hover-lift">
      <div class="flex items-start gap-4 mb-4">
        <div class="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
          <span class="text-lg font-bold text-primary-600">${d.avatar || 'DR'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-slate-800">${d.name}</h3>
          <p class="text-sm text-primary-600 font-medium">${d.department_name}</p>
        </div>
      </div>
      <div class="space-y-2 mb-4">
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          ${d.campus_name}
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          ${(d.consultation_days || []).join(', ')}
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          ₹${d.fee}
        </div>
      </div>
      <button onclick="selectDoctorById(${d.id})" class="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
        Book Appointment
      </button>
    </div>
  `).join('');
}

function filterDoctors() {
  const search = (document.getElementById('doctor-search')?.value || '').toLowerCase();
  const deptFilter = document.getElementById('doctor-dept-filter')?.value;
  const campusFilter = document.getElementById('doctor-campus-filter')?.value;

  const filtered = doctorsData.filter(d => {
    if (search && !d.name.toLowerCase().includes(search)) return false;
    if (deptFilter && d.department_id !== deptFilter) return false;
    if (campusFilter && d.campus_name !== campusFilter) return false;
    return true;
  });
  renderDoctorsGrid(filtered);
}

function populateDoctorFilters() {
  const deptSelect = document.getElementById('doctor-dept-filter');
  if (deptSelect) {
    deptSelect.innerHTML = '<option value="">All Departments</option>' + departmentsData.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  const campusSelect = document.getElementById('doctor-campus-filter');
  if (campusSelect) {
    campusSelect.innerHTML = '<option value="">All Campuses</option>' + campusesData.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

// ===== BOOKING STEP FLOW (PATIENT PORTAL) =====
function selectDepartmentById(deptId) {
  bookingState.department = departmentsData.find(d => d.id === deptId);
  bookingState.step = 1;
  hideConflictAlert();
  showPatientPage('booking');
  renderBookingStep();
}

function selectDoctorById(doctorId) {
  bookingState.doctor = doctorsData.find(d => d.id === doctorId);
  if (bookingState.doctor) {
    bookingState.department = departmentsData.find(d => d.id === bookingState.doctor.department_id);
    bookingState.campus = bookingState.doctor.campus_name;
  }
  bookingState.step = 3; // Jump directly to date & slot selection
  hideConflictAlert();
  showPatientPage('booking');
  renderBookingStep();
}

function renderStepIndicator() {
  const container = document.getElementById('step-indicator');
  if (!container) return;

  container.innerHTML = bookingSteps.map((step, i) => `
    <div class="flex items-center">
      <div class="flex flex-col items-center">
        <div class="step-circle ${i < bookingState.step ? 'completed' : i === bookingState.step ? 'active' : 'inactive'}">
          ${i < bookingState.step ? '✓' : i + 1}
        </div>
        <span class="text-xs mt-1 ${i === bookingState.step ? 'text-primary-600 font-semibold' : i < bookingState.step ? 'text-success-600' : 'text-slate-400'}">${step}</span>
      </div>
      ${i < bookingSteps.length - 1 ? `<div class="step-line mx-2 ${i < bookingState.step ? 'bg-success-500' : 'bg-surface-200'}"></div>` : ''}
    </div>
  `).join('');
}

function showConflictAlert(message) {
  const box = document.getElementById('booking-conflict-alert');
  const txt = document.getElementById('booking-conflict-text');
  if (box && txt) {
    txt.textContent = message || 'This slot is already occupied. Please select an alternative time.';
    box.classList.remove('hidden');
  }
}

function hideConflictAlert() {
  const box = document.getElementById('booking-conflict-alert');
  if (box) box.classList.add('hidden');
}

async function renderBookingStep() {
  renderStepIndicator();
  const content = document.getElementById('booking-step-content');
  if (!content) return;
  const step = bookingState.step;

  if (step === 0) {
    // 0. Select Department
    content.innerHTML = `
      <h2 class="text-2xl font-bold text-slate-800 mb-6">Select Department</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        ${departmentsData.map(d => `
          <div onclick="selectDepartmentById('${d.id}')" class="bg-white rounded-xl border-2 ${bookingState.department?.id === d.id ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-primary-300'} p-5 cursor-pointer transition hover-lift">
            <div class="flex items-center gap-3">
              <span class="text-2xl">${d.icon}</span>
              <div>
                <div class="font-semibold text-slate-800">${d.name}</div>
                <div class="text-sm text-slate-500">${d.desc.substring(0, 50)}...</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (step === 1) {
    // 1. Select Doctor
    const deptDoctors = doctorsData.filter(d => d.department_id === bookingState.department.id);
    content.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <button onclick="bookingState.step=0;renderBookingStep()" class="p-2 hover:bg-surface-100 rounded-lg transition"><svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
        <div>
          <h2 class="text-2xl font-bold text-slate-800">Select Doctor</h2>
          <p class="text-sm text-slate-500">${bookingState.department.name}</p>
        </div>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        ${deptDoctors.map(d => `
          <div onclick="bookingState.doctor=doctorsData.find(x=>x.id===${d.id});bookingState.campus='${d.campus_name}';bookingState.step=2;renderBookingStep()" class="bg-white rounded-xl border-2 ${bookingState.doctor?.id === d.id ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-primary-300'} p-5 cursor-pointer transition hover-lift">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                <span class="text-sm font-bold text-primary-600">${d.avatar}</span>
              </div>
              <div>
                <div class="font-semibold text-slate-800">${d.name}</div>
                <div class="text-sm text-slate-500">${d.campus_name}</div>
                <div class="text-sm text-slate-500">${d.consultation_days.join(', ')}</div>
                <div class="text-sm font-medium text-primary-600 mt-1">₹${d.fee}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (step === 2) {
    // 2. Campus Selection
    content.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <button onclick="bookingState.step=1;renderBookingStep()" class="p-2 hover:bg-surface-100 rounded-lg transition"><svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
        <div>
          <h2 class="text-2xl font-bold text-slate-800">Select Campus</h2>
          <p class="text-sm text-slate-500">${bookingState.doctor.name} • ${bookingState.department.name}</p>
        </div>
      </div>
      <div class="space-y-3">
        ${campusesData.map(c => {
          const isAvail = c.name === bookingState.doctor.campus_name;
          return `
          <div onclick="${isAvail ? `bookingState.campus='${c.name}';bookingState.step=3;renderBookingStep()` : ''}" class="bg-white rounded-xl border-2 ${bookingState.campus === c.name ? 'border-primary-500 bg-primary-50' : isAvail ? 'border-surface-200 hover:border-primary-300 cursor-pointer' : 'border-surface-100 opacity-50'} p-5 transition hover-lift">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 ${isAvail ? 'text-primary-600' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <div>
                  <div class="font-semibold text-slate-800">${c.name}</div>
                  <div class="text-sm ${isAvail ? 'text-success-600' : 'text-slate-400'}">${isAvail ? 'Available Campus' : 'Doctor not stationed at this campus'}</div>
                </div>
              </div>
              ${isAvail ? '<svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ''}
            </div>
          </div>
        `}).join('')}
      </div>
    `;
  } else if (step === 3) {
    // 3. Date & Real-time Slot Selection
    const defaultDate = bookingState.date || '2026-10-15';
    bookingState.date = defaultDate;

    content.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <button onclick="bookingState.step=2;renderBookingStep()" class="p-2 hover:bg-surface-100 rounded-lg transition"><svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
        <div>
          <h2 class="text-2xl font-bold text-slate-800">Select Date & Time</h2>
          <p class="text-sm text-slate-500">${bookingState.doctor.name} • ${bookingState.campus}</p>
        </div>
      </div>
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">Select Date (Consultation: ${bookingState.doctor.consultation_days.join(', ')})</label>
          <input type="date" id="booking-date-picker" value="${bookingState.date}" min="2026-10-01" max="2026-12-31" class="bg-white border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 transition" onchange="onBookingDateChange(this.value)">
        </div>

        <div id="booking-slots-container">
          <div class="text-sm text-slate-400 py-4">Checking live slot availability from hospital backend...</div>
        </div>

        ${bookingState.time ? `
          <button onclick="bookingState.step=4;renderBookingStep()" class="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold transition shadow-sm mt-4">
            Continue to Patient Details
          </button>
        ` : ''}
      </div>
    `;

    fetchAndRenderSlots();
  } else if (step === 4) {
    // 4. Patient Details
    content.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <button onclick="bookingState.step=3;renderBookingStep()" class="p-2 hover:bg-surface-100 rounded-lg transition"><svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
        <h2 class="text-2xl font-bold text-slate-800">Patient Details</h2>
      </div>
      <div class="bg-white rounded-2xl border border-surface-200 p-6">
        <div class="grid sm:grid-cols-2 gap-5">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
            <input id="patient-name" type="text" placeholder="Enter full name" value="${bookingState.patientName}" oninput="bookingState.patientName=this.value" class="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Phone Number * (10 Digits)</label>
            <input id="patient-phone" type="tel" placeholder="+91 98765 43210" value="${bookingState.patientPhone}" oninput="bookingState.patientPhone=this.value" class="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Email Address * <span class="text-xs text-primary-600 font-normal">(Required for confirmation email)</span></label>
            <input id="patient-email" type="email" placeholder="e.g. yourname@gmail.com" value="${bookingState.patientEmail}" oninput="bookingState.patientEmail=this.value" required class="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
            <p class="text-[11px] text-slate-400 mt-1">We will send your appointment ID, doctor details, and calendar instructions here.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Age *</label>
            <input id="patient-age" type="number" placeholder="Your age" value="${bookingState.patientAge}" oninput="bookingState.patientAge=this.value" class="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
          </div>
        </div>
        <button onclick="submitPatientDetails()" class="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold transition shadow-sm mt-6">
          Review Booking
        </button>
      </div>
    `;
  } else if (step === 5) {
    // 5. Review & Final Confirmation
    content.innerHTML = `
      <div class="flex items-center gap-3 mb-6">
        <button onclick="bookingState.step=4;renderBookingStep()" class="p-2 hover:bg-surface-100 rounded-lg transition"><svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>
        <h2 class="text-2xl font-bold text-slate-800">Review & Confirm Appointment</h2>
      </div>
      <div class="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        <div class="bg-primary-50 p-6 border-b border-primary-100">
          <h3 class="font-semibold text-primary-800 mb-4">Appointment Summary</h3>
          <div class="grid sm:grid-cols-2 gap-4">
            <div><span class="text-sm text-slate-500">Department</span><div class="font-semibold text-slate-800">${bookingState.department.name}</div></div>
            <div><span class="text-sm text-slate-500">Doctor</span><div class="font-semibold text-slate-800">${bookingState.doctor.name}</div></div>
            <div><span class="text-sm text-slate-500">Campus</span><div class="font-semibold text-slate-800">${bookingState.campus}</div></div>
            <div><span class="text-sm text-slate-500">Date</span><div class="font-semibold text-slate-800">${bookingState.date}</div></div>
            <div><span class="text-sm text-slate-500">Time Slot</span><div class="font-semibold text-slate-800">${bookingState.time}</div></div>
            <div><span class="text-sm text-slate-500">Consultation Fee</span><div class="font-bold text-lg text-slate-800">₹${bookingState.doctor.fee}</div></div>
          </div>
        </div>
        <div class="p-6">
          <h3 class="font-semibold text-slate-800 mb-4">Patient Information</h3>
          <div class="grid sm:grid-cols-2 gap-4 mb-6">
            <div><span class="text-sm text-slate-500">Name</span><div class="font-semibold">${bookingState.patientName}</div></div>
            <div><span class="text-sm text-slate-500">Phone</span><div class="font-semibold">${bookingState.patientPhone}</div></div>
            <div><span class="text-sm text-slate-500">Notification Email</span><div class="font-semibold text-primary-700">${bookingState.patientEmail}</div></div>
            <div><span class="text-sm text-slate-500">Age</span><div class="font-semibold">${bookingState.patientAge} yrs</div></div>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <div class="text-sm text-amber-700">Please arrive <strong>15 minutes early</strong> with a valid photo ID. Hospital Front Desk: <strong>+91 95132 62681</strong></div>
            </div>
          </div>
          <button id="btn-final-confirm" onclick="executeFinalBooking()" class="w-full bg-success-600 hover:bg-success-700 text-white py-3.5 rounded-xl font-semibold transition shadow-sm flex items-center justify-center gap-2">
            Confirm & Reserve Slot
          </button>
        </div>
      </div>
    `;
  }
}

function onBookingDateChange(newDate) {
  bookingState.date = newDate;
  bookingState.time = null;
  fetchAndRenderSlots();
}

async function fetchAndRenderSlots() {
  const container = document.getElementById('booking-slots-container');
  if (!container || !bookingState.doctor || !bookingState.date) return;

  container.innerHTML = '<div class="text-sm text-slate-400 py-3">Loading available slots...</div>';

  try {
    const res = await fetch(`${API_BASE}/doctors/${bookingState.doctor.id}/availability?date=${bookingState.date}`);
    const data = await res.json();
    currentAvailability = data;

    if (!data.isConsultationDay) {
      container.innerHTML = `
        <div class="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
          ⚠️ ${data.message}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <h3 class="font-semibold text-slate-700 mb-3">Available Time Slots for ${data.dayOfWeek} (${bookingState.date})</h3>
      <div class="grid grid-cols-3 gap-3">
        ${data.allSlots.map(slot => {
          const isBooked = data.bookedSlots.includes(slot);
          const isSelected = bookingState.time === slot;
          return `
            <div onclick="${isBooked ? '' : `selectTimeSlot('${slot}')`}" class="slot-btn ${isSelected ? 'selected' : ''} ${isBooked ? 'disabled' : ''}">
              <div class="font-medium">${slot}</div>
              ${isBooked ? '<div class="text-xs text-emergency-600 font-medium mt-1">Already Booked</div>' : '<div class="text-xs text-success-600 mt-1">Available</div>'}
            </div>
          `;
        }).join('')}
      </div>
      <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Each slot is locked to exactly one patient. Occupied slots cannot be double-booked.
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="text-sm text-emergency-600">Failed to load slot availability.</div>';
  }
}

function selectTimeSlot(slot) {
  bookingState.time = slot;
  hideConflictAlert();
  renderBookingStep();
}

function submitPatientDetails() {
  if (!bookingState.patientName || bookingState.patientName.trim().length < 2) {
    alert('Please enter your full name (minimum 2 characters).');
    return;
  }
  if (!bookingState.patientPhone || !bookingState.patientPhone.trim()) {
    alert('Please enter a valid 10-digit Indian mobile number.');
    return;
  }
  if (!bookingState.patientEmail || !bookingState.patientEmail.trim()) {
    alert('Please enter your email address so we can send your appointment confirmation.');
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(bookingState.patientEmail.trim())) {
    alert('Please enter a valid email address (e.g. name@example.com).');
    return;
  }
  if (!bookingState.patientAge || isNaN(bookingState.patientAge) || parseInt(bookingState.patientAge, 10) <= 0) {
    alert('Please enter a valid patient age.');
    return;
  }

  bookingState.step = 5;
  renderBookingStep();
}

// ===== FINAL TRANSACTIONAL BOOKING CALL =====
async function executeFinalBooking() {
  const btn = document.getElementById('btn-final-confirm');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
      Reserving Slot & Sending Email...
    `;
  }

  try {
    const payload = {
      doctorId: bookingState.doctor.id,
      appointmentDate: bookingState.date,
      appointmentTime: bookingState.time,
      patientName: bookingState.patientName,
      patientPhone: bookingState.patientPhone,
      patientEmail: bookingState.patientEmail,
      patientAge: bookingState.patientAge
    };

    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showConflictAlert(data.error || 'Failed to book slot.');
      bookingState.step = 3; // return to slot selection
      renderBookingStep();
      return;
    }

    // Success -> Display Confirmation Screen
    const b = data.booking;
    document.getElementById('confirm-ref').textContent = b.appointment_ref;
    document.getElementById('confirm-name').textContent = b.patient_name;
    document.getElementById('confirm-dept').textContent = b.department_name;
    document.getElementById('confirm-doctor').textContent = b.doctor_name;
    document.getElementById('confirm-campus').textContent = b.campus_name;
    document.getElementById('confirm-date').textContent = b.appointment_date;
    document.getElementById('confirm-time').textContent = b.appointment_time;
    document.getElementById('confirm-fee').textContent = '₹' + b.fee;
    document.getElementById('confirm-sent-email').textContent = b.patient_email || 'karthikkondeboyina@gmail.com';

    showPatientPage('confirmation');
    refreshStats();
  } catch (err) {
    showConflictAlert('Network error while booking appointment.');
  }
}

// ===== AI ASSISTANT CHAT ENGINE =====
const chatMessages = document.getElementById('chat-messages');

function addChatBubble(role, text, animate = true) {
  const div = document.createElement('div');
  div.className = role === 'patient' ? 'flex justify-end' : 'flex justify-start';

  if (role === 'assistant') {
    div.innerHTML = `
      <div class="flex items-start gap-2 max-w-[85%]">
        <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0 mt-1">
          <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        </div>
        <div class="chat-bubble-assistant px-4 py-3 text-sm leading-relaxed">${formatMarkdown(text)}</div>
      </div>
    `;
  } else {
    div.innerHTML = `<div class="chat-bubble-patient px-4 py-3 text-sm leading-relaxed max-w-[85%]">${escapeHtml(text)}</div>`;
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addQuickActions(actions) {
  if (!actions || !actions.length) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-wrap gap-2 pl-10';

  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'bg-primary-50 hover:bg-primary-100 text-primary-700 px-4 py-2 rounded-xl text-sm font-medium transition border border-primary-200';
    btn.textContent = a.label;
    btn.onclick = () => {
      wrapper.remove();
      handleChatAction(a);
    };
    wrapper.appendChild(btn);
  });

  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatAction(action) {
  if (action.type === 'call_emergency') {
    showPatientPage('emergency');
  } else if (action.type === 'call_ambulance') {
    showPatientPage('emergency');
  } else if (action.type === 'select_dept') {
    selectDepartmentById(action.deptId);
  } else if (action.type === 'select_doctor') {
    selectDoctorById(action.doctorId);
  } else if (action.type === 'open_booking') {
    selectDoctorById(action.doctorId);
  } else if (action.type === 'navigate') {
    showPatientPage(action.page);
  } else if (action.type === 'book_start') {
    startDirectBooking();
  }
}

async function sendUserMessage() {
  const input = document.getElementById('chat-input');
  const text = (input?.value || '').trim();
  if (!text) return;

  input.value = '';
  addChatBubble('patient', text);

  const lang = document.getElementById('lang-selector')?.value || 'en';

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text, language: lang })
    });

    const data = await res.json();
    addChatBubble('assistant', data.reply);
    if (data.actions) {
      addQuickActions(data.actions);
    }
  } catch (err) {
    console.warn('Backend chat unreachable, utilizing client emergency & directory engine:', err);
    const lower = text.toLowerCase();
    const emergencyWords = ['chest pain','heart attack','breathing','stroke','bleeding','unconscious','severe','injury','suicide','poison'];
    if (emergencyWords.some(w => lower.includes(w))) {
      addChatBubble('assistant', '⚠️ <strong>This may be a medical emergency.</strong> Please call <strong>105910</strong> or <strong>108</strong> immediately. <strong>Do not wait for an appointment.</strong>');
      addQuickActions([
        { label: 'Call 105910', type: 'call_emergency' },
        { label: 'Call 108', type: 'call_ambulance' }
      ]);
    } else if (lower.includes('book') || lower.includes('appointment')) {
      addChatBubble('assistant', 'I would be happy to help you book an appointment. You can browse our departments or choose a specialist directly.');
      addQuickActions([
        { label: 'Browse Departments', type: 'navigate', page: 'departments' },
        { label: 'Find a Doctor', type: 'navigate', page: 'doctors' },
        { label: 'Direct Booking', type: 'book_start' }
      ]);
    } else {
      addChatBubble('assistant', 'I can assist you in finding a specialist doctor, selecting an available time slot, and booking an appointment. How can I help you today?');
      addQuickActions([
        { label: 'Book Appointment', type: 'book_start' },
        { label: 'Find Doctor', type: 'navigate', page: 'doctors' },
        { label: 'View Departments', type: 'navigate', page: 'departments' }
      ]);
    }
  }
}

function restartChat() {
  sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now();
  chatMessages.innerHTML = '';
  addChatBubble('assistant', 'Hello! I am CareConnect AI, your hospital appointment assistant. How can I help you today?');
  addQuickActions([
    { label: 'Book an Appointment', type: 'book_start' },
    { label: 'Find a Doctor', type: 'navigate', page: 'doctors' },
    { label: 'View Departments', type: 'navigate', page: 'departments' },
    { label: 'Emergency Help', type: 'navigate', page: 'emergency' }
  ]);
}

// ===== FRONTDESK ADMIN DASHBOARD =====
function showAdminPage(page) {
  document.querySelectorAll('.admin-page').forEach(el => el.style.display = 'none');
  const el = document.getElementById('admin-page-' + page);
  if (el) el.style.display = 'block';
  currentAdminPage = page;

  const titles = {
    'dashboard': 'Dashboard',
    'bookings': 'Bookings Management',
    'conversations': 'Conversation Monitor',
    'notifications': 'Notification Audit Log',
    'admin-doctors': 'Doctor Directory',
    'admin-departments': 'Departments'
  };
  document.getElementById('admin-page-title').textContent = titles[page] || 'Dashboard';
  document.getElementById('admin-mobile-title').textContent = titles[page] || 'Dashboard';

  document.querySelectorAll('[data-admin-nav]').forEach(btn => {
    btn.className = btn.dataset.adminNav === page
      ? 'sidebar-item active w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left'
      : 'sidebar-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left text-slate-600';
  });

  if (page === 'bookings') fetchBookings();
  if (page === 'conversations') fetchConversations();
  if (page === 'notifications') fetchNotifications();
  if (page === 'dashboard') refreshAdminDashboard();

  window.scrollTo(0, 0);
}

function toggleAdminSidebar() {
  document.getElementById('mobile-admin-sidebar')?.classList.toggle('open');
}

async function refreshStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();

    document.getElementById('stat-total-booked').textContent = stats.totalBookings + '+';
    document.getElementById('stat-card-total').textContent = stats.totalBookings;
    document.getElementById('stat-card-today').textContent = stats.todayBookings;
    document.getElementById('stat-card-pending').textContent = stats.pendingBookings;
    document.getElementById('stat-card-convs').textContent = stats.activeConversations;

    // Render department load bars
    const loadBars = document.getElementById('admin-dept-load-bars');
    if (loadBars && stats.deptStats) {
      const maxCount = Math.max(...stats.deptStats.map(s => s.booking_count), 1);
      loadBars.innerHTML = stats.deptStats.slice(0, 6).map(s => {
        const pct = Math.round((s.booking_count / maxCount) * 100);
        return `
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-600 w-36 truncate">${s.name}</span>
            <div class="flex-1 bg-surface-100 rounded-full h-3">
              <div class="bg-primary-500 rounded-full h-3" style="width:${pct}%"></div>
            </div>
            <span class="text-sm font-semibold text-slate-700 w-12 text-right">${s.booking_count}</span>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function refreshAdminDashboard() {
  await refreshStats();

  // Load recent bookings
  try {
    const res = await fetch(`${API_BASE}/bookings?limit=5`);
    const bookings = await res.json();
    const container = document.getElementById('dashboard-recent-bookings');
    if (container) {
      const statusColors = { Confirmed: 'bg-success-100 text-success-700', Pending: 'bg-warning-100 text-warning-700', Cancelled: 'bg-emergency-100 text-emergency-700', Completed: 'bg-surface-100 text-slate-600' };
      container.innerHTML = bookings.slice(0, 5).map(b => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 transition cursor-pointer" onclick="openBookingDetails('${b.appointment_ref}')">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <span class="text-xs font-bold text-primary-600">${b.patient_name.substring(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <div class="text-sm font-semibold text-slate-800">${b.patient_name} (${b.appointment_ref})</div>
              <div class="text-xs text-slate-400">${b.doctor_name} • ${b.appointment_date} ${b.appointment_time}</div>
            </div>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[b.status] || 'bg-surface-100'}">${b.status}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load recent bookings:', err);
  }

  // Load recent conversations
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    const convs = await res.json();
    const container = document.getElementById('dashboard-recent-conversations');
    if (container) {
      container.innerHTML = convs.slice(0, 5).map(c => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 transition cursor-pointer" onclick="showAdminPage('conversations')">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <span class="text-xs font-bold text-primary-600">AI</span>
            </div>
            <div>
              <div class="text-sm font-semibold text-slate-800">${c.sessionId}</div>
              <div class="text-xs text-slate-400">${c.messageCount} messages • ${new Date(c.lastActivity).toLocaleTimeString()}</div>
            </div>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-success-100 text-success-700">Logged</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load recent convs:', err);
  }
}

// ===== FRONTDESK: BOOKINGS TABLE =====
async function fetchBookings() {
  const search = document.getElementById('booking-search-input')?.value || '';
  const campus = document.getElementById('booking-campus-filter')?.value || '';
  const status = document.getElementById('booking-status-filter')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (campus) params.append('campus', campus);
  if (status) params.append('status', status);

  try {
    const res = await fetch(`${API_BASE}/bookings?${params.toString()}`);
    bookingsData = await res.json();
    renderBookingsTable(bookingsData);
  } catch (err) {
    console.error('Failed to fetch bookings:', err);
  }
}

function renderBookingsTable(list) {
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  const statusColors = { Confirmed: 'bg-success-100 text-success-700', Pending: 'bg-warning-100 text-warning-700', Cancelled: 'bg-emergency-100 text-emergency-700', Completed: 'bg-surface-100 text-slate-600' };

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-sm text-slate-400">No appointments found matching your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => `
    <tr class="border-b border-surface-100 hover:bg-surface-50 transition">
      <td class="px-5 py-4"><span class="font-mono text-sm font-semibold text-primary-600">${b.appointment_ref}</span></td>
      <td class="px-5 py-4"><div class="text-sm font-semibold text-slate-800">${b.patient_name}</div></td>
      <td class="px-5 py-4 hidden lg:table-cell"><span class="text-sm text-slate-500">${b.patient_phone}</span></td>
      <td class="px-5 py-4 hidden md:table-cell"><span class="text-sm text-slate-600">${b.department_name}</span></td>
      <td class="px-5 py-4 hidden xl:table-cell"><span class="text-sm text-slate-600">${b.doctor_name}</span></td>
      <td class="px-5 py-4 hidden lg:table-cell"><div class="text-sm text-slate-600">${b.appointment_date}</div><div class="text-xs text-slate-400">${b.appointment_time}</div></td>
      <td class="px-5 py-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[b.status] || 'bg-surface-100'}">${b.status}</span></td>
      <td class="px-5 py-4">
        <button onclick="openBookingDetails('${b.appointment_ref}')" class="text-primary-600 hover:text-primary-700 text-sm font-medium transition">View Details</button>
      </td>
    </tr>
  `).join('');
}

async function openBookingDetails(ref) {
  try {
    const res = await fetch(`${API_BASE}/bookings/${ref}`);
    const data = await res.json();
    const b = data.booking;
    const notifs = data.notifications || [];

    const statusColors = { Confirmed: 'bg-success-100 text-success-700', Pending: 'bg-warning-100 text-warning-700', Cancelled: 'bg-emergency-100 text-emergency-700', Completed: 'bg-surface-100 text-slate-600' };

    document.getElementById('drawer-content').innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <span class="font-mono text-lg font-bold text-primary-600">${b.appointment_ref}</span>
          <span class="text-sm font-semibold px-3 py-1 rounded-full ${statusColors[b.status]}">${b.status}</span>
        </div>
        
        <div>
          <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Patient Details</h4>
          <div class="bg-surface-50 rounded-xl p-4 space-y-2">
            <div class="flex justify-between"><span class="text-sm text-slate-500">Name</span><span class="text-sm font-semibold">${b.patient_name}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Phone</span><span class="text-sm font-semibold">${b.patient_phone}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Email</span><span class="text-sm font-semibold text-primary-700">${b.patient_email || 'None'}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Age</span><span class="text-sm font-semibold">${b.patient_age} yrs</span></div>
          </div>
        </div>
        
        <div>
          <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Appointment Details</h4>
          <div class="bg-surface-50 rounded-xl p-4 space-y-2">
            <div class="flex justify-between"><span class="text-sm text-slate-500">Department</span><span class="text-sm font-semibold">${b.department_name}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Doctor</span><span class="text-sm font-semibold">${b.doctor_name}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Campus</span><span class="text-sm font-semibold">${b.campus_name}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Date</span><span class="text-sm font-semibold">${b.appointment_date}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Time</span><span class="text-sm font-semibold">${b.appointment_time}</span></div>
            <div class="flex justify-between"><span class="text-sm text-slate-500">Fee</span><span class="text-sm font-bold">₹${b.fee}</span></div>
          </div>
        </div>
        
        <div>
          <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Notification Audit Log</h4>
          <div class="bg-surface-50 rounded-xl p-4 space-y-2">
            ${notifs.length ? notifs.map(n => `
              <div class="border-b border-surface-200 pb-2 mb-2 last:border-b-0 last:pb-0">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold uppercase text-slate-700">${n.type} (${n.channel})</span>
                  <span class="px-2 py-0.5 rounded font-semibold ${n.status === 'Sent' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}">${n.status}</span>
                </div>
                <div class="text-xs text-slate-500 mt-1">${n.recipient} • ${n.sent_at || n.created_at}</div>
              </div>
            `).join('') : '<div class="text-xs text-slate-400">No email events recorded yet.</div>'}
          </div>
        </div>
        
        <div class="flex gap-3 pt-2">
          ${b.status !== 'Cancelled' ? `
            <button onclick="cancelAppointmentFromAdmin('${b.appointment_ref}')" class="flex-1 bg-emergency-50 hover:bg-emergency-100 text-emergency-700 py-2.5 rounded-xl text-sm font-semibold transition border border-emergency-200">
              Cancel Appointment
            </button>
          ` : '<div class="text-sm text-slate-400 text-center w-full py-2">Appointment is Cancelled</div>'}
        </div>
      </div>
    `;

    document.getElementById('drawer-overlay').classList.add('open');
    document.getElementById('drawer-panel').classList.add('open');
  } catch (err) {
    alert('Failed to open booking details.');
  }
}

async function cancelAppointmentFromAdmin(ref) {
  if (!confirm(`Are you sure you want to cancel appointment ${ref}? Slot will be reopened.`)) return;

  try {
    const res = await fetch(`${API_BASE}/bookings/${ref}/cancel`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      closeDrawer();
      fetchBookings();
      refreshStats();
    } else {
      alert(data.error || 'Failed to cancel appointment.');
    }
  } catch (err) {
    alert('Network error cancelling appointment.');
  }
}

function closeDrawer() {
  document.getElementById('drawer-overlay')?.classList.remove('open');
  document.getElementById('drawer-panel')?.classList.remove('open');
}

// ===== FRONTDESK: CONVERSATION MONITOR =====
let conversationsList = [];

async function fetchConversations() {
  try {
    const res = await fetch(`${API_BASE}/conversations`);
    conversationsList = await res.json();
    renderConversationsList();
    if (conversationsList.length) {
      inspectConversation(conversationsList[0].sessionId);
    }
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }
}

function renderConversationsList() {
  const container = document.getElementById('conversation-list');
  if (!container) return;

  if (!conversationsList.length) {
    container.innerHTML = '<div class="p-4 text-xs text-slate-400">No conversations recorded yet.</div>';
    return;
  }

  container.innerHTML = conversationsList.map((c, idx) => `
    <div class="conversation-list-item ${idx === 0 ? 'active' : ''} p-4 cursor-pointer border-b border-surface-100" onclick="inspectConversation('${c.sessionId}')">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm font-semibold text-slate-800">${c.sessionId}</span>
        <span class="text-xs text-success-600">● Active</span>
      </div>
      <div class="text-xs text-slate-400">${c.messageCount} messages • ${new Date(c.lastActivity).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function inspectConversation(sessionId) {
  const conv = conversationsList.find(c => c.sessionId === sessionId);
  if (!conv) return;

  document.getElementById('conv-active-title').textContent = sessionId;
  document.getElementById('conv-active-subtitle').textContent = `${conv.messageCount} exchanges recorded`;

  const container = document.getElementById('conversation-transcript');
  container.innerHTML = conv.messages.map(m => `
    <div class="${m.role === 'patient' ? 'flex justify-end' : 'flex justify-start'}">
      <div class="max-w-[80%]">
        <div class="text-[11px] text-slate-400 mb-1 ${m.role === 'patient' ? 'text-right' : ''}">${m.role === 'patient' ? 'Patient' : 'CareConnect AI'} • ${new Date(m.created_at).toLocaleTimeString()}</div>
        <div class="${m.role === 'patient' ? 'chat-bubble-patient' : 'chat-bubble-assistant'} px-4 py-3 text-sm leading-relaxed">${formatMarkdown(m.message)}</div>
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

// ===== FRONTDESK: NOTIFICATIONS LOG =====
async function fetchNotifications() {
  const tbody = document.getElementById('notifications-table-body');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/notifications`);
    const notifs = await res.json();

    if (!notifs.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-sm text-slate-400">No notification events recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = notifs.map(n => `
      <tr class="border-b border-surface-100 hover:bg-surface-50 transition">
        <td class="px-5 py-4"><span class="text-xs font-mono text-slate-500">${n.id}</span></td>
        <td class="px-5 py-4"><span class="font-mono text-sm font-semibold text-primary-600">${n.appointment_ref}</span></td>
        <td class="px-5 py-4"><span class="text-xs font-bold uppercase bg-surface-100 px-2 py-1 rounded text-slate-700">${n.type}</span></td>
        <td class="px-5 py-4"><span class="text-sm text-slate-600">${n.recipient}</span></td>
        <td class="px-5 py-4"><span class="text-sm text-slate-800">${n.subject}</span></td>
        <td class="px-5 py-4"><span class="text-xs font-semibold px-2.5 py-1 rounded-full ${n.status === 'Sent' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}">${n.status}</span></td>
        <td class="px-5 py-4"><span class="text-xs text-slate-500">${n.sent_at || n.created_at}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

// ===== ADMIN DOCTORS & DEPARTMENTS =====
function renderAdminDoctors() {
  const tbody = document.getElementById('admin-doctors-table');
  if (!tbody) return;

  tbody.innerHTML = doctorsData.map(d => `
    <tr class="border-b border-surface-100 hover:bg-surface-50 transition">
      <td class="px-5 py-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
            <span class="text-sm font-bold text-primary-600">${d.avatar}</span>
          </div>
          <div class="font-semibold text-sm text-slate-800">${d.name}</div>
        </div>
      </td>
      <td class="px-5 py-4"><span class="text-sm text-slate-600">${d.department_name}</span></td>
      <td class="px-5 py-4"><span class="text-sm text-slate-600">${d.campus_name}</span></td>
      <td class="px-5 py-4"><span class="text-sm text-slate-600">${d.consultation_days.join(', ')}</span></td>
      <td class="px-5 py-4"><span class="text-sm font-bold text-slate-700">₹${d.fee}</span></td>
    </tr>
  `).join('');
}

function renderAdminDepartments() {
  const grid = document.getElementById('admin-departments-grid');
  if (!grid) return;

  grid.innerHTML = departmentsData.map(d => {
    const deptDocs = doctorsData.filter(doc => doc.department_id === d.id);
    return `
      <div class="bg-white rounded-2xl p-6 border border-surface-200 hover-lift">
        <div class="flex items-start justify-between mb-4">
          <div class="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-xl">${d.icon}</div>
        </div>
        <h3 class="font-semibold text-slate-800 mb-1">${d.name}</h3>
        <p class="text-sm text-slate-500 mb-4">${d.desc.substring(0, 60)}...</p>
        <div class="flex gap-4 text-sm">
          <div><span class="font-bold text-primary-600">${deptDocs.length}</span> <span class="text-slate-500">doctors</span></div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== UTILITIES =====
function updateClock() {
  const clock = document.getElementById('admin-clock');
  if (clock) {
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    clock.textContent = now.toLocaleTimeString('en-IN', options) + ' IST';
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMarkdown(str) {
  if (!str) return '';
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ===== SAMMY VOICE ASSISTANT CLIENT CONTROLLER =====
let voiceSessionId = null;
let voiceRecognition = null;
let isVoiceMuted = false;
let isVoiceSpeaking = false;
let isListening = false;
let voiceAudioWaveInterval = null;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API is not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN'; // Indian English matching Sammy's profile

  recognition.onstart = () => {
    isListening = true;
    updateVoiceUIStatus('Listening to you...', true);
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log('[Sammy Voice] User speech transcript:', transcript);
    addVoiceTranscriptBubble('patient', transcript);
    await processVoiceTurn(transcript);
  };

  recognition.onerror = (event) => {
    console.warn('[Sammy Voice] Speech recognition error:', event.error);
    if (event.error !== 'no-speech') {
      updateVoiceUIStatus('Ready to listen. Click speak below.', false);
    }
    isListening = false;
  };

  recognition.onend = () => {
    isListening = false;
    if (!isVoiceSpeaking) {
      updateVoiceUIStatus('Tap "Hold or Click to Speak" to talk', false);
    }
  };

  return recognition;
}

async function openVoiceCallModal() {
  const modal = document.getElementById('voice-call-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  const transcriptBox = document.getElementById('voice-transcript-box');
  if (transcriptBox) {
    transcriptBox.innerHTML = '';
  }

  const badge = document.getElementById('voice-booking-badge');
  if (badge) badge.classList.add('hidden');

  updateVoiceUIStatus('Connecting to Yashoda Hospitals FrontDesk...', false);

  try {
    const res = await fetch(`${API_BASE}/voice/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: bookingState.patientPhone || '+91 95132 62681',
        email: bookingState.patientEmail || 'karthikkondeboyina@gmail.com'
      })
    });

    const data = await res.json();
    voiceSessionId = data.sessionId;
    addVoiceTranscriptBubble('sammy', data.reply);
    speakSammyText(data.reply);
  } catch (err) {
    console.error('Error starting voice session:', err);
    updateVoiceUIStatus('Connected to Sammy Assistant (Offline Mode)', false);
    const greeting = "Hi, this is Sammy from Yashoda Hospitals. How may I help you today?";
    addVoiceTranscriptBubble('sammy', greeting);
    speakSammyText(greeting);
  }
}

function closeVoiceCallModal() {
  endVoiceCall();
  const modal = document.getElementById('voice-call-modal');
  if (modal) {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  }
}

function endVoiceCall() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (voiceRecognition) {
    try { voiceRecognition.stop(); } catch (e) {}
  }
  isVoiceSpeaking = false;
  isListening = false;
  updateVoiceUIStatus('Call Ended', false);
  const modal = document.getElementById('voice-call-modal');
  if (modal) {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  }
}

function toggleVoiceMute() {
  isVoiceMuted = !isVoiceMuted;
  const btn = document.getElementById('voice-btn-mic');
  const icon = document.getElementById('voice-mic-icon');
  if (isVoiceMuted) {
    btn?.classList.add('bg-emergency-100', 'text-emergency-600');
    if (icon) {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>';
    }
  } else {
    btn?.classList.remove('bg-emergency-100', 'text-emergency-600');
    if (icon) {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>';
    }
  }
}

function triggerManualSpeechTurn() {
  if (!voiceRecognition) {
    voiceRecognition = initSpeechRecognition();
  }

  if (isVoiceSpeaking && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    isVoiceSpeaking = false;
  }

  if (voiceRecognition) {
    try {
      voiceRecognition.start();
    } catch (e) {
      console.log('Voice recognition already running or restarting');
    }
  } else {
    // Prompt fallback for browsers with disabled mic
    const userPrompt = prompt('Speak to Sammy (or type your response):', 'I want to book an appointment for stomach problem');
    if (userPrompt && userPrompt.trim()) {
      addVoiceTranscriptBubble('patient', userPrompt);
      processVoiceTurn(userPrompt);
    }
  }
}

async function processVoiceTurn(transcript) {
  updateVoiceUIStatus('Sammy is thinking...', true);

  try {
    const res = await fetch(`${API_BASE}/voice/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: voiceSessionId, message: transcript })
    });

    const data = await res.json();
    addVoiceTranscriptBubble('sammy', data.reply);

    // If an appointment was booked inside this voice turn
    if (data.booking) {
      const badge = document.getElementById('voice-booking-badge');
      const badgeText = document.getElementById('voice-booking-badge-text');
      if (badge && badgeText) {
        badge.classList.remove('hidden');
        badgeText.innerHTML = `<strong>Appointment Confirmed:</strong> Ref ${data.booking.appointment_ref} with ${data.booking.doctor_name}. Email dispatched to ${data.booking.patient_email}!`;
      }
      refreshStats();
    }

    speakSammyText(data.reply, () => {
      if (data.callEnded) {
        setTimeout(closeVoiceCallModal, 2500);
      }
    });

  } catch (err) {
    console.error('Error in voice interact turn:', err);
    updateVoiceUIStatus('Ready to listen', false);
  }
}

function speakSammyText(text, onEndCallback) {
  if (!('speechSynthesis' in window)) {
    updateVoiceUIStatus('Listening to you...', false);
    if (onEndCallback) onEndCallback();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.05; // Slightly warmer pitch

  // Pick natural English voice (Indian preference en-IN)
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Rishi') || v.name.includes('Heera'));
  if (indianVoice) {
    utterance.voice = indianVoice;
  }

  utterance.onstart = () => {
    isVoiceSpeaking = true;
    updateVoiceUIStatus('Sammy is speaking...', true);
    setWaveformActive(true);
  };

  utterance.onend = () => {
    isVoiceSpeaking = false;
    setWaveformActive(false);
    updateVoiceUIStatus('Listening to you...', false);

    // Auto-listen after Sammy stops speaking
    if (!isVoiceMuted) {
      setTimeout(() => {
        if (!isVoiceSpeaking) {
          triggerManualSpeechTurn();
        }
      }, 500);
    }

    if (onEndCallback) onEndCallback();
  };

  utterance.onerror = () => {
    isVoiceSpeaking = false;
    setWaveformActive(false);
    updateVoiceUIStatus('Listening to you...', false);
    if (onEndCallback) onEndCallback();
  };

  window.speechSynthesis.speak(utterance);
}

function updateVoiceUIStatus(statusText, isAnimated) {
  const statusEl = document.getElementById('voice-call-status');
  if (statusEl) {
    statusEl.textContent = statusText;
  }
  setWaveformActive(isAnimated);
}

function setWaveformActive(active) {
  const waveform = document.getElementById('voice-waveform');
  const avatarRing = document.getElementById('voice-avatar-ring');
  if (waveform) {
    waveform.style.opacity = active ? '1' : '0.25';
  }
  if (avatarRing) {
    if (active) {
      avatarRing.classList.add('voice-ring');
    } else {
      avatarRing.classList.remove('voice-ring');
    }
  }
}

function addVoiceTranscriptBubble(sender, text) {
  const box = document.getElementById('voice-transcript-box');
  if (!box) return;

  const div = document.createElement('div');
  div.className = 'flex items-start gap-2 animate-fade-in';

  if (sender === 'sammy') {
    div.innerHTML = `
      <span class="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">S</span>
      <div class="bg-white border border-surface-200 rounded-xl px-3 py-1.5 text-slate-800 text-xs shadow-sm flex-1">
        <span class="font-semibold text-teal-700">Sammy:</span> ${escapeHtml(text)}
      </div>
    `;
  } else {
    div.innerHTML = `
      <div class="bg-primary-600 text-white rounded-xl px-3 py-1.5 text-xs shadow-sm flex-1 ml-6 text-right">
        <span class="font-semibold text-primary-200">You:</span> ${escapeHtml(text)}
      </div>
      <span class="w-5 h-5 rounded-full bg-primary-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">Y</span>
    `;
  }

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// Mic input for text chat
let chatSpeechRecognition = null;
function toggleChatMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Voice input is not supported in this browser.');
    return;
  }

  const micBtn = document.getElementById('btn-chat-mic');
  const chatInput = document.getElementById('chat-input');

  if (!chatSpeechRecognition) {
    chatSpeechRecognition = new SpeechRecognition();
    chatSpeechRecognition.continuous = false;
    chatSpeechRecognition.interimResults = false;
    chatSpeechRecognition.lang = 'en-IN';

    chatSpeechRecognition.onstart = () => {
      micBtn?.classList.add('bg-emergency-50', 'text-emergency-600', 'border-emergency-300', 'animate-pulse');
      chatInput.placeholder = 'Listening... Speak now';
    };

    chatSpeechRecognition.onresult = (e) => {
      const spoken = e.results[0][0].transcript;
      if (chatInput) {
        chatInput.value = spoken;
        sendUserMessage();
      }
    };

    chatSpeechRecognition.onend = () => {
      micBtn?.classList.remove('bg-emergency-50', 'text-emergency-600', 'border-emergency-300', 'animate-pulse');
      chatInput.placeholder = 'Type your health concern or doctor preference...';
    };
  }

  try {
    chatSpeechRecognition.start();
  } catch (e) {
    chatSpeechRecognition.stop();
  }
}

// Kick off initialization reliably
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
