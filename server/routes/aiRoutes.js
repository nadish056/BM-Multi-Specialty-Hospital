const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/chat', aiController.chat);
router.post('/enhance-symptoms', aiController.enhanceSymptoms);

module.exports = router;
