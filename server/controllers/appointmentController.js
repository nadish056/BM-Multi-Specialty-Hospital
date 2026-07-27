const db = require('../database/init');
const { sendOTPEmail, sendBookingConfirmation } = require('../services/emailService');

// Helper to generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to generate Appointment ID
function generateAppointmentID() {
    return 'BM-' + Math.floor(100000 + Math.random() * 900000);
}

const otpCooldowns = new Map();

/**
 * Step 1: Generate & Send OTP
 */
exports.requestOTP = async (req, res) => {
    let { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }

    email = email.trim().toLowerCase();

    // 30-second cooldown check
    if (otpCooldowns.has(email)) {
        const lastRequested = otpCooldowns.get(email);
        const elapsed = Date.now() - lastRequested;
        if (elapsed < 30000) {
            const remaining = Math.ceil((30000 - elapsed) / 1000);
            return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting another OTP.` });
        }
    }
    otpCooldowns.set(email, Date.now());

    const otp = generateOTP();
    // 10 minutes expiration window in milliseconds
    const expiresAt = Date.now() + 10 * 60 * 1000;

    console.log(`[OTP Generated] Email: ${email} | OTP: ${otp}`);

    db.run(`DELETE FROM otps WHERE email = ?`, [email], (err) => {
        db.run(`INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)`, [email, otp, expiresAt], async (err) => {
            if (err) {
                console.error('Failed to insert OTP:', err.message);
                return res.status(500).json({ error: 'Failed to generate OTP.' });
            }

            try {
                await sendOTPEmail(email, otp);
                res.json({ message: 'OTP sent to your email address successfully.' });
            } catch (emailErr) {
                console.error('Failed to send OTP email:', emailErr);
                res.status(500).json({ error: `Failed to send OTP email: ${emailErr.message || 'Unknown error'}` });
            }
        });
    });
};

/**
 * Step 2: Verify OTP and Create Appointment
 */
exports.verifyOTPAndBook = async (req, res) => {
    let { name, email, phone, gender, age, department, doctor_id, appointment_date, appointment_time, reason, otp } = req.body;

    if (!name || !email || !phone || !department || !appointment_date || !appointment_time || !otp) {
        return res.status(400).json({ error: 'All required fields including OTP must be provided.' });
    }

    email = email.trim().toLowerCase();
    otp = String(otp).trim();

    console.log(`[OTP Verification Attempt] Email: ${email} | Input OTP: ${otp}`);

    // Verify OTP
    db.get(`SELECT * FROM otps WHERE email = ? AND otp = ?`, [email, otp], (err, row) => {
        if (err || !row) {
            console.warn(`[OTP Failed] No matching record for Email: ${email} & OTP: ${otp}`);
            return res.status(400).json({ error: 'Invalid OTP code. Please check your email or request a new OTP.' });
        }

        const now = Date.now();
        if (Number(row.expires_at) < now) {
            console.warn(`[OTP Expired] OTP for ${email} expired at ${row.expires_at}, now is ${now}`);
            db.run(`DELETE FROM otps WHERE email = ?`, [email]);
            return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        // Delete valid used OTP
        db.run(`DELETE FROM otps WHERE email = ?`, [email]);

        // Check if slot is already booked for this doctor & date
        db.get(
            `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'`,
            [doctor_id, appointment_date, appointment_time],
            (bErr, bookedSlot) => {
                if (bookedSlot) {
                    return res.status(400).json({ error: 'This time slot is already booked for the selected doctor. Please select another slot.' });
                }

                // Upsert patient
                db.get(`SELECT * FROM patients WHERE email = ?`, [email], (pErr, patient) => {
                    const saveAppointment = (pId) => {
                        const appointmentId = generateAppointmentID();

                        db.run(
                            `INSERT INTO appointments (appointment_id, patient_id, doctor_id, department, appointment_date, appointment_time, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
                            [appointmentId, pId, doctor_id || null, department, appointment_date, appointment_time, reason || ''],
                            function(aErr) {
                                if (aErr) {
                                    console.error('Error inserting appointment:', aErr);
                                    return res.status(500).json({ error: 'Failed to record appointment.' });
                                }

                                let doctorName = 'Assigned Specialist';
                                db.get(`SELECT name FROM doctors WHERE id = ?`, [doctor_id], (dErr, docRow) => {
                                    if (docRow) doctorName = docRow.name;

                                    sendBookingConfirmation({
                                        email,
                                        name,
                                        appointment_id: appointmentId,
                                        doctor: doctorName,
                                        department,
                                        date: appointment_date,
                                        time: appointment_time,
                                        reason: reason || ''
                                    }).catch(e => console.error('Email error:', e));

                                    res.json({
                                        success: true,
                                        message: 'Appointment booked successfully!',
                                        appointment_id: appointmentId,
                                        details: {
                                            name,
                                            email,
                                            department,
                                            doctor: doctorName,
                                            date: appointment_date,
                                            time: appointment_time
                                        }
                                    });
                                });
                            }
                        );
                    };

                    if (patient) {
                        saveAppointment(patient.id);
                    } else {
                        db.run(`INSERT INTO patients (name, email, phone, gender, age) VALUES (?, ?, ?, ?, ?)`, [name, email, phone, gender || 'Other', age || null], function(insErr) {
                            if (insErr) {
                                console.error('Error inserting patient:', insErr);
                                return res.status(500).json({ error: 'Failed to register patient.' });
                            }
                            saveAppointment(this.lastID);
                        });
                    }
                });
            }
        );
    });
};

/**
 * Fetch List of Doctors
 */
exports.getDoctors = (req, res) => {
    db.all(`SELECT * FROM doctors`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch doctors.' });
        }
        const formatted = rows.map(doc => ({
            ...doc,
            slots: doc.slots ? JSON.parse(doc.slots) : ["09:00 AM", "11:00 AM", "02:00 PM"]
        }));
        res.json(formatted);
    });
};

/**
 * Get Already Booked Slots for a Doctor & Date
 */
exports.getBookedSlots = (req, res) => {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
        return res.json([]);
    }

    db.all(
        `SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'`,
        [doctor_id, date],
        (err, rows) => {
            if (err) return res.json([]);
            res.json(rows.map(r => r.appointment_time));
        }
    );
};
