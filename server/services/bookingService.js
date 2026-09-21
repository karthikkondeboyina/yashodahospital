const { db } = require('../db');
const availabilityService = require('./availabilityService');
const notificationService = require('./notificationService');

class BookingService {
  /**
   * Validate Indian Mobile Number (10 digits starting with 6-9)
   */
  validateAndNormalizePhone(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+91')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    
    // Exactly 10 digits starting with 6-9
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return '+91 ' + cleaned.substring(0, 5) + ' ' + cleaned.substring(5);
    }
    return null;
  }

  generateReference() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `CC-${new Date().getFullYear()}-${randomNum}`;
  }

  /**
   * Create an appointment with strict transactional isolation and duplicate prevention
   */
  createBooking({ doctorId, appointmentDate, appointmentTime, patientName, patientPhone, patientEmail, patientAge, notes }) {
    // 1. Validate phone
    const normalizedPhone = this.validateAndNormalizePhone(patientPhone);
    if (!normalizedPhone) {
      return { success: false, error: 'Invalid phone number. Please provide a valid 10-digit Indian mobile number.' };
    }

    // 2. Validate patient info
    if (!patientName || patientName.trim().length < 2) {
      return { success: false, error: 'Patient name is required (minimum 2 characters).' };
    }
    if (!patientEmail || !patientEmail.trim()) {
      return { success: false, error: 'Patient email address is required so we can send your appointment confirmation.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail.trim())) {
      return { success: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
    }
    if (!patientAge || isNaN(patientAge) || patientAge < 0 || patientAge > 125) {
      return { success: false, error: 'Valid patient age is required.' };
    }

    // 3. Pre-check availability
    const available = availabilityService.isSlotAvailable(doctorId, appointmentDate, appointmentTime);
    if (!available) {
      return {
        success: false,
        error: 'Slot is not available or has already been booked. Please choose another time slot.',
        code: 'SLOT_OCCUPIED'
      };
    }

    // 4. Fetch Doctor & Details
    const doctor = db.prepare(`
      SELECT d.*, dept.name as department_name, c.name as campus_name 
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      JOIN campuses c ON d.campus_id = c.id
      WHERE d.id = ? AND d.active = 1
    `).get(doctorId);

    if (!doctor) {
      return { success: false, error: 'Doctor not found or inactive.' };
    }

    const ref = this.generateReference();

    // 5. Run ACID transaction with SQLite
    const insertTx = db.transaction(() => {
      // Immediate re-check inside transaction to eliminate race conditions
      const existing = db.prepare(`
        SELECT id FROM bookings 
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'
      `).get(doctorId, appointmentDate, appointmentTime);

      if (existing) {
        throw new Error('SLOT_OCCUPIED');
      }

      const stmt = db.prepare(`
        INSERT INTO bookings (
          appointment_ref, doctor_id, department_id, campus_id, 
          appointment_date, appointment_time, patient_name, patient_phone, 
          patient_email, patient_age, status, fee, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?)
      `);

      const result = stmt.run(
        ref,
        doctor.id,
        doctor.department_id,
        doctor.campus_id,
        appointmentDate,
        appointmentTime,
        patientName.trim(),
        normalizedPhone,
        patientEmail ? patientEmail.trim() : null,
        parseInt(patientAge, 10),
        doctor.fee,
        notes || null
      );

      return result.lastInsertRowid;
    });

    let bookingId;
    try {
      bookingId = insertTx();
    } catch (err) {
      if (err.message === 'SLOT_OCCUPIED' || (err.code && err.code.includes('SQLITE_CONSTRAINT'))) {
        return {
          success: false,
          error: 'This specific slot was just booked by another patient. Please select an alternative slot.',
          code: 'SLOT_OCCUPIED'
        };
      }
      console.error('[BookingService] Transaction error:', err);
      return { success: false, error: 'Booking failed due to an internal server error.' };
    }

    // 6. Fetch complete booking object
    const booking = db.prepare(`
      SELECT b.*, d.name as doctor_name, dept.name as department_name, c.name as campus_name
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.id
      JOIN departments dept ON b.department_id = dept.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE b.id = ?
    `).get(bookingId);

    // 7. Emit appointment:created event (triggers notification & email pipeline)
    notificationService.emit('appointment:created', booking);

    return {
      success: true,
      booking
    };
  }

  /**
   * Cancel an appointment
   */
  cancelBooking(ref) {
    const booking = db.prepare(`
      SELECT b.*, d.name as doctor_name, dept.name as department_name, c.name as campus_name
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.id
      JOIN departments dept ON b.department_id = dept.id
      JOIN campuses c ON b.campus_id = c.id
      WHERE b.appointment_ref = ?
    `).get(ref);

    if (!booking) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (booking.status === 'Cancelled') {
      return { success: false, error: 'Appointment is already cancelled.' };
    }

    db.prepare(`UPDATE bookings SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(booking.id);
    booking.status = 'Cancelled';

    notificationService.emit('appointment:cancelled', booking);
    return { success: true, booking };
  }
}

module.exports = new BookingService();
