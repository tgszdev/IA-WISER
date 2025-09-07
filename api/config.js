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

  // GET - Verificar configurações
  if (req.method === 'GET') {
    try {
      const [apiKey, dbUrl, systemPrompt] = await Promise.all([
        kv.get('google_api_key'),
        kv.get('db_url'),
        kv.get('system_prompt')
      ]);
      
      return res.status(200).json({
        hasApiKey: !!apiKey,
        hasDbUrl: !!dbUrl,
        hasSystemPrompt: !!systemPrompt,
        systemPromptPreview: systemPrompt ? systemPrompt.substring(0, 100) + '...' : null
      });
    } catch (error) {
      console.error('Config check error:', error);
      return res.status(500).json({ error: 'Erro ao verificar configurações' });
    }
  }

  // POST - Salvar configurações
  if (req.method === 'POST') {
    const { apiKey, dbUrl, systemPrompt, adminPassword } = req.body;
    
    try {
      // Verificar senha de admin
      const storedPassword = await kv.get('admin_password');
      
      // Se não houver senha configurada, aceitar a primeira senha fornecida
      if (!storedPassword && adminPassword) {
        await kv.set('admin_password', adminPassword);
      } else if (storedPassword && adminPassword !== storedPassword) {
        return res.status(401).json({ error: 'Senha de administrador incorreta' });
      } else if (storedPassword && !adminPassword) {
        return res.status(401).json({ error: 'Senha de administrador necessária' });
      }
      
      // Salvar configurações
      const updates = [];
      
      if (apiKey !== undefined) {
        updates.push(kv.set('google_api_key', apiKey));
      }
      
      if (dbUrl !== undefined) {
        updates.push(kv.set('db_url', dbUrl));
      }
      
      if (systemPrompt !== undefined) {
        updates.push(kv.set('system_prompt', systemPrompt));
      }
      
      await Promise.all(updates);
      
      return res.status(200).json({ success: true });
      
    } catch (error) {
      console.error('Config save error:', error);
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}