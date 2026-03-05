const express = require('express');
const router = express.Router();
const {
  createCourseRequest,
  getMyRequests,
  getFacultyRequests,
  getRequestStats,
  approveCourseRequest,
  rejectCourseRequest,
  getRequestStatus
} = require('../controllers/courseRequestController');
const { protect, authorize } = require('../middleware/auth');

// Student routes
router.post('/', protect, authorize('student'), createCourseRequest);
router.get('/my-requests', protect, authorize('student'), getMyRequests);
router.get('/status/:courseId', protect, authorize('student'), getRequestStatus);

// Faculty routes
router.get('/faculty-requests', protect, authorize('faculty'), getFacultyRequests);
router.get('/stats', protect, authorize('faculty'), getRequestStats);
router.patch('/:id/approve', protect, authorize('faculty'), approveCourseRequest);
router.patch('/:id/reject', protect, authorize('faculty'), rejectCourseRequest);

module.exports = router;
