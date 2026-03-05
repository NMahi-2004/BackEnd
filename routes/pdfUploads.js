const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const pdfUploadController = require('../controllers/pdfUploadController');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// All routes require authentication and student role
router.use(protect);
router.use(authorize('student'));

// Upload PDF
router.post('/', upload.single('file'), pdfUploadController.uploadPdf);

// Get all uploads for current user
router.get('/', pdfUploadController.getMyUploads);

// Get single upload details
router.get('/:id', pdfUploadController.getUploadById);

// Get quiz for an upload
router.get('/:id/quiz', pdfUploadController.getQuiz);

// Submit quiz answers
router.post('/:id/submit-quiz', pdfUploadController.submitQuiz);

// Get progress for an upload
router.get('/:id/progress', pdfUploadController.getProgress);

// Delete upload
router.delete('/:id', pdfUploadController.deleteUpload);

module.exports = router;
