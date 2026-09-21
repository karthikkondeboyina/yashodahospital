const { db } = require('../db');

const STANDARD_SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class AvailabilityService {
  /**
   * Get day name from YYYY-MM-DD
   */
  getDayOfWeek(dateStr) {
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return DAY_NAMES[d.getDay()];
  }

  /**
   * Check if a doctor consults on a given date and returns available slots
   */
  getDoctorAvailability(doctorId, dateStr) {
    const doctor = db.prepare(`
      SELECT d.*, dept.name as department_name, c.name as campus_name 
      FROM doctors d
      JOIN departments dept ON d.department_id = dept.id
      JOIN campuses c ON d.campus_id = c.id
      WHERE d.id = ? AND d.active = 1
    `).get(doctorId);

    if (!doctor) {
      return { error: 'Doctor not found or inactive' };
    }

    const consultDays = JSON.parse(doctor.consultation_days);
    const dayOfWeek = this.getDayOfWeek(dateStr);

    if (!consultDays.includes(dayOfWeek)) {
      return {
        doctorId,
        doctorName: doctor.name,
        date: dateStr,
        dayOfWeek,
        consultationDays: consultDays,
        isConsultationDay: false,
        availableSlots: [],
        message: `${doctor.name} does not consult on ${dayOfWeek}s. Consultation days are: ${consultDays.join(', ')}.`
      };
    }

    // Query existing confirmed bookings for this doctor on this date
    const bookedRows = db.prepare(`
      SELECT appointment_time 
      FROM bookings 
      WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'
    `).all(doctorId, dateStr);

    const bookedTimes = new Set(bookedRows.map(r => r.appointment_time));

    const availableSlots = STANDARD_SLOTS.filter(slot => !bookedTimes.has(slot));

    return {
      doctorId,
      doctorName: doctor.name,
      departmentName: doctor.department_name,
      campusName: doctor.campus_name,
      fee: doctor.fee,
      date: dateStr,
      dayOfWeek,
      consultationDays: consultDays,
      isConsultationDay: true,
      allSlots: STANDARD_SLOTS,
      bookedSlots: Array.from(bookedTimes),
      availableSlots
    };
  }

  /**
   * Check if a specific slot is available right now
   */
  isSlotAvailable(doctorId, dateStr, timeSlot) {
    const availability = this.getDoctorAvailability(doctorId, dateStr);
    if (!availability.isConsultationDay) return false;
    return availability.availableSlots.includes(timeSlot);
  }
}

module.exports = new AvailabilityService();
