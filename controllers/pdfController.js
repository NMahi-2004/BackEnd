/**
 * PDF Controller
 * Handles PDF upload, processing, and quiz generation
 */

const pdfService = require('../services/pdfService');

/**
 * Health check endpoint
 * GET /api/pdf/health
 */
exports.healthCheck = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'PDF service is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
};

/**
 * Process uploaded PDF file
 * POST /api/pdf/process
 */
exports.processPdf = async (req, res) => {
  try {
    console.log('📥 PDF upload request received');
    console.log('User:', req.user?.email || 'Unknown');
    console.log('File:', req.file?.originalname || 'No file');

    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded'
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      console.log('❌ Invalid file type:', req.file.mimetype);
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    console.log('✅ File validation passed');
    console.log('📄 Processing:', req.file.originalname);
    console.log('📊 Size:', (req.file.size / 1024).toFixed(2), 'KB');

    // Process the PDF
    const result = await pdfService.processPdfFile(
      req.file.buffer,
      req.file.originalname
    );

    console.log('✅ PDF processed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'PDF processed successfully',
      data: {
        filename: result.filename,
        summary: result.summary,
        quiz: result.quiz,
        processedAt: result.processedAt
      }
    });

  } catch (error) {
    console.error('❌ PDF processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Submit quiz answers and get progress analysis
 * POST /api/pdf/submit-quiz
 */
exports.submitQuiz = async (req, res) => {
  try {
    console.log('📝 Quiz submission received');
    
    const { answers, quiz } = req.body;

    // Validate input
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers format'
      });
    }

    if (!quiz || !quiz.questions) {
      return res.status(400).json({
        success: false,
        message: 'Quiz data is required'
      });
    }

    console.log('📊 Analyzing', answers.length, 'answers');

    // Analyze progress
    const progress = pdfService.analyzeProgress(answers, quiz);

    // Generate mentor suggestions
    const mentorSuggestions = pdfService.generateMentorSuggestions(progress);

    console.log('✅ Quiz analyzed successfully');

    // Return results
    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        progress,
        mentorSuggestions
      }
    });

  } catch (error) {
    console.error('❌ Quiz submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process quiz submission',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
