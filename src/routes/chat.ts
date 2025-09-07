// Main Chat API Route with Supabase Integration and Session Management
import { Hono } from 'hono'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseService } from '../lib/supabase'
import { getSessionManager } from '../lib/session'
import { getQueryGenerator } from '../lib/query-generator'

type Bindings = {
  KV?: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GOOGLE_API_KEY?: string;
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
    
    // Enhance response with AI if available and confidence is low
    if (googleApiKey && googleApiKey !== 'your_google_api_key_here' && intent.confidence < 0.7) {
      try {
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
      } catch (aiError: any) {
        console.log('⚠️ AI enhancement failed, using base response:', aiError.message);
      }
    }
    
    // Add response indicator
    const responseTime = Date.now() - startTime;
    response += `\n\n📊 *[Query executada em ${responseTime}ms | Tipo: ${intent.type} | Confiança: ${Math.round(intent.confidence * 100)}%]*`;
    
    // Save assistant response to session
    await sessionManager.addMessage(sessionId, 'assistant', response, {
      intent: intent.type,
      queryType: queryPlan.queries[0]?.type,
      dbResults: queryResults[0]?.count,
      responseTime
    });
    
    // Get session stats
    const sessionStats = await sessionManager.getSessionStats(sessionId);
    
    // Return response
    return c.json({
      response,
      estoqueLoaded: true,
      totalProdutos: queryResults[0]?.count || 0,
      dbStatus: 'connected',
      queryType: intent.type,
      confidence: intent.confidence,
      sessionStats,
      responseTime
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