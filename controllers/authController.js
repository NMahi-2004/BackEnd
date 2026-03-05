const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// @desc    Admin login (Owner only)
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  console.log('🔐 Admin login attempt');
  
  try {
    // MANDATORY: Check database connection state BEFORE any database operations
    const dbState = mongoose.connection.readyState;
    console.log('🔍 Database connection state:', dbState);
    
    if (dbState !== 1) {
      console.log('❌ Database not connected, readyState:', dbState);
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please try again later.'
      });
    }
    
    const { username, password } = req.body;
    console.log('🔍 Extracted credentials - Username:', username, 'Password exists:', !!password);
    
    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    console.log('🔍 Searching for admin user in database...');
    // Find admin user - only execute if database is connected
    const admin = await User.findOne({ 
      username: username,
      role: 'admin',
      isActive: true 
    });

    console.log('📊 Database query result:', admin ? `Admin found: ${admin.username}` : 'Admin not found');

    if (!admin) {
      console.log('❌ Admin not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    console.log('🔐 Verifying password...');
    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    console.log('🔐 Password verification result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid admin password');
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Verify role is admin
    if (admin.role !== 'admin') {
      console.log('❌ User is not admin, role:', admin.role);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    console.log('✅ Password verified successfully');

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    console.log('🎫 Generating JWT token...');
    // Generate token
    const token = generateToken({
      id: admin._id,
      username: admin.username,
      role: admin.role
    });
    console.log('✅ Token generated successfully');

    console.log('✅ Admin login successful');

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: admin.role
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin login error - Exception caught:', error.message);
    console.error('❌ Admin login error - Stack trace:', error.stack);
    
    // Handle specific MongoDB timeout errors
    if (error.message.includes('buffering timed out') || error.message.includes('timeout')) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please try again later.'
      });
    }
    
    // Handle MongoDB connection errors
    if (error.message.includes('connection') || error.message.includes('ENOTFOUND')) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable. Please try again later.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error during admin login'
    });
  }
};

// @desc    Create Faculty/Student account (Admin only)
// @route   POST /api/auth/admin/create-user
// @access  Private (Admin only)
const createUser = async (req, res) => {
  console.log('👥 Admin creating user');
  console.log('📋 Request body received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { name, email, phoneNumber, username, password, role } = req.body;
    let { department, academicYear, semester } = req.body;
    
    // Validate required fields
    if (!name || !email || !phoneNumber || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone number, username, password, and role are required'
      });
    }

    // Validate role
    if (!['faculty', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be faculty or student'
      });
    }

    // Get system settings for defaults if not provided
    if (!department || !academicYear) {
      const SystemSettings = require('../models/SystemSettings');
      const settings = await SystemSettings.findOne({ isActive: true });
      
      if (settings) {
        department = department || settings.departments[0]; // Use first department as default
        academicYear = academicYear || settings.academicYear;
      } else {
        // Fallback defaults
        department = department || 'CSE';
        academicYear = academicYear || '2026-27';
      }
    }

    // For students, ensure semester is provided
    if (role === 'student' && !semester) {
      semester = 1; // Default to semester 1
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create user object with all required fields
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      username: username.trim(),
      password: password,
      role: role,
      department: department,
      academicYear: academicYear,
      createdBy: req.user.id
    };

    // Add semester for students
    if (role === 'student') {
      userData.semester = parseInt(semester);
    }

    console.log('✅ Final user data to save:', JSON.stringify(userData, null, 2));

    const user = new User(userData);
    await user.save();

    console.log('✅ User created successfully:', username);

    // Log user creation activity
    await logger.logUserCreated(req.user, user, req);

    return res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('User creation error:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: error.message
      });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error during user creation'
    });
  }
};

// @desc    Faculty/Student login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  // IMMEDIATE logging before anything else
  process.stdout.write('🚀 LOGIN CALLED\n');
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    const user = await User.findOne({ 
      username: username,
      role: { $in: ['faculty', 'student'] },
      isActive: true 
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role
    });
    
    // Log successful login (non-blocking)
    logger.logLogin(user, req, 'success').catch(err => {
      console.error('⚠️ Failed to log activity:', err.message);
    });
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error.message);
    console.error('❌ STACK:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      timestamp: new Date().toISOString(),
      errorDetails: error.message,
      errorStack: error.stack
    });
  }
};

// @desc    Get admin dashboard statistics
// @route   GET /api/auth/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res) => {
  try {
    const userStats = await User.getUserStats();
    
    return res.status(200).json({
      success: true,
      data: userStats
    });
  } catch (error) {
    console.error('Get admin stats error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  console.log('🔐 Change password request');
  
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If currentPassword is provided, verify it
    if (currentPassword) {
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log('✅ Password changed successfully for user:', user.username);

    // Log password change activity
    await logger.logPasswordChange(user, req).catch(err => {
      console.error('⚠️ Failed to log activity:', err.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

module.exports = {
  adminLogin,
  createUser,
  login,
  getAdminStats,
  getProfile,
  changePassword,
  logout
};