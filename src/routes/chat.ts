// Main Chat API Route with Supabase Integration and Session Management
import { Hono } from 'hono'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseService } from '../lib/supabase'
import { getSessionManager } from '../lib/session'
import { getQueryGenerator } from '../lib/query-generator'
import { OpenAIService } from '../lib/openai-service'

type Bindings = {
  KV?: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

interface ChatRequest {
  message: string;
  sessionId: string;
  history?: any[];
}

const chatRoutes = new Hono<{ Bindings: Bindings }>();

// Smart chat endpoint with Query Generator
chatRoutes.post('/api/chat-smart', async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json<ChatRequest>();
    const { message, sessionId } = body;
    
    console.log(`\n🤖 CHAT SMART - Processing: "${message}"`);
    console.log(`📝 Session ID: ${sessionId}`);
    
    // Get environment variables from multiple sources
    const supabaseUrl = c.env?.SUPABASE_URL || 
                       process.env.SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       'https://tecvgnrqcfqcrcodrjtt.supabase.co';
                       
    const supabaseKey = c.env?.SUPABASE_ANON_KEY || 
                       process.env.SUPABASE_ANON_KEY || 
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MjE1MzQsImV4cCI6MjA0ODI5NzUzNH0.j6rk4Y9GMZu0CAr20gbLlGdZPnGCB-yiwfjxRWxiuZE';
                       
    const googleApiKey = c.env?.GOOGLE_API_KEY || 
                        process.env.GOOGLE_API_KEY ||
                        'your_google_api_key_here';
                        
    const openaiApiKey = c.env?.OPENAI_API_KEY || 
                        process.env.OPENAI_API_KEY ||
                        'your_openai_api_key_here';
    
    // Initialize services
    const supabase = getSupabaseService(supabaseUrl, supabaseKey);
    const sessionManager = getSessionManager(c.env?.KV);
    const queryGenerator = getQueryGenerator(supabase);
    
    // Test database connection
    const isConnected = await supabase.testConnection();
    if (!isConnected) {
      return c.json({
        error: 'Database connection failed',
        response: '❌ Falha na conexão com o banco de dados. Verifique as credenciais.',
        estoqueLoaded: false,
        dbStatus: 'connection_failed'
      }, 500);
    }
    
    // Get session history
    const sessionHistory = await sessionManager.getSessionHistory(sessionId, 10);
    
    // Add user message to session
    await sessionManager.addMessage(sessionId, 'user', message, {
      timestamp: new Date().toISOString()
    });
    
    // Analyze intent
    const intent = queryGenerator.analyzeIntent(message, sessionHistory);
    console.log('🎯 Intent detected:', JSON.stringify(intent));
    
    // Generate and execute query plan
    const queryPlan = queryGenerator.generateQueryPlan(intent);
    console.log('📋 Query plan:', JSON.stringify(queryPlan));
    
    const queryResults = await queryGenerator.executeQueryPlan(queryPlan);
    console.log(`✅ Executed ${queryResults.length} queries`);
    
    // Format base response
    let response = queryGenerator.formatResults(intent, queryResults, message);
    let aiModel = 'local';
    
    // PRIORITY 1: Try OpenAI first (always, not just for low confidence)
    if (openaiApiKey && openaiApiKey !== 'your_openai_api_key_here') {
      try {
        console.log('🤖 Using OpenAI GPT-4 for response generation');
        const openAI = new OpenAIService(openaiApiKey);
        
        if (openAI.isReady()) {
          // Prepare inventory data for OpenAI
          const inventoryData = {
            queryResults: queryResults[0]?.data || [],
            summary: queryResults[0]?.summary || {},
            intent: intent,
            totalItems: queryResults[0]?.count || 0
          };
          
          // Generate response with OpenAI
          response = await openAI.processInventoryQuery(
            message,
            inventoryData,
            sessionHistory
          );
          
          aiModel = 'gpt-4';
          console.log('✅ OpenAI response generated successfully');
        }
      } catch (openaiError: any) {
        console.log('⚠️ OpenAI failed, falling back to Google Gemini:', openaiError.message);
        
        // PRIORITY 2: Fallback to Google Gemini
        if (googleApiKey && googleApiKey !== 'your_google_api_key_here') {
          try {
            console.log('🤖 Using Google Gemini as fallback');
            const genAI = new GoogleGenerativeAI(googleApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // Build context for AI
            const context = `
              Você é um assistente especializado em inventário.
              
              Pergunta do usuário: ${message}
              
              Dados do banco:
              ${JSON.stringify(queryResults[0]?.data || {}, null, 2).slice(0, 1000)}
              
              Responda de forma clara e objetiva, usando os dados fornecidos.
              Se não houver dados suficientes, informe isso claramente.
            `;
            
            const aiResult = await model.generateContent(context);
            const aiResponse = await aiResult.response;
            response = aiResponse.text();
            aiModel = 'gemini-1.5-flash';
            console.log('✅ Gemini response generated successfully');
          } catch (geminiError: any) {
            console.log('⚠️ Gemini also failed, using local response:', geminiError.message);
            aiModel = 'local';
          }
        }
      }
    } 
    // PRIORITY 3: If no OpenAI, try Gemini directly
    else if (googleApiKey && googleApiKey !== 'your_google_api_key_here') {
      try {
        console.log('🤖 Using Google Gemini (OpenAI not configured)');
        const genAI = new GoogleGenerativeAI(googleApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const context = `
          Você é um assistente especializado em inventário.
          
          Pergunta do usuário: ${message}
          
          Dados do banco:
          ${JSON.stringify(queryResults[0]?.data || {}, null, 2).slice(0, 1000)}
          
          Responda de forma clara e objetiva, usando os dados fornecidos.
          Se não houver dados suficientes, informe isso claramente.
        `;
        
        const aiResult = await model.generateContent(context);
        const aiResponse = await aiResult.response;
        response = aiResponse.text();
        aiModel = 'gemini-1.5-flash';
      } catch (geminiError: any) {
        console.log('⚠️ Gemini failed, using local response:', geminiError.message);
        aiModel = 'local';
      }
    } else {
      console.log('📝 Using local Query Generator (no AI configured)');
    }
    
    // Add response indicator with AI model info
    const responseTime = Date.now() - startTime;
    const aiIndicator = aiModel === 'gpt-4' ? '🧠 GPT-4' : 
                       aiModel === 'gemini-1.5-flash' ? '✨ Gemini' : 
                       '🔧 Local';
    response += `\n\n📊 *[${aiIndicator} | Query: ${responseTime}ms | Tipo: ${intent.type} | Confiança: ${Math.round(intent.confidence * 100)}%]*`;
    
    // Save assistant response to session
    await sessionManager.addMessage(sessionId, 'assistant', response, {
      intent: intent.type,
      queryType: queryPlan.queries[0]?.type,
      dbResults: queryResults[0]?.count,
      responseTime
    });
    
    // Get session stats
    const sessionStats = await sessionManager.getSessionStats(sessionId);
    
    // Return response with AI model info
    return c.json({
      response,
      estoqueLoaded: true,
      totalProdutos: queryResults[0]?.count || 0,
      dbStatus: 'connected',
      queryType: intent.type,
      confidence: intent.confidence,
      sessionStats,
      responseTime,
      aiModel,  // Include which AI was used
      aiStatus: {
        openai: openaiApiKey && openaiApiKey !== 'your_openai_api_key_here' ? 'configured' : 'not_configured',
        gemini: googleApiKey && googleApiKey !== 'your_google_api_key_here' ? 'configured' : 'not_configured'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Chat error:', error);
    
    return c.json({
      error: error.message,
      response: `❌ Erro ao processar mensagem: ${error.message}`,
      estoqueLoaded: false,
      dbStatus: 'error'
    }, 500);
  }
});

// Get session history endpoint
chatRoutes.get('/api/session/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const sessionManager = getSessionManager(c.env?.KV);
    const session = await sessionManager.getFullSession(sessionId);
    
    return c.json(session);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Export session for debugging
chatRoutes.get('/api/session/:sessionId/export', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const sessionManager = getSessionManager(c.env?.KV);
    const exportData = await sessionManager.exportSession(sessionId);
    
    return c.text(exportData, 200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="session_${sessionId}.json"`
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Clear session endpoint
chatRoutes.delete('/api/session/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const sessionManager = getSessionManager(c.env?.KV);
    await sessionManager.clearSession(sessionId);
    
    return c.json({ success: true, message: 'Session cleared' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Test database connection
chatRoutes.get('/api/test-connection', async (c) => {
  try {
    const supabaseUrl = c.env?.SUPABASE_URL || 
                       process.env.SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       'https://tecvgnrqcfqcrcodrjtt.supabase.co';
                       
    const supabaseKey = c.env?.SUPABASE_ANON_KEY || 
                       process.env.SUPABASE_ANON_KEY || 
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MjE1MzQsImV4cCI6MjA0ODI5NzUzNH0.j6rk4Y9GMZu0CAr20gbLlGdZPnGCB-yiwfjxRWxiuZE';
    
    const supabase = getSupabaseService(supabaseUrl, supabaseKey);
    const connected = await supabase.testConnection();
    
    if (connected) {
      const summary = await supabase.getInventorySummary();
      return c.json({
        connected: true,
        summary: summary.data
      });
    } else {
      return c.json({
        connected: false,
        error: 'Connection test failed'
      });
    }
  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    return c.json({
      connected: false,
      error: error.message
    }, 500);
  }
});

// Config check endpoint
chatRoutes.get('/api/config', async (c) => {
  return c.json({
    hasApiKey: true,
    hasSystemPrompt: true,
    hasDbUrl: true
  });
});

// AI Status endpoint - shows which AI services are available
chatRoutes.get('/api/ai-status', async (c) => {
  const openaiApiKey = c.env?.OPENAI_API_KEY || 
                       process.env.OPENAI_API_KEY ||
                       'your_openai_api_key_here';
                       
  const googleApiKey = c.env?.GOOGLE_API_KEY || 
                       process.env.GOOGLE_API_KEY ||
                       'your_google_api_key_here';
  
  const openaiConfigured = openaiApiKey && openaiApiKey !== 'your_openai_api_key_here';
  const geminiConfigured = googleApiKey && googleApiKey !== 'your_google_api_key_here';
  
  let openaiStatus = 'not_configured';
  let geminiStatus = 'not_configured';
  
  // Test OpenAI if configured
  if (openaiConfigured) {
    try {
      const openAI = new OpenAIService(openaiApiKey);
      openaiStatus = openAI.isReady() ? 'ready' : 'configured_but_not_ready';
    } catch {
      openaiStatus = 'error';
    }
  }
  
  // Test Gemini if configured
  if (geminiConfigured) {
    try {
      const genAI = new GoogleGenerativeAI(googleApiKey);
      // Simple test to see if we can create a model
      genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      geminiStatus = 'ready';
    } catch {
      geminiStatus = 'error';
    }
  }
  
  // Determine primary AI
  const primaryAI = openaiStatus === 'ready' ? 'openai' : 
                   geminiStatus === 'ready' ? 'gemini' : 
                   'local';
  
  return c.json({
    primaryAI,
    priority: [
      '1. OpenAI GPT-4 (if configured)',
      '2. Google Gemini (fallback)',
      '3. Local Query Generator (always available)'
    ],
    services: {
      openai: {
        status: openaiStatus,
        model: openaiStatus === 'ready' ? 'gpt-4' : null,
        configured: openaiConfigured,
        keyPrefix: openaiConfigured ? openaiApiKey.substring(0, 7) + '...' : null
      },
      gemini: {
        status: geminiStatus,
        model: geminiStatus === 'ready' ? 'gemini-1.5-flash' : null,
        configured: geminiConfigured,
        keyPrefix: geminiConfigured ? googleApiKey.substring(0, 7) + '...' : null
      },
      local: {
        status: 'always_ready',
        model: 'query-generator',
        configured: true
      }
    },
    recommendation: openaiStatus !== 'ready' ? 
      'Configure OpenAI API key for best performance' : 
      'System is using OpenAI GPT-4 for optimal responses'
  });
});

// History endpoint (legacy support)
chatRoutes.get('/api/history/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const sessionManager = getSessionManager(c.env?.KV);
    const session = await sessionManager.getFullSession(sessionId);
    return c.json(session.messages || []);
  } catch (error: any) {
    return c.json([], 200); // Return empty array on error for compatibility
  }
});

export default chatRoutes;