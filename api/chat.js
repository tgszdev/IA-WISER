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
  let prompt = "";
  
  // Se há contexto do banco, SOBRESCREVER TUDO e FORÇAR uso
  if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
    prompt = "VOCÊ É UM ANALISTA DE ESTOQUE ESPECIALIZADO EM WMS.\n";
    prompt += "VOCÊ TEM ACESSO AOS DADOS REAIS DO ESTOQUE DA EMPRESA LISTADOS ABAIXO.\n";
    prompt += "REGRA ABSOLUTA: ANALISE E RESPONDA USANDO APENAS OS DADOS DE ESTOQUE FORNECIDOS.\n";
    prompt += "SEMPRE FORNEÇA NÚMEROS EXATOS, CÓDIGOS DE PRODUTOS, LOTES E LOCALIZAÇÕES.\n";
    prompt += "SE A PERGUNTA FOR SOBRE UM PRODUTO QUE NÃO ESTÁ NOS DADOS, INFORME ISSO.\n\n";
    prompt += systemPrompt || "Responda sempre em português do Brasil como um especialista em gestão de estoque.";
  } else {
    prompt = systemPrompt || "Você é um assistente de IA útil e prestativo. Responda sempre em português do Brasil.";
  }
  
  // Adicionar histórico da conversa
  if (history && history.length > 0) {
    prompt += "\n\n### Histórico da Conversa:\n";
    history.forEach(msg => {
      prompt += `[${msg.role === 'user' ? 'Usuário' : 'Assistente'}]: ${msg.content}\n`;
    });
  }
  
  // Adicionar contexto do banco de dados com ênfase ABSOLUTA
  if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
    prompt += "\n\n📦 DADOS REAIS DO ESTOQUE - SISTEMA WMS 📦\n";
    prompt += "================================================================\n";
    prompt += "⚠️ ESTES SÃO OS DADOS REAIS E ATUAIS DO ESTOQUE DA EMPRESA\n";
    prompt += "⚠️ ANALISE ESTES DADOS PARA RESPONDER AS PERGUNTAS\n\n";
    
    // Verificar se é tabela estoque pelos campos
    const isEstoque = databaseContext.results[0] && 
                     (databaseContext.results[0].codigo_produto || 
                      databaseContext.results[0].content?.includes('Código:'));
    
    if (isEstoque) {
      prompt += "DADOS DO ESTOQUE DISPONÍVEIS:\n";
      prompt += "=====================================\n";
      databaseContext.results.forEach((record, index) => {
        if (record.codigo_produto) {
          // Dados diretos da tabela estoque
          prompt += `\n[ITEM ${index + 1}]\n`;
          prompt += `Código: ${record.codigo_produto}\n`;
          prompt += `Descrição: ${record.descricao_produto}\n`;
          prompt += `Lote: ${record.lote_industria_produto}\n`;
          prompt += `Saldo Disponível: ${record.saldo_disponivel_produto} unidades\n`;
          prompt += `Saldo Reservado: ${record.saldo_reservado_produto || 0} unidades\n`;
          prompt += `Saldo Bloqueado: ${record.saldo_bloqueado_produto || 0} unidades\n`;
          prompt += `Armazém: ${record.armazem}\n`;
          prompt += `Rua: ${record.rua}\n`;
          prompt += `Local: ${record.local_produto}\n`;
        } else {
          // Dados formatados como content
          prompt += `\n[REGISTRO ${index + 1}]\n`;
          prompt += `${record.content}\n`;
        }
        prompt += "---\n";
      });
    } else {
      // Formato genérico para outras tabelas
      databaseContext.results.forEach((record, index) => {
        prompt += `\n⭐ INFORMAÇÃO ${index + 1}:\n`;
        prompt += `TÍTULO: ${record.title}\n`;
        prompt += `CONTEÚDO: ${record.content}\n`;
        if (record.category) {
          prompt += `CATEGORIA: ${record.category}\n`;
        }
        if (record.tags && record.tags.length > 0) {
          prompt += `TAGS: ${record.tags.join(', ')}\n`;
        }
        prompt += "\n";
      });
    }
    
    prompt += "\n📈 INSTRUÇÕES PARA ANÁLISE DE ESTOQUE:\n";
    prompt += "1. ANALISE OS DADOS DE ESTOQUE ACIMA\n";
    prompt += "2. FORNEÇA NÚMEROS EXATOS E LOCALIZAÇÕES PRECISAS\n";
    prompt += "3. SE PERGUNTADO SOBRE TOTAIS, SOME OS VALORES\n";
    prompt += "4. SE PERGUNTADO SOBRE PRODUTOS ESPECÍFICOS, FILTRE OS DADOS\n";
    prompt += "5. SEMPRE MENCIONE CÓDIGOS, LOTES E ARMAZÉNS\n";
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
    let dbUrl = getConfig('db_url');
    const systemPrompt = getConfig('system_prompt');
    
    // Atualizar para nova senha se ainda tem a antiga
    if (dbUrl && (dbUrl.includes('Nnyq2122') || dbUrl.includes('%40%40'))) {
      console.log('Updating to new password');
      dbUrl = dbUrl
        .replace(/Nnyq2122%40%40/g, '38016863884')
        .replace(/Nnyq2122@@/g, '38016863884');
    }
    
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
        // SEMPRE passar uma query, mesmo vazia, para buscar TODOS os dados
        databaseContext = await queryDatabase(dbUrl, message || '');
        
        if (databaseContext) {
          if (databaseContext.error) {
            console.log('Database warning:', databaseContext.error);
            dbStatus = 'error';
          } else if (databaseContext.results && databaseContext.results.length > 0) {
            console.log(`Database returned ${databaseContext.results.length} results`);
            console.log('FORCING AI to use database context!');
            dbStatus = 'found_data';
            
            // LOG DETALHADO para debug
            console.log('Database content being sent to AI:');
            databaseContext.results.forEach((r, i) => {
              console.log(`  ${i+1}. ${r.title}: ${r.content.substring(0, 100)}...`);
            });
          } else {
            console.log('Database returned no results - trying to fetch ALL');
            // Tentar buscar TODOS os registros se não achou específicos
            databaseContext = await queryDatabase(dbUrl, '');
            if (databaseContext && databaseContext.results && databaseContext.results.length > 0) {
              dbStatus = 'found_data';
              console.log(`Got ${databaseContext.results.length} records on second attempt`);
            } else {
              dbStatus = 'no_data';
            }
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