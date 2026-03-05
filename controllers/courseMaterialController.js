const CourseMaterial = require('../models/CourseMaterial');
const Course = require('../models/Course');
const path = require('path');
const fs = require('fs').promises;

// @desc    Upload course material (Faculty)
// @route   POST /api/courses/:courseId/materials
// @access  Private (Faculty only)
const uploadCourseMaterial = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;
    const facultyId = req.user.id;

    console.log('📤 ========================================');
    console.log('📤 UPLOADING COURSE MATERIAL');
    console.log('📤 Course ID:', courseId);
    console.log('📤 Faculty ID:', facultyId);
    console.log('📤 Title:', title);

    // Verify course exists and belongs to faculty
    const course = await Course.findOne({ _id: courseId, facultyId });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or you do not have permission'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    // Create material record
    const material = new CourseMaterial({
      courseId,
      facultyId,
      title: title.trim(),
      description: description ? description.trim() : '',
      fileUrl: `/uploads/course-materials/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

    await material.save();
    await material.populate('facultyId', 'name email');

    console.log('✅ Material uploaded successfully');
    console.log('✅ Material ID:', material._id);
    console.log('✅ File:', material.fileName);
    console.log('📤 ========================================');

    res.status(201).json({
      success: true,
      message: 'Course material uploaded successfully',
      data: material
    });

  } catch (error) {
    console.error('❌ Upload material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading material'
    });
  }
};

// @desc    Get course materials
// @route   GET /api/courses/:courseId/materials
// @access  Private (Faculty and enrolled students)
const getCourseMaterials = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📚 ========================================');
    console.log('📚 FETCHING COURSE MATERIALS');
    console.log('📚 Course ID:', courseId);
    console.log('📚 User ID:', userId);
    console.log('📚 User Role:', userRole);

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check access permissions
    if (userRole === 'faculty') {
      // Faculty can only see materials for their own courses
      if (course.facultyId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view these materials'
        });
      }
    } else if (userRole === 'student') {
      // Students can only see materials if enrolled
      if (!course.enrolledStudents.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to view materials'
        });
      }
    }

    const materials = await CourseMaterial.getCourseMaterials(courseId);

    console.log('📚 Total Materials Found:', materials.length);
    console.log('📚 ========================================');

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials
    });

  } catch (error) {
    console.error('❌ Get materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching materials'
    });
  }
};

// @desc    Delete course material (Faculty)
// @route   DELETE /api/courses/:courseId/materials/:materialId
// @access  Private (Faculty only)
const deleteCourseMaterial = async (req, res) => {
  try {
    const { courseId, materialId } = req.params;
    const facultyId = req.user.id;

    console.log('🗑️ ========================================');
    console.log('🗑️ DELETING COURSE MATERIAL');
    console.log('🗑️ Material ID:', materialId);

    const material = await CourseMaterial.findOne({
      _id: materialId,
      courseId,
      facultyId
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or you do not have permission'
      });
    }

    // Soft delete
    material.isActive = false;
    await material.save();

    console.log('✅ Material deleted successfully');
    console.log('🗑️ ========================================');

    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting material'
    });
  }
};

// @desc    Download course material (with access control)
// @route   GET /api/courses/:courseId/materials/:materialId/download
// @access  Private (Faculty and enrolled students)
const downloadCourseMaterial = async (req, res) => {
  try {
    const { courseId, materialId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📥 ========================================');
    console.log('📥 DOWNLOADING COURSE MATERIAL');
    console.log('📥 Material ID:', materialId);
    console.log('📥 User ID:', userId);
    console.log('📥 User Role:', userRole);

    // Find the material
    const material = await CourseMaterial.findOne({
      _id: materialId,
      courseId,
      isActive: true
    });

    if (!material) {
      console.log('❌ Material not found');
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('❌ Course not found');
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check access permissions
    if (userRole === 'faculty') {
      if (course.facultyId.toString() !== userId) {
        console.log('❌ Faculty access denied');
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this material'
        });
      }
    } else if (userRole === 'student') {
      if (!course.enrolledStudents.includes(userId)) {
        console.log('❌ Student not enrolled');
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to access materials'
        });
      }
    }

    // Build file path
    const filePath = path.join(__dirname, '..', material.fileUrl);
    console.log('📁 File path:', filePath);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.log('❌ File not found on disk');
      return res.status(404).json({
        success: false,
        message: 'File not available. Please contact faculty.'
      });
    }

    console.log('✅ Access granted, serving file');
    console.log('📥 ========================================');

    // Set headers for PDF viewing in browser
    res.setHeader('Content-Type', material.fileType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${material.fileName}"`);
    
    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('❌ Download material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading material'
    });
  }
};

module.exports = {
  uploadCourseMaterial,
  getCourseMaterials,
  deleteCourseMaterial,
  downloadCourseMaterial
};
