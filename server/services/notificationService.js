const EventEmitter = require('events');
const emailService = require('./emailService');
const { db } = require('../db');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  setupListeners() {
    // Event triggered when a new booking is confirmed
    this.on('appointment:created', async (booking) => {
      await this.handleAppointmentCreated(booking);
    });

    // Event triggered when a booking is cancelled
    this.on('appointment:cancelled', async (booking) => {
      await this.handleAppointmentCancelled(booking);
    });

    // Clean extension points for future channels (SMS, WhatsApp, Voice)
    this.on('appointment:voice_callback', async (eventData) => {
      console.log('[NotificationService] Voice callback event scheduled for future integration:', eventData);
    });
  }

  async handleAppointmentCreated(booking) {
    console.log(`[NotificationService] Event 'appointment:created' received for Ref: ${booking.appointment_ref}`);

    const recipient = booking.patient_email || process.env.DEMO_PATIENT_EMAIL || 'karthikkondeboyina@gmail.com';
    const subject = `Appointment Confirmed: ${booking.appointment_ref}`;
    const payload = JSON.stringify({
      ref: booking.appointment_ref,
      doctor: booking.doctor_name,
      dept: booking.department_name,
      campus: booking.campus_name,
      date: booking.appointment_date,
      time: booking.appointment_time,
      fee: booking.fee
    });

    // Record Pending notification row in database
    const insertStmt = db.prepare(`
      INSERT INTO notifications (appointment_ref, type, channel, recipient, status, subject, payload)
      VALUES (?, 'confirmation', 'email', ?, 'Pending', ?, ?)
    `);
    const info = insertStmt.run(booking.appointment_ref, recipient, subject, payload);
    const notifId = info.lastInsertRowid;

    // Trigger Email Service
    try {
      const result = await emailService.sendAppointmentConfirmation(booking);
      const updateStmt = db.prepare(`
        UPDATE notifications 
        SET status = ?, sent_at = CURRENT_TIMESTAMP, error_message = ?
        WHERE id = ?
      `);

      if (result.status === 'Sent') {
        updateStmt.run('Sent', null, notifId);
        console.log(`[NotificationService] Notification ID ${notifId} marked as 'Sent'`);
      } else {
        updateStmt.run('Failed', result.error || 'Unknown email failure', notifId);
        console.error(`[NotificationService] Notification ID ${notifId} marked as 'Failed'`);
      }
    } catch (err) {
      const updateStmt = db.prepare(`
        UPDATE notifications 
        SET status = 'Failed', error_message = ?
        WHERE id = ?
      `);
      updateStmt.run(err.message, notifId);
      console.error(`[NotificationService] Failed to dispatch email notification:`, err.message);
    }
  }

  async handleAppointmentCancelled(booking) {
    console.log(`[NotificationService] Event 'appointment:cancelled' for Ref: ${booking.appointment_ref}`);
    const recipient = booking.patient_email || process.env.DEMO_PATIENT_EMAIL || 'karthikkondeboyina@gmail.com';
    
    const insertStmt = db.prepare(`
      INSERT INTO notifications (appointment_ref, type, channel, recipient, status, subject, payload)
      VALUES (?, 'cancellation', 'email', ?, 'Pending', ?, ?)
    `);
    const notif = insertStmt.run(
      booking.appointment_ref,
      recipient,
      `Appointment Cancelled: ${booking.appointment_ref}`,
      JSON.stringify(booking)
    );

    try {
      const result = await emailService.sendAppointmentCancellation(booking);
      db.prepare(`UPDATE notifications SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(result.status, notif.lastInsertRowid);
    } catch (err) {
      db.prepare(`UPDATE notifications SET status = 'Failed', error_message = ? WHERE id = ?`)
        .run(err.message, notif.lastInsertRowid);
    }
  }
}

module.exports = new NotificationService();
