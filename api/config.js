// Vercel serverless function for configuration check
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

  // Check configuration
  const hasOpenAI = !!(process.env.OPENAI_API_KEY && 
                       !process.env.OPENAI_API_KEY.includes('your_'));
  
  const hasGemini = !!(process.env.GOOGLE_API_KEY && 
                       !process.env.GOOGLE_API_KEY.includes('your_'));
  
  const hasSupabase = !!(process.env.SUPABASE_URL && 
                         process.env.SUPABASE_ANON_KEY);

  return res.status(200).json({
    hasApiKey: hasOpenAI || hasGemini,
    hasSystemPrompt: true,
    hasDbUrl: hasSupabase,
    services: {
      openai: hasOpenAI,
      gemini: hasGemini,
      supabase: hasSupabase
    }
  });
}