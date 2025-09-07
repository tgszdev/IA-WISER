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

// Store de sessões em memória (substitua por Redis/DB em produção)
const sessionStore = global.sessionStore || new Map();
global.sessionStore = sessionStore;

// Analisador de intenção melhorado
function analyzeIntent(message, sessionHistory = []) {
  const lower = message.toLowerCase();
  
  // Extrair código do produto se houver
  const productMatch = message.match(/\b(\d{4,})\b/);
  const productCode = productMatch ? productMatch[1] : null;
  
  // Detectar perguntas sobre avaria/vencido
  if ((lower.includes('avaria') || lower.includes('vencido') || lower.includes('bloqueado')) && productCode) {
    return { 
      type: 'product_status', 
      product: productCode,
      checkStatus: true,
      statusType: lower.includes('avaria') ? 'Avaria' : 'Vencido'
    };
  }
  
  // Verificar se produto está na lista
  if (lower.includes('lista') && productCode) {
    return { type: 'check_product_exists', product: productCode };
  }
  
  // Detectar saldo de produto específico
  if ((lower.includes('saldo') || lower.includes('quantidade')) && productCode) {
    return { type: 'product_balance', product: productCode };
  }
  
  // Saldo total
  if (lower.includes('saldo total') || lower.includes('total do estoque')) {
    return { type: 'total_inventory' };
  }
  
  // Produtos bloqueados em geral
  if (lower.includes('bloqueado') || lower.includes('vencido') || lower.includes('avaria')) {
    return { type: 'blocked_items' };
  }
  
  // Se tiver código de produto sem contexto específico
  if (productCode) {
    return { type: 'product_info', product: productCode };
  }
  
  return { type: 'general', message };
}

// Executar query baseada na intenção
async function executeQuery(intent) {
  console.log('🎯 Intenção detectada:', JSON.stringify(intent));
  
  try {
    switch (intent.type) {
      case 'check_product_exists': {
        // Verificar se produto existe
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .eq('codigo_produto', intent.product);
        
        if (error) throw error;
        
        return {
          type: 'product_exists',
          product: intent.product,
          exists: data && data.length > 0,
          count: data.length,
          data: data
        };
      }
      
      case 'product_status': {
        // Buscar produto com status específico
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .eq('codigo_produto', intent.product);
        
        if (error) throw error;
        
        // Filtrar por status
        const withStatus = data.filter(item => 
          item.saldo_bloqueado_produto === intent.statusType
        );
        
        return {
          type: 'product_status',
          product: intent.product,
          statusType: intent.statusType,
          totalItems: data.length,
          itemsWithStatus: withStatus.length,
          hasStatus: withStatus.length > 0,
          details: withStatus,
          allData: data
        };
      }
      
      case 'product_info': {
        // Informações gerais do produto
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .eq('codigo_produto', intent.product);
        
        if (error) throw error;
        
        const total = data.reduce((sum, item) => 
          sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
        
        const blocked = data.filter(item => 
          item.saldo_bloqueado_produto === 'Vencido' || 
          item.saldo_bloqueado_produto === 'Avaria'
        );
        
        return {
          type: 'product_info',
          product: intent.product,
          exists: data.length > 0,
          description: data[0]?.descricao_produto || 'Produto não encontrado',
          total_balance: total,
          lots_count: data.length,
          blocked_count: blocked.length,
          blocked_details: blocked,
          data: data
        };
      }
      
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

// Formatar resposta melhorada
function formatResponse(queryResult, originalMessage) {
  switch (queryResult.type) {
    case 'product_exists':
      if (queryResult.exists) {
        return `✅ **Sim, o produto ${queryResult.product} está na lista!**

Encontrei **${queryResult.count} registros** deste produto no estoque.

${queryResult.data[0]?.descricao_produto ? 
  `**Descrição**: ${queryResult.data[0].descricao_produto}` : ''}

Precisa de mais informações sobre este produto?`;
      } else {
        return `❌ **Produto ${queryResult.product} NÃO encontrado no estoque**

Este código não existe na base de dados atual.
Verifique se o código está correto ou tente outro produto.`;
      }
      
    case 'product_status':
      if (queryResult.hasStatus) {
        return `⚠️ **Produto ${queryResult.product} - Status ${queryResult.statusType}**

**Situação**: ${queryResult.itemsWithStatus} de ${queryResult.totalItems} lotes estão com ${queryResult.statusType}

**Detalhes dos lotes com ${queryResult.statusType}**:
${queryResult.details.map((item, i) => 
  `${i+1}. Lote ${item.lote_industria_produto}
   - Local: ${item.local_produto || 'N/A'}
   - Armazém: ${item.armazem || 'BARUERI'}
   - Status: ${item.saldo_bloqueado_produto}`
).join('\n\n')}

**Motivo**: Os produtos marcados como "${queryResult.statusType}" foram bloqueados no sistema.
${queryResult.statusType === 'Avaria' ? 
  'Avaria indica dano físico ou problema de qualidade no produto.' :
  'Vencido indica que o produto passou da data de validade.'}`;
      } else {
        return `✅ **Produto ${queryResult.product} - Sem ${queryResult.statusType}**

Nenhum lote deste produto está marcado como ${queryResult.statusType}.
Total de ${queryResult.totalItems} lotes encontrados, todos em outras condições.`;
      }
      
    case 'product_info':
      if (!queryResult.exists) {
        return `❌ **Produto ${queryResult.product} não encontrado**`;
      }
      
      return `📦 **Produto ${queryResult.product} - ${queryResult.description}**

**Status Geral**:
• Total de lotes: ${queryResult.lots_count}
• Saldo disponível: ${queryResult.total_balance.toLocaleString('pt-BR')} unidades
• Lotes bloqueados: ${queryResult.blocked_count}

${queryResult.blocked_count > 0 ? `
**⚠️ Atenção - Lotes Bloqueados**:
${queryResult.blocked_details.map(item => 
  `• Lote ${item.lote_industria_produto}: ${item.saldo_bloqueado_produto}`
).join('\n')}` : '✅ Nenhum lote bloqueado'}

${queryResult.data[0]?.armazem ? 
  `**Localização**: Armazém ${queryResult.data[0].armazem}` : ''}`;
      
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
    const { message, sessionId, history } = req.body;
    console.log('\n🤖 CHAT SMART - Nova requisição:', message);
    console.log('📝 SessionId:', sessionId);
    
    // Gerenciar sessão
    let sessionHistory = sessionStore.get(sessionId) || [];
    if (history && history.length > 0) {
      sessionHistory = history;
    }
    
    // Adicionar mensagem atual ao histórico
    sessionHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
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