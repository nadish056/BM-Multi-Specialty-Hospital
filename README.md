# 🏥 BM Multi Speciality Hospital — Smart Appointment Booking System

> **A modern, full-stack hospital appointment management platform featuring AI-powered symptom analysis, OTP email verification, dynamic PDF booking slips, and an integrated staff administration portal.**

---

## 🌟 Key Features

- **📱 Dynamic Specialist Directory**: Browse 30+ specialists across 16 medical departments with live daily consultation slot availability.
- **✨ AI Symptom Refinement (Google Gemini)**: Patients can enter informal symptom descriptions and click **"Enhance with AI"** to convert them into structured medical summaries.
- **💬 AI Chief Medical Assistant Chatbot**: Interactive 24/7 AI health guide with live database integration for real-time doctor availability and department recommendations.
- **✉️ Email Verification via OTP**: Secure 6-digit OTP verification powered by Nodemailer to ensure valid appointment requests.
- **📄 Instant PDF Confirmation Slips**: Downloadable and automatically emailed PDF appointment slips featuring custom layout wrapping and official hospital branding.
- **🔐 Admin Staff Portal**: Secure JWT-authenticated dashboard (`/admin`) to view appointment metrics, filter patient records, export CSV reports, and manage booking statuses.
- **🎨 Glassmorphism & Claymorphism UI**: High-end luxury aesthetic with 3D organ icons, dark/light theme toggle, and smooth GSAP micro-interactions.
- **⚡ Fully Offline-Ready Assets**: All organ PNG icons (Microsoft Fluent UI 3D series) and doctor avatars are bundled locally for hackathons and offline demonstrations.

---

## 🛠️ Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, Custom Modern CSS (CSS Variables), GSAP 3.x |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite3 (`sqlite3`) |
| **AI Integration** | Google Gemini 2.0 / Flash AI APIs (`@google/genai`) |
| **Security & Auth** | JWT (`jsonwebtoken`), `bcrypt` password hashing, `express-rate-limit`, `helmet`, CORS |
| **Document & Email** | jsPDF (Client-side PDF), Nodemailer (SMTP OTP & Confirmation Slips) |

---

## 📁 Project Structure

```text
├── admin/                      # Admin Staff Portal (Dashboard, Login, Analytics)
│   ├── index.html              # Admin SPA markup
│   ├── admin.js                # Dashboard logic & API handlers
│   └── styles.css              # Admin portal styling
├── client/                     # Public Hospital Patient Portal
│   ├── assets/                 # Local 3D Organ PNGs & Doctor Avatars
│   │   ├── doctors/            # Deterministic specialist photos
│   │   └── organs/             # 3D organ PNG icons (Microsoft Fluent Series)
│   ├── index.html              # Main SPA container
│   ├── app.js                  # Booking flow, AI chat, PDF slip generator & state
│   └── styles.css              # Luxury theme system & responsive layout
├── server/                     # Express Backend Architecture
│   ├── controllers/            # Appointments, Admin & AI Controllers
│   ├── database/               # SQLite schema setup & automated seeders
│   ├── middleware/             # JWT auth & rate limiters
│   ├── routes/                 # Express API Endpoints (`/api/appointments`, `/api/admin`, `/api/ai`)
│   └── services/               # Nodemailer email notification service
├── .env.example                # Environment variables template
├── package.json                # Project manifest & scripts
├── README.md                   # Project documentation
└── run.bat                     # Quick launch script (Windows)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nadish056/BM-Multi-Specialty-Hospital.git
   cd BM-Multi-Specialty-Hospital
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Fill in your configuration details inside `.env`:
   ```env
   PORT=5000
   EMAIL_USER=your_gmail_address@gmail.com
   EMAIL_PASS=your_gmail_app_password
   GEMINI_API_KEY=your_google_gemini_api_key
   ADMIN_EMAIL=admin@hospital.com
   ADMIN_PASSWORD=your_secure_admin_password_12char
   SESSION_SECRET=your_random_session_secret
   JWT_SECRET=your_random_jwt_secret
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```

5. **Access the Application**:
   - **Patient Booking Portal**: `http://localhost:5000`
   - **Admin Staff Dashboard**: `http://localhost:5000/admin`

---

## 🎓 Educational & Hackathon Context

This project was engineered for a college hackathon and supervisor demonstration. It is built as a complete client-side SPA coupled with a Node/Express REST backend to demonstrate clean architecture, robust user experience, AI API integrations, and secure data pipelines.

---

## 📜 Asset Credits & Attributions

- **3D Organ Icons**: Sourced from [Microsoft Fluent UI Emoji Series](https://github.com/microsoft/fluentui-emoji) (MIT License).
- **Doctor Profile Images**: Unsplash Open License & UI Avatars.
