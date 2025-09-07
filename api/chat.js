// Chat API usando variáveis de ambiente e memória
import { GoogleGenerativeAI } from '@google/generative-ai';

// Armazenamento em memória para sessões e configurações
const sessionStore = global.sessionStore || new Map();
global.sessionStore = sessionStore;

const configStore = global.configStore || new Map();
global.configStore = configStore;

// Função auxiliar para gerar ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função para obter configuração (memória ou env)
function getConfig(key) {
  // Prioridade: 1. Memória, 2. Variáveis de Ambiente
  const envMap = {
    'google_api_key': process.env.GOOGLE_API_KEY,
    'db_url': process.env.DATABASE_URL,
    'system_prompt': process.env.SYSTEM_PROMPT
  };
  
  return configStore.get(key) || envMap[key] || null;
}

// Função para buscar contexto do banco de dados
async function fetchDatabaseContext(dbUrl, query) {
  if (!dbUrl) return null;
  
  try {
    // Aqui você integraria com seu banco real
    // Por enquanto, retorna dados de exemplo
    return {
      query: query,
      results: []
    };
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Função para construir o prompt completo
function buildPrompt(systemPrompt, history, databaseContext, userMessage) {
  let prompt = systemPrompt || "Você é um assistente de IA útil e prestativo.";
  
  // Adicionar histórico da conversa
  if (history && history.length > 0) {
    prompt += "\n\n### Histórico da Conversa Atual:\n";
    history.forEach(msg => {
      prompt += `[${msg.role === 'user' ? 'Usuário' : 'Assistente'}]: ${msg.content}\n`;
    });
  }
  
  // Adicionar contexto do banco de dados
  if (databaseContext && databaseContext.results.length > 0) {
    prompt += "\n\n### Dados de Contexto do Banco de Dados:\n";
    databaseContext.results.forEach((record, index) => {
      prompt += `---\nRegistro ${index + 1}:\n`;
      Object.entries(record).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          prompt += `${key}: ${value}\n`;
        }
      });
    });
  }
  
  prompt += `\n\n### Nova Pergunta do Usuário:\n${userMessage}`;
  
  return prompt;
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

  const { message, sessionId, history } = req.body;

  try {
    // Obter configurações
    const apiKey = getConfig('google_api_key');
    const dbUrl = getConfig('db_url');
    const systemPrompt = getConfig('system_prompt');
    
    if (!apiKey) {
      return res.status(200).json({
        id: generateId(),
        role: 'assistant',
        content: `⚠️ API do Google não configurada!

Para configurar:
1. Obtenha sua API key em: https://aistudio.google.com
2. No dashboard da Vercel, vá em Settings → Environment Variables
3. Adicione GOOGLE_API_KEY com sua chave
4. Faça redeploy do projeto

Ou configure temporariamente na página de Configurações (ícone ⚙️).`,
        timestamp: new Date().toISOString(),
        error: true
      });
    }
    
    // Buscar contexto do banco de dados
    const databaseContext = dbUrl ? await fetchDatabaseContext(dbUrl, message) : null;
    
    // Construir prompt
    const fullPrompt = buildPrompt(
      systemPrompt || '',
      history || [],
      databaseContext,
      message
    );
    
    // Chamar Google AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Criar mensagem de resposta
    const responseMessage = {
      id: generateId(),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    // Salvar no histórico da sessão (em memória)
    const sessionKey = `session_${sessionId}`;
    let chatHistory = sessionStore.get(sessionKey) || [];
    
    // Adicionar mensagem do usuário e resposta ao histórico
    chatHistory.push({
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    chatHistory.push(responseMessage);
    
    // Manter apenas as últimas 20 mensagens
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }
    
    // Salvar histórico atualizado
    sessionStore.set(sessionKey, chatHistory);
    
    // Limpar sessões antigas (mais de 24 horas)
    const now = Date.now();
    for (const [key, value] of sessionStore.entries()) {
      if (value && value.length > 0) {
        const lastMessage = value[value.length - 1];
        if (lastMessage) {
          const messageTime = new Date(lastMessage.timestamp).getTime();
          if (now - messageTime > 24 * 60 * 60 * 1000) {
            sessionStore.delete(key);
          }
        }
      }
    }
    
    return res.status(200).json(responseMessage);
    
  } catch (error) {
    console.error('Chat error:', error);
    
    // Tratamento específico de erros
    let errorMessage = 'Erro ao processar mensagem.';
    
    if (error.message && error.message.includes('API_KEY_INVALID')) {
      errorMessage = 'API Key inválida. Verifique se copiou corretamente do Google AI Studio.';
    } else if (error.message && error.message.includes('SAFETY')) {
      errorMessage = 'A mensagem foi bloqueada por questões de segurança. Tente reformular.';
    } else if (error.message) {
      errorMessage = `Erro: ${error.message}`;
    }
    
    return res.status(200).json({
      id: generateId(),
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date().toISOString(),
      error: true
    });
  }
}