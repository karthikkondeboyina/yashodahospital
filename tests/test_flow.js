/**
 * Automated Verification Suite for CareConnect AI Hospital System
 * Tests:
 * 1. Health check endpoint
 * 2. Directory & Availability queries
 * 3. Double-booking conflict prevention (ACID / Transactional)
 * 4. Emergency safety gate check
 * 5. Notification & Email generation lifecycle
 * 6. Appointment cancellation and slot restoration
 */

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🏥 Starting CareConnect AI Automated Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'TEST 1: Health check endpoint is active');

    // TEST 2: Approved Directory Seed Data
    const depts = await request('GET', '/departments');
    assert(depts.status === 200 && depts.body.length === 12, 'TEST 2.1: Exactly 12 approved clinical departments present');

    const doctors = await request('GET', '/doctors');
    assert(doctors.status === 200 && doctors.body.length === 15, 'TEST 2.2: Exactly 15 approved doctors loaded');

    // TEST 3: Doctor Availability
    const avail = await request('GET', '/doctors/1/availability?date=2026-10-15'); // Thursday
    assert(avail.status === 200 && avail.body.isConsultationDay === true, 'TEST 3.1: Doctor 1 availability for valid consultation day');

    // TEST 4: Emergency Gate Interceptor
    const emergencyChat = await request('POST', '/chat', {
      sessionId: 'test_emergency_session',
      message: 'I have severe chest pain and cannot breathe'
    });
    assert(emergencyChat.status === 200 && emergencyChat.body.isEmergency === true && emergencyChat.body.reply.includes('105910'), 'TEST 4: Emergency safety gate triggers on chest pain with helpline numbers');

    // TEST 5: Successful Booking & Slot Reservation
    const slots = ['10:00 AM', '11:00 AM', '12:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];
    const uniqueTime = slots[Math.floor(Math.random() * slots.length)];
    // Random future date (Mon-Fri)
    const randomDay = String(Math.floor(10 + Math.random() * 15)).padStart(2, '0');
    const testDate = `2026-12-${randomDay}`;
    const bookingPayload = {
      doctorId: 1,
      appointmentDate: testDate,
      appointmentTime: uniqueTime,
      patientName: 'Karthik Kondeboyina',
      patientPhone: '+91 98765 43210',
      patientEmail: 'karthikkondeboyina@gmail.com',
      patientAge: 30
    };

    const firstBooking = await request('POST', '/bookings', bookingPayload);
    assert(firstBooking.status === 201 && firstBooking.body.success === true, 'TEST 5.1: Patient A successfully books available slot');
    const createdRef = firstBooking.body.booking.appointment_ref;

    // TEST 6: CRITICAL DOUBLE-BOOKING PREVENTION RULE
    // Patient B attempts to book the EXACT SAME doctor, date, and slot
    const duplicatePayload = {
      doctorId: 1,
      appointmentDate: testDate,
      appointmentTime: uniqueTime,
      patientName: 'Patient B (Competitor)',
      patientPhone: '+91 99999 88888',
      patientEmail: 'patientb@example.com',
      patientAge: 40
    };

    const secondBooking = await request('POST', '/bookings', duplicatePayload);
    assert(secondBooking.status === 409 && secondBooking.body.code === 'SLOT_OCCUPIED', 'TEST 6: Duplicate booking on identical doctor/date/time is REJECTED with 409 Conflict');

    // TEST 7: Notification Event & Email Dispatch Verification
    // Allow time for live Gmail SMTP network handshake
    let createdNotif = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 600));
      const notifs = await request('GET', `/notifications`);
      createdNotif = notifs.body.find(n => n.appointment_ref === createdRef);
      if (createdNotif && createdNotif.status === 'Sent') break;
    }
    assert(createdNotif && createdNotif.status === 'Sent', 'TEST 7: Automated notification event generated with status Sent');

    // TEST 8: FrontDesk Booking Inspection & Cancellation
    const cancelRes = await request('PATCH', `/bookings/${createdRef}/cancel`);
    assert(cancelRes.status === 200 && cancelRes.body.booking.status === 'Cancelled', 'TEST 8.1: Appointment successfully cancelled');

    // Slot should now be bookable again
    const thirdBooking = await request('POST', '/bookings', duplicatePayload);
    assert(thirdBooking.status === 201 && thirdBooking.body.success === true, 'TEST 8.2: Previously cancelled slot is immediately freed and bookable again');

    console.log('\n====================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
