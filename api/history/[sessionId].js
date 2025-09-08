// Vercel serverless function for session history
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

  const { sessionId } = req.query;

  // For now, return empty history (in production, this would connect to a database or KV store)
  // In Vercel, you could use Vercel KV or another storage solution
  
  return res.status(200).json([]);
}