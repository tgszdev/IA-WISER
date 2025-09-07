// Configuração temporária usando cookies como fallback se KV não estiver disponível
let kvAvailable = true;
let kv;

try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.log('Vercel KV não disponível, usando modo de demonstração');
  kvAvailable = false;
}

// Simulação de KV para desenvolvimento/demo
const memoryStore = new Map();

const kvFallback = {
  async get(key) {
    return memoryStore.get(key) || null;
  },
  async set(key, value) {
    memoryStore.set(key, value);
    return 'OK';
  }
};

const storage = kvAvailable && kv ? kv : kvFallback;

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
      // Se KV não estiver disponível, retorna configuração de demo
      if (!kvAvailable) {
        return res.status(200).json({
          hasApiKey: false,
          hasDbUrl: false,
          hasSystemPrompt: false,
          demoMode: true,
          message: 'Aplicação em modo demonstração. Configure o Vercel KV para persistência.'
        });
      }

      const [apiKey, dbUrl, systemPrompt] = await Promise.all([
        storage.get('google_api_key'),
        storage.get('db_url'),
        storage.get('system_prompt')
      ]);
      
      return res.status(200).json({
        hasApiKey: !!apiKey,
        hasDbUrl: !!dbUrl,
        hasSystemPrompt: !!systemPrompt,
        systemPromptPreview: systemPrompt ? systemPrompt.substring(0, 100) + '...' : null,
        demoMode: !kvAvailable
      });
    } catch (error) {
      console.error('Config check error:', error);
      return res.status(200).json({
        hasApiKey: false,
        hasDbUrl: false,
        hasSystemPrompt: false,
        demoMode: true,
        error: 'Vercel KV não configurado'
      });
    }
  }

  // POST - Salvar configurações
  if (req.method === 'POST') {
    const { apiKey, dbUrl, systemPrompt, adminPassword } = req.body;
    
    try {
      // Se KV não estiver disponível, retorna mensagem explicativa
      if (!kvAvailable) {
        return res.status(200).json({ 
          success: false,
          demoMode: true,
          message: 'Configurações não podem ser salvas em modo demo. Configure o Vercel KV primeiro.',
          instructions: [
            '1. No dashboard da Vercel, vá em Storage',
            '2. Crie um banco KV',
            '3. Conecte ao seu projeto',
            '4. Faça redeploy'
          ]
        });
      }

      // Verificar senha de admin
      const storedPassword = await storage.get('admin_password');
      
      // Se não houver senha configurada, aceitar a primeira senha fornecida
      if (!storedPassword && adminPassword) {
        await storage.set('admin_password', adminPassword);
      } else if (storedPassword && adminPassword !== storedPassword) {
        return res.status(401).json({ error: 'Senha de administrador incorreta' });
      } else if (storedPassword && !adminPassword) {
        return res.status(401).json({ error: 'Senha de administrador necessária' });
      }
      
      // Salvar configurações
      const updates = [];
      
      if (apiKey !== undefined) {
        updates.push(storage.set('google_api_key', apiKey));
      }
      
      if (dbUrl !== undefined) {
        updates.push(storage.set('db_url', dbUrl));
      }
      
      if (systemPrompt !== undefined) {
        updates.push(storage.set('system_prompt', systemPrompt));
      }
      
      await Promise.all(updates);
      
      return res.status(200).json({ 
        success: true,
        message: 'Configurações salvas com sucesso!'
      });
      
    } catch (error) {
      console.error('Config save error:', error);
      return res.status(200).json({ 
        success: false,
        error: 'Erro ao salvar. Verifique se o Vercel KV está configurado.',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}