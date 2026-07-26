const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

router.post('/login', adminController.login);
router.get('/stats', auth, adminController.getStats);
router.get('/appointments', auth, adminController.getAppointments);
router.patch('/appointments/:id/status', auth, adminController.updateStatus);

module.exports = router;
