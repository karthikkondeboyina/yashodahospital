const { db } = require('../db');
const availabilityService = require('./availabilityService');
const bookingService = require('./bookingService');

const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'difficulty breathing', 'breathing problem',
  'breathless', 'stroke', 'paralysis', 'heavy bleeding', 'bleeding heavily',
  'unconscious', 'fainted', 'severe injury', 'suicide', 'suicidal',
  'poison', 'poisoning', 'can\'t breathe', 'cannot breathe'
];

class AiService {
  /**
   * Check message against strict emergency safety gate
   */
  checkEmergency(message) {
    const text = (message || '').toLowerCase();
    for (const kw of EMERGENCY_KEYWORDS) {
      if (text.includes(kw)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process patient chat message
   */
  async processMessage({ sessionId, message, language = 'en', context = {} }) {
    const text = (message || '').trim();
    const lower = text.toLowerCase();

    // 1. Log patient message
    db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(
      sessionId,
      'patient',
      text
    );

    // 2. Strict Emergency Gate
    if (this.checkEmergency(text)) {
      let emergencyResponse;
      if (language === 'hi') {
        emergencyResponse = `⚠️ **यह एक आपातकालीन स्थिति हो सकती है।** कृपया तुरंत आपातकालीन हेल्पलाइन **105910** या एम्बुलेंस **108** पर कॉल करें। अपॉइंटमेंट के लिए प्रतीक्षा न करें। CareConnect AI चिकित्सा निदान या सलाह प्रदान नहीं करता है।`;
      } else if (language === 'te') {
        emergencyResponse = `⚠️ **ఇది అత్యవసర పరిస్థితి కావచ్చు.** దయచేసి వెంటనే అత్యవసర హెల్ప్‌లైన్ **105910** లేదా అంబులెన్స్ **108** కి కాల్ చేయండి. అపాయింట్‌మెంట్ కోసం వేచి ఉండకండి. CareConnect AI వైద్య నిర్ధారణ లేదా సలహాను అందించదు.`;
      } else {
        emergencyResponse = `⚠️ **This may be a medical emergency.** Please call our Emergency Helpline **105910** or Ambulance **108** immediately. **Do not wait for an appointment.** CareConnect AI does not provide medical diagnosis or treatment advice.`;
      }

      db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(
        sessionId,
        'assistant',
        emergencyResponse
      );

      return {
        reply: emergencyResponse,
        isEmergency: true,
        actions: [
          { type: 'call_emergency', label: 'Call 105910', number: '105910' },
          { type: 'call_ambulance', label: 'Call 108 (Ambulance)', number: '108' }
        ]
      };
    }

    // 3. Medical advice refusal
    const adviceKeywords = ['diagnose', 'prescribe', 'medicine', 'tablet', 'cure', 'dosage', 'report interpretation'];
    if (adviceKeywords.some(kw => lower.includes(kw))) {
      const refusal = `I am CareConnect AI, a hospital appointment assistant. I cannot provide medical diagnosis, prescribe medications, or interpret medical reports. I can help connect you with our specialist doctors for a comprehensive consultation. Would you like to view our departments?`;
      db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(sessionId, 'assistant', refusal);
      return {
        reply: refusal,
        actions: [{ type: 'navigate', page: 'departments', label: 'View Departments' }]
      };
    }

    // 4. Intent parsing
    if (lower.includes('book') || lower.includes('appointment')) {
      const reply = `I would be happy to assist you in booking a doctor appointment. Which department or specialist would you like to consult?`;
      const depts = db.prepare('SELECT id, name FROM departments LIMIT 6').all();
      db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(sessionId, 'assistant', reply);
      return {
        reply,
        actions: depts.map(d => ({ type: 'select_dept', deptId: d.id, label: d.name }))
      };
    }

    // 5. Department keyword matching
    const depts = db.prepare('SELECT * FROM departments').all();
    const matchedDept = depts.find(d => lower.includes(d.name.toLowerCase()) || lower.includes(d.id));

    if (matchedDept) {
      const doctors = db.prepare(`
        SELECT d.*, c.name as campus_name 
        FROM doctors d 
        JOIN campuses c ON d.campus_id = c.id
        WHERE d.department_id = ?
      `).all(matchedDept.id);

      const doctorList = doctors.map(d => `• **${d.name}** (${d.campus_name}) - Fee: ₹${d.fee}`).join('\n');
      const reply = `Here are our specialist doctors in **${matchedDept.name}**:\n\n${doctorList}\n\nWould you like to book with any of these specialists?`;

      db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(sessionId, 'assistant', reply);
      return {
        reply,
        actions: doctors.map(d => ({ type: 'select_doctor', doctorId: d.id, label: d.name }))
      };
    }

    // 6. Doctor keyword matching
    const allDoctors = db.prepare('SELECT * FROM doctors').all();
    const matchedDoc = allDoctors.find(doc => lower.includes(doc.name.toLowerCase().replace('dr. ', '')) || lower.includes(doc.name.toLowerCase()));

    if (matchedDoc) {
      const consultDays = JSON.parse(matchedDoc.consultation_days);
      const reply = `**${matchedDoc.name}** consults on **${consultDays.join(', ')}**.\n\nPlease select a date to check available slots.`;
      db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(sessionId, 'assistant', reply);
      return {
        reply,
        doctor: matchedDoc,
        actions: [{ type: 'open_booking', doctorId: matchedDoc.id, label: `Book with ${matchedDoc.name}` }]
      };
    }

    // 7. General fallback
    const fallback = `Hello! I am CareConnect AI. I can help you find a department, locate specialists, check available slots, and book your appointment.\n\nHow can I help you today?`;
    db.prepare('INSERT INTO conversations (session_id, role, message) VALUES (?, ?, ?)').run(sessionId, 'assistant', fallback);
    return {
      reply: fallback,
      actions: [
        { type: 'navigate', page: 'departments', label: 'View Departments' },
        { type: 'navigate', page: 'doctors', label: 'Find a Doctor' },
        { type: 'book_start', label: 'Book Appointment' }
      ]
    };
  }
}

module.exports = new AiService();
