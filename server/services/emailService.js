const nodemailer = require('nodemailer');
const { generateAppointmentPDF } = require('../utils/pdfGenerator');

function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: (process.env.EMAIL_USER || '').trim(),
            pass: (process.env.EMAIL_PASS || '').trim()
        }
    });
}

/* ───── SHARED EMAIL WRAPPER ────────────────────────────────────── */
const headerHtml = `
<div style="background: linear-gradient(135deg,#0d9488,#059669); padding:28px 32px 22px; border-radius:12px 12px 0 0; text-align:center;">
  <h1 style="margin:0; color:#ffffff; font-size:22px; font-family:'Segoe UI',Arial,sans-serif; letter-spacing:0.5px;">
    🏥 BM Multi Speciality Hospital
  </h1>
  <p style="margin:6px 0 0; color:rgba(255,255,255,0.82); font-size:13px; font-family:Arial,sans-serif;">
    42, Anna Salai, Near Gemini Flyover, Chennai &nbsp;|&nbsp; +91 44-2600-1234
  </p>
</div>`;

const footerHtml = `
<div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 32px; border-radius:0 0 12px 12px; text-align:center;">
  <p style="margin:0; font-size:11px; color:#94a3b8; font-family:Arial,sans-serif;">
    Emergency Helpline: <strong>+91 1800-222-555</strong> &nbsp;|&nbsp; 24/7 Pharmacy &amp; Diagnostics<br>
    © 2026 BM Multi Speciality Hospital. All rights reserved.
  </p>
</div>`;

function emailWrapper(content) {
    return `
    <div style="background-color:#f1f5f9; padding:32px 12px; font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:600px; margin:0 auto; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.10); overflow:hidden; border:1px solid #e2e8f0;">
        ${headerHtml}
        <div style="background:#ffffff; padding:28px 32px;">
          ${content}
        </div>
        ${footerHtml}
      </div>
    </div>`;
}

/* ───── OTP EMAIL ───────────────────────────────────────────────── */
async function sendOTPEmail(toEmail, otp) {
    const body = `
      <p style="color:#475569; font-size:15px; margin:0 0 20px;">
        Hello! You requested an appointment verification code for <strong style="color:#0f172a;">${toEmail}</strong>.
        Use the code below to complete your booking:
      </p>
      <div style="text-align:center; margin:28px 0;">
        <div style="display:inline-block; background:linear-gradient(135deg,#f0fdfa,#d1fae5); border:2px dashed #0d9488;
                    border-radius:16px; padding:20px 40px;">
          <p style="margin:0 0 6px; font-size:12px; color:#0d9488; text-transform:uppercase; letter-spacing:2px; font-weight:700;">
            One-Time Password
          </p>
          <h1 style="margin:0; font-size:48px; font-weight:800; color:#0d9488; letter-spacing:10px; line-height:1.1;">
            ${otp}
          </h1>
        </div>
      </div>
      <table style="width:100%; border-collapse:collapse; background:#fef9c3; border-radius:10px; margin-top:16px;">
        <tr>
          <td style="padding:12px 16px; font-size:13px; color:#854d0e;">
            ⏱️ This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.
          </td>
        </tr>
      </table>
      <p style="font-size:13px; color:#94a3b8; margin-top:18px;">
        If you did not request this, please ignore this email or contact us immediately.
      </p>`;

    return getTransporter().sendMail({
        from: `"BM Hospital" <${(process.env.EMAIL_USER || '').trim()}>`,
        to: toEmail,
        subject: '🔐 Your OTP Code - BM Hospital Appointment',
        html: emailWrapper(body)
    });
}

/* ───── BOOKING CONFIRMATION EMAIL ──────────────────────────────── */
async function sendBookingConfirmation({ email, name, appointment_id, doctor, department, date, time, reason }) {
    const body = `
      <p style="color:#475569; font-size:15px; margin:0 0 20px;">
        Dear <strong style="color:#0f172a;">${name}</strong>,<br>
        Your appointment at BM Multi Speciality Hospital has been <strong style="color:#16a34a;">successfully confirmed</strong>.
        Please find your appointment details below.
      </p>

      <!-- APPOINTMENT SLIP -->
      <div style="border:2px solid #0d9488; border-radius:12px; overflow:hidden; margin-bottom:24px;">
        <!-- Slip header -->
        <div style="background:#0d9488; padding:10px 20px;">
          <p style="margin:0; color:#ffffff; font-weight:700; font-size:13px; letter-spacing:1px;">
            APPOINTMENT CONFIRMATION SLIP
          </p>
        </div>
        <!-- Slip body -->
        <table style="width:100%; border-collapse:collapse;">
          <tr style="background:#f0fdfa;">
            <td style="padding:10px 20px; font-size:13px; color:#64748b; width:40%;">Appointment ID</td>
            <td style="padding:10px 20px; font-size:13px; font-weight:700; color:#0d9488;">${appointment_id}</td>
          </tr>
          <tr>
            <td style="padding:10px 20px; font-size:13px; color:#64748b;">Patient Name</td>
            <td style="padding:10px 20px; font-size:13px; font-weight:600; color:#0f172a;">${name}</td>
          </tr>
          <tr style="background:#f0fdfa;">
            <td style="padding:10px 20px; font-size:13px; color:#64748b;">Patient Email</td>
            <td style="padding:10px 20px; font-size:13px; font-weight:600; color:#0f172a;">${email}</td>
          </tr>
          <tr>
            <td style="padding:10px 20px; font-size:13px; color:#64748b;">Department</td>
            <td style="padding:10px 20px; font-size:13px; font-weight:600; color:#0f172a;">${department}</td>
          </tr>
          <tr style="background:#f0fdfa;">
            <td style="padding:10px 20px; font-size:13px; color:#64748b;">Attending Doctor</td>
            <td style="padding:10px 20px; font-size:13px; font-weight:600; color:#0f172a;">${doctor}</td>
          </tr>
          <tr>
            <td style="padding:10px 20px; font-size:13px; color:#64748b;">Date &amp; Time</td>
            <td style="padding:10px 20px; font-size:13px; font-weight:700; color:#059669;">${date} at ${time}</td>
          </tr>
          ${reason ? `<tr style="background:#f0fdfa;">
            <td style="padding:10px 20px; font-size:13px; color:#64748b; vertical-align:top;">Reason / Symptoms</td>
            <td style="padding:10px 20px; font-size:13px; color:#0f172a;">${reason}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- INSTRUCTIONS -->
      <div style="background:#f8fafc; border-left:4px solid #0d9488; border-radius:6px; padding:14px 18px; margin-bottom:16px;">
        <p style="margin:0; font-size:13px; color:#475569; line-height:1.7;">
          📍 <strong>Hospital Address:</strong> 42, Anna Salai, Near Gemini Flyover, Chennai<br>
          🕐 <strong>Please arrive 15 minutes early</strong> at the OPD reception counter<br>
          📞 <strong>Reception:</strong> +91 44-2600-1234 &nbsp;|&nbsp; 🚨 <strong>Emergency:</strong> +91 1800-222-555
        </p>
      </div>

      <p style="font-size:12px; color:#94a3b8; margin-top:8px;">
        📎 Your appointment PDF slip is <strong>attached to this email</strong> and can also be downloaded directly from the website after booking.
      </p>`;

    // Generate PDF attachment
    let attachments = [];
    try {
        const pdfBuffer = await generateAppointmentPDF({
            appointment_id, name, email, department, doctor, date, time, reason
        });
        attachments = [{
            filename: `Appointment_Slip_${appointment_id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }];
    } catch (pdfErr) {
        console.error('[PDF Generation Error] Could not generate PDF attachment:', pdfErr.message);
        // Continue sending email without attachment rather than failing entirely
    }

    return getTransporter().sendMail({
        from: `"BM Hospital" <${(process.env.EMAIL_USER || '').trim()}>`,
        to: email,
        subject: `✅ Appointment Confirmed [${appointment_id}] - BM Hospital`,
        html: emailWrapper(body),
        attachments
    });
}

module.exports = { sendOTPEmail, sendBookingConfirmation };

