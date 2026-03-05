const express = require('express');
const router = express.Router();
const {
  adminLogin,
  createUser,
  login,
  getAdminStats,
  getProfile,
  changePassword,
  logout
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Admin routes - NO MIDDLEWARE ON LOGIN
console.log('🔧 Registering admin login route: POST /admin/login');
router.post('/admin/login', adminLogin);
console.log('🔧 Registering admin create-user route: POST /admin/create-user');
router.post('/admin/create-user', protect, authorize('admin'), createUser);
console.log('🔧 Registering admin stats route: GET /admin/stats');
router.get('/admin/stats', protect, authorize('admin'), getAdminStats);

// Faculty/Student routes - NO MIDDLEWARE ON LOGIN
router.post('/login', (req, res, next) => {
  console.log('🎯 LOGIN ROUTE HIT - Middleware wrapper');
  console.log('📋 Request body:', req.body);
  login(req, res, next);
});

// Common protected routes
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;