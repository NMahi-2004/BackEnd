const express = require('express');
const router = express.Router();
const {
  createFacultyRequest,
  getMyRequests,
  getStudentRequests,
  approveRequest,
  rejectRequest,
  getAvailableFaculty,
  getRequestStats
} = require('../controllers/facultyRequestController');
const { protect, authorize } = require('../middleware/auth');

// Student routes
router.post('/', protect, authorize('student'), createFacultyRequest);
router.get('/my-requests', protect, authorize('student'), getMyRequests);
router.get('/available-faculty', protect, authorize('student'), getAvailableFaculty);

// Faculty routes
router.get('/student-requests', protect, authorize('faculty'), getStudentRequests);
router.get('/stats', protect, authorize('faculty'), getRequestStats);
router.put('/:id/approve', protect, authorize('faculty'), approveRequest);
router.put('/:id/reject', protect, authorize('faculty'), rejectRequest);

module.exports = router;