import { testConnection } from './database.js';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dbUrl } = req.body;

  try {
    // Usa a URL fornecida ou a variável de ambiente
    const connectionString = dbUrl || process.env.DATABASE_URL;
    
    if (!connectionString) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL de conexão não fornecida' 
      });
    }
    
    // Testa a conexão
    const result = await testConnection(connectionString);
    
    if (result.success) {
      let message = result.message;
      
      if (!result.hasKnowledgeBase) {
        message += '\n⚠️ Tabela knowledge_base não encontrada. Execute o script SQL no Supabase.';
      } else {
        message += '\n✅ Tabela knowledge_base encontrada!';
      }
      
      return res.status(200).json({
        ...result,
        message
      });
    } else {
      return res.status(400).json(result);
    }
    
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: `Erro: ${error.message}` 
    });
  }
}