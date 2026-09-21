const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../hospital.db');
const db = new Database(dbPath);

// Enable Foreign Keys & WAL mode for performance & concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      desc TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campuses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id TEXT NOT NULL,
      campus_id TEXT NOT NULL,
      consultation_days TEXT NOT NULL, -- JSON array e.g. ["Mon","Tue","Wed"]
      fee INTEGER NOT NULL,
      avatar TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (campus_id) REFERENCES campuses(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_ref TEXT NOT NULL UNIQUE,
      doctor_id INTEGER NOT NULL,
      department_id TEXT NOT NULL,
      campus_id TEXT NOT NULL,
      appointment_date TEXT NOT NULL, -- YYYY-MM-DD
      appointment_time TEXT NOT NULL, -- e.g. "10:00 AM"
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      patient_email TEXT,
      patient_age INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Confirmed', -- Confirmed, Cancelled, Completed
      fee INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (campus_id) REFERENCES campuses(id),
      -- CRITICAL CONFLICT RULE: One patient per doctor slot for active bookings
      CHECK (status IN ('Confirmed', 'Cancelled', 'Completed'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_slot_unique 
    ON bookings (doctor_id, appointment_date, appointment_time) 
    WHERE status != 'Cancelled';

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_ref TEXT NOT NULL,
      type TEXT NOT NULL, -- 'confirmation', 'cancellation', 'update', 'reminder'
      channel TEXT NOT NULL, -- 'email', 'in_app', 'sms'
      recipient TEXT NOT NULL,
      status TEXT NOT NULL, -- 'Pending', 'Sent', 'Failed'
      subject TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON stringified details
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL, -- 'patient', 'assistant', 'system'
      message TEXT NOT NULL,
      metadata TEXT, -- JSON optional
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON bookings(doctor_id, appointment_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_ref ON notifications(appointment_ref);
    CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
  `);

  seedData();
}

function seedData() {
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get().count;
  if (deptCount > 0) return; // Already seeded

  console.log('Seeding initial hospital data...');

  const insertDept = db.prepare('INSERT INTO departments (id, name, icon, desc, color) VALUES (?, ?, ?, ?, ?)');
  const approvedDepts = [
    ['gen', 'General Medicine', '🩺', 'Primary care, preventive health, and general medical consultations', 'primary'],
    ['card', 'Cardiology', '❤️', 'Heart conditions, ECG, echocardiography, and cardiac care', 'emergency'],
    ['ortho', 'Orthopaedics', '🦴', 'Bone, joint, spine injuries and musculoskeletal conditions', 'teal'],
    ['neuro', 'Neurology', '🧠', 'Brain, spine, and nervous system disorders', 'primary'],
    ['gastro', 'Gastroenterology', '🫁', 'Digestive system, liver, stomach, and intestinal disorders', 'teal'],
    ['derma', 'Dermatology', '🧴', 'Skin, hair, and nail conditions', 'primary'],
    ['ent', 'ENT', '👂', 'Ear, nose, and throat conditions and treatments', 'teal'],
    ['gynae', 'Gynaecology', '👩‍⚕️', 'Women\'s health, reproductive system, and prenatal care', 'primary'],
    ['paedia', 'Paediatrics', '👶', 'Child healthcare, vaccinations, and developmental assessments', 'teal'],
    ['pulmo', 'Pulmonology', '🫁', 'Lung and respiratory system conditions', 'primary'],
    ['uro', 'Urology', '⚕️', 'Urinary tract and male reproductive system conditions', 'teal'],
    ['onco', 'Oncology', '🎗️', 'Cancer diagnosis, treatment, and supportive care', 'emergency']
  ];
  for (const dept of approvedDepts) {
    insertDept.run(...dept);
  }

  const insertCampus = db.prepare('INSERT INTO campuses (id, name, address, phone) VALUES (?, ?, ?, ?)');
  const approvedCampuses = [
    ['somajiguda', 'Somajiguda', 'Raj Bhavan Rd, Somajiguda, Hyderabad', '+91 95132 62681'],
    ['hitec_city', 'Hitec City', 'Cyber Towers Junction, Hitec City, Hyderabad', '+91 95132 62682'],
    ['secunderabad', 'Secunderabad', 'Clock Tower Square, Secunderabad', '+91 95132 62683'],
    ['malakpet', 'Malakpet', 'Old Station Road, Malakpet, Hyderabad', '+91 95132 62684']
  ];
  for (const campus of approvedCampuses) {
    insertCampus.run(...campus);
  }

  const insertDoctor = db.prepare('INSERT INTO doctors (id, name, department_id, campus_id, consultation_days, fee, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)');
  // Strict approved 15 doctors from MEMORY.md & PRD.md
  const approvedDoctors = [
    [1, 'Dr. Ravi Teja', 'gen', 'somajiguda', JSON.stringify(['Mon','Tue','Wed','Thu','Fri','Sat']), 800, 'RT'],
    [2, 'Dr. Meena Iyer', 'gen', 'hitec_city', JSON.stringify(['Mon','Tue','Wed','Thu','Fri']), 800, 'MI'],
    [3, 'Dr. Anil Kumar Reddy', 'card', 'somajiguda', JSON.stringify(['Mon','Wed','Fri']), 1200, 'AR'],
    [4, 'Dr. Sunita Rao', 'card', 'secunderabad', JSON.stringify(['Tue','Thu','Sat']), 1200, 'SR'],
    [5, 'Dr. Vikram Singh', 'ortho', 'hitec_city', JSON.stringify(['Mon','Tue','Wed','Thu','Fri','Sat']), 1000, 'VS'],
    [6, 'Dr. P. Srinivas', 'ortho', 'malakpet', JSON.stringify(['Mon','Wed','Fri']), 1000, 'PS'],
    [7, 'Dr. Kavitha Nair', 'neuro', 'somajiguda', JSON.stringify(['Tue','Thu','Sat']), 1200, 'KN'],
    [8, 'Dr. Farhan Ali', 'gastro', 'somajiguda', JSON.stringify(['Mon','Tue','Wed','Thu','Fri']), 1000, 'FA'],
    [9, 'Dr. Ananya Sharma', 'derma', 'hitec_city', JSON.stringify(['Mon','Wed','Fri']), 800, 'AS'],
    [10, 'Dr. Suresh Babu', 'ent', 'secunderabad', JSON.stringify(['Mon','Tue','Wed','Thu','Fri','Sat']), 800, 'SB'],
    [11, 'Dr. Lakshmi Prasanna', 'gynae', 'somajiguda', JSON.stringify(['Mon','Tue','Wed','Thu','Fri','Sat']), 1000, 'LP'],
    [12, 'Dr. Rohit Menon', 'paedia', 'hitec_city', JSON.stringify(['Mon','Tue','Wed','Thu','Fri','Sat']), 800, 'RM'],
    [13, 'Dr. G. Ramesh', 'pulmo', 'malakpet', JSON.stringify(['Tue','Thu','Sat']), 1000, 'GR'],
    [14, 'Dr. Aditya Verma', 'uro', 'secunderabad', JSON.stringify(['Mon','Wed','Fri']), 1200, 'AV'],
    [15, 'Dr. Nandini Kulkarni', 'onco', 'somajiguda', JSON.stringify(['Tue','Thu']), 1500, 'NK']
  ];
  for (const doc of approvedDoctors) {
    insertDoctor.run(...doc);
  }

  // Seed sample initial bookings
  const insertBooking = db.prepare(`
    INSERT INTO bookings (appointment_ref, doctor_id, department_id, campus_id, appointment_date, appointment_time, patient_name, patient_phone, patient_email, patient_age, status, fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialBookings = [
    ['CC-2026-0142', 3, 'card', 'somajiguda', '2026-10-15', '10:00 AM', 'Rahul Verma', '+91 98765 43210', 'rahul.verma@example.com', 45, 'Confirmed', 1200],
    ['CC-2026-0143', 1, 'gen', 'somajiguda', '2026-10-15', '11:00 AM', 'Sneha Patel', '+91 87654 32109', 'sneha.patel@example.com', 29, 'Confirmed', 800],
    ['CC-2026-0144', 5, 'ortho', 'hitec_city', '2026-10-15', '10:00 AM', 'Karthik Reddy', '+91 76543 21098', 'karthikkondeboyina@gmail.com', 32, 'Confirmed', 1000],
    ['CC-2026-0145', 7, 'neuro', 'somajiguda', '2026-10-16', '11:00 AM', 'Priyanka Singh', '+91 65432 10987', 'priyanka@example.com', 38, 'Confirmed', 1200],
    ['CC-2026-0146', 9, 'derma', 'hitec_city', '2026-10-16', '10:00 AM', 'Arun Kumar', '+91 54321 09876', 'arun@example.com', 24, 'Confirmed', 800],
    ['CC-2026-0147', 11, 'gynae', 'somajiguda', '2026-10-15', '11:00 AM', 'Divya Sharma', '+91 43210 98765', 'divya@example.com', 31, 'Completed', 1000],
    ['CC-2026-0148', 10, 'ent', 'secunderabad', '2026-10-17', '04:00 PM', 'Mohammed Ali', '+91 32109 87654', 'ali@example.com', 52, 'Cancelled', 800],
    ['CC-2026-0149', 4, 'card', 'secunderabad', '2026-10-15', '04:00 PM', 'Lakshmi Nair', '+91 21098 76543', 'lakshmi@example.com', 61, 'Confirmed', 1200]
  ];

  for (const b of initialBookings) {
    insertBooking.run(...b);
  }

  // Seed sample conversation
  const insertConv = db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)');
  insertConv.run('sess_sample_1042', 'assistant', 'Hello! I am CareConnect AI, your hospital appointment assistant. How can I help you today?');
  insertConv.run('sess_sample_1042', 'patient', 'I need to see a cardiologist for heart checkup.');
  insertConv.run('sess_sample_1042', 'assistant', 'I would be glad to help you with our Cardiology department. Dr. Anil Kumar Reddy is available at Somajiguda.');

  console.log('Database seeded successfully.');
}

module.exports = {
  db,
  initializeDatabase
};
