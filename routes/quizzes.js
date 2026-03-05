const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizStatistics
} = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateCreateQuiz,
  validateUpdateQuiz
} = require('../middleware/validation');

// @route   POST /api/quizzes
// @desc    Create new quiz
// @access  Private (Faculty only)
router.post('/', protect, authorize('faculty'), validateCreateQuiz, createQuiz);

// @route   GET /api/quizzes
// @desc    Get all quizzes with filtering
// @access  Private (All roles)
router.get('/', protect, getQuizzes);

// @route   GET /api/quizzes/:id
// @desc    Get quiz by ID
// @access  Private (All roles with restrictions)
router.get('/:id', protect, getQuizById);

// @route   PUT /api/quizzes/:id
// @desc    Update quiz
// @access  Private (Faculty - own quizzes only)
router.put('/:id', protect, authorize('faculty'), validateUpdateQuiz, updateQuiz);

// @route   DELETE /api/quizzes/:id
// @desc    Delete quiz
// @access  Private (Faculty - own quizzes only)
router.delete('/:id', protect, authorize('faculty'), deleteQuiz);

// @route   GET /api/quizzes/:id/statistics
// @desc    Get quiz statistics
// @access  Private (Faculty - own quizzes, Admin - all)
router.get('/:id/statistics', protect, authorize('faculty', 'admin'), getQuizStatistics);

module.exports = router;