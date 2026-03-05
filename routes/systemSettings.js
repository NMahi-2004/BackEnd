const express = require('express');
const router = express.Router();
const {
  getSystemSettings,
  updateSystemSettings,
  getDepartments,
  getSemesters,
  getAcademicYear
} = require('../controllers/systemSettingsController');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/system/settings
// @desc    Get current system settings
// @access  Private (Admin only)
router.get('/settings', protect, authorize('admin'), getSystemSettings);

// @route   PUT /api/system/settings
// @desc    Update system settings
// @access  Private (Admin only)
router.put('/settings', protect, authorize('admin'), updateSystemSettings);

// @route   GET /api/system/departments
// @desc    Get departments for dropdowns
// @access  Private (Faculty and Student)
router.get('/departments', protect, authorize('faculty', 'student'), getDepartments);

// @route   GET /api/system/semesters
// @desc    Get semesters for dropdowns
// @access  Private (Faculty and Student)
router.get('/semesters', protect, authorize('faculty', 'student'), getSemesters);

// @route   GET /api/system/academic-year
// @desc    Get current academic year
// @access  Private (Faculty and Student)
router.get('/academic-year', protect, authorize('faculty', 'student'), getAcademicYear);

module.exports = router;