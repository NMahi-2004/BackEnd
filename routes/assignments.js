const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createAssignment,
  getFacultyAssignments,
  getStudentAssignments,
  getAssignmentById,
  addQuestions,
  publishAssignment,
  getAssignmentSubmissions,
  submitAssignment,
  evaluateSubmission,
  publishResults,
  getMySubmissions
} = require('../controllers/assignmentController');
const { protect, restrictTo } = require('../middleware/auth');
const {
  validateCreateAssignment,
  validateAssignmentQuestions,
  validateAssignmentSubmission,
  validateAssignmentEvaluation
} = require('../middleware/validation');

// Configure multer for assignment file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/assignments/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'assignment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept pdf, doc, docx, txt, zip files
  const allowedTypes = /pdf|doc|docx|txt|zip/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, TXT, and ZIP files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// @route   POST /api/assignments
// @desc    Create new assignment with optional file
// @access  Private (Faculty only)
router.post('/', protect, restrictTo('faculty'), upload.single('assignmentFile'), validateCreateAssignment, createAssignment);

// @route   GET /api/assignments/faculty
// @desc    Get all assignments for faculty
// @access  Private (Faculty only)
router.get('/faculty', protect, restrictTo('faculty'), getFacultyAssignments);

// @route   GET /api/assignments/student
// @desc    Get assignments for students
// @access  Private (Student only)
router.get('/student', protect, restrictTo('student'), getStudentAssignments);

// @route   GET /api/assignments/my-submissions
// @desc    Get student's own submissions
// @access  Private (Student only)
router.get('/my-submissions', protect, restrictTo('student'), getMySubmissions);

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private
router.get('/:id', protect, getAssignmentById);

// @route   POST /api/assignments/:id/questions
// @desc    Add questions to assignment
// @access  Private (Faculty only)
router.post('/:id/questions', protect, restrictTo('faculty'), validateAssignmentQuestions, addQuestions);

// @route   PUT /api/assignments/:id/publish
// @desc    Publish assignment
// @access  Private (Faculty only)
router.put('/:id/publish', protect, restrictTo('faculty'), publishAssignment);

// @route   GET /api/assignments/:id/submissions
// @desc    Get assignment submissions
// @access  Private (Faculty only)
router.get('/:id/submissions', protect, restrictTo('faculty'), getAssignmentSubmissions);

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment
// @access  Private (Student only)
router.post('/:id/submit', protect, restrictTo('student'), upload.single('file'), validateAssignmentSubmission, submitAssignment);

// @route   PUT /api/assignments/submissions/:submissionId/evaluate
// @desc    Evaluate submission
// @access  Private (Faculty only)
router.put('/submissions/:submissionId/evaluate', protect, restrictTo('faculty'), validateAssignmentEvaluation, evaluateSubmission);

// @route   PUT /api/assignments/:id/publish-results
// @desc    Publish results
// @access  Private (Faculty only)
router.put('/:id/publish-results', protect, restrictTo('faculty'), publishResults);

module.exports = router;