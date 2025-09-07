import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.query;

  try {
    const sessionKey = `session_${sessionId}`;
    const history = await kv.get(sessionKey);
    
    if (history) {
      return res.status(200).json(JSON.parse(history));
    }
    
    return res.status(200).json([]);
    
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ error: 'Erro ao obter histórico' });
  }
}