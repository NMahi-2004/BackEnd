const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser
} = require('../controllers/userController');
const { createUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateCreateUser,
  validateUpdateUser
} = require('../middleware/validation');

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), validateCreateUser, createUser);

// @route   GET /api/users
// @desc    Get all users with filtering
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), getUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/:id', protect, authorize('admin'), getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), validateUpdateUser, updateUser);

// @route   PATCH /api/users/:id/toggle-status
// @desc    Toggle user status (enable/disable)
// @access  Private (Admin only)
router.patch('/:id/toggle-status', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const User = require('../models/User');
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password
// @access  Private (Admin only)
router.put('/:id/reset-password', protect, authorize('admin'), resetUserPassword);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;