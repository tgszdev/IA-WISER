import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DatabaseClient, testDatabaseConnection } from './database'

// Tipos TypeScript
type Bindings = {
  KV: KVNamespace;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatRequest {
  message: string;
  sessionId: string;
  history?: ChatMessage[];
}

interface ConfigRequest {
  dbUrl?: string;
  apiKey?: string;
  systemPrompt?: string;
  adminPassword?: string;
}

interface DatabaseContext {
  query: string;
  results: any[];
}

const app = new Hono<{ Bindings: Bindings }>()

// Habilitar CORS para comunicação frontend-backend
app.use('/api/*', cors())

// Servir arquivos estáticos
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/favicon.ico', serveStatic({ root: './public' }))

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Função para buscar contexto do banco de dados
async function fetchDatabaseContext(dbUrl: string, query: string): Promise<DatabaseContext | null> {
  if (!dbUrl) return null;
  
  try {
    const client = new DatabaseClient(dbUrl);
    await client.connect();
    
    // Busca inteligente baseada em palavras-chave
    // Por enquanto, busca os 5 registros mais recentes da tabela 'knowledge_base'
    // Em produção, você pode personalizar isso para buscar de várias tabelas
    const searchQuery = `
      SELECT * FROM knowledge_base 
      WHERE content ILIKE $1 OR title ILIKE $1
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const searchTerm = `%${query.split(' ').slice(0, 3).join('%')}%`;
    const result = await client.query(searchQuery, [searchTerm]);
    
    await client.end();
    
    return {
      query: searchTerm,
      results: result.rows
    };
  } catch (error) {
    console.error('Database error:', error);
    // Se a tabela não existir ou houver erro, retorna contexto vazio
    return {
      query: query,
      results: []
    };
  }
}

// Função para construir o prompt completo
function buildPrompt(
  systemPrompt: string,
  history: ChatMessage[],
  databaseContext: DatabaseContext | null,
  userMessage: string
): string {
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

// API: Chat com IA
app.post('/api/chat', async (c) => {
  const { env } = c;
  const body = await c.req.json<ChatRequest>();
  
  try {
    // Obter configurações do KV
    const [apiKey, dbUrl, systemPrompt] = await Promise.all([
      env.KV.get('google_api_key'),
      env.KV.get('db_url'),
      env.KV.get('system_prompt')
    ]);
    
    if (!apiKey) {
      return c.json({ 
        error: 'API do Google não configurada. Por favor, configure nas Configurações.' 
      }, 400);
    }
    
    // Buscar contexto do banco de dados
    const databaseContext = dbUrl ? await fetchDatabaseContext(dbUrl, body.message) : null;
    
    // Construir prompt
    const fullPrompt = buildPrompt(
      systemPrompt || '',
      body.history || [],
      databaseContext,
      body.message
    );
    
    // Chamar Google AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Criar mensagem de resposta
    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    // Salvar no histórico da sessão
    const sessionKey = `session_${body.sessionId}`;
    const existingHistory = await env.KV.get(sessionKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    
    // Adicionar mensagem do usuário e resposta ao histórico
    history.push({
      id: generateId(),
      role: 'user',
      content: body.message,
      timestamp: new Date().toISOString()
    });
    history.push(responseMessage);
    
    // Manter apenas as últimas 20 mensagens
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    // Salvar histórico atualizado (com TTL de 24 horas)
    await env.KV.put(sessionKey, JSON.stringify(history), { 
      expirationTtl: 86400 
    });
    
    return c.json(responseMessage);
    
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ 
      error: 'Erro ao processar mensagem. Verifique as configurações.' 
    }, 500);
  }
});

// API: Obter histórico da sessão
app.get('/api/chat/history/:sessionId', async (c) => {
  const { env } = c;
  const sessionId = c.req.param('sessionId');
  
  const sessionKey = `session_${sessionId}`;
  const history = await env.KV.get(sessionKey);
  
  if (history) {
    return c.json(JSON.parse(history));
  }
  
  return c.json([]);
});

// API: Verificar configurações
app.get('/api/config/check', async (c) => {
  const { env } = c;
  
  const [apiKey, dbUrl, systemPrompt] = await Promise.all([
    env.KV.get('google_api_key'),
    env.KV.get('db_url'),
    env.KV.get('system_prompt')
  ]);
  
  return c.json({
    hasApiKey: !!apiKey,
    hasDbUrl: !!dbUrl,
    hasSystemPrompt: !!systemPrompt,
    systemPromptPreview: systemPrompt ? systemPrompt.substring(0, 100) + '...' : null
  });
});

// API: Salvar configurações (protegido por senha)
app.post('/api/config', async (c) => {
  const { env } = c;
  const body = await c.req.json<ConfigRequest>();
  
  // Verificar senha de admin
  const adminPassword = await env.KV.get('admin_password');
  
  // Se não houver senha configurada, aceitar a primeira senha fornecida
  if (!adminPassword && body.adminPassword) {
    await env.KV.put('admin_password', body.adminPassword);
  } else if (adminPassword && body.adminPassword !== adminPassword) {
    return c.json({ error: 'Senha de administrador incorreta' }, 401);
  } else if (adminPassword && !body.adminPassword) {
    return c.json({ error: 'Senha de administrador necessária' }, 401);
  }
  
  // Salvar configurações
  const updates = [];
  
  if (body.apiKey !== undefined) {
    updates.push(env.KV.put('google_api_key', body.apiKey));
  }
  
  if (body.dbUrl !== undefined) {
    updates.push(env.KV.put('db_url', body.dbUrl));
  }
  
  if (body.systemPrompt !== undefined) {
    updates.push(env.KV.put('system_prompt', body.systemPrompt));
  }
  
  await Promise.all(updates);
  
  return c.json({ success: true });
});

// API: Testar conexão com banco de dados
app.post('/api/config/test-db', async (c) => {
  const body = await c.req.json<{ dbUrl: string }>();
  
  const result = await testDatabaseConnection(body.dbUrl);
  
  if (result.success) {
    return c.json(result);
  } else {
    return c.json(result, 400);
  }
});

// Página principal - Chat
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wiser IA Assistant</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/chat.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div id="app" class="container mx-auto px-4 py-8 max-w-4xl">
            <!-- Header -->
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">
                    <i class="fas fa-robot mr-2 text-blue-600"></i>
                    Wiser IA Assistant
                </h1>
                <a href="/config" class="p-3 rounded-lg bg-white shadow hover:shadow-lg transition-all">
                    <i class="fas fa-cog text-gray-600 text-xl"></i>
                </a>
            </div>
            
            <!-- Chat Container -->
            <div class="bg-white rounded-xl shadow-xl overflow-hidden">
                <!-- Messages Container -->
                <div id="messages" class="h-[500px] overflow-y-auto p-6 space-y-4">
                    <!-- Welcome Message -->
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-4 max-w-lg">
                                <p class="text-gray-700">
                                    Olá! Sou o Wiser IA Assistant. Como posso ajudá-lo hoje?
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Typing Indicator -->
                <div id="typing-indicator" class="hidden px-6 pb-2">
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4">
                            <div class="flex space-x-1">
                                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="border-t border-gray-200 p-4">
                    <div class="flex space-x-3">
                        <input 
                            type="text" 
                            id="message-input"
                            placeholder="Digite sua pergunta..."
                            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autofocus
                        >
                        <button 
                            id="send-button"
                            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                            <i class="fas fa-paper-plane"></i>
                            <span>Enviar</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Status Bar -->
            <div id="status-bar" class="mt-4 text-center text-sm text-gray-500">
                <span id="status-text">Pronto para conversar</span>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/chat.js"></script>
    </body>
    </html>
  `);
});

// Página de configurações
app.get('/config', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Configurações - Wiser IA Assistant</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-3xl">
            <!-- Header -->
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">
                    <i class="fas fa-cog mr-2 text-blue-600"></i>
                    Configurações
                </h1>
                <a href="/" class="p-3 rounded-lg bg-white shadow hover:shadow-lg transition-all">
                    <i class="fas fa-comments text-gray-600 text-xl"></i>
                </a>
            </div>
            
            <!-- Configuration Form -->
            <div class="bg-white rounded-xl shadow-xl p-8">
                <form id="config-form" class="space-y-6">
                    <!-- Admin Password -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-lock mr-1"></i>
                            Senha de Administrador
                        </label>
                        <input 
                            type="password" 
                            id="admin-password"
                            placeholder="Digite a senha de administrador"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                        <p class="mt-1 text-sm text-gray-500">
                            Na primeira configuração, esta será definida como a senha de admin.
                        </p>
                    </div>
                    
                    <!-- Google API Key -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-key mr-1"></i>
                            Chave de API do Google AI Studio
                        </label>
                        <input 
                            type="password" 
                            id="api-key"
                            placeholder="AIza..."
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                        <p class="mt-1 text-sm text-gray-500">
                            Obtenha sua chave em 
                            <a href="https://aistudio.google.com" target="_blank" class="text-blue-600 hover:underline">
                                aistudio.google.com
                            </a>
                        </p>
                    </div>
                    
                    <!-- Database URL -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-database mr-1"></i>
                            URL de Conexão PostgreSQL
                        </label>
                        <input 
                            type="password" 
                            id="db-url"
                            placeholder="postgresql://user:password@host:port/database"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                        <div class="mt-2">
                            <button 
                                type="button" 
                                id="test-db-button"
                                class="text-sm px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                <i class="fas fa-plug mr-1"></i>
                                Testar Conexão
                            </button>
                            <span id="db-test-result" class="ml-3 text-sm"></span>
                        </div>
                        <p class="mt-2 text-sm text-gray-500">
                            <strong>Compatível com:</strong> Neon, Supabase, ou qualquer PostgreSQL com API REST.
                        </p>
                    </div>
                    
                    <!-- System Prompt -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            <i class="fas fa-brain mr-1"></i>
                            Prompt de Comportamento da IA
                        </label>
                        <textarea 
                            id="system-prompt"
                            rows="6"
                            placeholder="Você é um assistente de vendas especializado em produtos de tecnologia. Seja sempre cordial e use os dados fornecidos para responder sobre os produtos. Não invente informações..."
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                        <p class="mt-1 text-sm text-gray-500">
                            Define a personalidade e comportamento da IA.
                        </p>
                    </div>
                    
                    <!-- Buttons -->
                    <div class="flex space-x-3">
                        <button 
                            type="submit"
                            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                            <i class="fas fa-save"></i>
                            <span>Salvar Configurações</span>
                        </button>
                        <button 
                            type="button"
                            id="check-config-button"
                            class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <i class="fas fa-check-circle"></i>
                            <span>Verificar Status</span>
                        </button>
                    </div>
                </form>
                
                <!-- Status Message -->
                <div id="status-message" class="mt-6 hidden">
                    <div class="p-4 rounded-lg">
                        <p class="text-sm font-medium"></p>
                    </div>
                </div>
            </div>
            
            <!-- Info Box -->
            <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 class="text-lg font-semibold text-blue-900 mb-3">
                    <i class="fas fa-info-circle mr-2"></i>
                    Informações Importantes
                </h3>
                <ul class="space-y-2 text-sm text-blue-800">
                    <li class="flex items-start">
                        <i class="fas fa-check mr-2 mt-1 text-blue-600"></i>
                        <span>As configurações são salvas de forma segura no Cloudflare KV.</span>
                    </li>
                    <li class="flex items-start">
                        <i class="fas fa-check mr-2 mt-1 text-blue-600"></i>
                        <span>Para PostgreSQL, use serviços compatíveis: Neon, Supabase, etc.</span>
                    </li>
                    <li class="flex items-start">
                        <i class="fas fa-check mr-2 mt-1 text-blue-600"></i>
                        <span>O histórico de conversas é mantido por 24 horas.</span>
                    </li>
                    <li class="flex items-start">
                        <i class="fas fa-check mr-2 mt-1 text-blue-600"></i>
                        <span>Crie uma tabela 'knowledge_base' com colunas 'title' e 'content'.</span>
                    </li>
                </ul>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/config.js"></script>
    </body>
    </html>
  `);
});

export default app