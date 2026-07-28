const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('./database/init');

const app = express();

// Trust proxy for reverse proxies (Render, Heroku, Nginx)
app.set('trust proxy', true);

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false // disabled for simple setup with local static files
}));
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // 150 requests per IP per 15 mins
    message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api', globalLimiter);

// Specific Rate Limiter for AI endpoints (protect Gemini API quota)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25, // 25 AI calls per IP per 15 mins
    message: { error: 'AI rate limit exceeded. Please wait a few minutes before asking AI again.' }
});
app.use('/api/ai', aiLimiter);

// Specific Rate Limiter for OTP emails (prevent email spam)
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 OTP requests per IP per 15 mins
    message: { error: 'Too many OTP requests. Please wait before requesting another OTP.' }
});
app.use('/api/appointments/request-otp', otpLimiter);

// Serve static files (Frontend)
app.use(express.static(path.join(__dirname, '../client')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// API Routes - standard mounting
const apiRouter = express.Router();
apiRouter.use('/appointments', require('./routes/appointmentRoutes'));
apiRouter.use('/admin', require('./routes/adminRoutes'));
apiRouter.use('/ai', require('./routes/aiRoutes'));

app.use('/api', apiRouter);
// Mount on Netlify's expected path for serverless functions
app.use('/.netlify/functions/api', apiRouter);

// Fallback for SPA routing
app.use('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Catch-all route for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const PORT = process.env.PORT || 5000;

// Start server if run directly (not via serverless)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Netlify serverless wrapper
module.exports = app;
