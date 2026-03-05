// Load environment variables FIRST
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from backend directory
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

// Debug environment loading
if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  console.error('📁 Looking for .env at:', envPath);
} else {
  console.log('✅ Environment variables loaded successfully');
  console.log('📁 .env file location:', envPath);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Connect to database
connectDB();

const app = express();

// Add request logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// CORS configuration with updated origins
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📁 Static file serving enabled for /uploads');

// Routes
console.log('🔧 Loading routes...');
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  app.use('/api/users', require('./routes/users'));
  console.log('✅ Users routes loaded');
} catch (error) {
  console.error('❌ Error loading users routes:', error.message);
}

try {
  app.use('/api/quizzes', require('./routes/quizzes'));
  console.log('✅ Quizzes routes loaded');
} catch (error) {
  console.error('❌ Error loading quizzes routes:', error.message);
}

try {
  app.use('/api/quiz-attempts', require('./routes/quizAttempts'));
  console.log('✅ Quiz attempts routes loaded');
} catch (error) {
  console.error('❌ Error loading quiz attempts routes:', error.message);
}

try {
  app.use('/api/assignments', require('./routes/assignments'));
  console.log('✅ Assignment routes loaded');
} catch (error) {
  console.error('❌ Error loading assignment routes:', error.message);
}

try {
  app.use('/api/ai', require('./routes/ai'));
  console.log('✅ AI routes loaded');
} catch (error) {
  console.error('❌ Error loading AI routes:', error.message);
}

try {
  app.use('/api/system', require('./routes/systemSettings'));
  console.log('✅ System settings routes loaded');
} catch (error) {
  console.error('❌ Error loading system settings routes:', error.message);
}

try {
  app.use('/api/faculty-requests', require('./routes/facultyRequests'));
  console.log('✅ Faculty requests routes loaded');
} catch (error) {
  console.error('❌ Error loading faculty requests routes:', error.message);
}

try {
  app.use('/api/courses', require('./routes/courses'));
  console.log('✅ Courses routes loaded');
} catch (error) {
  console.error('❌ Error loading courses routes:', error.message);
}

try {
  app.use('/api/course-requests', require('./routes/courseRequests'));
  console.log('✅ Course requests routes loaded');
} catch (error) {
  console.error('❌ Error loading course requests routes:', error.message);
}

try {
  app.use('/api/activity-logs', require('./routes/activityLogs'));
  console.log('✅ Activity logs routes loaded');
} catch (error) {
  console.error('❌ Error loading activity logs routes:', error.message);
}

try {
  app.use('/api/pdf-uploads', require('./routes/pdfUploads'));
  console.log('✅ PDF uploads routes loaded');
} catch (error) {
  console.error('❌ Error loading PDF uploads routes:', error.message);
}

// DISABLED: Using direct routes below instead
// try {
//   app.use('/api/pdf', require('./routes/pdf'));
//   console.log('✅ PDF processing routes loaded');
// } catch (error) {
//   console.error('❌ Error loading PDF processing routes:', error.message);
// }

// TEMPORARY: Direct PDF routes (bypassing require issues)
const multer = require('multer');
const pdfParse = require('pdf-parse');
const PdfUploadHistory = require('./models/PdfUploadHistory');
const { protect } = require('./middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  }
});

// PDF Health Check
app.get('/api/pdf/health', (req, res) => {
  console.log('✅ PDF Health check hit');
  res.status(200).json({
    success: true,
    message: 'PDF service is running',
    timestamp: new Date().toISOString()
  });
});

// PDF Process Endpoint (with authentication)
app.post('/api/pdf/process', protect, upload.single('file'), async (req, res) => {
  try {
    console.log('📥 PDF Process endpoint hit');
    
    // Validate file upload
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded. Please select a file.'
      });
    }

    // Validate file buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('❌ Empty file buffer');
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty. Please select a valid PDF file.'
      });
    }

    // Log file details for debugging
    console.log('📄 File Details:');
    console.log('  - Name:', req.file.originalname);
    console.log('  - Size:', req.file.size, 'bytes', `(${(req.file.size / 1024).toFixed(2)} KB)`);
    console.log('  - MIME Type:', req.file.mimetype);
    console.log('  - Buffer Length:', req.file.buffer.length);

    // Extract text from PDF with robust error handling
    let data, text;
    let parsingAttempts = 0;
    let lastError = null;
    
    // Try multiple parsing strategies
    const parsingStrategies = [
      // Strategy 1: Default parsing
      async () => {
        console.log('🔍 Parsing PDF (Strategy 1: Default)...');
        return await pdfParse(req.file.buffer, {
          max: 0,
          version: 'default'
        });
      },
      // Strategy 2: Lenient parsing
      async () => {
        console.log('🔍 Parsing PDF (Strategy 2: Lenient)...');
        return await pdfParse(req.file.buffer, {
          max: 0,
          version: 'default',
          pagerender: null // Skip page rendering
        });
      },
      // Strategy 3: Very basic parsing
      async () => {
        console.log('🔍 Parsing PDF (Strategy 3: Basic)...');
        return await pdfParse(req.file.buffer);
      }
    ];
    
    // Try each strategy
    for (const strategy of parsingStrategies) {
      try {
        parsingAttempts++;
        data = await strategy();
        text = data.text || '';
        
        if (text && text.trim().length > 0) {
          console.log(`✅ PDF parsed successfully (Strategy ${parsingAttempts})`);
          console.log('  - Pages:', data.numpages || 'unknown');
          console.log('  - Text Length:', text.length, 'characters');
          console.log('  - First 100 chars:', text.substring(0, 100).replace(/\s+/g, ' '));
          break; // Success! Exit loop
        } else {
          console.log(`⚠️ Strategy ${parsingAttempts} extracted no text, trying next...`);
        }
      } catch (pdfError) {
        lastError = pdfError;
        console.error(`⚠️ Strategy ${parsingAttempts} failed:`, pdfError.message);
        
        // Try to extract any partial text if available
        if (pdfError.text && pdfError.text.length > 0) {
          console.log('⚠️ Partial text extracted despite error');
          text = pdfError.text;
          break; // Use partial text
        }
        
        // Continue to next strategy
        if (parsingAttempts < parsingStrategies.length) {
          console.log(`  → Trying next parsing strategy...`);
        }
      }
    }
    
    // If all strategies failed
    if (!text || text.trim().length === 0) {
      console.error('❌ All parsing strategies failed');
      console.error('  - Last error:', lastError?.message);
      console.error('  - Error type:', lastError?.name);
      
      return res.status(400).json({
        success: false,
        message: 'Unable to extract text from this PDF file. The file may be:\n• Image-based (scanned document without OCR)\n• Encrypted or password-protected\n• Corrupted or invalid format\n\nPlease try a different PDF file with readable text content.'
      });
    }

    // Clean and normalize text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    console.log('📝 Cleaned text length:', cleanText.length, 'characters');

    // Check if we have ANY extractable text (very lenient - even 1 character is ok)
    if (!cleanText || cleanText.length === 0) {
      console.error('❌ No text extracted from PDF after cleaning');
      return res.status(400).json({
        success: false,
        message: 'This PDF appears to contain no readable text. It may be:\n• An image-based PDF (scanned document)\n• A blank document\n• A corrupted file\n\nPlease upload a PDF with text content or use OCR software to convert scanned images to text.'
      });
    }
    
    console.log('✅ Text extraction successful! Proceeding with analysis...');
    if (!cleanText || cleanText.length === 0) {
      console.error('❌ No text extracted from PDF');
      return res.status(400).json({
        success: false,
        message: 'This PDF appears to contain no readable text. It may be an image-based PDF or scanned document. Please upload a PDF with text content.'
      });
    }

    // Determine content level and set expectations
    let contentLevel = 'minimal';
    let quizMessage = 'PDF processed successfully';
    let targetQuestionCount = 10;
    let timeLimit = 600; // 10 minutes default
    
    if (cleanText.length < 100) {
      contentLevel = 'very-short';
      quizMessage = 'Very short document detected — generating a minimal quiz from available content';
      console.log('⚠️ Very short content (< 100 chars)');
    } else if (cleanText.length < 500) {
      contentLevel = 'short';
      quizMessage = 'Short document detected — generating a smaller quiz based on available content';
      console.log('ℹ️ Short content (< 500 chars)');
    } else if (cleanText.length < 1500) {
      contentLevel = 'medium';
      quizMessage = 'Medium-length document — generating an appropriately sized quiz';
      console.log('ℹ️ Medium content (< 1500 chars)');
    } else if (cleanText.length < 3000) {
      contentLevel = 'rich';
      quizMessage = 'Rich content detected — generating comprehensive quiz';
      console.log('✅ Rich content (< 3000 chars)');
    } else {
      contentLevel = 'large';
      quizMessage = 'Large document detected — generating extensive quiz';
      console.log('✅ Large content (>= 3000 chars)');
    }

    // ADVANCED TOPIC EXTRACTION with quality rules
    console.log('📊 Analyzing PDF content for topics...');
    
    const lines = cleanText.split(/\n+/);
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    console.log('  - Lines:', lines.length);
    console.log('  - Sentences:', sentences.length);
    
    // Extract potential headings (short lines, capitalized)
    const headings = lines.filter(line => 
      line.length > 5 && 
      line.length < 100 && 
      /^[A-Z]/.test(line.trim()) &&
      !line.includes('.')
    ).map(h => h.trim());
    
    console.log('  - Headings found:', headings.length);
    
    // Extract key terms (capitalized words/phrases appearing multiple times)
    const capitalizedPhrases = cleanText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g) || [];
    const phraseCount = {};
    capitalizedPhrases.forEach(phrase => {
      const normalized = phrase.trim();
      if (normalized.length > 3 && !['The', 'This', 'That', 'These', 'Those', 'There', 'Where', 'When'].includes(normalized)) {
        phraseCount[normalized] = (phraseCount[normalized] || 0) + 1;
      }
    });
    
    // Identify main topics (frequency >= 3 or in headings)
    const mainTopics = Object.entries(phraseCount)
      .filter(([phrase, count]) => count >= 3 || headings.some(h => h.includes(phrase)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);
    
    // Validate topics - remove generic/undefined
    const validTopics = mainTopics.filter(topic => 
      topic && 
      topic !== 'undefined' && 
      topic.length > 2 &&
      !/^(General|Content|Document|Page|Section|Chapter)$/i.test(topic)
    );
    
    console.log(`✅ Extracted ${validTopics.length} valid topics:`, validTopics);
    
    // If no valid topics found, extract from most common meaningful words
    if (validTopics.length === 0) {
      console.log('⚠️ No topics from phrases, extracting from common words...');
      const words = cleanText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      const wordFreq = {};
      words.forEach(word => {
        if (!['this', 'that', 'with', 'from', 'have', 'been', 'were', 'their', 'there'].includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
      
      const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
      
      validTopics.push(...topWords);
      console.log('  - Added topics from common words:', topWords);
    }
    
    // Ensure we have at least one topic
    if (validTopics.length === 0) {
      validTopics.push('Document Content');
      console.log('  - Using fallback topic: Document Content');
    }
    
    console.log(`✅ Final topics (${validTopics.length}):`, validTopics);
    
    // Generate summary with fallback for very short content
    let shortSummary, keyPoints;
    
    if (sentences.length === 0) {
      // Fallback: use first part of text as summary
      shortSummary = cleanText.substring(0, Math.min(200, cleanText.length)) + (cleanText.length > 200 ? '...' : '');
      keyPoints = [cleanText.substring(0, Math.min(150, cleanText.length))];
      console.log('⚠️ No sentences found, using text substring for summary');
    } else {
      shortSummary = sentences.slice(0, Math.min(3, sentences.length)).join('. ').trim() + '.';
      keyPoints = sentences
        .filter(s => s.length > 30 && s.length < 250)
        .slice(0, Math.min(5, sentences.length))
        .map(s => s.trim());
      
      // Ensure we have at least one key point
      if (keyPoints.length === 0 && sentences.length > 0) {
        keyPoints = [sentences[0].trim()];
      }
    }
    
    console.log('📋 Summary generated:');
    console.log('  - Short summary length:', shortSummary.length);
    console.log('  - Key points:', keyPoints.length);
    
    // BUILD TOPIC-SENTENCE MAP for intelligent quiz generation
    const topicSentenceMap = {};
    validTopics.forEach(topic => {
      topicSentenceMap[topic] = sentences.filter(s => 
        s.toLowerCase().includes(topic.toLowerCase()) &&
        s.length > 40 &&
        s.length < 300
      );
    });
    
    // GENERATE HIGH-QUALITY QUIZ QUESTIONS
    console.log('🎯 Generating topic-specific quiz questions...');
    const questions = [];
    const usedSentences = new Set();
    const questionPatterns = [
      'What does the document state about {topic}?',
      'According to the text, which statement about {topic} is correct?',
      'Based on the document, what is true regarding {topic}?',
      'The document explains that {topic}:',
      'Which of the following best describes {topic} as mentioned in the document?'
    ];
    
    let patternIndex = 0;
    
    for (const topic of validTopics) {
      if (questions.length >= 10) break;
      
      const relatedSentences = topicSentenceMap[topic] || [];
      if (relatedSentences.length === 0) continue;
      
      // Find best sentence (not too long, contains topic clearly)
      const bestSentence = relatedSentences.find(s => !usedSentences.has(s));
      if (!bestSentence) continue;
      
      usedSentences.add(bestSentence);
      
      // Extract the key statement about the topic
      const sentenceParts = bestSentence.split(/[,;]/);
      let correctAnswer = sentenceParts[0].trim();
      
      // Clean up the answer
      correctAnswer = correctAnswer.replace(/^(The|A|An)\s+/i, '').trim();
      if (correctAnswer.length > 120) {
        correctAnswer = correctAnswer.substring(0, 117) + '...';
      }
      
      // Ensure answer is meaningful
      if (correctAnswer.length < 15 || correctAnswer.includes('undefined')) {
        continue;
      }
      
      // Generate realistic distractors
      const distractors = [
        `${topic} is not discussed in this context`,
        `${topic} has characteristics opposite to what is stated`,
        `${topic} is mentioned but not explained in detail`
      ];
      
      // Try to create a distractor from another sentence
      const otherSentences = sentences.filter(s => 
        !s.includes(topic) && 
        s.length > 30 && 
        s.length < 150 &&
        !usedSentences.has(s)
      );
      
      if (otherSentences.length > 0) {
        let altDistractor = otherSentences[0].split(/[,;]/)[0].trim();
        altDistractor = altDistractor.replace(/^(The|A|An)\s+/i, '').trim();
        if (altDistractor.length > 15 && altDistractor.length < 120) {
          distractors[2] = altDistractor;
        }
      }
      
      // Create question with varied pattern
      const questionPattern = questionPatterns[patternIndex % questionPatterns.length];
      const questionText = questionPattern.replace('{topic}', topic);
      patternIndex++;
      
      // Shuffle options
      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
      
      questions.push({
        id: `q${questions.length + 1}`,
        question: questionText,
        options: options,
        correct_answer: correctAnswer,
        topic: topic,
        source: 'PDF Content',
        difficulty: 'medium'
      });
      
      console.log(`✅ Generated Q${questions.length}: ${topic}`);
    }
    
    // ADAPTIVE QUIZ GENERATION - Handle short PDFs gracefully
    // Update quizMessage and targetQuestionCount based on content
    targetQuestionCount = 10;
    timeLimit = 600; // 10 minutes default
    
    // Determine appropriate question count and time based on content
    if (text.length < 500 || validTopics.length < 3) {
      targetQuestionCount = Math.max(1, Math.min(questions.length, 5));
      timeLimit = 300; // 5 minutes
      quizMessage = 'Short document detected — generating a smaller quiz based on available content';
      console.log(`📝 Short PDF: Generating ${targetQuestionCount} questions, ${timeLimit}s time limit`);
    } else if (text.length < 1500 || validTopics.length < 5) {
      targetQuestionCount = Math.max(2, Math.min(questions.length, 10));
      timeLimit = 600; // 10 minutes
      quizMessage = 'Medium-length document — generating an appropriately sized quiz';
      console.log(`📝 Medium PDF: Generating ${targetQuestionCount} questions, ${timeLimit}s time limit`);
    } else if (text.length < 3000 || validTopics.length < 8) {
      targetQuestionCount = Math.max(5, Math.min(questions.length, 15));
      timeLimit = 900; // 15 minutes
      console.log(`📝 Rich content: Generating ${targetQuestionCount} questions, ${timeLimit}s time limit`);
    } else {
      // Large PDF - generate more questions
      targetQuestionCount = Math.max(10, Math.min(questions.length, 20));
      timeLimit = 1200; // 20 minutes
      quizMessage = 'Large document detected — generating comprehensive quiz';
      console.log(`📝 Large PDF: Generating ${targetQuestionCount} questions, ${timeLimit}s time limit`);
    }
    
    // If we have fewer questions than target, try to generate from key points
    while (questions.length < targetQuestionCount && keyPoints.length > 0) {
      const pointIndex = questions.length % keyPoints.length;
      const point = keyPoints[pointIndex];
      const topic = validTopics[questions.length % validTopics.length] || 'Content';
      
      // Avoid duplicates
      const isDuplicate = questions.some(q => q.correct_answer === point.substring(0, 100));
      if (isDuplicate) break;
      
      questions.push({
        id: `q${questions.length + 1}`,
        question: `Based on the document, which statement about ${topic} is correct?`,
        options: [
          point.substring(0, 100),
          `${topic} contradicts this information`,
          `${topic} is not discussed in detail`,
          `${topic} has different properties`
        ].sort(() => Math.random() - 0.5),
        correct_answer: point.substring(0, 100),
        topic: topic,
        source: 'PDF Content',
        difficulty: 'medium'
      });
      
      console.log(`✅ Generated Q${questions.length} from key points: ${topic}`);
    }
    
    // Ensure at least 1 question is generated
    if (questions.length === 0) {
      console.log('⚠️ No questions generated, creating fallback question...');
      
      const fallbackTopic = validTopics[0] || 'Document Content';
      let fallbackContent;
      
      if (sentences.length > 0) {
        fallbackContent = sentences[0].substring(0, 100);
      } else if (cleanText.length > 0) {
        // Use raw text if no sentences
        fallbackContent = cleanText.substring(0, 100);
      } else {
        fallbackContent = 'Content from the uploaded document';
      }
      
      questions.push({
        id: 'q1',
        question: `What information is presented in the document?`,
        options: [
          fallbackContent,
          'This topic is not covered in the document',
          'The document discusses different content',
          'This information is not mentioned'
        ].sort(() => Math.random() - 0.5),
        correct_answer: fallbackContent,
        topic: fallbackTopic,
        source: 'PDF Content',
        difficulty: 'medium'
      });
      
      quizMessage = 'Minimal content detected — generated a basic quiz from available text';
      targetQuestionCount = 1;
      timeLimit = 300; // 5 minutes for single question
      console.log('✅ Generated 1 fallback question from available content');
    }
    
    console.log(`✅ Final quiz: ${questions.length} questions, ${timeLimit}s time limit`);

    console.log('✅ PDF processed successfully');

    // Save to PDF upload history
    try {
      const userId = req.user?._id || req.user?.id; // Get user ID from auth middleware
      
      if (userId) {
        const pdfHistory = new PdfUploadHistory({
          user: userId,
          filename: req.file.originalname,
          status: 'processed',
          summary: {
            short: shortSummary,
            detailed: keyPoints.join('\n• '),
            keyPoints,
            topics: validTopics
          },
          quiz: {
            questions,
            totalQuestions: questions.length,
            topicsCovered: [...new Set(questions.map(q => q.topic))],
            timeLimit
          }
        });
        
        await pdfHistory.save();
        console.log('✅ Saved to PDF upload history');
      }
    } catch (historyError) {
      console.error('⚠️ Failed to save history:', historyError.message);
      // Don't fail the request if history save fails
    }

    res.status(200).json({
      success: true,
      message: quizMessage,
      data: {
        filename: req.file.originalname,
        summary: {
          short: shortSummary,
          detailed: keyPoints.join('\n• '),
          keyPoints,
          topics: validTopics
        },
        quiz: {
          questions,
          totalQuestions: questions.length,
          topicsCovered: [...new Set(questions.map(q => q.topic))],
          timeLimit // Add time limit to response
        },
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process PDF'
    });
  }
});

// PDF Submit Quiz with ADVANCED TOPIC ANALYSIS
app.post('/api/pdf/submit-quiz', (req, res) => {
  try {
    console.log('📊 Analyzing quiz submission...');
    const { answers, quiz } = req.body;
    
    if (!answers || !quiz || !quiz.questions) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz submission data'
      });
    }
    
    const totalQuestions = quiz.questions.length;
    let correctCount = 0;
    const topicPerformance = {};
    const incorrectQuestions = [];
    
    // Analyze each answer with topic tracking
    answers.forEach(answer => {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      if (!question) return;
      
      const isCorrect = answer.userAnswer === question.correct_answer;
      if (isCorrect) correctCount++;
      else {
        incorrectQuestions.push({
          question: question.question,
          topic: question.topic,
          yourAnswer: answer.userAnswer,
          correctAnswer: question.correct_answer
        });
      }
      
      const topic = question.topic || 'General';
      
      // Skip undefined or invalid topics
      if (!topic || topic === 'undefined' || topic === 'General') return;
      
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { 
          correct: 0, 
          total: 0,
          percentage: 0,
          questions: []
        };
      }
      
      topicPerformance[topic].total++;
      if (isCorrect) topicPerformance[topic].correct++;
      topicPerformance[topic].questions.push({
        question: question.question,
        correct: isCorrect
      });
    });
    
    // Calculate percentages for each topic
    Object.keys(topicPerformance).forEach(topic => {
      const perf = topicPerformance[topic];
      perf.percentage = ((perf.correct / perf.total) * 100).toFixed(1);
    });
    
    const percentage = ((correctCount / totalQuestions) * 100).toFixed(2);
    const level = percentage >= 80 ? 'Advanced' : percentage >= 60 ? 'Intermediate' : 'Beginner';
    
    // Identify weak and strong topics with quality rules
    const weakTopics = [];
    const strongTopics = [];
    const needsImprovementTopics = [];
    
    Object.entries(topicPerformance).forEach(([topic, perf]) => {
      const topicPercentage = parseFloat(perf.percentage);
      
      if (topicPercentage < 50) {
        weakTopics.push({
          name: topic,
          score: `${perf.correct}/${perf.total}`,
          percentage: perf.percentage,
          status: 'weak'
        });
      } else if (topicPercentage < 70) {
        needsImprovementTopics.push({
          name: topic,
          score: `${perf.correct}/${perf.total}`,
          percentage: perf.percentage,
          status: 'needs improvement'
        });
      } else if (topicPercentage >= 80) {
        strongTopics.push({
          name: topic,
          score: `${perf.correct}/${perf.total}`,
          percentage: perf.percentage,
          status: 'strong'
        });
      }
    });
    
    // Sort by percentage (weakest first)
    weakTopics.sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage));
    needsImprovementTopics.sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage));
    strongTopics.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    
    // GENERATE PROFESSIONAL MENTOR SUGGESTIONS (no metrics, clean guidance)
    console.log('💡 Generating professional mentor suggestions...');
    
    const revisionTopics = [...weakTopics, ...needsImprovementTopics];
    
    // Generate clean, professional suggestions for each weak topic
    const mentorGuidance = revisionTopics.map(topicInfo => {
      const topic = topicInfo.name;
      const percentage = parseFloat(topicInfo.percentage);
      
      let explanation = '';
      let recommendation = '';
      
      if (percentage < 30) {
        explanation = `Your understanding of ${topic} needs strengthening. This is a fundamental concept in the document.`;
        recommendation = `Start by reviewing the basic definitions and core principles of ${topic} from the PDF summary.`;
      } else if (percentage < 50) {
        explanation = `You have a basic grasp of ${topic}, but there are gaps in your understanding.`;
        recommendation = `Focus on the key concepts and examples related to ${topic} mentioned in the document.`;
      } else if (percentage < 70) {
        explanation = `You understand ${topic} at a foundational level, but could benefit from deeper study.`;
        recommendation = `Review the specific sections about ${topic} and practice applying the concepts.`;
      }
      
      return {
        topic: topic,
        explanation: explanation,
        recommendation: recommendation
      };
    });
    
    // Generate study strategy based on performance (no time estimates)
    const studyStrategy = [];
    if (percentage < 50) {
      studyStrategy.push('Begin with the PDF summary to build a strong foundation');
      studyStrategy.push('Focus on understanding core concepts before moving to details');
      studyStrategy.push('Use the learning resources provided for each topic');
    } else if (percentage < 70) {
      studyStrategy.push('Review the topics where you need improvement');
      studyStrategy.push('Connect concepts across different sections of the document');
      studyStrategy.push('Practice explaining these concepts in your own words');
    } else if (percentage < 85) {
      studyStrategy.push('Refine your understanding of the weaker areas');
      studyStrategy.push('Look for connections between different topics');
      studyStrategy.push('Consider exploring related advanced concepts');
    } else {
      studyStrategy.push('Excellent understanding demonstrated');
      studyStrategy.push('Consider exploring advanced topics in this subject area');
      studyStrategy.push('Share your knowledge by helping others learn');
    }
    
    // Generate clean learning resources (ONLY YouTube and Google)
    const learningResources = revisionTopics.map(topicInfo => {
      const topic = topicInfo.name;
      return {
        topic: topic,
        youtubeLink: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' explained')}`,
        googleArticleLink: `https://www.google.com/search?q=${encodeURIComponent(topic + ' tutorial article')}`
      };
    });
    
    // Generate recommendations
    const recommendations = [];
    if (revisionTopics.length > 0) {
      const topicList = revisionTopics.slice(0, 3).map(t => t.name).join(', ');
      recommendations.push(`Focus your revision on: ${topicList}`);
      recommendations.push('Use the learning resources below to strengthen your understanding');
      recommendations.push('Reattempt the quiz after reviewing to measure your progress');
    } else {
      recommendations.push('Excellent work! You have demonstrated strong understanding');
      recommendations.push('Consider exploring advanced topics related to this subject');
      recommendations.push('Continue building on this solid foundation');
    }
    
    console.log(`✅ Analysis complete: ${correctCount}/${totalQuestions} (${percentage}%)`);
    console.log(`📊 Topics needing attention: ${revisionTopics.length}`);
    
    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        progress: {
          score: correctCount,
          totalQuestions,
          percentage,
          level,
          weakTopics: weakTopics.map(t => t.name),
          strongTopics: strongTopics.map(t => t.name),
          needsImprovement: needsImprovementTopics.map(t => t.name),
          topicBreakdown: topicPerformance,
          incorrectQuestions: incorrectQuestions.slice(0, 5)
        },
        mentorSuggestions: {
          revisionTopics: revisionTopics.map(t => t.name),
          mentorGuidance: mentorGuidance, // Clean professional guidance
          studyStrategy: studyStrategy,
          recommendations: recommendations,
          learningResources: learningResources, // Clean resources without metrics
          performanceSummary: {
            weak: weakTopics,
            needsImprovement: needsImprovementTopics,
            strong: strongTopics
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Quiz submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process quiz submission'
    });
  }
});

// PDF Upload History Routes (with authentication)
app.get('/api/pdf/history', protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const history = await PdfUploadHistory.find({ user: userId })
      .sort({ uploadDate: -1 })
      .limit(20)
      .select('-quizAttempts'); // Exclude attempts for list view
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('❌ Error fetching PDF history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PDF history'
    });
  }
});

app.get('/api/pdf/history/:id', protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const pdfHistory = await PdfUploadHistory.findOne({
      _id: id,
      user: userId
    });
    
    if (!pdfHistory) {
      return res.status(404).json({
        success: false,
        message: 'PDF history not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pdfHistory
    });
  } catch (error) {
    console.error('❌ Error fetching PDF history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PDF history'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 GLOBAL ERROR HANDLER TRIGGERED');
  console.error('📍 Request:', req.method, req.path);
  console.error('❌ Error message:', err.message);
  console.error('❌ Error stack:', err.stack);
  console.error('❌ Error name:', err.name);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = app;