// Chat API com integração ao Supabase e modelo Gemini atualizado
import { GoogleGenerativeAI } from '@google/generative-ai';
import { queryDatabase } from './database.js';

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
  if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
    prompt += "\n\n### Informações Relevantes da Base de Conhecimento:\n";
    databaseContext.results.forEach((record, index) => {
      prompt += `\n**${record.title}**\n`;
      prompt += `${record.content}\n`;
      if (record.category) {
        prompt += `Categoria: ${record.category}\n`;
      }
      if (record.tags && record.tags.length > 0) {
        prompt += `Tags: ${record.tags.join(', ')}\n`;
      }
      prompt += "---\n";
    });
    
    prompt += "\nUse as informações acima para responder a pergunta do usuário de forma precisa.";
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

  try {
    const { message, sessionId, history } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Mensagem não pode estar vazia'
      });
    }

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
    
    // Buscar contexto do banco de dados se configurado
    let databaseContext = null;
    if (dbUrl) {
      try {
        databaseContext = await queryDatabase(dbUrl, message);
        
        if (databaseContext && databaseContext.error) {
          console.log('Database query warning:', databaseContext.error);
        }
      } catch (dbError) {
        console.error('Database query error:', dbError);
        // Continua sem o contexto do banco
      }
    }
    
    // Construir prompt
    const fullPrompt = buildPrompt(
      systemPrompt || '',
      history || [],
      databaseContext,
      message
    );
    
    // Chamar Google AI com modelo atualizado
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usar gemini-1.5-flash que é o modelo mais recente e disponível
    let model;
    let text;
    
    try {
      // Tentar primeiro o gemini-1.5-flash (mais rápido e eficiente)
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      text = response.text();
    } catch (modelError) {
      console.log('Trying alternative model...');
      try {
        // Se falhar, tentar gemini-1.5-pro
        model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        text = response.text();
      } catch (modelError2) {
        // Se ainda falhar, tentar o modelo legado
        console.log('Trying legacy model...');
        model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        text = response.text();
      }
    }
    
    // Criar mensagem de resposta
    const responseMessage = {
      id: generateId(),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
      hasContext: !!(databaseContext && databaseContext.results && databaseContext.results.length > 0)
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
    console.error('Error stack:', error.stack);
    
    // Tratamento específico de erros
    let errorMessage = 'Erro ao processar mensagem.';
    
    if (error.message) {
      if (error.message.includes('API_KEY_INVALID')) {
        errorMessage = 'API Key inválida. Verifique se copiou corretamente do Google AI Studio.';
      } else if (error.message.includes('SAFETY')) {
        errorMessage = 'A mensagem foi bloqueada por questões de segurança. Tente reformular.';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'API Key sem permissão. Verifique se a API está ativada no Google Cloud.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Cota da API excedida. Aguarde um momento ou verifique seu plano.';
      } else if (error.message.includes('404') && error.message.includes('model')) {
        errorMessage = 'Modelo de IA não disponível. O sistema está sendo atualizado. Tente novamente em instantes.';
      } else {
        errorMessage = `Erro: ${error.message}`;
      }
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