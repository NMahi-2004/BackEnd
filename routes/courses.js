const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createCourse,
  getMyCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAvailableCourses,
  getCourseStats,
  getEnrolledCourses
} = require('../controllers/courseController');
const {
  uploadCourseMaterial,
  getCourseMaterials,
  deleteCourseMaterial,
  downloadCourseMaterial
} = require('../controllers/courseMaterialController');
const {
  getCourseAssignments
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/course-materials/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// IMPORTANT: Specific routes MUST come before parameterized routes
// Student routes (must be before /:id)
router.get('/available', protect, authorize('student'), getAvailableCourses);
router.get('/enrolled', protect, authorize('student'), getEnrolledCourses);

// Faculty routes
router.post('/', protect, authorize('faculty'), createCourse);
router.get('/my-courses', protect, authorize('faculty'), getMyCourses);
router.get('/stats', protect, authorize('faculty'), getCourseStats);

// Course materials routes (must be before /:id)
router.post('/:courseId/materials', protect, authorize('faculty'), upload.single('file'), uploadCourseMaterial);
router.get('/:courseId/materials', protect, authorize('faculty', 'student'), getCourseMaterials);
router.get('/:courseId/materials/:materialId/download', protect, authorize('faculty', 'student'), downloadCourseMaterial);
router.delete('/:courseId/materials/:materialId', protect, authorize('faculty'), deleteCourseMaterial);

// Course assignments routes (must be before /:id)
router.get('/:courseId/assignments', protect, authorize('faculty', 'student'), getCourseAssignments);

// Parameterized routes MUST come last
router.get('/:id', protect, authorize('faculty'), getCourseById);
router.put('/:id', protect, authorize('faculty'), updateCourse);
router.delete('/:id', protect, authorize('faculty'), deleteCourse);

module.exports = router;