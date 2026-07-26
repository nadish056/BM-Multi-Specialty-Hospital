const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.post('/request-otp', appointmentController.requestOTP);
router.post('/verify-otp', appointmentController.verifyOTPAndBook);
router.get('/doctors', appointmentController.getDoctors);
router.get('/booked-slots', appointmentController.getBookedSlots);

module.exports = router;
