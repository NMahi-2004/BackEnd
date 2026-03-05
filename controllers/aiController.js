const axios = require('axios');

// @desc    Chat with AI Assistant
// @route   POST /api/ai/chat
// @access  Private (Faculty only)
const chatWithAI = async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Prepare the system prompt for quiz creation assistance
    const systemPrompt = `You are an AI educational assistant helping faculty create better quizzes. 
    
Your role:
- Help with quiz question creation and improvement
- Suggest appropriate difficulty levels
- Recommend question types and formats
- Provide teaching tips and best practices
- Help with quiz timing and structure
- Suggest engaging question topics

Context: Faculty is creating a quiz on the LMS platform.

Guidelines:
- Keep responses concise and actionable
- Focus on educational best practices
- Be encouraging and supportive
- Provide specific, practical suggestions
- Use a friendly, professional tone`;

    const userMessage = context ? `Context: ${context}\n\nQuestion: ${message}` : message;

    // Make request to Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = response.data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI Assistant');
    }

    return res.status(200).json({
      success: true,
      data: {
        message: aiResponse,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI API Error:', error.response?.data || error.message);
    
    // Handle specific API errors
    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'AI service authentication failed'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'AI service is busy. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'AI assistant is temporarily unavailable. Please try again later.'
    });
  }
};

module.exports = {
  chatWithAI
};