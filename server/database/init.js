const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Use /tmp directory in Vercel (read-only filesystem workaround)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const dbPath = isVercel 
    ? path.join('/tmp', 'hospital.db')
    : path.join(__dirname, '../../database/hospital.db');

// Ensure database directory exists locally
const dbDir = path.dirname(dbPath);
if (!isVercel && !fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
    } catch (err) {
        console.warn('Could not create database directory, it might already exist or is read-only.');
    }
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Doctors Table
        db.run(`
            CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                designation TEXT,
                qualification TEXT,
                avatar TEXT,
                slots TEXT,
                available_today INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Patients Table
        db.run(`
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                gender TEXT,
                age INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Ensure gender & age columns exist in existing database
        db.run(`ALTER TABLE patients ADD COLUMN gender TEXT`, () => {});
        db.run(`ALTER TABLE patients ADD COLUMN age INTEGER`, () => {});

        // Appointments Table
        db.run(`
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id TEXT UNIQUE NOT NULL,
                patient_id INTEGER,
                doctor_id INTEGER,
                department TEXT,
                appointment_date DATE,
                appointment_time TIME,
                reason TEXT,
                status TEXT DEFAULT 'Pending OTP',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id),
                FOREIGN KEY (doctor_id) REFERENCES doctors(id)
            )
        `);

        // Migration: Ensure reason column exists in existing database
        db.run(`ALTER TABLE appointments ADD COLUMN reason TEXT`, () => {});

        // OTP Table
        db.run(`
            CREATE TABLE IF NOT EXISTS otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                retries INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin Table
        db.run(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // AI Chat Logs Table
        db.run(`
            CREATE TABLE IF NOT EXISTS ai_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_session TEXT,
                message TEXT,
                response TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed Admin & Doctors
        seedAdmin();
        seedDoctors();
    });
}

async function seedAdmin() {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hospital.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : null;

    if (!adminPassword) {
        console.warn('WARN: ADMIN_PASSWORD environment variable is not defined. Skipping default admin seed.');
        return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    db.run(`DELETE FROM admins WHERE email = ? OR email = 'admin@hospital.com' OR email = 'nadish'`, [adminEmail], () => {
        db.run(`INSERT INTO admins (email, password) VALUES (?, ?)`, [adminEmail, hashedPassword], (err) => {
            if (!err) console.log(`Default admin user (${adminEmail}) seeded successfully.`);
        });
    });
}

function seedDoctors() {
    const fullDoctorsList = [
        // CARDIOLOGY
        { name: "Dr. Ramesh Kumar", designation: "Senior Cardiologist", department: "Cardiology", qualification: "MBBS, MD, DM (Cardiology) – 22 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "10:30 AM", "02:00 PM"]), available_today: 1 },
        { name: "Dr. Meera Krishnan", designation: "Interventional Cardiologist", department: "Cardiology", qualification: "MBBS, MD, DM – 18 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["11:00 AM", "03:30 PM"]), available_today: 1 },
        { name: "Dr. Aravind Sridhar", designation: "Electrophysiologist", department: "Cardiology", qualification: "MBBS, DM, FHRS – 14 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:30 AM", "04:00 PM"]), available_today: 1 },
        { name: "Dr. Brindha Suresh", designation: "Cardiac Surgeon", department: "Cardiology", qualification: "MBBS, MS, MCh (CTVS) – 16 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:00 AM", "02:30 PM"]), available_today: 0 },

        // NEUROLOGY
        { name: "Dr. Suresh Babu", designation: "Neurologist", department: "Neurology", qualification: "MBBS, MD (Neurology) – 15 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:30 AM", "11:30 AM", "04:00 PM"]), available_today: 1 },
        { name: "Dr. Deepa Iyer", designation: "Stroke Specialist", department: "Neurology", qualification: "MBBS, MD, DM – 12 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:00 AM", "02:30 PM"]), available_today: 0 },
        { name: "Dr. Kiran Sundar", designation: "Neuro Surgeon", department: "Neurology", qualification: "MBBS, MS, MCh – 19 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["08:30 AM", "01:00 PM"]), available_today: 1 },

        // ORTHOPAEDICS
        { name: "Dr. Priya Nair", designation: "Orthopaedic Surgeon", department: "Orthopaedics", qualification: "MBBS, MS (Ortho), FRCS – 20 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:00 AM", "02:30 PM", "05:00 PM"]), available_today: 1 },
        { name: "Dr. Mohan Das", designation: "Joint Replacement Surgeon", department: "Orthopaedics", qualification: "MBBS, MS, Fellowship – 17 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "03:00 PM"]), available_today: 1 },
        { name: "Dr. Subha Rajan", designation: "Spine Surgeon", department: "Orthopaedics", qualification: "MBBS, MS, DNB – 13 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["11:00 AM", "04:30 PM"]), available_today: 0 },

        // PAEDIATRICS
        { name: "Dr. Anand Venkat", designation: "Paediatric Specialist", department: "Paediatrics", qualification: "MBBS, MD (Paediatrics) – 12 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "11:00 AM", "03:00 PM"]), available_today: 1 },
        { name: "Dr. Yamini Murali", designation: "Neonatologist", department: "Paediatrics", qualification: "MBBS, MD, Fellowship – 10 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:30 AM", "02:00 PM"]), available_today: 1 },
        { name: "Dr. Rahul Krishnan", designation: "Paediatric Surgeon", department: "Paediatrics", qualification: "MBBS, MS, MCh – 14 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:30 AM", "04:00 PM"]), available_today: 1 },

        // GYNAECOLOGY
        { name: "Dr. Lakshmi Devi", designation: "Gynaecologist & Obstetrician", department: "Gynaecology", qualification: "MBBS, MS (OBG), FRCOG – 17 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:30 AM", "02:00 PM", "04:30 PM"]), available_today: 0 },
        { name: "Dr. Sangeetha Raj", designation: "Infertility Specialist", department: "Gynaecology", qualification: "MBBS, MS, DGO – 14 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["09:30 AM", "03:30 PM"]), available_today: 1 },
        { name: "Dr. Nithya Bharath", designation: "Maternal-Fetal Specialist", department: "Gynaecology", qualification: "MBBS, MS, FMAS – 11 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["11:00 AM", "04:00 PM"]), available_today: 1 },

        // ONCOLOGY
        { name: "Dr. Karthik Raj", designation: "Medical Oncologist", department: "Oncology", qualification: "MBBS, MD, DM – 14 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "01:00 PM"]), available_today: 1 },
        { name: "Dr. Nalini Sekar", designation: "Surgical Oncologist", department: "Oncology", qualification: "MBBS, MS, MCh – 16 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:00 AM", "03:00 PM"]), available_today: 1 },

        // OPHTHALMOLOGY
        { name: "Dr. Ranjitha Selvam", designation: "Ophthalmologist", department: "Ophthalmology", qualification: "MBBS, MS (Ophthalmology) – 11 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["09:30 AM", "11:00 AM", "04:00 PM"]), available_today: 1 },
        { name: "Dr. Ganesh Pillai", designation: "Retina Specialist", department: "Ophthalmology", qualification: "MBBS, MS, FRCS – 13 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["10:00 AM", "02:30 PM"]), available_today: 1 },

        // DERMATOLOGY
        { name: "Dr. Shalini Mohan", designation: "Dermatologist", department: "Dermatology", qualification: "MBBS, MD (Dermatology) – 10 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["11:30 AM", "03:00 PM", "05:00 PM"]), available_today: 1 },
        { name: "Dr. Vivek Anand", designation: "Cosmetologist", department: "Dermatology", qualification: "MBBS, MD, DNB – 9 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "02:00 PM"]), available_today: 1 },

        // GASTROENTEROLOGY
        { name: "Dr. Vijay Prasad", designation: "Gastroenterologist", department: "Gastroenterology", qualification: "MBBS, MD, DM – 16 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["10:00 AM", "02:30 PM"]), available_today: 1 },
        { name: "Dr. Usha Rani", designation: "Hepatologist", department: "Gastroenterology", qualification: "MBBS, MD, DM – 12 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["09:30 AM", "03:30 PM"]), available_today: 0 },

        // PULMONOLOGY
        { name: "Dr. Harish Govind", designation: "Pulmonologist", department: "Pulmonology", qualification: "MBBS, MD (Pulmonology) – 14 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:30 AM", "03:00 PM"]), available_today: 1 },
        { name: "Dr. Lavanya Mohan", designation: "Sleep & Respiratory Specialist", department: "Pulmonology", qualification: "MBBS, MD, FCCP – 10 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["11:00 AM", "04:30 PM"]), available_today: 1 },

        // ENT
        { name: "Dr. Prakash Nathan", designation: "ENT Surgeon", department: "ENT", qualification: "MBBS, MS (ENT) – 13 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "11:30 AM", "04:00 PM"]), available_today: 1 },
        { name: "Dr. Meena Balan", designation: "Audiologist & ENT", department: "ENT", qualification: "MBBS, MS, DORL – 11 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["10:00 AM", "02:00 PM"]), available_today: 1 },

        // UROLOGY
        { name: "Dr. Senthil Kumar", designation: "Urologist", department: "Urology", qualification: "MBBS, MS, MCh (Urology) – 15 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["10:00 AM", "02:30 PM", "05:00 PM"]), available_today: 1 },
        { name: "Dr. Arun Bose", designation: "Uro-Oncologist", department: "Urology", qualification: "MBBS, MS, MCh – 12 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "01:00 PM"]), available_today: 0 },

        // NEPHROLOGY
        { name: "Dr. Kavitha Menon", designation: "Nephrologist", department: "Nephrology", qualification: "MBBS, MD, DM – 12 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["09:00 AM", "01:00 PM"]), available_today: 1 },

        // ENDOCRINOLOGY
        { name: "Dr. Rajiv Thomas", designation: "Endocrinologist & Diabetologist", department: "Endocrinology", qualification: "MBBS, MD, DM – 11 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["10:30 AM", "03:30 PM"]), available_today: 1 },

        // PSYCHIATRY
        { name: "Dr. Pooja Mathur", designation: "Psychiatrist", department: "Psychiatry", qualification: "MBBS, MD (Psychiatry) – 10 yrs", avatar: "👩‍⚕️", slots: JSON.stringify(["11:00 AM", "04:00 PM"]), available_today: 1 },
        { name: "Dr. Sanjay Rao", designation: "Child & Adolescent Psychiatrist", department: "Psychiatry", qualification: "MBBS, MD, DPM – 9 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["10:00 AM", "03:00 PM"]), available_today: 1 },

        // RHEUMATOLOGY
        { name: "Dr. Sundar Rajan", designation: "Rheumatologist", department: "Rheumatology", qualification: "MBBS, MD, DM – 13 yrs", avatar: "👨‍⚕️", slots: JSON.stringify(["09:00 AM", "02:00 PM"]), available_today: 1 }
    ];

    db.get(`SELECT COUNT(*) as count FROM doctors`, (err, row) => {
        if (err) {
            console.error('Error checking doctors count:', err);
            return;
        }
        if (row.count === 0) {
            const stmt = db.prepare(`INSERT INTO doctors (name, designation, department, qualification, avatar, slots, available_today) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            fullDoctorsList.forEach(doc => {
                stmt.run(doc.name, doc.designation, doc.department, doc.qualification, doc.avatar, doc.slots, doc.available_today);
            });
            stmt.finalize(() => console.log('Successfully seeded 35 doctors from nadish.html into database.'));
        } else {
            console.log(`Doctors table already contains ${row.count} records. Skipping seed.`);
        }
    });
}

module.exports = db;
