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

// Mock inventory data for testing
const mockInventory = [
  { codigo: '000004', descricao: 'PRODUTO ESPECIAL 004', saldo: 850, lotes: 2, local: 'BARUERI' },
  { codigo: '000032', descricao: 'PRODUTO TESTE EXEMPLO 032', saldo: 1250, lotes: 3, local: 'BARUERI' },
  { codigo: '000123', descricao: 'PRODUTO DEMO 123', saldo: 500, lotes: 1, local: 'BARUERI' },
];

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

function getLocalResponse(intent, message) {
  const { type, productCode } = intent;
  
  if (type === 'greeting') {
    return '👋 Olá! Sou o Wiser IA Assistant. Posso ajudá-lo com informações sobre o inventário. Pergunte sobre saldos, produtos, ou peça uma análise!';
  }
  
  if (type === 'help') {
    return `📚 **Como posso ajudar:**\n\n` +
           `• "Qual o saldo do produto 000004?"\n` +
           `• "Me fale sobre o produto 123"\n` +
           `• "Qual o total do estoque?"\n` +
           `• "Faça uma análise do inventário"\n` +
           `• "Produtos com estoque baixo"\n\n` +
           `Digite sua pergunta e eu responderei com as informações disponíveis!`;
  }
  
  if (productCode && (type === 'productBalance' || type === 'productInfo')) {
    const product = mockInventory.find(p => p.codigo === productCode);
    if (product) {
      return `📦 **Produto ${product.codigo}**\n\n` +
             `**Descrição**: ${product.descricao}\n` +
             `**Saldo disponível**: ${product.saldo} unidades\n` +
             `**Lotes**: ${product.lotes}\n` +
             `**Localização**: ${product.local}`;
    }
    return `❌ Produto ${productCode} não encontrado no sistema.`;
  }
  
  if (type === 'totalInventory') {
    const total = mockInventory.reduce((sum, p) => sum + p.saldo, 0);
    return `📊 **Resumo do Inventário**\n\n` +
           `**Total de produtos**: ${mockInventory.length}\n` +
           `**Saldo total**: ${total.toLocaleString('pt-BR')} unidades\n` +
           `**Localização**: BARUERI`;
  }
  
  return `📋 **Processando sua pergunta**\n\n` +
         `Entendi que você quer saber sobre: "${message}"\n\n` +
         `Para melhor precisão, tente perguntas como:\n` +
         `• "Qual o saldo do produto 000004?"\n` +
         `• "Qual o total do estoque?"\n` +
         `• "Me fale sobre o produto 123"`;
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
    
    // Try OpenAI first
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !openaiKey.includes('your_') && !openaiKey.includes('xxx')) {
      try {
        console.log('Trying OpenAI...');
        const openai = new OpenAI({ apiKey: openaiKey });
        
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "Você é um assistente especializado em gestão de inventário. Responda em português de forma clara e objetiva."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        });
        
        response = completion.choices[0].message.content;
        aiModel = 'gpt-3.5-turbo';
        console.log('OpenAI response generated');
        
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
    
    // If no AI worked, use local response
    if (!response) {
      console.log('Using local response');
      response = getLocalResponse(intent, message);
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