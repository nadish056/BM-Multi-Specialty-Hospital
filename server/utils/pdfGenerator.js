/**
 * Server-side PDF generator for appointment slips.
 * Uses PDFKit to produce a Buffer attached to confirmation emails.
 */
const PDFDocument = require('pdfkit');

function generateAppointmentPDF(data) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4', margin: 50,
            info: { Title: `Appointment Slip - ${data.appointment_id}`, Author: 'BM Multi Speciality Hospital' }
        });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const W = 595.28;
        const TEAL = '#0d9488';
        const DARK = '#0f172a';
        const MUTED = '#64748b';
        const GOLD  = '#c9a84c';
        const LEFT  = 50;
        const RIGHT_EDGE = W - 50;

        // Header Bar
        doc.rect(0, 0, W, 75).fill(TEAL);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
           .text('BM MULTI SPECIALITY HOSPITAL', LEFT, 20, { width: W - 100 });
        doc.font('Helvetica').fontSize(9).fillColor('#ccfdf7')
           .text('42, Anna Salai, Near Gemini Flyover, Chennai  |  +91 44-2600-1234', LEFT, 44);

        // Title
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(15)
           .text('CONFIRMED APPOINTMENT SLIP', LEFT, 95);
        doc.rect(LEFT, 113, 200, 2).fill(GOLD);

        // Appointment ID row
        doc.roundedRect(LEFT, 124, RIGHT_EDGE - LEFT, 32, 6).fill('#f0fdfa');
        doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(10).text('Appointment ID:', LEFT + 12, 133);
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13).text(data.appointment_id, LEFT + 115, 131);

        // Detail box
        const rows = [
            ['Patient Name',      data.name      || ''],
            ['Patient Email',     data.email     || ''],
            ['Department',        data.department|| ''],
            ['Attending Doctor',  data.doctor    || ''],
            ['Date',              data.date      || ''],
            ['Time Slot',         data.time      || ''],
            ['Reason / Symptoms', (data.reason   || 'General Consultation').slice(0, 70)]
        ];

        doc.roundedRect(LEFT, 168, RIGHT_EDGE - LEFT, rows.length * 29 + 4, 6)
           .strokeColor(TEAL).lineWidth(1.5).stroke();

        let y = 178;
        rows.forEach(([label, value], idx) => {
            doc.rect(LEFT + 1, y, RIGHT_EDGE - LEFT - 2, 28).fill(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
            doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(label, LEFT + 12, y + 9, { width: 130 });
            doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(String(value), LEFT + 155, y + 8, { width: RIGHT_EDGE - LEFT - 167 });
            y += 29;
        });
        doc.roundedRect(LEFT, 168, RIGHT_EDGE - LEFT, rows.length * 29 + 4, 6)
           .strokeColor(TEAL).lineWidth(1.5).stroke();

        // Instructions
        const instrY = y + 14;
        doc.rect(LEFT, instrY, RIGHT_EDGE - LEFT, 60).fill('#f0fdfa');
        doc.rect(LEFT, instrY, 4, 60).fill(TEAL);
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text('Important Instructions:', LEFT + 14, instrY + 8);
        doc.font('Helvetica').fillColor(MUTED).fontSize(8.5)
           .text('Present this slip at OPD reception 15 min before your slot.', LEFT + 14, instrY + 22, { width: RIGHT_EDGE - LEFT - 20 })
           .text('Address: 42, Anna Salai, Near Gemini Flyover, Chennai', LEFT + 14, instrY + 35, { width: RIGHT_EDGE - LEFT - 20 })
           .text('Reception: +91 44-2600-1234  |  Emergency: +91 1800-222-555 (24/7)', LEFT + 14, instrY + 48, { width: RIGHT_EDGE - LEFT - 20 });

        // Footer
        doc.rect(0, 765, W, 30).fill('#f1f5f9');
        doc.fillColor(MUTED).font('Helvetica').fontSize(8)
           .text('2026 BM Multi Speciality Hospital. All rights reserved.  |  Emergency: +91 1800-222-555  |  24/7 Pharmacy and Diagnostics',
                 LEFT, 773, { width: W - 100, align: 'center' });

        doc.end();
    });
}

module.exports = { generateAppointmentPDF };
