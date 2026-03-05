const User = require('../models/User');

// Note: createUser function moved to authController.js to avoid duplication
// This controller now focuses on user management operations only

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    // Build filter object
    let filter = { role: { $ne: 'admin' } };
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (Admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        username: user.username,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

// @desc    Reset user password (Admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private (Admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new temporary password
    const newPassword = 'TempPass123!';
    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        newPassword: newPassword // In real app, this would be sent via email
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while resetting password'
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser
};