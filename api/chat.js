// Chat API com fallback para modo demo
let kvAvailable = true;
let kv;

try {
  kv = require('@vercel/kv').kv;
} catch (error) {
  console.log('Vercel KV não disponível, usando modo de demonstração');
  kvAvailable = false;
}

import { GoogleGenerativeAI } from '@google/generative-ai';

// Simulação de KV para desenvolvimento/demo
const memoryStore = new Map();

const kvFallback = {
  async get(key) {
    return memoryStore.get(key) || null;
  },
  async set(key, value, options) {
    memoryStore.set(key, value);
    return 'OK';
  }
};

const storage = kvAvailable && kv ? kv : kvFallback;

// Função auxiliar para gerar ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função para buscar contexto do banco de dados
async function fetchDatabaseContext(dbUrl, query) {
  if (!dbUrl) return null;
  
  try {
    // Para Vercel, usamos a API REST do PostgreSQL
    // Compatível com Neon, Supabase, etc.
    const searchTerm = `%${query.split(' ').slice(0, 3).join('%')}%`;
    
    // Simulação de busca - em produção, use a API real do seu banco
    return {
      query: searchTerm,
      results: []
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      query: query,
      results: []
    };
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
    // Se KV não estiver disponível, usar API key de demonstração ou avisar
    let apiKey, dbUrl, systemPrompt;
    
    if (!kvAvailable) {
      // Modo demonstração - você pode colocar uma API key de teste aqui
      return res.status(200).json({
        id: generateId(),
        role: 'assistant',
        content: 'Olá! A aplicação está em modo demonstração. Para funcionalidade completa, configure o Vercel KV Storage no dashboard da Vercel: Storage → Create Database → KV → Connect to Project. Após isso, configure sua API key do Google AI Studio na página de configurações.',
        timestamp: new Date().toISOString(),
        demoMode: true
      });
    }

    // Obter configurações do KV
    [apiKey, dbUrl, systemPrompt] = await Promise.all([
      storage.get('google_api_key'),
      storage.get('db_url'),
      storage.get('system_prompt')
    ]);
    
    if (!apiKey) {
      return res.status(200).json({
        id: generateId(),
        role: 'assistant',
        content: 'API do Google não configurada. Por favor, acesse a página de Configurações e adicione sua chave de API do Google AI Studio.',
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
    
    // Salvar no histórico da sessão
    const sessionKey = `session_${sessionId}`;
    const existingHistory = await storage.get(sessionKey);
    const chatHistory = existingHistory ? JSON.parse(existingHistory) : [];
    
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
      chatHistory.splice(0, chatHistory.length - 20);
    }
    
    // Salvar histórico atualizado (com TTL de 24 horas)
    await storage.set(sessionKey, JSON.stringify(chatHistory), { ex: 86400 });
    
    return res.status(200).json(responseMessage);
    
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(200).json({
      id: generateId(),
      role: 'assistant',
      content: `Erro ao processar mensagem: ${error.message}. Verifique as configurações.`,
      timestamp: new Date().toISOString(),
      error: true
    });
  }
}