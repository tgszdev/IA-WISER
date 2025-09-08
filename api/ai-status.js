// Vercel serverless function for AI status
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  const openaiApiKey = process.env.OPENAI_API_KEY || '';
  const googleApiKey = process.env.GOOGLE_API_KEY || '';
  
  const openaiConfigured = openaiApiKey && !openaiApiKey.includes('your_') && !openaiApiKey.includes('xxx');
  const geminiConfigured = googleApiKey && !googleApiKey.includes('your_') && !googleApiKey.includes('xxx');
  
  let openaiStatus = 'not_configured';
  let geminiStatus = 'not_configured';
  
  // Test OpenAI if configured
  if (openaiConfigured) {
    try {
      // Simple validation - check if key format is correct
      if (openaiApiKey.startsWith('sk-')) {
        openaiStatus = 'ready';
      } else {
        openaiStatus = 'configured_but_invalid';
      }
    } catch {
      openaiStatus = 'error';
    }
  }
  
  // Test Gemini if configured
  if (geminiConfigured) {
    try {
      // Simple validation - check if key format is correct
      if (googleApiKey.startsWith('AIza')) {
        geminiStatus = 'ready';
      } else {
        geminiStatus = 'configured_but_invalid';
      }
    } catch {
      geminiStatus = 'error';
    }
  }
  
  // Determine primary AI
  const primaryAI = openaiStatus === 'ready' ? 'openai' : 
                   geminiStatus === 'ready' ? 'gemini' : 
                   'local';
  
  return res.status(200).json({
    primaryAI,
    priority: [
      '1. OpenAI GPT-4 (if configured)',
      '2. Google Gemini (fallback)',
      '3. Local Query Generator (always available)'
    ],
    services: {
      openai: {
        status: openaiStatus,
        model: openaiStatus === 'ready' ? 'gpt-4' : null,
        configured: openaiConfigured,
        keyPrefix: openaiConfigured ? openaiApiKey.substring(0, 7) + '...' : null
      },
      gemini: {
        status: geminiStatus,
        model: geminiStatus === 'ready' ? 'gemini-1.5-flash' : null,
        configured: geminiConfigured,
        keyPrefix: geminiConfigured ? googleApiKey.substring(0, 7) + '...' : null
      },
      local: {
        status: 'always_ready',
        model: 'query-generator',
        configured: true
      }
    },
    recommendation: openaiStatus === 'ready' ? 
      'System is using OpenAI GPT-4 for optimal responses' : 
      geminiStatus === 'ready' ?
      'System is using Google Gemini for responses' :
      'Configure OpenAI or Gemini API keys for better performance'
  });
}