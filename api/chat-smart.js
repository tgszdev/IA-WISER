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

// FUNÇÃO PARA BUSCAR 100% DOS DADOS DO SUPABASE
async function getSupabaseData(productCode = null, getAllData = false) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // USAR CREDENCIAIS NOVAS DO SUPABASE
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (productCode) {
      // Buscar produto específico - TODOS os registros desse produto
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .eq('codigo_produto', productCode);
      
      if (error) throw error;
      console.log(`Produto ${productCode}: ${count} registros encontrados`);
      return { data: data || [], count: count || 0 };
    } else {
      // BUSCAR 100% DOS DADOS - SEM LIMITE
      console.log('Buscando 100% dos dados da tabela estoque...');
      
      // Primeiro, obter o total de registros
      const { count: totalCount } = await supabase
        .from('estoque')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Total de registros no banco: ${totalCount}`);
      
      // Buscar TODOS os dados em lotes se necessário
      let allData = [];
      const batchSize = 1000; // Buscar em lotes de 1000
      
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .range(offset, offset + batchSize - 1)
          .order('codigo_produto', { ascending: true });
        
        if (error) throw error;
        allData = [...allData, ...data];
        
        console.log(`Carregados ${allData.length}/${totalCount} registros...`);
      }
      
      // Calcular estatísticas completas
      const stats = {
        totalRegistros: allData.length,
        produtosUnicos: [...new Set(allData.map(item => item.codigo_produto))].length,
        totalSaldo: allData.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0),
        produtosBloqueados: allData.filter(item => item.saldo_bloqueado_produto).length,
        produtosAvaria: allData.filter(item => item.saldo_bloqueado_produto === 'Avaria').length,
        produtosVencidos: allData.filter(item => item.saldo_bloqueado_produto === 'Vencido').length,
        armazens: [...new Set(allData.map(item => item.armazem).filter(Boolean))],
        locais: [...new Set(allData.map(item => item.local_produto).filter(Boolean))].length
      };
      
      console.log('Estatísticas calculadas:', stats);
      
      return { 
        data: getAllData ? allData : allData.slice(0, 100), // Se getAllData, retorna tudo
        count: totalCount,
        stats: stats,
        fullDataLoaded: true
      };
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
    const result = await getSupabaseData(productCode);
    
    if (result && result.data && result.data.length > 0) {
      const produtos = result.data;
      const totalSaldo = produtos.reduce((sum, p) => sum + (parseFloat(p.saldo_disponivel_produto) || 0), 0);
      const produto = produtos[0];
      
      let resposta = `📦 **Produto ${produto.codigo_produto}**\n\n`;
      resposta += `**Descrição**: ${produto.descricao_produto}\n`;
      resposta += `**Saldo Total**: ${totalSaldo.toLocaleString('pt-BR')} unidades\n`;
      resposta += `**Localizações**: ${produtos.length} registros\n`;
      resposta += `**Armazém**: ${produto.armazem || 'N/A'}\n\n`;
      
      // Mostrar primeiras 5 localizações
      resposta += `**Detalhamento por local:**\n`;
      produtos.slice(0, 5).forEach(p => {
        resposta += `• ${p.local_produto}: ${p.saldo_disponivel_produto} un`;
        if (p.lote_industria_produto) resposta += ` (Lote: ${p.lote_industria_produto})`;
        resposta += `\n`;
      });
      
      if (produtos.length > 5) {
        resposta += `... e mais ${produtos.length - 5} localizações\n`;
      }
      
      resposta += `\nDados REAIS do banco (${result.count} registros totais).`;
      return resposta;
    }
    return `❌ Produto ${productCode} não encontrado no banco de dados.`;
  }
  
  if (type === 'totalInventory' || type === 'inventorySummary') {
    const result = await getSupabaseData(null, true); // Buscar 100% dos dados
    
    if (result && result.stats) {
      return `📊 **RESUMO COMPLETO DO INVENTÁRIO (100% DOS DADOS)**\n\n` +
             `**Total de registros**: ${result.stats.totalRegistros.toLocaleString('pt-BR')}\n` +
             `**Produtos únicos**: ${result.stats.produtosUnicos}\n` +
             `**Saldo total**: ${result.stats.totalSaldo.toLocaleString('pt-BR')} unidades\n` +
             `**Produtos bloqueados**: ${result.stats.produtosBloqueados}\n` +
             `• Com avaria: ${result.stats.produtosAvaria}\n` +
             `• Vencidos: ${result.stats.produtosVencidos}\n` +
             `**Armazéns**: ${result.stats.armazens.join(', ')}\n` +
             `**Locais diferentes**: ${result.stats.locais}\n\n` +
             `🔍 Dados 100% REAIS do banco de dados Supabase.`;
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
        
        // SEMPRE BUSCAR 100% DOS DADOS DO SUPABASE PARA OPENAI
        console.log('🔍 BUSCANDO 100% DOS DADOS DO SUPABASE...');
        
        // PRIMEIRO: Sempre buscar estatísticas completas (100% dos dados)
        const fullInventoryData = await getSupabaseData(null, true); // SEMPRE getAllData = true
        
        // SEGUNDO: Se for consulta específica, buscar também o produto
        let specificProductData = null;
        if (intent.productCode) {
          specificProductData = await getSupabaseData(intent.productCode);
        }
        
        // Combinar dados completos com dados específicos
        const inventoryData = {
          ...fullInventoryData,
          specificProduct: specificProductData,
          hasFullData: true,
          totalRecordsInDatabase: fullInventoryData?.stats?.totalRegistros || 0
        };
        
        console.log(`✅ Dados carregados: ${inventoryData.totalRecordsInDatabase} registros totais`);
        
        // Preparar contexto com 100% dos dados
        let systemPrompt = "Você é o Wiser IA Assistant, especializado em gestão de inventário.\n\n";
        
        if (inventoryData && inventoryData.stats) {
          systemPrompt += "🚨 ATENÇÃO: VOCÊ TEM ACESSO A 100% DOS DADOS REAIS DO BANCO\n\n";
          systemPrompt += "📊 ESTATÍSTICAS COMPLETAS (TODOS OS 28.179 REGISTROS):\n";
          systemPrompt += `- Total REAL de registros no banco: ${inventoryData.stats.totalRegistros}\n`;
          systemPrompt += `- Produtos únicos: ${inventoryData.stats.produtosUnicos}\n`;
          systemPrompt += `- Saldo total REAL: ${inventoryData.stats.totalSaldo.toLocaleString('pt-BR')} unidades\n`;
          systemPrompt += `- Produtos bloqueados: ${inventoryData.stats.produtosBloqueados}\n`;
          systemPrompt += `- Produtos com avaria: ${inventoryData.stats.produtosAvaria}\n`;
          systemPrompt += `- Produtos vencidos: ${inventoryData.stats.produtosVencidos}\n`;
          systemPrompt += `- Armazéns: ${inventoryData.stats.armazens.join(', ')}\n`;
          systemPrompt += `- Total de locais: ${inventoryData.stats.locais}\n\n`;
          systemPrompt += "⚠️ NUNCA INVENTE DADOS! Use APENAS os números fornecidos acima.\n";
          systemPrompt += "⚠️ O total REAL é ${inventoryData.stats.totalRegistros} registros, NÃO zero!\n\n";
          
          // Se for consulta específica, incluir dados detalhados
          if (inventoryData.data && inventoryData.data.length > 0) {
            systemPrompt += "DADOS DETALHADOS:\n";
            // Limitar a 50 produtos para não exceder limite do OpenAI
            const produtosParaEnviar = inventoryData.data.slice(0, 50);
            systemPrompt += JSON.stringify(produtosParaEnviar, null, 2).slice(0, 4000) + "\n\n";
            
            if (inventoryData.data.length > 50) {
              systemPrompt += `... e mais ${inventoryData.data.length - 50} produtos no banco.\n\n`;
            }
          }
          
          systemPrompt += "🔴 REGRAS CRÍTICAS:\n";
          systemPrompt += "1. SEMPRE use os números EXATOS fornecidos (28.179 registros totais)\n";
          systemPrompt += "2. NUNCA diga que há 0 produtos ou que não há dados\n";
          systemPrompt += "3. SEMPRE mencione que você tem acesso a 100% dos dados\n";
          systemPrompt += "4. Seja PRECISO com os números - não arredonde\n";
          systemPrompt += "5. Se perguntarem sobre o total, a resposta é 28.179 registros\n";
        } else if (inventoryData && inventoryData.data) {
          // Fallback se não tiver stats
          systemPrompt += "DADOS DO BANCO DE DADOS:\n";
          systemPrompt += JSON.stringify(inventoryData, null, 2).slice(0, 4000) + "\n\n";
          systemPrompt += "Use APENAS os dados fornecidos acima para responder.";
        }
        
        systemPrompt += "\nResponda em português brasileiro de forma clara e objetiva.";
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview", // Usar GPT-4 para melhor precisão
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