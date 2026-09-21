const { db } = require('../db');
const availabilityService = require('./availabilityService');
const bookingService = require('./bookingService');

const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'difficulty breathing', 'breathing problem',
  'breathless', 'stroke', 'paralysis', 'heavy bleeding', 'bleeding heavily',
  'unconscious', 'fainted', 'severe injury', 'suicide', 'suicidal',
  'poison', 'poisoning', 'can\'t breathe', 'cannot breathe', 'emergency', 'urgent'
];

const FILLERS = [
  'So', 'So okay', 'Okay so', 'Um', 'Hmm okay', 'Right', 'Yeah so', 'Achha', 'Haan so', 'One second', 'Let me see', 'Actually'
];

class VoiceService {
  constructor() {
    this.sessions = new Map();
    this.fillerIndex = 0;
  }

  getFiller() {
    const filler = FILLERS[this.fillerIndex % FILLERS.length];
    this.fillerIndex++;
    return filler;
  }

  isEmergency(text) {
    const lower = (text || '').toLowerCase();
    return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
  }

  initSession(sessionId = null, callerPhone = '+91 98765 43210', callerEmail = null) {
    const id = sessionId || 'voice_' + Math.random().toString(36).substring(2, 9) + Date.now();
    const session = {
      id,
      step: 'GREETING',
      callerPhone: callerPhone || '+91 98765 43210',
      callerEmail: callerEmail || process.env.DEMO_PATIENT_EMAIL || 'karthikkondeboyina@gmail.com',
      department: null,
      campus: null,
      doctor: null,
      patientName: null,
      timing: null,
      appointmentDate: null,
      appointmentTime: null,
      appointmentRef: null,
      hasSaidGoodbye: false,
      callEnded: false,
      history: []
    };

    const opening = "Hi, this is Sammy from Yashoda Hospitals. How may I help you today?";
    session.history.push({ role: 'assistant', text: opening });
    this.sessions.set(id, session);

    return {
      sessionId: id,
      reply: opening,
      step: session.step,
      callEnded: false
    };
  }

  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.initSession(sessionId);
    }
    return this.sessions.get(sessionId);
  }

  // Look up campus from user utterance
  matchCampus(text) {
    const lower = text.toLowerCase();
    if (lower.includes('somajiguda') || lower.includes('pehla') || lower.includes('first') || lower.includes('one') || lower.includes('1')) {
      return db.prepare("SELECT * FROM campuses WHERE id = 'somajiguda'").get();
    }
    if (lower.includes('hitec') || lower.includes('second') || lower.includes('doosra') || lower.includes('dusra') || lower.includes('two') || lower.includes('2')) {
      return db.prepare("SELECT * FROM campuses WHERE id = 'hitec_city'").get();
    }
    if (lower.includes('secunderabad') || lower.includes('third') || lower.includes('teesra') || lower.includes('three') || lower.includes('3')) {
      return db.prepare("SELECT * FROM campuses WHERE id = 'secunderabad'").get();
    }
    if (lower.includes('malakpet') || lower.includes('fourth') || lower.includes('chautha') || lower.includes('last') || lower.includes('four') || lower.includes('4')) {
      return db.prepare("SELECT * FROM campuses WHERE id = 'malakpet'").get();
    }
    // Location based resolution
    if (lower.includes('madhapur') || lower.includes('gachibowli') || lower.includes('kondapur') || lower.includes('jubilee hills')) {
      return db.prepare("SELECT * FROM campuses WHERE id = 'hitec_city'").get();
    }
    if (lower.includes('begumpet') || lower.includes('ameerpet') || lower.includes('panjagutta') || lower.includes('banjara hills')) {
      return db.prepare("SELECT * FROM campuses WHERE id = 'somajiguda'").get();
    }
    return null;
  }

  // Softly match department or problem
  matchDepartmentOrProblem(text) {
    const lower = text.toLowerCase();

    // Check doctor names first if mentioned directly
    const doctors = db.prepare('SELECT d.*, dept.name as department_name, c.name as campus_name FROM doctors d JOIN departments dept ON d.department_id = dept.id JOIN campuses c ON d.campus_id = c.id').all();
    const matchedDoctor = doctors.find(d => {
      const nameParts = d.name.toLowerCase().replace('dr.', '').trim().split(' ');
      return nameParts.some(part => part.length > 2 && lower.includes(part));
    });

    if (matchedDoctor) {
      return { doctor: matchedDoctor, department: { id: matchedDoctor.department_id, name: matchedDoctor.department_name } };
    }

    const problemMap = [
      { keywords: ['heart', 'cardio', 'bp', 'blood pressure', 'palpitations'], deptId: 'card', name: 'Cardiology', suggestion: 'cardiology' },
      { keywords: ['headache', 'brain', 'nerve', 'migraine', 'dizziness'], deptId: 'neuro', name: 'Neurology', suggestion: 'neurology' },
      { keywords: ['stomach', 'gastric', 'acidity', 'liver', 'digest', 'belly'], deptId: 'gastro', name: 'Gastroenterology', suggestion: 'gastro' },
      { keywords: ['bone', 'knee', 'joint', 'fracture', 'back pain', 'spine'], deptId: 'ortho', name: 'Orthopaedics', suggestion: 'orthopaedics' },
      { keywords: ['skin', 'rash', 'pimples', 'acne', 'hair'], deptId: 'derma', name: 'Dermatology', suggestion: 'dermatology' },
      { keywords: ['ear', 'nose', 'throat', 'sinus', 'ent'], deptId: 'ent', name: 'ENT', suggestion: 'ENT' },
      { keywords: ['pregnancy', 'period', 'gynae', 'women'], deptId: 'gynae', name: 'Gynaecology', suggestion: 'gynaecology' },
      { keywords: ['child', 'baby', 'kid', 'paedia', 'vaccination'], deptId: 'paedia', name: 'Paediatrics', suggestion: 'paediatrics' },
      { keywords: ['cough', 'asthma', 'lung', 'pulmo'], deptId: 'pulmo', name: 'Pulmonology', suggestion: 'pulmonology' },
      { keywords: ['fever', 'cold', 'general', 'weakness', 'body ache'], deptId: 'gen', name: 'General Medicine', suggestion: 'general medicine' }
    ];

    for (const item of problemMap) {
      if (item.keywords.some(kw => lower.includes(kw))) {
        const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(item.deptId);
        return { department: dept, suggestion: item.suggestion };
      }
    }

    // Direct department match
    const depts = db.prepare('SELECT * FROM departments').all();
    const deptMatch = depts.find(d => lower.includes(d.name.toLowerCase()));
    if (deptMatch) {
      return { department: deptMatch, suggestion: deptMatch.name };
    }

    return null;
  }

  processTurn(sessionId, userMessage) {
    const session = this.getSession(sessionId);
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // 1. Check if call already ended
    if (session.callEnded) {
      return {
        reply: "Bye!",
        callEnded: true,
        step: 'ENDED'
      };
    }

    // 2. AFTER THE GOODBYE — Strict No-Loop Rule
    if (session.hasSaidGoodbye) {
      session.callEnded = true;
      return {
        reply: "Bye!",
        callEnded: true,
        step: 'ENDED'
      };
    }

    // 3. User said bye before Sammy's goodbye
    if (lower === 'bye' || lower === 'okay bye' || lower === 'bye bye') {
      session.callEnded = true;
      session.hasSaidGoodbye = true;
      return {
        reply: "Bye, take care!",
        callEnded: true,
        step: 'ENDED'
      };
    }

    // 4. EMERGENCY RULE — Overrides everything else immediately
    if (this.isEmergency(lower)) {
      session.callEnded = true;
      const emergencyReply = "This sounds like an emergency. Please call one zero five nine one zero right now, or one zero eight for ambulance. Please go, I am stopping here.";
      session.history.push({ role: 'patient', text });
      session.history.push({ role: 'assistant', text: emergencyReply });
      return {
        reply: emergencyReply,
        isEmergency: true,
        callEnded: true,
        step: 'EMERGENCY'
      };
    }

    // 5. User asked "Are you AI?"
    if (lower.includes('are you ai') || lower.includes('are you a bot') || lower.includes('are you robot') || lower.includes('are you human')) {
      return {
        reply: "Yes I am! I am the AI assistant here, I take booking calls so nobody waits on hold. Shall we continue?",
        callEnded: false,
        step: session.step
      };
    }

    // 6. User asked technical/model details
    if (lower.includes('which model') || lower.includes('what technology') || lower.includes('gpt') || lower.includes('gemini')) {
      return {
        reply: "Honestly I don't know the technical side, I just handle the bookings here.",
        callEnded: false,
        step: session.step
      };
    }

    // 7. Medical Advice Refusal Rule
    const adviceKeywords = ['what medicine', 'give medicine', 'which tablet', 'diagnose me', 'cure for', 'is it cancer', 'treatment for'];
    if (adviceKeywords.some(kw => lower.includes(kw))) {
      return {
        reply: "Sorry, I cannot advise on medical things. The doctor will guide you properly.",
        callEnded: false,
        step: session.step
      };
    }

    // 8. Incomplete sentence handling
    if (text.endsWith(' and') || text.endsWith(' so') || text.endsWith(' my') || text.endsWith(' the')) {
      return {
        reply: "Hmm hmm.",
        callEnded: false,
        step: session.step
      };
    }

    session.history.push({ role: 'patient', text });

    // ==========================================
    // SAMMY 5-STEP CONVERSATIONAL STATE MACHINE
    // ==========================================

    // STEP 1: What they need / Problem
    if (session.step === 'GREETING' || session.step === 'NEED') {
      const match = this.matchDepartmentOrProblem(text);
      if (match && match.doctor) {
        session.doctor = match.doctor;
        session.department = match.department;
        session.campus = { id: match.doctor.campus_id, name: match.doctor.campus_name };
        session.step = 'DOCTOR_CONFIRM';
        const reply = `So at ${session.campus.name} we have ${session.doctor.name}. Shall I book with him?`;
        session.history.push({ role: 'assistant', text: reply });
        return { reply, step: session.step, session };
      }

      if (match && match.department) {
        session.department = match.department;
        session.step = 'CAMPUS';
        const reply = `Hmm okay, for that we usually book ${match.suggestion}. Um, we have four campuses: Somajiguda, Hitec City, Secunderabad, and Malakpet. Which one?`;
        session.history.push({ role: 'assistant', text: reply });
        return { reply, step: session.step, session };
      }

      session.step = 'NEED';
      const reply = "Sure, which doctor or which problem you want to consult for?";
      session.history.push({ role: 'assistant', text: reply });
      return { reply, step: session.step, session };
    }

    // STEP 2: Campus Selection
    if (session.step === 'CAMPUS') {
      const campus = this.matchCampus(text);
      if (!campus) {
        const reply = "Sorry, which one — Somajiguda, Hitec City, Secunderabad or Malakpet?";
        session.history.push({ role: 'assistant', text: reply });
        return { reply, step: session.step, session };
      }

      session.campus = campus;
      // Step 3: Find doctor for this department and campus
      let doctor = null;
      if (session.department) {
        doctor = db.prepare('SELECT * FROM doctors WHERE department_id = ? AND campus_id = ? AND active = 1 LIMIT 1').get(session.department.id, campus.id);
      }

      if (!doctor) {
        // Find if another campus has it
        const altDoc = db.prepare('SELECT d.*, c.name as campus_name FROM doctors d JOIN campuses c ON d.campus_id = c.id WHERE d.department_id = ? AND d.active = 1 LIMIT 1').get(session.department ? session.department.id : 'gen');
        if (altDoc) {
          session.doctor = altDoc;
          session.step = 'DOCTOR_CONFIRM';
          const reply = `Um, for that our main centre is ${altDoc.campus_name} with ${altDoc.name}. Should I book you there?`;
          session.history.push({ role: 'assistant', text: reply });
          return { reply, step: session.step, session };
        }
      }

      session.doctor = doctor || db.prepare('SELECT * FROM doctors WHERE campus_id = ? LIMIT 1').get(campus.id);
      session.step = 'DOCTOR_CONFIRM';
      const reply = `${campus.name}, got it. Um, so for ${session.department ? session.department.name : 'consultation'} we have ${session.doctor.name}. Shall I book with them?`;
      session.history.push({ role: 'assistant', text: reply });
      return { reply, step: session.step, session };
    }

    // STEP 3: Doctor Confirmation
    if (session.step === 'DOCTOR_CONFIRM') {
      if (lower.includes('yes') || lower.includes('sure') || lower.includes('yeah') || lower.includes('book') || lower.includes('fine') || lower.includes('okay')) {
        session.step = 'NAME';
        const reply = "Right. And your good name please?";
        session.history.push({ role: 'assistant', text: reply });
        return { reply, step: session.step, session };
      } else if (lower.includes('no') || lower.includes('someone else') || lower.includes('other')) {
        // Offer next doctor in that department
        const nextDoc = db.prepare('SELECT * FROM doctors WHERE department_id = ? AND id != ? AND active = 1 LIMIT 1').get(session.doctor.department_id, session.doctor.id);
        if (nextDoc) {
          session.doctor = nextDoc;
          const reply = `Okay so we also have ${nextDoc.name}. Shall I book with them?`;
          session.history.push({ role: 'assistant', text: reply });
          return { reply, step: session.step, session };
        } else {
          session.step = 'NAME';
          const reply = "Understood, reception will assign another specialist for you. And your good name please?";
          session.history.push({ role: 'assistant', text: reply });
          return { reply, step: session.step, session };
        }
      }
    }

    // STEP 4: Name
    if (session.step === 'NAME') {
      let extractedName = text.replace(/my name is/i, '').replace(/this is/i, '').replace(/i am/i, '').replace(/name is/i, '').trim();
      if (!extractedName) extractedName = 'Patient';
      session.patientName = extractedName;
      session.step = 'WHEN';
      const reply = `${extractedName}, got it. And when would you like to come?`;
      session.history.push({ role: 'assistant', text: reply });
      return { reply, step: session.step, session };
    }

    // STEP 5: When / Timing
    if (session.step === 'WHEN') {
      session.timing = text;

      // Determine consultation date & time based on doctor's schedule
      const doctorDays = JSON.parse(session.doctor.consultation_days || '["Mon","Tue","Wed","Thu","Fri","Sat"]');
      let targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); // Start with tomorrow

      // Loop forward up to 7 days to match one of the doctor's consultation days
      for (let i = 0; i < 7; i++) {
        const dayName = availabilityService.getDayOfWeek(targetDate.toISOString().split('T')[0]);
        if (doctorDays.includes(dayName)) {
          break;
        }
        targetDate.setDate(targetDate.getDate() + 1);
      }
      session.appointmentDate = targetDate.toISOString().split('T')[0];

      // Time slot normalization
      if (lower.includes('eleven') || lower.includes('11')) session.appointmentTime = '11:00 AM';
      else if (lower.includes('ten') || lower.includes('10')) session.appointmentTime = '10:00 AM';
      else if (lower.includes('twelve') || lower.includes('12')) session.appointmentTime = '12:00 PM';
      else if (lower.includes('four') || lower.includes('4')) session.appointmentTime = '04:00 PM';
      else if (lower.includes('five') || lower.includes('5')) session.appointmentTime = '05:00 PM';
      else if (lower.includes('evening')) session.appointmentTime = '05:00 PM';
      else session.appointmentTime = '11:00 AM';

      session.step = 'CONFIRM_READBACK';
      const reply = `Okay so your name is ${session.patientName}, and I am booking you with ${session.doctor.name} at our ${session.campus.name} branch, ${session.timing}. Is that correct?`;
      session.history.push({ role: 'assistant', text: reply });
      return { reply, step: session.step, session };
    }

    // STEP 6: Confirmation Readback & ACID Booking Execution
    if (session.step === 'CONFIRM_READBACK') {
      if (lower.includes('yes') || lower.includes('correct') || lower.includes('right') || lower.includes('confirm') || lower.includes('ha') || lower.includes('haan')) {
        // Execute transactional booking
        const bookingResult = bookingService.createBooking({
          doctorId: session.doctor.id,
          appointmentDate: session.appointmentDate,
          appointmentTime: session.appointmentTime,
          patientName: session.patientName,
          patientPhone: session.callerPhone,
          patientEmail: session.callerEmail,
          patientAge: 32,
          notes: 'Voice booking via Sammy Assistant'
        });

        console.log('[VoiceService] createBooking result:', bookingResult);
        if (bookingResult.success) {
          session.appointmentRef = bookingResult.booking.appointment_ref;
          session.step = 'CLOSING';
          const reply = `Done, your appointment is confirmed. You will get the details on this same number shortly. Anything else I can help you with?`;
          session.history.push({ role: 'assistant', text: reply });
          return {
            reply,
            step: session.step,
            booking: bookingResult.booking,
            session
          };
        } else {
          console.warn('[VoiceService] Booking failed:', bookingResult.error);
          // Find first available slot on that date
          const avail = availabilityService.getDoctorAvailability(session.doctor.id, session.appointmentDate);
          if (avail && avail.availableSlots && avail.availableSlots.length > 0) {
            session.appointmentTime = avail.availableSlots[0];
            const retry = bookingService.createBooking({
              doctorId: session.doctor.id,
              appointmentDate: session.appointmentDate,
              appointmentTime: session.appointmentTime,
              patientName: session.patientName,
              patientPhone: session.callerPhone,
              patientEmail: session.callerEmail,
              patientAge: 32,
              notes: 'Voice booking via Sammy Assistant'
            });

            if (retry.success) {
              session.appointmentRef = retry.booking.appointment_ref;
              session.step = 'CLOSING';
              const reply = `Done, your appointment is confirmed. You will get the details on this same number shortly. Anything else I can help you with?`;
              session.history.push({ role: 'assistant', text: reply });
              return { reply, step: session.step, booking: retry.booking, session };
            }
          }

          const reply = "Um, reception will assign the exact slot and call you back shortly. Is that okay?";
          session.step = 'CLOSING';
          return { reply, step: session.step, session };
        }
      }
    }

    // STEP 7: Closing & Final Goodbye
    if (session.step === 'CLOSING') {
      if (lower.includes('no') || lower.includes('nothing') || lower.includes('that is all') || lower.includes('all good') || lower.includes('thanks') || lower.includes('thank you')) {
        session.hasSaidGoodbye = true;
        session.callEnded = true;
        const firstName = session.patientName ? session.patientName.split(' ')[0] : '';
        const reply = firstName
          ? `Alright ${firstName}, take care and see you ${session.timing || 'soon'}!`
          : `Alright, take care and see you ${session.timing || 'soon'}!`;
        session.history.push({ role: 'assistant', text: reply });
        return {
          reply,
          step: 'ENDED',
          callEnded: true,
          session
        };
      } else {
        const reply = "Okay so reception will help you with that when you arrive. Anything else?";
        return { reply, step: session.step, session };
      }
    }

    // Fallback turn
    const filler = this.getFiller();
    const fallbackReply = `${filler}, would you like me to book your consultation with Dr. ${session.doctor ? session.doctor.name : 'Raghu'}?`;
    return { reply: fallbackReply, step: session.step, session };
  }
}

module.exports = new VoiceService();
