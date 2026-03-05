const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔍 Auth middleware - Token received');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Check for secure admin token FIRST (bypass for development)
    if (token === 'admin-secure-token-2024') {
      console.log('✅ Admin secure token matched');
      // Create admin user for secure access with proper ObjectId
      const mongoose = require('mongoose');
      req.user = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'admin',
        name: 'System Administrator',
        role: 'admin',
        isActive: true
      };
      return next();
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      console.log('✅ Token decoded successfully:', decoded.username);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('❌ User not found for token:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists.'
        });
      }

      if (!user.isActive) {
        console.log('❌ User account is deactivated:', user.username);
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated.'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      console.error('❌ JWT error name:', jwtError.name);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        error: jwtError.message
      });
    }
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication middleware.'
    });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Restrict to specific roles (alias for authorize)
const restrictTo = (...roles) => {
  return authorize(...roles);
};

module.exports = {
  protect,
  authorize,
  restrictTo
};