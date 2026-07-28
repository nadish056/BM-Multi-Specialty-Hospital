const nodemailer = require('nodemailer');
const { generateAppointmentPDF } = require('../utils/pdfGenerator');

function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: (process.env.EMAIL_USER || '').trim(),
            pass: (process.env.EMAIL_PASS || '').trim()
        },
        // Explicit timeouts — prevents silent SMTP hang on Render (causes 502).
        // With these, a blocked SMTP connection fails fast with a catchable error.
        connectionTimeout: 10000,  // 10s to establish TCP connection
        greetingTimeout:   10000,  // 10s for SMTP greeting after connect
        socketTimeout:     15000,  // 15s for any subsequent socket inactivity
        pool: false                // no connection pooling — each mail gets fresh socket
    });
}

/* ───── RESPONSIVE TABLE-BASED EMAIL WRAPPER ───────────────────── */
// Uses table layout for cross-client compatibility (Gmail, Outlook, Apple Mail, mobile).
// No border-radius, box-shadow, or flexbox — unsupported in most email clients.
function emailWrapper(content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>BM Hospital</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:#ffffff; border:1px solid #e2e8f0;">
        <!-- HEADER -->
        <tr>
          <td align="center" style="background:#0d9488; padding:24px 20px;">
            <p style="margin:0; color:#ffffff; font-size:20px; font-weight:bold; font-family:Arial,sans-serif;">&#127973; BM Multi Speciality Hospital</p>
            <p style="margin:6px 0 0; color:#ccfdf7; font-size:12px; font-family:Arial,sans-serif;">42, Anna Salai, Near Gemini Flyover, Chennai &nbsp;|&nbsp; +91 44-2600-1234</p>
          </td>
        </tr>
        <!-- CONTENT -->
        <tr>
          <td style="padding:28px 24px; background:#ffffff;">
            ${content}
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td align="center" style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:14px 20px;">
            <p style="margin:0; font-size:11px; color:#94a3b8; font-family:Arial,sans-serif;">Emergency Helpline: <strong>+91 1800-222-555</strong> &nbsp;|&nbsp; 24/7 Pharmacy &amp; Diagnostics<br>&#169; 2026 BM Multi Speciality Hospital. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ───── OTP EMAIL ───────────────────────────────────────────────── */
async function sendOTPEmail(toEmail, otp) {
    const body = `
      <p style="margin:0 0 20px; color:#475569; font-size:15px; font-family:Arial,sans-serif; line-height:1.6;">
        Hello! You requested an appointment verification code for <strong style="color:#0f172a;">${toEmail}</strong>.
        Use the code below to complete your booking:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdfa; border:2px dashed #0d9488; width:100%; max-width:320px;">
              <tr>
                <td align="center" style="padding:20px;">
                  <p style="margin:0 0 8px; font-size:11px; color:#0d9488; text-transform:uppercase; letter-spacing:3px; font-weight:bold; font-family:Arial,sans-serif;">One-Time Password</p>
                  <p style="margin:0; font-size:44px; font-weight:bold; color:#0d9488; letter-spacing:12px; font-family:'Courier New',Courier,monospace;">${otp}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef9c3; margin-top:16px;">
        <tr>
          <td style="padding:12px 16px; font-size:13px; color:#854d0e; font-family:Arial,sans-serif;">
            This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.
          </td>
        </tr>
      </table>
      <p style="font-size:13px; color:#94a3b8; margin-top:18px; font-family:Arial,sans-serif;">
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
    const rows = [
        ['Appointment ID',   appointment_id, '#0d9488', true],
        ['Patient Name',     name,           '#0f172a', false],
        ['Patient Email',    email,          '#0f172a', true],
        ['Department',       department,     '#0f172a', false],
        ['Attending Doctor', doctor,         '#0f172a', true],
        ['Date &amp; Time',  `${date} at ${time}`, '#059669', false],
        ...(reason ? [['Reason / Symptoms', reason, '#0f172a', true]] : [])
    ];

    const rowsHtml = rows.map(([label, value, color, shaded]) => `
        <tr style="background:${shaded ? '#f0fdfa' : '#ffffff'}">
          <td width="40%" style="padding:10px 16px; font-size:13px; color:#64748b; font-family:Arial,sans-serif; vertical-align:top;">${label}</td>
          <td style="padding:10px 16px; font-size:13px; font-weight:bold; color:${color}; font-family:Arial,sans-serif; word-break:break-word;">${value}</td>
        </tr>`).join('');

    const body = `
      <p style="margin:0 0 20px; color:#475569; font-size:15px; font-family:Arial,sans-serif; line-height:1.6;">
        Dear <strong style="color:#0f172a;">${name}</strong>,<br>
        Your appointment at BM Multi Speciality Hospital has been <strong style="color:#16a34a;">successfully confirmed</strong>.
        Please find your appointment details below.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #0d9488; margin-bottom:20px;">
        <tr>
          <td style="background:#0d9488; padding:10px 16px;">
            <p style="margin:0; color:#ffffff; font-weight:bold; font-size:13px; letter-spacing:1px; font-family:Arial,sans-serif;">APPOINTMENT CONFIRMATION SLIP</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${rowsHtml}
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border-left:4px solid #0d9488; margin-bottom:16px;">
        <tr>
          <td style="padding:14px 16px; font-size:13px; color:#475569; font-family:Arial,sans-serif; line-height:1.8;">
            <strong>Hospital Address:</strong> 42, Anna Salai, Near Gemini Flyover, Chennai<br>
            <strong>Please arrive 15 minutes early</strong> at the OPD reception counter<br>
            <strong>Reception:</strong> +91 44-2600-1234 &nbsp;|&nbsp; <strong>Emergency:</strong> +91 1800-222-555
          </td>
        </tr>
      </table>

      <p style="font-size:12px; color:#94a3b8; margin:8px 0 0; font-family:Arial,sans-serif;">
        Your appointment PDF slip is <strong>attached to this email</strong> and can also be downloaded from the website after booking.
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

