// Chat Route com OpenAI Integration
import { Hono } from 'hono';
import { getOpenAIService } from '../lib/openai-service';
import { getSupabaseService } from '../lib/supabase';
import { getSessionManager } from '../lib/session';
import { getQueryGenerator } from '../lib/query-generator';

type Bindings = {
  KV?: KVNamespace;
  OPENAI_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

const openAIRoutes = new Hono<{ Bindings: Bindings }>();

// Chat endpoint com OpenAI
openAIRoutes.post('/api/chat-openai', async (c) => {
  const startTime = Date.now();
  
  try {
    const { message, sessionId } = await c.req.json();
    
    console.log(`🤖 OpenAI Chat - Processing: "${message}"`);
    console.log(`📝 Session ID: ${sessionId}`);
    
    // Configuração
    const openaiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const supabaseUrl = c.env?.SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = c.env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    // Inicializar serviços
    const openAI = getOpenAIService({ apiKey: openaiKey });
    const supabase = getSupabaseService(supabaseUrl!, supabaseKey!);
    const sessionManager = getSessionManager(c.env?.KV);
    const queryGenerator = getQueryGenerator(supabase);
    
    // Verificar se OpenAI está configurado
    if (!openAI.isReady()) {
      console.log('⚠️ OpenAI não configurado, usando Query Generator local');
      
      // Fallback para Query Generator local
      const intent = queryGenerator.analyzeIntent(message);
      const queryPlan = queryGenerator.generateQueryPlan(intent);
      const queryResults = await queryGenerator.executeQueryPlan(queryPlan);
      const response = queryGenerator.formatResults(intent, queryResults, message);
      
      return c.json({
        response,
        model: 'local-query-generator',
        responseTime: Date.now() - startTime
      });
    }
    
    // Obter histórico da sessão
    const sessionHistory = await sessionManager.getSessionHistory(sessionId, 5);
    
    // Buscar dados relevantes do inventário
    const intent = queryGenerator.analyzeIntent(message);
    const queryPlan = queryGenerator.generateQueryPlan(intent);
    const queryResults = await queryGenerator.executeQueryPlan(queryPlan);
    
    // Processar com OpenAI
    const response = await openAI.processInventoryQuery(
      message,
      queryResults[0]?.data,
      sessionHistory
    );
    
    // Salvar na sessão
    await sessionManager.addMessage(sessionId, 'user', message, {
      timestamp: new Date().toISOString()
    });
    
    await sessionManager.addMessage(sessionId, 'assistant', response, {
      model: 'openai',
      responseTime: Date.now() - startTime
    });
    
    // Retornar resposta
    return c.json({
      response,
      model: openAI.isReady() ? 'gpt-4' : 'local',
      responseTime: Date.now() - startTime,
      sessionStats: await sessionManager.getSessionStats(sessionId)
    });
    
  } catch (error: any) {
    console.error('❌ OpenAI Chat error:', error);
    return c.json({
      error: error.message,
      response: `❌ Erro ao processar: ${error.message}`
    }, 500);
  }
});

// Endpoint para análise de tendências
openAIRoutes.post('/api/analyze-trends', async (c) => {
  try {
    const { data } = await c.req.json();
    
    const openaiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAI = getOpenAIService({ apiKey: openaiKey });
    
    if (!openAI.isReady()) {
      return c.json({
        error: 'OpenAI não configurado'
      }, 400);
    }
    
    const analysis = await openAI.analyzeTrends(data);
    
    return c.json({
      analysis,
      model: 'gpt-4'
    });
    
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Endpoint para geração de relatório
openAIRoutes.post('/api/generate-report', async (c) => {
  try {
    const { data, type = 'summary' } = await c.req.json();
    
    const openaiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAI = getOpenAIService({ apiKey: openaiKey });
    
    if (!openAI.isReady()) {
      return c.json({
        error: 'OpenAI não configurado'
      }, 400);
    }
    
    const report = await openAI.generateReport(data, type);
    
    return c.json({
      report,
      type,
      model: 'gpt-4'
    });
    
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Comparação com GPT-4
openAIRoutes.post('/api/enhance-response', async (c) => {
  try {
    const { query, localResponse } = await c.req.json();
    
    const openaiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const openAI = getOpenAIService({ apiKey: openaiKey });
    
    if (!openAI.isReady()) {
      return c.json({
        enhanced: false,
        response: localResponse
      });
    }
    
    const result = await openAI.compareWithGPT4(query, localResponse);
    
    return c.json(result);
    
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default openAIRoutes;