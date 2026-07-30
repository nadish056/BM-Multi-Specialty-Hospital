const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const compression = require('compression'); // For gzip
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('./database/init');

const app = express();

// Trust proxy for reverse proxies (Render, Heroku, Vercel)
app.set('trust proxy', 1);

// Gzip Compression for Performance
app.use(compression());

// Security Middlewares (OWASP) - Helmet removed for local dev/student project to fix CSP issues
app.use(cors({
    origin: '*', // You can restrict this to your specific Vercel domain in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON and URL-encoded bodies with limits (prevent large payloads)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

// Serve static files with Cache-Control headers
const staticOptions = {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true
};
app.use(express.static(path.join(__dirname, '../client'), staticOptions));
app.use('/admin', express.static(path.join(__dirname, '../admin'), staticOptions));

// API Routes
const apiRouter = express.Router();
apiRouter.use('/appointments', require('./routes/appointmentRoutes'));
apiRouter.use('/admin', require('./routes/adminRoutes'));
apiRouter.use('/ai', require('./routes/aiRoutes'));

app.use('/api', apiRouter);

// Global API Error Handler
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err.message);
    res.status(err.status || 500).json({ error: 'Internal Server Error' });
});

// SPA Fallback Routing
app.use('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Global Application Error Handler
app.use((err, req, res, next) => {
    console.error('App Error:', err.message);
    res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 5000;

// Start server if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel Serverless Functions
module.exports = app;
