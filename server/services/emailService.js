require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.host = process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = parseInt(process.env.SMTP_PORT, 10) || 587;
    this.secure = process.env.SMTP_SECURE === 'true';
    this.user = process.env.SMTP_USER || '';
    this.pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
    this.from = process.env.EMAIL_FROM || '"CareConnect AI Hospital" <noreply@careconnect.ai>';
    this.mockDir = path.resolve(__dirname, '../../mock-emails');

    if (!fs.existsSync(this.mockDir)) {
      fs.mkdirSync(this.mockDir, { recursive: true });
    }

    this.isConfigured = !!(this.user && this.pass);

    if (this.isConfigured) {
      // Use direct pool/host config which works reliably across all cloud hosting providers (Render, AWS, GCP, etc.)
      const smtpPort = this.port === 465 || this.secure ? 465 : (this.port || 587);
      const isSecure = smtpPort === 465;

      this.transporter = nodemailer.createTransport({
        host: this.host || 'smtp.gmail.com',
        port: smtpPort,
        secure: isSecure, // true for 465, false for 587
        auth: {
          user: this.user,
          pass: this.pass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
      });
      console.log(`EmailService: Configured with live Gmail SMTP transport on ${this.host}:${smtpPort} (secure: ${isSecure}).`);
    } else {
      console.log('EmailService: Running in simulation mode (no SMTP credentials provided). Emails will be saved to mock-emails/ and recorded.');
    }
  }

  generateConfirmationHtml(booking) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #4f46e5; color: #ffffff; padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }
          .body { padding: 24px 32px; }
          .ref-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
          .ref-label { font-size: 12px; color: #4338ca; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
          .ref-val { font-size: 22px; font-family: monospace; font-weight: 700; color: #312e81; }
          .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; }
          .val { font-weight: 600; color: #0f172a; text-align: right; }
          .instructions { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0 16px 0; }
          .inst-title { font-size: 13px; font-weight: 700; color: #b45309; margin-bottom: 6px; }
          .inst-list { margin: 0; padding-left: 18px; font-size: 13px; color: #92400e; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Appointment Confirmed!</h1>
            <span class="badge">CareConnect AI Hospital</span>
          </div>
          <div class="body">
            <div class="ref-box">
              <div class="ref-label">Appointment Reference</div>
              <div class="ref-val">${booking.appointment_ref}</div>
            </div>

            <div class="row"><span class="label">Patient Name:</span><span class="val">${booking.patient_name}</span></div>
            <div class="row"><span class="label">Department:</span><span class="val">${booking.department_name}</span></div>
            <div class="row"><span class="label">Doctor:</span><span class="val">${booking.doctor_name}</span></div>
            <div class="row"><span class="label">Hospital Campus:</span><span class="val">${booking.campus_name}</span></div>
            <div class="row"><span class="label">Appointment Date:</span><span class="val">${booking.appointment_date}</span></div>
            <div class="row"><span class="label">Appointment Time:</span><span class="val">${booking.appointment_time}</span></div>
            <div class="row"><span class="label">Consultation Fee:</span><span class="val">₹${booking.fee}</span></div>
            <div class="row"><span class="label">Status:</span><span class="val" style="color:#16a34a;">${booking.status}</span></div>

            <div class="instructions">
              <div class="inst-title">Important Instructions</div>
              <ul class="inst-list">
                <li>Please arrive <strong>15 minutes early</strong> with a valid photo ID.</li>
                <li>Carry all previous medical prescriptions or diagnostic reports.</li>
                <li>Hospital Front Desk: <strong>${process.env.FRONT_DESK_PHONE || '+91 95132 62681'}</strong></li>
                <li>Emergency Helpline: <strong>105910</strong> / Ambulance: <strong>108</strong></li>
              </ul>
            </div>
          </div>
          <div class="footer">
            CareConnect AI Hospital System • Automated Notification • Do not reply directly to this email
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendAppointmentConfirmation(booking) {
    const recipient = booking.patient_email || process.env.DEMO_PATIENT_EMAIL || 'karthikkondeboyina@gmail.com';
    const subject = `Appointment Confirmed: ${booking.appointment_ref} - ${booking.doctor_name} on ${booking.appointment_date}`;
    const html = this.generateConfirmationHtml(booking);

    console.log(`[EmailService] Preparing confirmation email for ${recipient} (Ref: ${booking.appointment_ref})...`);

    if (this.isConfigured) {
      try {
        const info = await this.transporter.sendMail({
          from: this.from,
          to: recipient,
          subject,
          html
        });
        console.log(`[EmailService] Sent live email to ${recipient}: ${info.messageId}`);
        return { status: 'Sent', messageId: info.messageId };
      } catch (err) {
        console.warn(`[EmailService] Primary transport failed (${err.message}). Attempting port 465 SSL fallback...`);
        try {
          const fallbackTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: this.user,
              pass: this.pass
            },
            tls: {
              rejectUnauthorized: false
            },
            connectionTimeout: 15000
          });
          const info = await fallbackTransporter.sendMail({
            from: this.from,
            to: recipient,
            subject,
            html
          });
          console.log(`[EmailService] Sent live email via fallback port 465 to ${recipient}: ${info.messageId}`);
          return { status: 'Sent', messageId: info.messageId };
        } catch (fallbackErr) {
          console.error(`[EmailService] Failed to send email to ${recipient}:`, fallbackErr.message);
          return { status: 'Failed', error: fallbackErr.message };
        }
      }
    } else {
      // Simulation mode: write email file for audit / verification
      const filename = `email_${booking.appointment_ref}_${Date.now()}.html`;
      const filepath = path.join(this.mockDir, filename);
      fs.writeFileSync(filepath, html, 'utf8');
      console.log(`[EmailService] [Simulation] Saved email preview to ${filepath}`);
      return { status: 'Sent', simulation: true, file: filename };
    }
  }

  async sendAppointmentCancellation(booking) {
    const recipient = booking.patient_email || process.env.DEMO_PATIENT_EMAIL || 'karthikkondeboyina@gmail.com';
    const subject = `Appointment Cancelled: ${booking.appointment_ref}`;
    const html = `<p>Your appointment <strong>${booking.appointment_ref}</strong> with ${booking.doctor_name} on ${booking.appointment_date} has been cancelled.</p>`;
    
    if (this.isConfigured) {
      try {
        await this.transporter.sendMail({ from: this.from, to: recipient, subject, html });
        return { status: 'Sent' };
      } catch (err) {
        try {
          const fallbackTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: this.user, pass: this.pass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 15000
          });
          await fallbackTransporter.sendMail({ from: this.from, to: recipient, subject, html });
          return { status: 'Sent' };
        } catch (fErr) {
          return { status: 'Failed', error: fErr.message };
        }
      }
    } else {
      console.log(`[EmailService] [Simulation] Cancellation email logged for ${recipient} (Ref: ${booking.appointment_ref})`);
      return { status: 'Sent', simulation: true };
    }
  }
}

module.exports = new EmailService();
