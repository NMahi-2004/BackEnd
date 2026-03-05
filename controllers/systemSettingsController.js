const SystemSettings = require('../models/SystemSettings');

// @desc    Get current system settings
// @route   GET /api/system/settings
// @access  Private (Admin only)
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching system settings'
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/system/settings
// @access  Private (Admin only)
const updateSystemSettings = async (req, res) => {
  try {
    const { academicYear, departments, semesters } = req.body;
    
    // Validate required fields
    if (!academicYear || !departments || !semesters) {
      return res.status(400).json({
        success: false,
        message: 'Academic year, departments, and semesters are required'
      });
    }
    
    // Validate academic year format
    if (!/^\d{4}[-–]\d{4}$/.test(academicYear)) {
      return res.status(400).json({
        success: false,
        message: 'Academic year must be in format YYYY-YY (e.g., 2026-27)'
      });
    }
    
    // Validate departments
    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one department is required'
      });
    }
    
    // Validate semesters
    if (!Array.isArray(semesters) || semesters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one semester is required'
      });
    }
    
    // Validate semester numbers
    const invalidSemesters = semesters.filter(sem => 
      !Number.isInteger(sem) || sem < 1 || sem > 12
    );
    
    if (invalidSemesters.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Semesters must be integers between 1 and 12'
      });
    }
    
    // Update settings
    const newSettings = {
      academicYear: academicYear.trim(),
      departments: departments.map(dept => dept.trim().toUpperCase()),
      semesters: [...new Set(semesters)].sort((a, b) => a - b) // Remove duplicates and sort
    };
    
    const updatedSettings = await SystemSettings.updateSettings(newSettings, req.user.id);
    
    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: updatedSettings
    });
    
  } catch (error) {
    console.error('Update system settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating system settings'
    });
  }
};

// @desc    Get departments for dropdowns
// @route   GET /api/system/departments
// @access  Private (Faculty and Student)
const getDepartments = async (req, res) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    return res.status(200).json({
      success: true,
      data: settings.departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching departments'
    });
  }
};

// @desc    Get semesters for dropdowns
// @route   GET /api/system/semesters
// @access  Private (Faculty and Student)
const getSemesters = async (req, res) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    return res.status(200).json({
      success: true,
      data: settings.semesters
    });
  } catch (error) {
    console.error('Get semesters error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching semesters'
    });
  }
};

// @desc    Get current academic year
// @route   GET /api/system/academic-year
// @access  Private (Faculty and Student)
const getAcademicYear = async (req, res) => {
  try {
    const settings = await SystemSettings.getCurrentSettings();
    
    return res.status(200).json({
      success: true,
      data: settings.academicYear
    });
  } catch (error) {
    console.error('Get academic year error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching academic year'
    });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  getDepartments,
  getSemesters,
  getAcademicYear
};