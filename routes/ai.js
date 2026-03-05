const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/ai/chat
// @desc    Chat with AI Assistant (Faculty only)
// @access  Private
router.post('/chat', protect, authorize('faculty'), chatWithAI);

module.exports = router;