const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File received:', file.originalname, file.mimetype);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Helper function to extract text from PDF
async function extractTextFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Helper function to generate summary from text
function generateSummary(text) {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Short summary (first 3-5 sentences)
  const shortSummary = sentences.slice(0, 3).join('. ').trim() + '.';
  
  // Key points (extract important sentences)
  const keyPoints = sentences
    .filter(s => s.length > 30 && s.length < 200)
    .slice(0, 5)
    .map(s => s.trim());
  
  // Extract topics (capitalized words that appear multiple times)
  const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const wordCount = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  const topics = Object.entries(wordCount)
    .filter(([word, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
  
  return {
    short: shortSummary,
    detailed: keyPoints.join('\n• '),
    keyPoints,
    topics: topics.length > 0 ? topics : ['General', 'Content', 'Information']
  };
}

// Helper function to generate quiz questions
function generateQuiz(text, topics) {
  const questions = [];
  const usedTopics = topics.slice(0, 10);
  
  // Generate 10 questions
  for (let i = 0; i < 10; i++) {
    const topic = usedTopics[i % usedTopics.length];
    
    questions.push({
      id: `q${i + 1}`,
      question: `What is the main concept related to ${topic}?`,
      options: [
        `${topic} is a fundamental concept in this document`,
        `${topic} is not discussed in detail`,
        `${topic} is mentioned briefly`,
        `${topic} is a secondary topic`
      ],
      correct_answer: `${topic} is a fundamental concept in this document`,
      topic: topic
    });
  }
  
  return {
    questions,
    totalQuestions: questions.length
  };
}

// Health check endpoint (NO AUTH - for testing)
router.get('/health', (req, res) => {
  console.log('✅ Health check endpoint hit');
  res.status(200).json({
    success: true,
    message: 'PDF service is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint (NO AUTH - for testing)
router.post('/test', (req, res) => {
  console.log('✅ Test endpoint hit');
  res.status(200).json({
    success: true,
    message: 'PDF route working',
    summary: 'sample summary'
  });
});

// Process PDF endpoint (NO AUTH FOR NOW - to fix routing issue)
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    console.log('📥 Process endpoint hit');
    console.log('Headers:', req.headers);
    console.log('File:', req.file ? req.file.originalname : 'No file');
    
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

    console.log('✅ Processing PDF:', req.file.originalname, `(${req.file.size} bytes)`);

    // Extract text from PDF
    let text;
    try {
      text = await extractTextFromPdf(req.file.buffer);
      console.log('✅ Text extracted:', text.length, 'characters');
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to extract text from PDF. Make sure it contains readable text.'
      });
    }

    // Check if we got meaningful text
    if (!text || text.trim().length < 50) {
      console.log('❌ Insufficient text extracted');
      return res.status(400).json({
        success: false,
        message: 'PDF contains insufficient text. Please upload a PDF with readable text content.'
      });
    }

    // Generate summary
    const summary = generateSummary(text);
    console.log('✅ Summary generated');

    // Generate quiz
    const quiz = generateQuiz(text, summary.topics);
    console.log('✅ Quiz generated with', quiz.totalQuestions, 'questions');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'PDF processed successfully',
      data: {
        filename: req.file.originalname,
        summary,
        quiz,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Submit quiz endpoint (NO AUTH FOR NOW)
router.post('/submit-quiz', async (req, res) => {
  try {
    console.log('📥 Submit quiz endpoint hit');
    const { answers, quiz } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers format'
      });
    }

    // Calculate score
    const totalQuestions = quiz?.questions?.length || answers.length;
    let correctCount = 0;
    const topicPerformance = {};

    answers.forEach(answer => {
      const question = quiz?.questions?.find(q => q.id === answer.questionId);
      if (question) {
        const isCorrect = answer.userAnswer === question.correct_answer;
        if (isCorrect) correctCount++;

        // Track topic performance
        const topic = question.topic || 'General';
        if (!topicPerformance[topic]) {
          topicPerformance[topic] = { correct: 0, total: 0 };
        }
        topicPerformance[topic].total++;
        if (isCorrect) topicPerformance[topic].correct++;
      }
    });

    const percentage = ((correctCount / totalQuestions) * 100).toFixed(2);
    
    // Determine level
    let level = 'Beginner';
    if (percentage >= 80) level = 'Advanced';
    else if (percentage >= 60) level = 'Intermediate';

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

    // Generate mentor suggestions
    const mentorSuggestions = {
      revisionTopics: weakTopics,
      studyStrategy: percentage < 50 
        ? ['Start with fundamentals', 'Review the summary carefully', 'Take notes while studying']
        : percentage < 70
        ? ['Review weak topics', 'Practice more questions', 'Create flashcards']
        : percentage < 90
        ? ['Focus on weak areas', 'Attempt advanced questions', 'Teach concepts to others']
        : ['Excellent work!', 'Challenge yourself with advanced topics', 'Help others learn'],
      estimatedTime: percentage < 50 ? '4-6 hours' : percentage < 70 ? '2-4 hours' : percentage < 90 ? '1-2 hours' : '30 minutes for review',
      recommendations: weakTopics.length > 0 
        ? [`Focus on: ${weakTopics.join(', ')}`, 'Reattempt the quiz after reviewing', 'Use additional resources']
        : ['Great job!', 'All topics well understood', 'Consider exploring advanced concepts']
    };

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        progress: {
          score: correctCount,
          totalQuestions,
          percentage,
          level,
          weakTopics,
          strongTopics,
          topicPerformance
        },
        mentorSuggestions
      }
    });

  } catch (error) {
    console.error('❌ Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process quiz submission'
    });
  }
});

// Fallback for undefined routes
router.use((req, res) => {
  console.log('❌ Unknown PDF route:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /api/pdf/health',
      'POST /api/pdf/test',
      'POST /api/pdf/process',
      'POST /api/pdf/submit-quiz'
    ]
  });
});

module.exports = router;
