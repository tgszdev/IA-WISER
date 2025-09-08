// Vercel serverless function with REAL Supabase connection
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase with the NEW credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';

// Initialize OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize OpenAI if key exists
let openai = null;
if (OPENAI_API_KEY && !OPENAI_API_KEY.includes('your_')) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// Analyze user intent
function analyzeIntent(message) {
  const lower = message.toLowerCase();
  
  // Extract product code
  const productMatch = message.match(/\b(\d{3,})\b/);
  const productCode = productMatch ? productMatch[1].padStart(6, '0') : null;
  
  // Determine intent type
  if (/(?:saldo|quantidade|estoque|disponível).*\d{3,}/i.test(message)) {
    return { type: 'productBalance', productCode, confidence: 0.9 };
  }
  if (/(?:qual|info|detalh|sobre|mostr).*produto/i.test(message)) {
    return { type: 'productInfo', productCode, confidence: 0.85 };
  }
  if (/(?:total|resumo|geral|todos).*(?:estoque|inventário|produtos)/i.test(message)) {
    return { type: 'inventorySummary', confidence: 0.85 };
  }
  if (/(?:baixo|pouco|mínimo|crítico|acabando)/i.test(message)) {
    return { type: 'lowStock', confidence: 0.8 };
  }
  if (/(?:avaria|bloqueado|problema|defeito|vencido)/i.test(message)) {
    return { type: 'blockedItems', confidence: 0.8 };
  }
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(message)) {
    return { type: 'greeting', confidence: 0.95 };
  }
  
  return { type: 'general', productCode, confidence: 0.5 };
}

// Query Supabase for inventory data
async function queryInventory(intent) {
  const results = {
    data: [],
    count: 0,
    error: null
  };
  
  try {
    if (intent.type === 'productBalance' || intent.type === 'productInfo') {
      if (intent.productCode) {
        // Search for specific product
        const { data, error, count } = await supabase
          .from('estoque')
          .select('*', { count: 'exact' })
          .eq('codigo_produto', intent.productCode);
        
        if (error) throw error;
        results.data = data || [];
        results.count = count || 0;
      }
    } else if (intent.type === 'inventorySummary') {
      // Get summary of all products
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .limit(100);
      
      if (error) throw error;
      results.data = data || [];
      results.count = count || 0;
    } else if (intent.type === 'lowStock') {
      // Get products with low stock
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .lt('saldo_disponivel_produto', 50)
        .limit(20);
      
      if (error) throw error;
      results.data = data || [];
      results.count = count || 0;
    } else if (intent.type === 'blockedItems') {
      // Get blocked or damaged products
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .or('saldo_bloqueado_produto.eq.Avaria,saldo_bloqueado_produto.eq.Vencido')
        .limit(20);
      
      if (error) throw error;
      results.data = data || [];
      results.count = count || 0;
    } else {
      // General query - get sample data
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .limit(10);
      
      if (error) throw error;
      results.data = data || [];
      results.count = count || 0;
    }
  } catch (error) {
    console.error('Supabase query error:', error);
    results.error = error.message;
  }
  
  return results;
}

// Generate response using OpenAI with real data
async function generateOpenAIResponse(message, inventoryData, intent) {
  if (!openai) {
    return generateLocalResponse(message, inventoryData, intent);
  }
  
  try {
    const systemPrompt = `Você é o Wiser IA Assistant, especializado em gestão de inventário.

DADOS REAIS DO BANCO DE DADOS:
${JSON.stringify(inventoryData, null, 2)}

REGRAS:
1. Use SEMPRE os dados fornecidos acima para responder
2. Seja preciso com números e quantidades do banco de dados
3. Se não houver dados, informe claramente
4. Use português brasileiro
5. Formate com markdown quando apropriado
6. Use emojis para melhor visualização`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    return generateLocalResponse(message, inventoryData, intent);
  }
}

// Generate local response without AI
function generateLocalResponse(message, inventoryData, intent) {
  const { data, count } = inventoryData;
  
  if (intent.type === 'greeting') {
    return '👋 Olá! Sou o Wiser IA Assistant. Como posso ajudá-lo com o inventário hoje?';
  }
  
  if (intent.type === 'productBalance' || intent.type === 'productInfo') {
    if (data && data.length > 0) {
      const totalSaldo = data.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
      const product = data[0];
      
      return `📦 **Produto ${product.codigo_produto}**\n\n` +
             `**Descrição**: ${product.descricao_produto}\n` +
             `**Saldo Total**: ${totalSaldo.toLocaleString('pt-BR')} unidades\n` +
             `**Registros**: ${data.length} localizações\n` +
             `**Armazém**: ${product.armazem || 'N/A'}\n\n` +
             `Detalhes por localização:\n` +
             data.slice(0, 5).map(item => 
               `• Local ${item.local_produto}: ${item.saldo_disponivel_produto} unidades`
             ).join('\n');
    }
    return `❌ Produto ${intent.productCode} não encontrado no banco de dados.`;
  }
  
  if (intent.type === 'inventorySummary') {
    return `📊 **Resumo do Inventário**\n\n` +
           `**Total de registros**: ${count} itens\n` +
           `**Produtos mostrados**: ${data.length}\n\n` +
           'Use consultas específicas para mais detalhes.';
  }
  
  if (intent.type === 'lowStock') {
    if (data && data.length > 0) {
      return `⚠️ **Produtos com Estoque Baixo**\n\n` +
             `Encontrados ${count} produtos com menos de 50 unidades:\n\n` +
             data.slice(0, 10).map(item => 
               `• ${item.codigo_produto} - ${item.descricao_produto}: ${item.saldo_disponivel_produto} un`
             ).join('\n');
    }
    return '✅ Nenhum produto com estoque crítico no momento.';
  }
  
  if (intent.type === 'blockedItems') {
    if (data && data.length > 0) {
      return `🚫 **Produtos Bloqueados**\n\n` +
             `Encontrados ${count} produtos com problemas:\n\n` +
             data.slice(0, 10).map(item => 
               `• ${item.codigo_produto}: ${item.saldo_bloqueado_produto} - ${item.saldo_disponivel_produto} un`
             ).join('\n');
    }
    return '✅ Nenhum produto bloqueado ou com avaria no momento.';
  }
  
  return `📋 Processando: "${message}"\n\n` +
         `Encontrados ${count} registros no banco de dados.\n` +
         `Use perguntas mais específicas para melhores resultados.`;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`Processing: "${message}"`);
    
    // Analyze intent
    const intent = analyzeIntent(message);
    console.log('Intent:', intent);
    
    // Query Supabase for real data
    const inventoryData = await queryInventory(intent);
    console.log(`Found ${inventoryData.count} items in database`);
    
    // Generate response
    let response;
    if (inventoryData.error) {
      response = `❌ Erro ao conectar com o banco de dados: ${inventoryData.error}\n\n` +
                `Verifique as credenciais do Supabase.`;
    } else {
      response = await generateOpenAIResponse(message, inventoryData, intent);
    }
    
    // Add metadata
    const responseTime = Date.now() - startTime;
    const aiModel = openai ? 'gpt-4' : 'local';
    response += `\n\n📊 *[${aiModel === 'gpt-4' ? '🧠 GPT-4' : '🔧 Local'} | ${responseTime}ms | ${intent.type} | ${Math.round(intent.confidence * 100)}%]*`;
    
    // Return response
    return res.status(200).json({
      response,
      estoqueLoaded: !inventoryData.error,
      totalProdutos: inventoryData.count,
      dbStatus: inventoryData.error ? 'error' : 'connected',
      queryType: intent.type,
      confidence: intent.confidence,
      responseTime,
      aiModel,
      sessionStats: {
        sessionId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      response: `❌ Erro ao processar: ${error.message}`
    });
  }
}