const express = require('express');
const router = express.Router();
const {
  getActivityLogs,
  getActivityStats,
  clearOldLogs
} = require('../controllers/activityLogController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Get activity logs with filters
router.get('/', getActivityLogs);

// Get activity statistics
router.get('/stats', getActivityStats);

// Clear old logs
router.delete('/clear', clearOldLogs);

module.exports = router;
