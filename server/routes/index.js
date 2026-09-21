const express = require('express');
const { db } = require('../db');
const availabilityService = require('../services/availabilityService');
const bookingService = require('../services/bookingService');
const aiService = require('../services/aiService');
const voiceService = require('../services/voiceService');

const router = express.Router();

// --- Health Check ---
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CareConnect AI Hospital Service'
  });
});

// --- Departments ---
router.get('/departments', (req, res) => {
  const depts = db.prepare('SELECT * FROM departments').all();
  res.json(depts);
});

// --- Campuses ---
router.get('/campuses', (req, res) => {
  const campuses = db.prepare('SELECT * FROM campuses').all();
  res.json(campuses);
});

// --- Doctors ---
router.get('/doctors', (req, res) => {
  const { department, campus, search } = req.query;
  let query = `
    SELECT d.*, dept.name as department_name, c.name as campus_name 
    FROM doctors d
    JOIN departments dept ON d.department_id = dept.id
    JOIN campuses c ON d.campus_id = c.id
    WHERE d.active = 1
  `;
  const params = [];

  if (department) {
    query += ' AND d.department_id = ?';
    params.push(department);
  }
  if (campus) {
    query += ' AND d.campus_id = ?';
    params.push(campus);
  }
  if (search) {
    query += ' AND LOWER(d.name) LIKE ?';
    params.push(`%${search.toLowerCase()}%`);
  }

  const doctors = db.prepare(query).all(...params);
  const formatted = doctors.map(d => ({
    ...d,
    consultation_days: JSON.parse(d.consultation_days)
  }));
  res.json(formatted);
});

// --- Doctor Availability Check ---
router.get('/doctors/:id/availability', (req, res) => {
  const doctorId = parseInt(req.params.id, 10);
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Query parameter date (YYYY-MM-DD) is required.' });
  }

  const availability = availabilityService.getDoctorAvailability(doctorId, date);
  if (availability.error) {
    return res.status(404).json(availability);
  }
  res.json(availability);
});

// --- Booking Availability Pre-check ---
router.post('/bookings/check', (req, res) => {
  const { doctorId, appointmentDate, appointmentTime } = req.body;
  if (!doctorId || !appointmentDate || !appointmentTime) {
    return res.status(400).json({ error: 'doctorId, appointmentDate, and appointmentTime are required.' });
  }

  const isAvailable = availabilityService.isSlotAvailable(doctorId, appointmentDate, appointmentTime);
  res.json({
    available: isAvailable,
    doctorId,
    appointmentDate,
    appointmentTime
  });
});

// --- Create Booking (Transactional) ---
router.post('/bookings', (req, res) => {
  const result = bookingService.createBooking(req.body);
  if (!result.success) {
    const status = result.code === 'SLOT_OCCUPIED' ? 409 : 400;
    return res.status(status).json(result);
  }
  res.status(201).json(result);
});

// --- FrontDesk: List Bookings ---
router.get('/bookings', (req, res) => {
  const { status, campus, search, date } = req.query;
  let query = `
    SELECT b.*, d.name as doctor_name, dept.name as department_name, c.name as campus_name
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    JOIN departments dept ON b.department_id = dept.id
    JOIN campuses c ON b.campus_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'All Status') {
    query += ' AND b.status = ?';
    params.push(status);
  }
  if (campus && campus !== 'All Campuses') {
    query += ' AND c.name = ?';
    params.push(campus);
  }
  if (date) {
    query += ' AND b.appointment_date = ?';
    params.push(date);
  }
  if (search) {
    query += ' AND (LOWER(b.patient_name) LIKE ? OR LOWER(b.appointment_ref) LIKE ? OR LOWER(d.name) LIKE ?)';
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY b.appointment_date DESC, b.appointment_time ASC';

  const bookings = db.prepare(query).all(...params);
  res.json(bookings);
});

// --- FrontDesk: Get Single Booking ---
router.get('/bookings/:ref', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, d.name as doctor_name, dept.name as department_name, c.name as campus_name
    FROM bookings b
    JOIN doctors d ON b.doctor_id = d.id
    JOIN departments dept ON b.department_id = dept.id
    JOIN campuses c ON b.campus_id = c.id
    WHERE b.appointment_ref = ?
  `).get(req.params.ref);

  if (!booking) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  // Also fetch notification status for this booking
  const notifications = db.prepare('SELECT * FROM notifications WHERE appointment_ref = ? ORDER BY created_at DESC').all(req.params.ref);

  res.json({
    booking,
    notifications
  });
});

// --- Cancel Booking ---
router.patch('/bookings/:ref/cancel', (req, res) => {
  const result = bookingService.cancelBooking(req.params.ref);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// --- AI Chat Endpoint ---
router.post('/chat', async (req, res) => {
  const { sessionId, message, language, context } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const result = await aiService.processMessage({
      sessionId: sessionId || 'sess_default',
      message,
      language: language || 'en',
      context: context || {}
    });
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      reply: 'An error occurred while processing your request. Please contact our front desk at +91 95132 62681.',
      error: true
    });
  }
});

// --- FrontDesk: Conversation Monitor ---
router.get('/conversations', (req, res) => {
  const sessions = db.prepare(`
    SELECT session_id, COUNT(*) as message_count, MAX(created_at) as last_activity
    FROM conversations
    GROUP BY session_id
    ORDER BY last_activity DESC
  `).all();

  const results = sessions.map(s => {
    const messages = db.prepare('SELECT role, message, created_at FROM conversations WHERE session_id = ? ORDER BY created_at ASC').all(s.session_id);
    return {
      sessionId: s.session_id,
      messageCount: s.message_count,
      lastActivity: s.last_activity,
      messages
    };
  });

  res.json(results);
});

// --- FrontDesk: Notifications Audit Log ---
router.get('/notifications', (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
  res.json(notifs);
});

// --- FrontDesk: Dashboard Statistics ---
router.get('/stats', (req, res) => {
  const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE appointment_date = ?').get(today).count;
  const pendingBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Pending'").get().count;
  const activeConversations = db.prepare('SELECT COUNT(DISTINCT session_id) as count FROM conversations').get().count;

  // Department booking distribution
  const deptStats = db.prepare(`
    SELECT dept.name, COUNT(b.id) as booking_count
    FROM departments dept
    LEFT JOIN bookings b ON dept.id = b.department_id AND b.status != 'Cancelled'
    GROUP BY dept.id
    ORDER BY booking_count DESC
  `).all();

  res.json({
    totalBookings,
    todayBookings,
    pendingBookings,
    activeConversations,
    deptStats
  });
});

// ==========================================
// --- VOICE ASSISTANT ROUTES (SAMMY) ---
// ==========================================

// Start or retrieve a voice session
router.post('/voice/session', (req, res) => {
  const { sessionId, phone, email } = req.body || {};
  const result = voiceService.initSession(sessionId, phone, email);
  res.json(result);
});

// Process a spoken turn with Sammy
router.post('/voice/interact', (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  try {
    const result = voiceService.processTurn(sessionId, message);
    res.json(result);
  } catch (err) {
    console.error('Voice interact error:', err);
    res.status(500).json({
      reply: 'Sorry, once again please?',
      error: err.message
    });
  }
});

// External Voice / Telephony Webhook Bridge (Vapi, Retell AI, Twilio, assistant id -P24DFtmXIl2e8SfJOKt)
router.post('/voice/webhook', async (req, res) => {
  const body = req.body || {};
  console.log('[Voice Webhook] Received payload:', JSON.stringify(body));

  // Handle function calling tool requests
  const functionCall = body.message?.function_call || body.function_call || body.toolCall || body.tool;
  if (functionCall) {
    const fnName = functionCall.name || functionCall.function?.name;
    let fnArgs = functionCall.parameters || functionCall.arguments || {};
    if (typeof fnArgs === 'string') {
      try { fnArgs = JSON.parse(fnArgs); } catch (e) {}
    }

    if (fnName === 'check_availability') {
      const { doctor_id, date } = fnArgs;
      const doc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctor_id);
      if (!doc) return res.json({ result: { available: false, message: 'Doctor not found' } });
      const avail = availabilityService.getDoctorAvailability(doctor_id, date);
      return res.json({ result: avail });
    }

    if (fnName === 'book_appointment') {
      const bookingResult = bookingService.createBooking({
        doctorId: fnArgs.doctor_id || fnArgs.doctorId,
        appointmentDate: fnArgs.date || fnArgs.appointmentDate,
        appointmentTime: fnArgs.time || fnArgs.appointmentTime,
        patientName: fnArgs.patient_name || fnArgs.patientName || 'Voice Patient',
        patientPhone: fnArgs.patient_phone || fnArgs.patientPhone || '+91 98765 43210',
        patientEmail: fnArgs.patient_email || fnArgs.patientEmail || process.env.DEMO_PATIENT_EMAIL || 'karthikkondeboyina@gmail.com',
        patientAge: parseInt(fnArgs.patient_age || fnArgs.patientAge || 30, 10),
        notes: 'Booked via Voice Telephony Webhook'
      });
      return res.json({ result: bookingResult });
    }

    if (fnName === 'get_doctors') {
      const docs = db.prepare('SELECT id, name, department_id, campus_id, fee FROM doctors WHERE active = 1').all();
      return res.json({ result: docs });
    }
  }

  // Handle direct message webhook turn
  const userMsg = body.message?.content || body.transcript || body.text || '';
  const sessId = body.sessionId || body.call_id || body.callId || 'webhook_' + Date.now();
  const turnResult = voiceService.processTurn(sessId, userMsg);
  res.json({
    response: turnResult.reply,
    ...turnResult
  });
});

module.exports = router;
