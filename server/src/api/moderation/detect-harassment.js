const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// route: "/api/v1/moderation/detect-harassment" -> payload: { message: "", platform: ""}

router.post('/detect-harassment', async (req, res) => {
  try {
    const { message, platform } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or missing message'
      });
    }

    const systemPrompt = `You are an AI harassment detection assistant. 
    Carefully analyze the given text and provide a detailed JSON response 
    with the following boolean keys:

    Provide a STRICT JSON response WITHOUT any markdown or code block formatting. 
      
      {
        "isHarassment": true/false,
        "isVulgar": true/false,
        "isThreatening": true/false,
        "isSexuallyExplicit": true/false,
        "isPotentiallyOffensive": true/false,
        "analysis": "detailed analysis text"
      }
    This is the platform where user has received the message: ${platform}.
    Also do these harrassment checks based on platform and situation, like no one should ask any user about they have a
    boyfriend or not, since linkedin is a professional platform, but this same thing might be appropriate for instagram.
    `  

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${systemPrompt}\n\nMessage to analyze: ${message}`);
    const response = await result.response;
    const text = await response.text();
    
    let analysisResult;
    try {
      analysisResult = JSON.parse(text);
    } catch (parseError) {
      try {
        const cleanedText = text.replace(/^```json\n/, '').replace(/\n```$/, '');
        analysisResult = JSON.parse(cleanedText);
      } catch (cleanParseError) {
        analysisResult = {
          isHarassment: /harassment detected/i.test(text),
          isVulgar: /vulgar/i.test(text),
          isThreatening: /threatening/i.test(text),
          isSexuallyExplicit: /sexually explicit/i.test(text),
          isPotentiallyOffensive: /offensive/i.test(text),
          analysis: text
        };
      }
    }
    res.json({
      status: 'success',
      analysis: analysisResult
    });
  } catch (error) {
    console.error('Message analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze message',
      error: error.toString()
    });
  }
});

module.exports = router;