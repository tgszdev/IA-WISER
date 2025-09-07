// Chat Inteligente - Query Generator Simplificado
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Configuração
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const genAI = process.env.GOOGLE_API_KEY ? 
  new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

// Analisador de intenção
function analyzeIntent(message) {
  const lower = message.toLowerCase();
  
  // Detectar o que o usuário quer
  if (lower.includes('saldo') && lower.includes('000004')) {
    return { type: 'product_balance', product: '000004' };
  }
  if (lower.includes('saldo total') || lower.includes('total do estoque')) {
    return { type: 'total_inventory' };
  }
  if (lower.includes('produtos') && lower.includes('list')) {
    return { type: 'list_products' };
  }
  if (lower.includes('bloqueado') || lower.includes('vencido')) {
    return { type: 'blocked_items' };
  }
  
  // Tentar extrair código do produto
  const productMatch = message.match(/\b(\d{4,})\b/);
  if (productMatch) {
    return { type: 'product_balance', product: productMatch[1] };
  }
  
  return { type: 'general', message };
}

// Executar query baseada na intenção
async function executeQuery(intent) {
  console.log('🎯 Intenção detectada:', intent);
  
  try {
    switch (intent.type) {
      case 'product_balance': {
        // Buscar saldo de produto específico
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .eq('codigo_produto', intent.product);
        
        if (error) throw error;
        
        // Calcular totais
        const total = data.reduce((sum, item) => 
          sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
        
        return {
          type: 'product_balance',
          product: intent.product,
          description: data[0]?.descricao_produto || 'Produto',
          total_balance: total,
          lots_count: data.length,
          lots: data.map(item => ({
            lote: item.lote_industria_produto,
            saldo: parseFloat(item.saldo_disponivel_produto) || 0,
            armazem: item.armazem || 'BARUERI'
          })),
          raw_data: data
        };
      }
      
      case 'total_inventory': {
        // Buscar todos e calcular total
        const { data, error } = await supabase
          .from('estoque')
          .select('codigo_produto, saldo_disponivel_produto');
        
        if (error) throw error;
        
        const total = data.reduce((sum, item) => 
          sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
        
        const uniqueProducts = [...new Set(data.map(item => item.codigo_produto))];
        
        return {
          type: 'total_inventory',
          total_balance: total,
          total_records: data.length,
          unique_products: uniqueProducts.length
        };
      }
      
      case 'blocked_items': {
        // Buscar itens bloqueados
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .or('saldo_bloqueado_produto.eq.Vencido,saldo_bloqueado_produto.eq.Avaria');
        
        if (error) throw error;
        
        return {
          type: 'blocked_items',
          count: data.length,
          items: data
        };
      }
      
      default: {
        // Query geral - pegar amostra
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .limit(10);
        
        if (error) throw error;
        
        return {
          type: 'sample',
          data: data
        };
      }
    }
  } catch (error) {
    console.error('❌ Erro na query:', error);
    return {
      type: 'error',
      error: error.message
    };
  }
}

// Formatar resposta
function formatResponse(queryResult, originalMessage) {
  switch (queryResult.type) {
    case 'product_balance':
      return `📦 **Produto ${queryResult.product} - ${queryResult.description}**

**Saldo Total Disponível**: ${queryResult.total_balance.toLocaleString('pt-BR')} unidades
**Total de Lotes**: ${queryResult.lots_count} lotes

**Detalhes por Lote**:
${queryResult.lots.map((lot, i) => 
  `${i+1}. Lote ${lot.lote}: ${lot.saldo} unidades (${lot.armazem})`
).join('\n')}

**Localização**: Armazém ${queryResult.lots[0]?.armazem || 'BARUERI'}`;

    case 'total_inventory':
      return `📊 **Saldo Total do Estoque**

**Total Geral Disponível**: ${queryResult.total_balance.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} unidades
**Total de Registros**: ${queryResult.total_records.toLocaleString('pt-BR')}
**Produtos Únicos**: ${queryResult.unique_products}

*Este total considera apenas saldos disponíveis.*`;

    case 'blocked_items':
      return `⚠️ **Itens Bloqueados no Estoque**

**Total de Itens Bloqueados**: ${queryResult.count} registros

${queryResult.count > 0 ? 
  'Estes itens estão marcados como "Vencido" ou "Avaria" e não estão disponíveis para venda.' :
  'Não há itens bloqueados no momento.'}`;

    case 'error':
      return `❌ **Erro ao consultar banco de dados**

${queryResult.error}

Por favor, tente novamente ou verifique a conexão.`;

    default:
      return `📋 **Informações do Estoque**

Encontrei ${queryResult.data?.length || 0} registros relacionados à sua pergunta.

Use perguntas mais específicas como:
- "Qual o saldo do produto 000004?"
- "Qual o saldo total do estoque?"
- "Quantos produtos estão bloqueados?"`;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { message } = req.body;
    console.log('\n🤖 CHAT SMART - Nova requisição:', message);
    
    // Analisar intenção
    const intent = analyzeIntent(message);
    
    // Executar query
    const queryResult = await executeQuery(intent);
    
    // Formatar resposta
    let response = formatResponse(queryResult, message);
    
    // Se tiver IA configurada, pode melhorar a resposta
    if (genAI && queryResult.type !== 'error') {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const improvePrompt = `
        Melhore esta resposta mantendo os dados exatos, mas tornando-a mais natural:
        
        ${response}
        
        Mantenha todos os números e informações, apenas melhore a apresentação.
        `;
        
        const result = await model.generateContent(improvePrompt);
        response = result.response.text();
      } catch (aiError) {
        console.log('IA não disponível, usando resposta padrão');
      }
    }
    
    // Adicionar indicador
    response += '\n\n📊 *[Query executada diretamente no banco]*';
    
    // Responder
    res.status(200).json({
      response,
      estoqueLoaded: true,
      totalProdutos: queryResult.raw_data?.length || queryResult.data?.length || 0,
      dbStatus: queryResult.type === 'error' ? 'error' : 'connected',
      queryType: queryResult.type
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({
      error: error.message,
      response: `Erro: ${error.message}`
    });
  }
}