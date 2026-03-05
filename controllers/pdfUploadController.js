const PdfUpload = require('../models/PdfUpload');
const axios = require('axios');
const FormData = require('form-data');

// Smart LMS Python service URL
const SMART_LMS_URL = process.env.SMART_LMS_URL || 'http://localhost:8000';

// Upload PDF and process with AI
exports.uploadPdf = async (req, res) => {
  try {
    const { file } = req;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file type
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Create form data for Python service
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    // Send to Smart LMS for processing
    const response = await axios.post(`${SMART_LMS_URL}/upload`, formData, {
      headers: formData.getHeaders(),
      timeout: 60000 // 60 second timeout
    });

    const { session_id, summary, quiz } = response.data;

    // Parse summary into short and detailed
    const summaryParts = summary.split('\n\n');
    const shortSummary = summaryParts[0] || summary.substring(0, 300);
    const detailedSummary = summary;

    // Extract key topics from quiz
    const keyTopics = [...new Set(quiz.questions.map(q => q.topic))];

    // Save to database
    const pdfUpload = new PdfUpload({
      userId,
      fileName: file.originalname,
      fileSize: file.size,
      sessionId: session_id,
      summary: {
        short: shortSummary,
        detailed: detailedSummary
      },
      keyTopics,
      quiz: {
        questions: quiz.questions,
        totalQuestions: quiz.questions.length
      },
      status: 'completed'
    });

    await pdfUpload.save();

    res.status(201).json({
      success: true,
      message: 'PDF uploaded and processed successfully',
      data: {
        uploadId: pdfUpload._id,
        sessionId: session_id,
        fileName: file.originalname,
        summary: pdfUpload.summary,
        keyTopics,
        quiz: pdfUpload.quiz
      }
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      message: error.response?.data?.error || 'Failed to process PDF',
      error: error.message
    });
  }
};

// Get all uploads for current user
exports.getMyUploads = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const uploads = await PdfUpload.find({ userId })
      .sort({ uploadDate: -1 })
      .select('-quiz.questions.correctAnswer'); // Hide correct answers

    res.status(200).json({
      success: true,
      data: uploads
    });

  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch uploads'
    });
  }
};

// Get single upload details
exports.getUploadById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const upload = await PdfUpload.findOne({ _id: id, userId });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    res.status(200).json({
      success: true,
      data: upload
    });

  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upload details'
    });
  }
};

// Submit quiz answers
exports.submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    const upload = await PdfUpload.findOne({ _id: id, userId });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    // Calculate score
    let correctCount = 0;
    const processedAnswers = [];
    const topicPerformance = {};

    answers.forEach(answer => {
      const question = upload.quiz.questions.find(q => q.id === answer.questionId);
      if (question) {
        const isCorrect = answer.userAnswer === question.correctAnswer;
        if (isCorrect) correctCount++;

        processedAnswers.push({
          questionId: answer.questionId,
          userAnswer: answer.userAnswer,
          isCorrect,
          timeTaken: answer.timeTaken || 0
        });

        // Track topic performance
        if (!topicPerformance[question.topic]) {
          topicPerformance[question.topic] = { correct: 0, total: 0 };
        }
        topicPerformance[question.topic].total++;
        if (isCorrect) topicPerformance[question.topic].correct++;
      }
    });

    const percentage = (correctCount / upload.quiz.totalQuestions) * 100;

    // Identify weak and strong topics
    const weakTopics = [];
    const strongTopics = [];

    Object.entries(topicPerformance).forEach(([topic, perf]) => {
      const topicPercentage = (perf.correct / perf.total) * 100;
      if (topicPercentage < 60) {
        weakTopics.push(topic);
      } else if (topicPercentage >= 80) {
        strongTopics.push(topic);
      }
    });

    // Save attempt
    upload.quizAttempts.push({
      answers: processedAnswers,
      score: correctCount,
      percentage,
      weakTopics,
      strongTopics
    });

    await upload.save();

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        score: correctCount,
        totalQuestions: upload.quiz.totalQuestions,
        percentage: percentage.toFixed(2),
        weakTopics,
        strongTopics,
        attemptId: upload.quizAttempts[upload.quizAttempts.length - 1]._id
      }
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz'
    });
  }
};

// Get quiz for an upload (without correct answers)
exports.getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const upload = await PdfUpload.findOne({ _id: id, userId });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    // Remove correct answers from response
    const quizQuestions = upload.quiz.questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      topic: q.topic
    }));

    res.status(200).json({
      success: true,
      data: {
        questions: quizQuestions,
        totalQuestions: upload.quiz.totalQuestions
      }
    });

  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz'
    });
  }
};

// Get progress for an upload
exports.getProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const upload = await PdfUpload.findOne({ _id: id, userId });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    if (upload.quizAttempts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          hasAttempts: false,
          message: 'No quiz attempts yet'
        }
      });
    }

    // Get latest attempt
    const latestAttempt = upload.quizAttempts[upload.quizAttempts.length - 1];

    res.status(200).json({
      success: true,
      data: {
        hasAttempts: true,
        latestAttempt: {
          score: latestAttempt.score,
          totalQuestions: upload.quiz.totalQuestions,
          percentage: latestAttempt.percentage,
          weakTopics: latestAttempt.weakTopics,
          strongTopics: latestAttempt.strongTopics,
          attemptDate: latestAttempt.attemptDate
        },
        totalAttempts: upload.quizAttempts.length,
        allAttempts: upload.quizAttempts.map(a => ({
          score: a.score,
          percentage: a.percentage,
          date: a.attemptDate
        }))
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    });
  }
};

// Delete upload
exports.deleteUpload = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const upload = await PdfUpload.findOneAndDelete({ _id: id, userId });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Upload deleted successfully'
    });

  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete upload'
    });
  }
};
