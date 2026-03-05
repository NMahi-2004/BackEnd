const pdfParse = require('pdf-parse');
const axios = require('axios');

const SMART_LMS_URL = process.env.SMART_LMS_URL || 'http://localhost:8000';

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Generate AI summary from text
 */
async function generateSummary(text) {
  try {
    const response = await axios.post(`${SMART_LMS_URL}/summary`, text, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 30000
    });
    return response.data.summary;
  } catch (error) {
    console.error('Summary generation error:', error.message);
    // Fallback: Create basic summary
    return createBasicSummary(text);
  }
}

/**
 * Generate quiz questions from summary
 */
async function generateQuiz(summary) {
  try {
    const response = await axios.post(`${SMART_LMS_URL}/quiz`, { summary }, {
      timeout: 30000
    });
    return response.data.quiz;
  } catch (error) {
    console.error('Quiz generation error:', error.message);
    // Fallback: Create basic quiz
    return createBasicQuiz(summary);
  }
}

/**
 * Analyze progress based on quiz results
 */
function analyzeProgress(answers, quiz) {
  const totalQuestions = quiz.questions.length;
  let correctAnswers = 0;
  const weakTopics = [];
  const strongTopics = [];
  const topicPerformance = {};

  // Calculate correct answers and topic performance
  answers.forEach(answer => {
    const question = quiz.questions.find(q => q.id === answer.questionId);
    if (question) {
      const isCorrect = answer.userAnswer === question.correct_answer;
      if (isCorrect) correctAnswers++;

      // Track topic performance
      const topic = question.topic || 'General';
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      topicPerformance[topic].total++;
      if (isCorrect) topicPerformance[topic].correct++;
    }
  });

  // Identify weak and strong topics
  Object.entries(topicPerformance).forEach(([topic, perf]) => {
    const percentage = (perf.correct / perf.total) * 100;
    if (percentage < 60) {
      weakTopics.push(topic);
    } else if (percentage >= 80) {
      strongTopics.push(topic);
    }
  });

  const score = correctAnswers;
  const percentage = (correctAnswers / totalQuestions) * 100;
  
  // Determine level
  let level = 'Beginner';
  if (percentage >= 80) level = 'Advanced';
  else if (percentage >= 60) level = 'Intermediate';

  return {
    score,
    totalQuestions,
    percentage: percentage.toFixed(2),
    level,
    weakTopics,
    strongTopics,
    topicPerformance
  };
}

/**
 * Generate mentor suggestions based on progress
 */
function generateMentorSuggestions(progress) {
  const suggestions = {
    revisionTopics: progress.weakTopics,
    studyStrategy: [],
    estimatedTime: '0 hours',
    recommendations: []
  };

  // Study strategy based on performance
  if (progress.percentage < 50) {
    suggestions.studyStrategy = [
      'Start with fundamentals and basic concepts',
      'Review the summary carefully before attempting quiz',
      'Focus on understanding rather than memorization',
      'Take notes while studying'
    ];
    suggestions.estimatedTime = '4-6 hours';
  } else if (progress.percentage < 70) {
    suggestions.studyStrategy = [
      'Review weak topics identified in the analysis',
      'Practice more questions on challenging areas',
      'Create flashcards for key concepts',
      'Discuss difficult topics with peers or mentors'
    ];
    suggestions.estimatedTime = '2-4 hours';
  } else if (progress.percentage < 90) {
    suggestions.studyStrategy = [
      'Focus on refining understanding of weak areas',
      'Attempt advanced practice questions',
      'Teach concepts to others to reinforce learning',
      'Review edge cases and exceptions'
    ];
    suggestions.estimatedTime = '1-2 hours';
  } else {
    suggestions.studyStrategy = [
      'Excellent performance! Keep up the good work',
      'Challenge yourself with advanced topics',
      'Help others understand the concepts',
      'Explore real-world applications'
    ];
    suggestions.estimatedTime = '0.5-1 hour for review';
  }

  // Specific recommendations
  if (progress.weakTopics.length > 0) {
    suggestions.recommendations.push(
      `Focus on: ${progress.weakTopics.join(', ')}`,
      'Reattempt the quiz after reviewing these topics',
      'Use additional resources for weak areas'
    );
  } else {
    suggestions.recommendations.push(
      'Great job! All topics well understood',
      'Consider exploring advanced concepts',
      'Share your knowledge with others'
    );
  }

  return suggestions;
}

/**
 * Fallback: Create basic summary from text
 */
function createBasicSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const shortSummary = sentences.slice(0, 3).join('. ') + '.';
  
  // Extract key points (first sentence of each paragraph)
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
  const keyPoints = paragraphs.slice(0, 5).map(p => {
    const firstSentence = p.split(/[.!?]/)[0];
    return firstSentence.trim();
  });

  // Extract potential topics (capitalized words that appear multiple times)
  const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  const topics = Object.entries(wordCount)
    .filter(([word, count]) => count > 2 && word.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    short: shortSummary,
    detailed: keyPoints.join('\n• '),
    keyPoints,
    topics
  };
}

/**
 * Fallback: Create basic quiz from summary
 */
function createBasicQuiz(summary) {
  const topics = summary.topics || ['General'];
  const questions = [];

  // Create sample questions based on content
  for (let i = 0; i < Math.min(10, topics.length * 2); i++) {
    const topic = topics[i % topics.length];
    questions.push({
      id: `q${i + 1}`,
      question: `What is the main concept related to ${topic}?`,
      options: [
        `${topic} is a fundamental concept`,
        `${topic} is not relevant`,
        `${topic} is optional`,
        `${topic} is deprecated`
      ],
      correct_answer: `${topic} is a fundamental concept`,
      topic: topic
    });
  }

  return {
    questions,
    totalQuestions: questions.length
  };
}

/**
 * Process PDF file completely
 */
async function processPdfFile(buffer, filename) {
  try {
    // Step 1: Extract text
    console.log('Extracting text from PDF...');
    const text = await extractTextFromPdf(buffer);
    
    if (!text || text.trim().length < 50) {
      throw new Error('PDF contains insufficient text content');
    }

    // Step 2: Generate summary
    console.log('Generating summary...');
    const summary = await generateSummary(text);

    // Step 3: Generate quiz
    console.log('Generating quiz...');
    const quiz = await generateQuiz(summary);

    // Return processed data
    return {
      filename,
      text: text.substring(0, 1000), // First 1000 chars for reference
      summary,
      quiz,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw error;
  }
}

module.exports = {
  extractTextFromPdf,
  generateSummary,
  generateQuiz,
  analyzeProgress,
  generateMentorSuggestions,
  processPdfFile
};
