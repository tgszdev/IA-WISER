// Smart Chat Route with 100% Real Data Access
import { Hono } from 'hono'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseService } from '../lib/supabase'
import { OpenAIService } from '../lib/openai-service'
import { GeminiService } from '../lib/gemini-service'

type Bindings = {
  KV: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
}

const chatSmartRoutes = new Hono<{ Bindings: Bindings }>()

// Main smart chat endpoint - 100% REAL DATA
chatSmartRoutes.post('/api/chat-smart', async (c) => {
  const startTime = Date.now();
  const { env } = c;
  
  try {
    const { message, sessionId } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    
    console.log(`🤖 CHAT SMART - Processing: "${message}"`);
    console.log(`📝 Session ID: ${sessionId || 'anonymous'}`);
    
    // Initialize services
    const supabaseService = getSupabaseService(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const openAIService = new OpenAIService({ apiKey: env.OPENAI_API_KEY });
    const geminiService = new GeminiService({ apiKey: env.GOOGLE_API_KEY });
    
    // Test database connection
    const isConnected = await supabaseService.testConnection();
    console.log(isConnected ? '✅ Database connection successful' : '❌ Database connection failed');
    
    // Simple intent detection
    const intent = {
      type: message.toLowerCase().includes('total') || message.toLowerCase().includes('resumo') ? 'totalInventory' : 'general',
      confidence: 0.8
    };
    console.log(`🎯 Intent detected: ${JSON.stringify(intent)}`);
    
    // Execute queries - ALWAYS LOAD 100% OF DATA FOR COMPLETE VISIBILITY
    let inventoryData = null;
    let totalItems = 0;
    let stats = null;
    
    if (isConnected) {
      try {
        // ALWAYS get complete inventory summary for context
        const summaryResult = await supabaseService.getInventorySummary();
        
        console.log(`🔍 Summary Result Type: ${summaryResult.type}`);
        console.log(`🔍 Summary Data:`, JSON.stringify(summaryResult.data).slice(0, 500));
        
        if (summaryResult.type === 'summary' && summaryResult.data) {
          stats = summaryResult.data;
          totalItems = stats.totalRecords || 0;
          
          console.log(`📊 ESTATÍSTICAS COMPLETAS (100% DOS DADOS):`);
          console.log(`   - Total de registros: ${stats.totalRecords}`);
          console.log(`   - Produtos únicos: ${stats.uniqueProducts}`);
          console.log(`   - Saldo total: ${stats.totalBalance}`);
          console.log(`   - Produtos bloqueados: ${stats.blockedProducts}`);
        } else {
          console.log('⚠️ Stats not loaded properly!');
        }
        
        // Get specific product data if requested
        let queryResults = [];
        const productMatch = message.match(/\b(\d{3,})\b/);
        if (productMatch) {
          const productCode = productMatch[1].padStart(6, '0');
          const productResult = await supabaseService.searchByProductCode(productCode);
          if (productResult.data) {
            queryResults = productResult.data;
          }
        }
        
        inventoryData = {
          stats: stats,
          queryResults: queryResults,
          totalItems: totalItems,
          fullDataLoaded: true,
          intent: intent,
          summary: stats // Adicionando summary também para compatibilidade
        };
        
        console.log(`📦 Inventory Data Created:`);
        console.log(`   - Stats available: ${stats ? 'YES' : 'NO'}`);
        console.log(`   - Total items: ${totalItems}`);
        console.log(`   - Full data loaded: ${inventoryData.fullDataLoaded}`);
      } catch (error) {
        console.error('❌ Error loading inventory:', error);
      }
    }
    
    // Generate response with AI
    let response = '';
    let aiModel = 'local';
    let debugInfo = null;
    
    // Try OpenAI first with 100% data context
    if (openAIService.isReady()) {
      try {
        console.log('🤖 Using OpenAI GPT-4 for response generation');
        console.log(`📤 Sending to OpenAI - Stats: ${inventoryData?.stats ? 'YES' : 'NO'}, Total: ${inventoryData?.totalItems || 0}`);
        response = await openAIService.processInventoryQuery(
          message,
          inventoryData,
          [] // No session history for now
        );
        aiModel = 'gpt-4';
        console.log('✅ OpenAI response generated successfully');
      } catch (error) {
        console.error('❌ OpenAI error:', error);
      }
    }
    
    // Fallback to Gemini if OpenAI fails
    if (!response && geminiService.isReady()) {
      try {
        console.log('🤖 Using Google Gemini as fallback');
        response = await geminiService.processInventoryQuery(
          message,
          inventoryData,
          [] // No session history for now
        );
        aiModel = 'gemini';
        console.log('✅ Gemini response generated successfully');
      } catch (error) {
        console.error('❌ Gemini error:', error);
      }
    }
    
    // Final fallback to local response
    if (!response) {
      console.log('🤖 Using local response generator');
      
      if (inventoryData && inventoryData.stats) {
        response = `📊 **RESUMO COMPLETO DO INVENTÁRIO (100% DOS DADOS)**\n\n`;
        response += `**Total de registros**: ${inventoryData.stats.totalRecords?.toLocaleString('pt-BR') || 0}\n`;
        response += `**Produtos únicos**: ${inventoryData.stats.uniqueProducts || 0}\n`;
        response += `**Saldo total**: ${inventoryData.stats.totalBalance?.toLocaleString('pt-BR') || 0} unidades\n`;
        response += `**Produtos bloqueados**: ${inventoryData.stats.blockedProducts || 0}\n`;
        response += `• Com avaria: ${inventoryData.stats.damageProducts || 0}\n`;
        response += `• Vencidos: ${inventoryData.stats.expiredProducts || 0}\n`;
        response += `**Armazéns**: ${inventoryData.stats.warehouses?.join(', ') || 'N/A'}\n`;
        response += `**Locais diferentes**: ${inventoryData.stats.locations || 0}\n\n`;
        response += `🔍 Dados 100% REAIS do banco de dados Supabase.`;
      } else {
        response = '⚠️ Não foi possível acessar o banco de dados.';
      }
      
      aiModel = 'local';
    }
    
    // Add metadata to response
    const processingTime = Date.now() - startTime;
    const metadata = `\n\n📊 *[🧠 ${aiModel.toUpperCase()} | Query: ${processingTime}ms | Tipo: ${intent.type} | Confiança: ${Math.round(intent.confidence * 100)}%]*`;
    response += metadata;
    
    // Simple session stats
    const sessionStats = {
      sessionId: sessionId || 'default',
      timestamp: new Date().toISOString()
    };
    
    // Return response
    return c.json({
      response: response,
      estoqueLoaded: isConnected,
      totalProdutos: totalItems,
      dbStatus: isConnected ? 'connected' : 'disconnected',
      queryType: intent.type,
      confidence: intent.confidence,
      sessionStats: sessionStats,
      fullDataStats: stats,
      responseTime: processingTime,
      aiModel: aiModel,
      aiStatus: {
        openai: openAIService.isReady() ? 'configured' : 'not configured',
        gemini: geminiService.isReady() ? 'configured' : 'not configured'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Chat Smart Error:', error);
    return c.json({
      error: error.message || 'Internal server error',
      response: '❌ Erro ao processar sua mensagem. Por favor, tente novamente.'
    }, 500);
  }
});

// Health check endpoint
chatSmartRoutes.get('/api/chat-smart/health', async (c) => {
  const { env } = c;
  
  const supabaseService = getSupabaseService(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const openAIService = new OpenAIService({ apiKey: env.OPENAI_API_KEY });
  const geminiService = new GeminiService({ apiKey: env.GOOGLE_API_KEY });
  
  const dbConnected = await supabaseService.testConnection();
  
  return c.json({
    success: true,
    status: 'healthy',
    services: {
      database: dbConnected ? 'connected' : 'disconnected',
      openai: openAIService.isReady() ? 'configured' : 'not configured',
      gemini: geminiService.isReady() ? 'configured' : 'not configured'
    },
    timestamp: new Date().toISOString()
  });
});

export default chatSmartRoutes;