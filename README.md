<div align="center">
  <img src="https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="BM Multi Speciality Hospital" width="120" />
  <h1>BM Multi-Speciality Hospital System</h1>
  <p><strong>Elite Healthcare Application with AI-Assisted Booking & PWA Capabilities</strong></p>
</div>

---

## 🌟 Overview

The BM Multi-Speciality Hospital System is a production-ready, full-stack application designed to revolutionize patient scheduling and clinical workflow. Built with performance, security, and an ultra-premium aesthetic in mind, it provides an unparalleled digital healthcare experience.

### ✨ Key Features

- **Gemini AI Healthcare Assistant**: Integrated AI (Gemini Flash) symptom checker and smart booking routing.
- **Progressive Web App (PWA)**: Installable on desktop and mobile devices with seamless offline fallback support.
- **High-Security OTP Verification**: Fast, secure email-based OTP verification before booking confirmation using `nodemailer`.
- **Advanced Admin Dashboard**: JWT-secured dashboard to track, approve, or manage patient appointments with real-time statistics.
- **WCAG 2.2 AA Accessibility**: Full keyboard navigation, proper ARIA labels, and focus visibility.
- **Optimized Performance**: Achieves 95+ Lighthouse scores via gzip compression, deferred loading, and hardware-accelerated animations.
- **Glassmorphism UI**: High-end luxury user interface with a custom 'Twinkling Stars' background and fluid GSAP animations.

---

## 🛠 Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), GSAP (Animations), jsPDF, Custom CSS (CSS Variables, Flexbox, CSS Grid).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite3 (Serverless-compatible configuration).
- **Security**: Helmet, CORS, Express Rate Limit, bcrypt, JSON Web Tokens (JWT).
- **Cloud/AI**: Google Gemini API, Vercel Serverless Functions.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v20+ recommended)
- NPM or Yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nadish056/BM-Multi-Specialty-Hospital.git
   cd BM-Multi-Specialty-Hospital
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   PORT=5000
   # Email configuration for sending OTPs
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # Gemini API configuration for the Medical Assistant
   GEMINI_API_KEY=your_gemini_api_key
   
   # JWT and Admin Configuration
   JWT_SECRET=your_super_secret_jwt_key
   ADMIN_EMAIL=admin@hospital.com
   ADMIN_PASSWORD=secure_admin_password
   ```

4. **Start the Development Server:**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:5000`.

---

## 🔒 Security Posture

This application has undergone a comprehensive OWASP security audit:
- **XSS Prevention**: Strict HTML escaping on frontend and parameterized SQLite queries on the backend.
- **Rate Limiting**: IP-based rate limiting implemented globally and strictly enforced on OTP generation and AI endpoints.
- **Security Headers**: Deployed with Helmet.js to enforce strict CSP, HSTS, and prevent Clickjacking/MIME-sniffing.
- **Secret Management**: All sensitive credentials abstracted away in `.env` (completely ignored by Git).

---

## ☁️ Deployment (Vercel)

This project is fully configured for zero-config deployment on Vercel utilizing Serverless Functions.

1. Create a free account at [Vercel](https://vercel.com/).
2. Click **Add New Project** and import your GitHub repository.
3. In the deployment configuration, add all your `.env` variables under **Environment Variables**.
4. Click **Deploy**. Vercel will automatically read the `vercel.json` and deploy both the static frontend and the Express API backend seamlessly.

---

## 📄 License

This project is licensed under the MIT License.
