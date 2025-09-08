// Vercel serverless function for smart chat
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple intent patterns for common queries
const intentPatterns = {
  productBalance: /(?:saldo|quantidade|estoque|disponível).*(produto|cod|código|item)?\s*(\d{3,})/i,
  productInfo: /(?:qual|quanto|mostr|info|detalh|sobre|me fal|me dig).*(produto|cod|código|item)?\s*(\d{3,})/i,
  totalInventory: /(?:total|soma|quanto|tudo|geral).*(?:estoque|inventário|saldo)/i,
  greeting: /^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|alô|e aí|tudo bem|como vai)$/i,
  help: /(?:ajuda|help|como|tutorial|instrução|manual|guia|explicação|ensina|aprend|entend|dúvida|pergunt)/i,
};

// REMOVENDO DADOS MOCK - USAR APENAS DADOS REAIS DO SUPABASE
// const mockInventory = []; // REMOVIDO - NÃO USAR DADOS FALSOS

function analyzeIntent(message) {
  const lower = message.toLowerCase();
  
  // Extract product code if present
  const productMatch = message.match(/\b(\d{3,})\b/);
  const productCode = productMatch ? productMatch[1].padStart(6, '0') : null;
  
  // Check patterns
  for (const [type, pattern] of Object.entries(intentPatterns)) {
    if (pattern.test(message)) {
      return { type, productCode, confidence: 0.8 };
    }
  }
  
  // Default
  return { type: 'general', productCode, confidence: 0.5 };
}

// FUNÇÃO PARA BUSCAR DADOS REAIS DO SUPABASE
async function getSupabaseData(productCode) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // USAR CREDENCIAIS NOVAS DO SUPABASE
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (productCode) {
      // Buscar produto específico
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('codigo_produto', productCode);
      
      if (error) throw error;
      return data || [];
    } else {
      // Buscar resumo geral
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .limit(20);
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    }
  } catch (error) {
    console.error('Erro Supabase:', error);
    return null;
  }
}

async function getLocalResponse(intent, message) {
  const { type, productCode } = intent;
  
  if (type === 'greeting') {
    return '👋 Olá! Sou o Wiser IA Assistant. Como posso ajudá-lo com o inventário hoje?';
  }
  
  if (type === 'help') {
    return `📚 **Como posso ajudar:**\n\n` +
           `• "Qual o saldo do produto 000004?"\n` +
           `• "Me fale sobre o produto 123"\n` +
           `• "Qual o total do estoque?"\n` +
           `• "Produtos com estoque baixo"\n\n` +
           `Digite sua pergunta!`;
  }
  
  // BUSCAR DADOS REAIS DO SUPABASE
  if (productCode && (type === 'productBalance' || type === 'productInfo')) {
    const produtos = await getSupabaseData(productCode);
    
    if (produtos && produtos.length > 0) {
      const totalSaldo = produtos.reduce((sum, p) => sum + (parseFloat(p.saldo_disponivel_produto) || 0), 0);
      const produto = produtos[0];
      
      return `📦 **Produto ${produto.codigo_produto}**\n\n` +
             `**Descrição**: ${produto.descricao_produto}\n` +
             `**Saldo Total**: ${totalSaldo.toLocaleString('pt-BR')} unidades\n` +
             `**Localizações**: ${produtos.length}\n` +
             `**Armazém**: ${produto.armazem || 'N/A'}\n\n` +
             `Dados REAIS do banco de dados.`;
    }
    return `❌ Produto ${productCode} não encontrado no banco de dados REAL.`;
  }
  
  if (type === 'totalInventory') {
    const result = await getSupabaseData();
    
    if (result && result.data) {
      const totalSaldo = result.data.reduce((sum, p) => sum + (parseFloat(p.saldo_disponivel_produto) || 0), 0);
      
      return `📊 **Resumo do Inventário REAL**\n\n` +
             `**Total de registros**: ${result.count}\n` +
             `**Saldo das amostras**: ${totalSaldo.toLocaleString('pt-BR')} unidades\n` +
             `**Dados do banco**: Supabase\n\n` +
             `Dados REAIS do banco de dados.`;
    }
    return '⚠️ Erro ao acessar banco de dados.';
  }
  
  return `📋 **Processando sua pergunta**\n\n` +
         `Buscando dados REAIS no banco...\n` +
         `Pergunta: "${message}"`;
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
    
    console.log(`Processing: "${message}" for session: ${sessionId}`);
    
    // Analyze intent
    const intent = analyzeIntent(message);
    let response = '';
    let aiModel = 'local';
    
    // Try OpenAI first WITH REAL DATA
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !openaiKey.includes('your_') && !openaiKey.includes('xxx')) {
      try {
        console.log('Trying OpenAI with REAL data...');
        const openai = new OpenAI({ apiKey: openaiKey });
        
        // BUSCAR DADOS REAIS DO SUPABASE PARA OPENAI
        let inventoryData = null;
        if (intent.productCode) {
          inventoryData = await getSupabaseData(intent.productCode);
        } else if (intent.type === 'totalInventory' || intent.type === 'inventorySummary') {
          inventoryData = await getSupabaseData();
        }
        
        // Preparar contexto com dados REAIS
        let systemPrompt = "Você é o Wiser IA Assistant, especializado em gestão de inventário.\n\n";
        
        if (inventoryData) {
          systemPrompt += "DADOS REAIS DO BANCO DE DADOS SUPABASE:\n";
          systemPrompt += JSON.stringify(inventoryData, null, 2).slice(0, 2000) + "\n\n";
          systemPrompt += "Use APENAS os dados fornecidos acima para responder. ";
          systemPrompt += "Seja preciso com números e quantidades. ";
          systemPrompt += "Se não houver dados, informe claramente.";
        }
        
        systemPrompt += "\nResponda em português brasileiro de forma clara e objetiva.";
        
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.3 // Mais determinístico para dados
        });
        
        response = completion.choices[0].message.content;
        aiModel = 'gpt-3.5-turbo';
        console.log('OpenAI response with REAL data generated');
        
      } catch (error) {
        console.log('OpenAI failed:', error.message);
        
        // Try Google Gemini as fallback
        const googleKey = process.env.GOOGLE_API_KEY;
        if (googleKey && !googleKey.includes('your_') && !googleKey.includes('xxx')) {
          try {
            console.log('Trying Google Gemini...');
            const genAI = new GoogleGenerativeAI(googleKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const result = await model.generateContent(message);
            response = result.response.text();
            aiModel = 'gemini-1.5-flash';
            console.log('Gemini response generated');
            
          } catch (geminiError) {
            console.log('Gemini also failed:', geminiError.message);
          }
        }
      }
    }
    
    // If no AI worked, use local response WITH REAL DATA FROM SUPABASE
    if (!response) {
      console.log('Using local response with REAL data from Supabase');
      response = await getLocalResponse(intent, message); // AWAIT PARA BUSCAR DADOS REAIS
      aiModel = 'local';
    }
    
    // Add AI indicator to response
    const aiIndicator = aiModel === 'gpt-3.5-turbo' ? '🧠 GPT-3.5' : 
                       aiModel === 'gemini-1.5-flash' ? '✨ Gemini' : 
                       '🔧 Local';
    
    response += `\n\n📊 *[${aiIndicator} | ${Date.now() - startTime}ms | Confiança: ${Math.round(intent.confidence * 100)}%]*`;
    
    return res.status(200).json({
      response,
      aiModel,
      queryType: intent.type,
      confidence: intent.confidence,
      responseTime: Date.now() - startTime,
      sessionId,
      aiStatus: {
        openai: openaiKey ? 'configured' : 'not_configured',
        gemini: process.env.GOOGLE_API_KEY ? 'configured' : 'not_configured'
      }
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: error.message,
      response: `❌ Erro ao processar mensagem: ${error.message}`
    });
  }
}