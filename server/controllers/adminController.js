const db = require('../database/init');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const dbGet = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbAll = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbRun = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) { err ? reject(err) : resolve(this); });
});

exports.login = (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    password = String(password).trim();

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('FATAL: JWT_SECRET environment variable is missing.');
        return res.status(500).json({ error: 'Server authentication configuration error.' });
    }

    email = email.trim().toLowerCase();

    db.get(`SELECT * FROM admins WHERE email = ?`, [email], async (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: admin.id, email: admin.email }, jwtSecret, { expiresIn: '24h' });
        res.json({ success: true, token, email: admin.email });
    });
};

/**
 * Dashboard Statistics
 */
exports.getStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const [patients, todaysPatients, doctors, confirmed, cancelled, completed] = await Promise.all([
            dbGet(`SELECT COUNT(*) as total FROM patients`),
            dbGet(`SELECT COUNT(*) as total FROM patients WHERE DATE(created_at) = ?`, [today]),
            dbGet(`SELECT COUNT(*) as total FROM doctors`),
            dbGet(`SELECT COUNT(*) as total FROM appointments WHERE status = 'Confirmed'`),
            dbGet(`SELECT COUNT(*) as total FROM appointments WHERE status = 'Cancelled'`),
            dbGet(`SELECT COUNT(*) as total FROM appointments WHERE status = 'Completed'`)
        ]);

        res.json({
            totalPatients: patients ? patients.total : 0,
            todaysPatients: todaysPatients ? todaysPatients.total : 0,
            totalDoctors: doctors ? doctors.total : 0,
            confirmedAppointments: confirmed ? confirmed.total : 0,
            cancelledAppointments: cancelled ? cancelled.total : 0,
            completedAppointments: completed ? completed.total : 0
        });
    } catch (err) {
        console.error('Database error in getStats:', err);
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
};

/**
 * Get Appointments with Filtering, Search, Sorting
 */
exports.getAppointments = (req, res) => {
    const { search, department, doctor_id, status, date } = req.query;

    let query = `
        SELECT a.*, p.name as patient_name, p.email as patient_email, p.phone as patient_phone, d.name as doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR a.appointment_id LIKE ?)`;
        const term = `%${search}%`;
        params.push(term, term, term, term);
    }

    if (department) {
        query += ` AND a.department = ?`;
        params.push(department);
    }

    if (doctor_id) {
        query += ` AND a.doctor_id = ?`;
        params.push(doctor_id);
    }

    if (status) {
        query += ` AND a.status = ?`;
        params.push(status);
    }

    if (date) {
        query += ` AND a.appointment_date = ?`;
        params.push(date);
    }

    query += ` ORDER BY a.created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching appointments:', err);
            return res.status(500).json({ error: 'Failed to fetch appointments.' });
        }
        res.json(rows);
    });
};

/**
 * Update Appointment Status
 */
exports.updateStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
    }

    db.run(`UPDATE appointments SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update status.' });
        }
        res.json({ success: true, message: 'Status updated successfully.' });
    });
};
