const express = require('express');
const router = express.Router();
const {
  startQuizAttempt,
  getQuizQuestions,
  submitAnswer,
  submitQuizAttempt,
  getMyAttempts,
  getQuizAttempts,
  getAttemptResults
} = require('../controllers/quizAttemptController');
const { protect, authorize } = require('../middleware/auth');
const { validateSubmitAnswer } = require('../middleware/validation');

// @route   POST /api/quiz-attempts/:quizId/start
// @desc    Start quiz attempt
// @access  Private (Student only)
router.post('/:quizId/start', protect, authorize('student'), startQuizAttempt);

// @route   GET /api/quiz-attempts/:attemptId/questions
// @desc    Get quiz questions for attempt
// @access  Private (Student - own attempts only)
router.get('/:attemptId/questions', protect, authorize('student'), getQuizQuestions);

// @route   POST /api/quiz-attempts/:attemptId/answer
// @desc    Submit quiz answer
// @access  Private (Student - own attempts only)
router.post('/:attemptId/answer', protect, authorize('student'), validateSubmitAnswer, submitAnswer);

// @route   POST /api/quiz-attempts/:attemptId/submit
// @desc    Submit quiz attempt
// @access  Private (Student - own attempts only)
router.post('/:attemptId/submit', protect, authorize('student'), submitQuizAttempt);

// @route   GET /api/quiz-attempts/my-attempts
// @desc    Get student's quiz attempts
// @access  Private (Student only)
router.get('/my-attempts', protect, authorize('student'), getMyAttempts);

// @route   GET /api/quiz-attempts/quiz/:quizId/attempts
// @desc    Get all attempts for a quiz
// @access  Private (Faculty, Admin)
router.get('/quiz/:quizId/attempts', protect, authorize('faculty', 'admin'), getQuizAttempts);

// @route   GET /api/quiz-attempts/:attemptId/results
// @desc    Get quiz attempt results
// @access  Private (Student - own attempts, Faculty - own quiz attempts)
router.get('/:attemptId/results', protect, getAttemptResults);

module.exports = router;