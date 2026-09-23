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

    this.resendApiKey = process.env.RESEND_API_KEY || '';
    this.brevoApiKey = process.env.BREVO_API_KEY || '';

    this.isConfigured = !!((this.user && this.pass) || this.resendApiKey || this.brevoApiKey);
    this.mode = this.resendApiKey ? 'resend-https-api' : (this.brevoApiKey ? 'brevo-https-api' : (this.user && this.pass ? 'gmail-smtp' : 'simulation'));

    if (this.resendApiKey) {
      console.log('EmailService: Configured with live Resend HTTP API (Port 443 HTTPS - 100% Render compatible).');
    } else if (this.brevoApiKey) {
      console.log('EmailService: Configured with live Brevo HTTP API (Port 443 HTTPS - 100% Render compatible).');
    } else if (this.user && this.pass) {
      // Direct SMTP Config
      this.transporter = nodemailer.createTransport({
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
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      console.log('EmailService: Configured with live Gmail SMTP transport on smtp.gmail.com:465.');
    } else {
      console.log('EmailService: Running in simulation mode (no credentials provided).');
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

    if (this.resendApiKey) {
      try {
        const https = require('https');
        const postData = JSON.stringify({
          from: this.from.includes('<') ? this.from : `CareConnect AI Hospital <onboarding@resend.dev>`,
          to: [recipient],
          subject,
          html
        });
        const options = {
          hostname: 'api.resend.com',
          port: 443,
          path: '/emails',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const result = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ status: 'Sent', data: body });
              } else {
                reject(new Error(`Resend API returned ${res.statusCode}: ${body}`));
              }
            });
          });
          req.on('error', reject);
          req.write(postData);
          req.end();
        });
        console.log(`[EmailService] Sent live email via Resend HTTPS API to ${recipient}: ${result.data}`);
        return { status: 'Sent', method: 'resend', messageId: result.data };
      } catch (err) {
        console.error(`[EmailService] Resend API error:`, err.message);
        return { status: 'Failed', error: err.message };
      }
    } else if (this.brevoApiKey) {
      try {
        const https = require('https');
        const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || this.user || 'karthikkondeboyina@gmail.com';
        const brevoSenderName = process.env.BREVO_SENDER_NAME || 'CareConnect AI Hospital';
        const postData = JSON.stringify({
          sender: { name: brevoSenderName, email: brevoSenderEmail },
          to: [{ email: recipient }],
          subject,
          htmlContent: html
        });
        const options = {
          hostname: 'api.brevo.com',
          port: 443,
          path: '/v3/smtp/email',
          method: 'POST',
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const result = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ status: 'Sent', data: body });
              } else {
                reject(new Error(`Brevo API returned ${res.statusCode}: ${body}`));
              }
            });
          });
          req.on('error', reject);
          req.write(postData);
          req.end();
        });
        console.log(`[EmailService] Sent live email via Brevo HTTPS API to ${recipient}: ${result.data}`);
        return { status: 'Sent', method: 'brevo', messageId: result.data };
      } catch (err) {
        console.error(`[EmailService] Brevo API error:`, err.message);
        return { status: 'Failed', error: err.message };
      }
    } else if (this.isConfigured && this.transporter) {
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
        console.error(`[EmailService] SMTP error for ${recipient}:`, err.message);
        return { status: 'Failed', error: err.message };
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
