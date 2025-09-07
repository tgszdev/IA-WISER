// Debug endpoint para testar conexão e consultas ao banco
import { queryDatabase, testConnection } from './database.js';

// Armazenamento em memória para configurações
const configStore = global.configStore || new Map();
global.configStore = configStore;

// Função para obter configuração
function getConfig(key) {
  const envMap = {
    'google_api_key': process.env.GOOGLE_API_KEY,
    'db_url': process.env.DATABASE_URL,
    'system_prompt': process.env.SYSTEM_PROMPT
  };
  
  return configStore.get(key) || envMap[key] || null;
}

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

  try {
    const { action, query } = req.body;
    const dbUrl = getConfig('db_url');
    
    if (!dbUrl) {
      return res.status(200).json({
        success: false,
        message: 'Database URL não configurada',
        data: null
      });
    }
    
    let result;
    
    switch (action) {
      case 'test':
        // Testa conexão com o banco
        result = await testConnection(dbUrl);
        break;
        
      case 'query':
        // Executa uma query de teste
        if (!query) {
          return res.status(400).json({
            success: false,
            message: 'Query não fornecida',
            data: null
          });
        }
        result = await queryDatabase(dbUrl, query);
        break;
        
      case 'sample':
        // Busca alguns registros de exemplo
        result = await queryDatabase(dbUrl, '');
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Ação inválida. Use: test, query ou sample',
          data: null
        });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Debug executado com sucesso',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    
    return res.status(200).json({
      success: false,
      message: error.message,
      data: null,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
}