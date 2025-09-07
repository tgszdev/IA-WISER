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
  let prompt = systemPrompt || "Você é um assistente de IA útil e prestativo. Responda sempre em português do Brasil.";
  
  // Se há contexto do banco, instrui a IA a usá-lo DE FORMA ENFÁTICA
  if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
    prompt = "INSTRUÇÃO CRÍTICA: Você DEVE usar as informações da base de conhecimento fornecida abaixo. ";
    prompt += "Sua resposta DEVE ser baseada principalmente nesses dados. ";
    prompt += "Se a pergunta for sobre algo presente na base de conhecimento, use EXATAMENTE essas informações.\n\n";
    prompt += systemPrompt || "Você é um assistente de IA útil e prestativo. Responda sempre em português do Brasil.";
  }
  
  // Adicionar histórico da conversa
  if (history && history.length > 0) {
    prompt += "\n\n### Histórico da Conversa:\n";
    history.forEach(msg => {
      prompt += `[${msg.role === 'user' ? 'Usuário' : 'Assistente'}]: ${msg.content}\n`;
    });
  }
  
  // Adicionar contexto do banco de dados com ênfase máxima
  if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
    prompt += "\n\n### 🔴 BASE DE CONHECIMENTO OFICIAL - USE OBRIGATORIAMENTE:\n";
    prompt += "================================================\n";
    prompt += "AS INFORMAÇÕES ABAIXO SÃO A FONTE DE VERDADE. USE-AS!\n\n";
    
    databaseContext.results.forEach((record, index) => {
      prompt += `\n[REGISTRO ${index + 1}]\n`;
      prompt += `📌 TÍTULO: ${record.title}\n`;
      prompt += `📄 CONTEÚDO COMPLETO:\n${record.content}\n`;
      if (record.category) {
        prompt += `🏷️ CATEGORIA: ${record.category}\n`;
      }
      if (record.tags && record.tags.length > 0) {
        prompt += `🔖 TAGS: ${record.tags.join(', ')}\n`;
      }
      prompt += "----------------------------------------\n";
    });
    
    prompt += "\n⚠️ REGRA OBRIGATÓRIA: Você DEVE usar as informações acima em sua resposta. ";
    prompt += "Se a pergunta está relacionada ao conteúdo acima, cite e use esses dados EXATAMENTE como estão. ";
    prompt += "NÃO invente informações - use APENAS o que está na base de conhecimento acima.\n";
  }
  
  // Adicionar pergunta com instrução final
  if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
    prompt += `\n\n### Pergunta do Usuário:\n${userMessage}\n`;
    prompt += "\n🔴 LEMBRETE FINAL: Use as informações da BASE DE CONHECIMENTO OFICIAL acima para responder!\n";
    prompt += "\n### Sua Resposta (baseada na base de conhecimento, em português do Brasil):";
  } else {
    prompt += `\n\n### Pergunta do Usuário:\n${userMessage}`;
    prompt += "\n\n### Sua Resposta (em português do Brasil):";
  }
  
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

    console.log('Processing message:', message);

    // Obter configurações
    const apiKey = getConfig('google_api_key');
    const dbUrl = getConfig('db_url');
    const systemPrompt = getConfig('system_prompt');
    
    console.log('Config loaded - Has API Key:', !!apiKey, 'Has DB URL:', !!dbUrl);
    
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
    let dbStatus = 'not_configured';
    
    if (dbUrl) {
      try {
        console.log('Querying database for:', message);
        databaseContext = await queryDatabase(dbUrl, message);
        
        if (databaseContext) {
          if (databaseContext.error) {
            console.log('Database warning:', databaseContext.error);
            dbStatus = 'error';
          } else if (databaseContext.results && databaseContext.results.length > 0) {
            console.log(`Database returned ${databaseContext.results.length} results`);
            dbStatus = 'found_data';
          } else {
            console.log('Database returned no results');
            dbStatus = 'no_data';
          }
        }
      } catch (dbError) {
        console.error('Database query error:', dbError);
        dbStatus = 'error';
      }
    }
    
    // Construir prompt
    const fullPrompt = buildPrompt(
      systemPrompt || '',
      history || [],
      databaseContext,
      message
    );
    
    console.log('Database status:', dbStatus);
    console.log('Prompt includes context:', !!(databaseContext && databaseContext.results && databaseContext.results.length > 0));
    
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
    
    // Adicionar indicador se usou dados do banco
    if (dbStatus === 'found_data') {
      text += "\n\n📊 *[Resposta baseada na base de conhecimento]*";
    } else if (dbStatus === 'no_data' && dbUrl) {
      text += "\n\n💡 *[Nenhum dado relevante encontrado na base de conhecimento]*";
    }
    
    // Criar mensagem de resposta
    const responseMessage = {
      id: generateId(),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
      hasContext: dbStatus === 'found_data',
      dbStatus: dbStatus
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