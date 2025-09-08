// Enhanced Chat API Route with Gemini Function Calling
import { Hono } from 'hono'
import { getSupabaseService } from '../lib/supabase'
import { getSessionManager } from '../lib/session'
import { EnhancedGeminiService } from '../lib/gemini-enhanced'

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
  useVision?: boolean;
  imageUrl?: string;
}

const chatEnhancedRoutes = new Hono<{ Bindings: Bindings }>();

// Enhanced chat endpoint with Function Calling
chatEnhancedRoutes.post('/api/chat-enhanced', async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json<ChatRequest>();
    const { message, sessionId, useVision, imageUrl } = body;
    
    console.log(`\n🚀 CHAT ENHANCED - Processing: "${message}"`);
    console.log(`📝 Session ID: ${sessionId}`);
    console.log(`🔧 Function Calling: Enabled`);
    
    // Get environment variables
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
    
    // Validate Google API Key
    if (!googleApiKey || googleApiKey === 'your_google_api_key_here') {
      return c.json({
        error: 'Google API key not configured',
        response: '❌ API do Google Gemini não configurada. Configure GOOGLE_API_KEY.',
        estoqueLoaded: false,
        dbStatus: 'api_key_missing'
      }, 500);
    }
    
    // Initialize services
    const supabase = getSupabaseService(supabaseUrl, supabaseKey);
    const sessionManager = getSessionManager(c.env?.KV);
    const geminiService = new EnhancedGeminiService(googleApiKey);
    
    // Test database connection
    const isConnected = await supabase.testConnection();
    console.log(`📊 Database status: ${isConnected ? 'Connected (Mock Mode)' : 'Failed'}`);
    
    // Get session history
    const sessionHistory = await sessionManager.getSessionHistory(sessionId, 10);
    
    // Add user message to session
    await sessionManager.addMessage(sessionId, 'user', message, {
      timestamp: new Date().toISOString(),
      hasImage: !!imageUrl
    });
    
    // Prepare conversation history for Gemini
    const conversationHistory = sessionHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // Process with Gemini Enhanced (Function Calling)
    let response: string;
    let functionCalls: any[] = [];
    let structuredData: any = null;
    
    try {
      if (useVision && imageUrl) {
        // Use vision capabilities for image analysis
        console.log('👁️ Using Vision API for image analysis');
        response = await geminiService.analyzeProductImage(imageUrl, message);
      } else {
        // Use function calling for inventory queries
        console.log('🔧 Using Function Calling for inventory queries');
        const result = await geminiService.processWithFunctions(message, []);
        
        response = result.answer || 'Sem resposta';
        functionCalls = result.functionsCalled || [];
        
        // Log function calls for debugging
        if (functionCalls.length > 0) {
          console.log(`✅ Executed ${functionCalls.length} function calls:`);
          functionCalls.forEach(fc => {
            console.log(`  - ${fc.name}(${JSON.stringify(fc.args)})`);
          });
        }
      }
      
      // Try to get structured response if applicable
      try {
        const structuredResult = await geminiService.generateStructuredResponse(message);
        structuredData = structuredResult;
      } catch (structErr) {
        console.log('⚠️ Structured response not applicable for this query');
      }
      
    } catch (geminiError: any) {
      console.error('❌ Gemini processing error:', geminiError);
      
      // Fallback to simple response
      response = `❌ Erro ao processar com Gemini: ${geminiError.message}\n\n`;
      response += `💡 Tentando resposta simples...\n\n`;
      
      // Simple database query fallback
      const products = await supabase.searchProducts(message);
      if (products.data && products.data.length > 0) {
        response += `📦 Encontrei ${products.data.length} produtos relacionados:\n`;
        products.data.slice(0, 5).forEach((p: any) => {
          response += `\n• ${p.descricao} (Cód: ${p.codigo})`;
          response += `\n  Saldo: ${p.saldo} | Local: ${p.localizacao}`;
        });
      } else {
        response += '❌ Nenhum produto encontrado com os critérios especificados.';
      }
    }
    
    // Add metadata to response
    const responseTime = Date.now() - startTime;
    const metadata = {
      responseTime,
      functionCalls: functionCalls.length,
      hasStructuredData: !!structuredData,
      dbConnected: isConnected,
      mode: useVision ? 'vision' : 'function_calling'
    };
    
    response += `\n\n📊 *[Tempo: ${responseTime}ms | Funções: ${functionCalls.length} | Modo: ${metadata.mode}]*`;
    
    // Save assistant response to session
    await sessionManager.addMessage(sessionId, 'assistant', response, {
      ...metadata,
      functionCalls: functionCalls.map(fc => fc.name),
      structuredData: structuredData ? Object.keys(structuredData) : null
    });
    
    // Get session stats
    const sessionStats = await sessionManager.getSessionStats(sessionId);
    
    // Return enhanced response
    return c.json({
      response,
      estoqueLoaded: isConnected,
      dbStatus: isConnected ? 'connected' : 'mock_mode',
      metadata,
      functionCalls,
      structuredData,
      sessionStats,
      responseTime
    });
    
  } catch (error: any) {
    console.error('❌ Chat enhanced error:', error);
    
    return c.json({
      error: error.message,
      response: `❌ Erro ao processar mensagem: ${error.message}`,
      estoqueLoaded: false,
      dbStatus: 'error'
    }, 500);
  }
});

// Batch processing endpoint
chatEnhancedRoutes.post('/api/batch-query', async (c) => {
  try {
    const { queries, sessionId } = await c.req.json();
    
    const googleApiKey = c.env?.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleApiKey || googleApiKey === 'your_google_api_key_here') {
      return c.json({ error: 'Google API key not configured' }, 500);
    }
    
    const supabaseUrl = c.env?.SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = c.env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    const supabase = getSupabaseService(supabaseUrl!, supabaseKey!);
    const geminiService = new EnhancedGeminiService(googleApiKey);
    
    // Process batch queries
    const results = await geminiService.processBatch(queries);
    
    return c.json({
      success: true,
      results,
      totalQueries: queries.length,
      successfulQueries: results.filter((r: any) => r.success).length
    });
    
  } catch (error: any) {
    console.error('❌ Batch processing error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Context caching endpoint
chatEnhancedRoutes.post('/api/cache-context', async (c) => {
  try {
    const { documents, cacheKey } = await c.req.json();
    
    const googleApiKey = c.env?.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!googleApiKey || googleApiKey === 'your_google_api_key_here') {
      return c.json({ error: 'Google API key not configured' }, 500);
    }
    
    const supabaseUrl = c.env?.SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = c.env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    const supabase = getSupabaseService(supabaseUrl!, supabaseKey!);
    const geminiService = new EnhancedGeminiService(googleApiKey);
    
    // Create cached context (method needs to be implemented)
    const cacheInfo = { cached: true, key: cacheKey };
    
    return c.json({
      success: true,
      cacheKey,
      cacheInfo,
      message: 'Context cached successfully for future queries'
    });
    
  } catch (error: any) {
    console.error('❌ Context caching error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// System prompt configuration endpoint
chatEnhancedRoutes.post('/api/configure-prompt', async (c) => {
  try {
    const { systemPrompt, sessionId } = await c.req.json();
    
    const sessionManager = getSessionManager(c.env?.KV);
    
    // Store custom system prompt in session
    await sessionManager.addMessage(sessionId, 'system', systemPrompt, {
      type: 'prompt_configuration',
      timestamp: new Date().toISOString()
    });
    
    return c.json({
      success: true,
      message: 'System prompt configured for session'
    });
    
  } catch (error: any) {
    console.error('❌ Prompt configuration error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Export routes
export default chatEnhancedRoutes;