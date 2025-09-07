// Configuração usando Variáveis de Ambiente da Vercel (mais simples e gratuito)

// Armazenamento temporário em memória para configurações dinâmicas
const memoryStore = global.configStore || new Map();
global.configStore = memoryStore;

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
      // Prioridade: 1. Memória, 2. Variáveis de Ambiente, 3. Padrão Supabase
      const apiKey = memoryStore.get('google_api_key') || process.env.GOOGLE_API_KEY;
      
      // Obter URL do banco
      let dbUrl = memoryStore.get('db_url') || process.env.DATABASE_URL;
      
      // Se tem senha antiga, atualizar para nova
      if (dbUrl && (dbUrl.includes('Nnyq2122') || dbUrl.includes('%40%40'))) {
        dbUrl = dbUrl
          .replace(/Nnyq2122%40%40/g, '38016863884')
          .replace(/Nnyq2122@@/g, '38016863884');
      }
      
      // URL padrão com nova senha
      if (!dbUrl) {
        dbUrl = 'postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres';
      }
      
      const systemPrompt = memoryStore.get('system_prompt') || 
                          process.env.SYSTEM_PROMPT || 
                          'Você é um analista de estoque especializado em WMS.';
      const adminPassword = memoryStore.get('admin_password') || process.env.ADMIN_PASSWORD;
      
      return res.status(200).json({
        hasApiKey: !!apiKey,
        hasDbUrl: !!dbUrl,
        hasSystemPrompt: !!systemPrompt,
        hasAdminPassword: !!adminPassword,
        systemPromptPreview: systemPrompt ? systemPrompt.substring(0, 100) + '...' : null,
        usingEnvVars: !!(process.env.GOOGLE_API_KEY || process.env.ADMIN_PASSWORD),
        message: process.env.GOOGLE_API_KEY ? 
          '✅ Configurado via variáveis de ambiente (permanente)' : 
          '⚠️ Usando configuração temporária. Configure variáveis de ambiente na Vercel para persistência.'
      });
    } catch (error) {
      console.error('Config check error:', error);
      return res.status(500).json({
        error: 'Erro ao verificar configurações',
        details: error.message
      });
    }
  }

  // POST - Salvar configurações
  if (req.method === 'POST') {
    const { apiKey, dbUrl, systemPrompt, adminPassword } = req.body;
    
    try {
      // Obter senha de admin (da memória ou variável de ambiente)
      const storedPassword = memoryStore.get('admin_password') || process.env.ADMIN_PASSWORD;
      
      // Se não há senha configurada, é a primeira vez
      if (!storedPassword) {
        // Define a primeira senha
        if (adminPassword) {
          memoryStore.set('admin_password', adminPassword);
        } else {
          return res.status(400).json({ 
            error: 'Por favor, defina uma senha de administrador' 
          });
        }
      } else {
        // Verifica a senha
        if (adminPassword !== storedPassword) {
          return res.status(401).json({ 
            error: 'Senha de administrador incorreta',
            hint: process.env.ADMIN_PASSWORD ? 
              'Use a senha definida nas variáveis de ambiente da Vercel' : 
              'Use a senha que você definiu anteriormente'
          });
        }
      }
      
      // Salvar configurações em memória
      let saved = [];
      
      if (apiKey && apiKey !== '') {
        memoryStore.set('google_api_key', apiKey);
        saved.push('API Key');
      }
      
      if (dbUrl && dbUrl !== '') {
        memoryStore.set('db_url', dbUrl);
        saved.push('Database URL');
      }
      
      if (systemPrompt && systemPrompt !== '') {
        memoryStore.set('system_prompt', systemPrompt);
        saved.push('System Prompt');
      }
      
      // Verificar se está usando variáveis de ambiente
      const usingEnvVars = !!(process.env.GOOGLE_API_KEY || process.env.ADMIN_PASSWORD);
      
      return res.status(200).json({ 
        success: true,
        saved: saved,
        message: usingEnvVars ? 
          '✅ Configurações salvas! As variáveis de ambiente têm prioridade.' :
          '⚠️ Configurações salvas temporariamente (até o próximo deploy).',
        temporary: !usingEnvVars,
        instructions: !usingEnvVars ? [
          'Para configuração permanente:',
          '1. No dashboard da Vercel, vá em Settings → Environment Variables',
          '2. Adicione as variáveis:',
          '   - GOOGLE_API_KEY: Sua API key do Google',
          '   - ADMIN_PASSWORD: Sua senha de admin',
          '   - SYSTEM_PROMPT: Prompt do sistema (opcional)',
          '   - DATABASE_URL: URL do PostgreSQL (opcional)',
          '3. Faça redeploy para aplicar as variáveis'
        ] : null
      });
      
    } catch (error) {
      console.error('Config save error:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar configurações',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}