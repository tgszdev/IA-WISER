// ============================================================
// ASSISTENTE DE ESTOQUE MELHORADO - VERSÃO COMPLETA
// Com análise de 100% dos dados e respostas precisas
// ============================================================

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Cache global para armazenar todos os dados em memória
let GLOBAL_INVENTORY_CACHE = null;
let CACHE_TIMESTAMP = null;
const CACHE_DURATION = 5 * 60 * 1000; // Cache por 5 minutos

// ============================================================
// FUNÇÃO PRINCIPAL: CARREGA 100% DOS DADOS DO SUPABASE
// ============================================================
async function loadCompleteInventory(forceRefresh = false) {
  // Verificar cache válido
  if (!forceRefresh && GLOBAL_INVENTORY_CACHE && CACHE_TIMESTAMP) {
    const cacheAge = Date.now() - CACHE_TIMESTAMP;
    if (cacheAge < CACHE_DURATION) {
      console.log(`✅ Usando cache (idade: ${Math.round(cacheAge/1000)}s)`);
      return GLOBAL_INVENTORY_CACHE;
    }
  }

  console.log('🔄 CARREGANDO 100% DOS DADOS DO SUPABASE...');
  
  try {
    // Configurar Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Primeiro: obter contagem total
    const { count: totalCount, error: countError } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    console.log(`📊 Total de registros no banco: ${totalCount}`);
    
    // Carregar TODOS os dados em lotes
    let allData = [];
    const batchSize = 1000;
    
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .range(offset, Math.min(offset + batchSize - 1, totalCount - 1))
        .order('codigo_produto', { ascending: true });
      
      if (error) throw error;
      if (data) allData = [...allData, ...data];
      
      console.log(`📦 Carregados ${allData.length}/${totalCount} registros...`);
    }
    
    // Criar índices para busca rápida
    const byProduct = {};
    const byLocation = {};
    const byWarehouse = {};
    const byLot = {};
    
    allData.forEach(item => {
      // Índice por produto
      if (!byProduct[item.codigo_produto]) {
        byProduct[item.codigo_produto] = [];
      }
      byProduct[item.codigo_produto].push(item);
      
      // Índice por localização
      if (item.local_produto) {
        if (!byLocation[item.local_produto]) {
          byLocation[item.local_produto] = [];
        }
        byLocation[item.local_produto].push(item);
      }
      
      // Índice por armazém
      if (item.armazem) {
        if (!byWarehouse[item.armazem]) {
          byWarehouse[item.armazem] = [];
        }
        byWarehouse[item.armazem].push(item);
      }
      
      // Índice por lote
      if (item.lote_industria_produto) {
        if (!byLot[item.lote_industria_produto]) {
          byLot[item.lote_industria_produto] = [];
        }
        byLot[item.lote_industria_produto].push(item);
      }
    });
    
    // Calcular estatísticas completas
    const stats = {
      totalRegistros: allData.length,
      produtosUnicos: Object.keys(byProduct).length,
      totalSaldoDisponivel: allData.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0),
      totalSaldoBloqueado: allData.filter(item => item.saldo_bloqueado_produto).length,
      produtosAvaria: allData.filter(item => item.saldo_bloqueado_produto === 'Avaria').length,
      produtosVencidos: allData.filter(item => item.saldo_bloqueado_produto === 'Vencido').length,
      produtosSemEstoque: allData.filter(item => parseFloat(item.saldo_disponivel_produto) === 0).length,
      produtosEstoqueBaixo: allData.filter(item => parseFloat(item.saldo_disponivel_produto) > 0 && parseFloat(item.saldo_disponivel_produto) < 10).length,
      armazens: [...new Set(allData.map(item => item.armazem).filter(Boolean))],
      locaisUnicos: [...new Set(allData.map(item => item.local_produto).filter(Boolean))].length,
      lotesUnicos: [...new Set(allData.map(item => item.lote_industria_produto).filter(Boolean))].length,
      categorias: [...new Set(allData.map(item => item.categoria).filter(Boolean))],
      valorTotalEstoque: allData.reduce((sum, item) => {
        const saldo = parseFloat(item.saldo_disponivel_produto) || 0;
        const preco = parseFloat(item.preco_unitario) || 0;
        return sum + (saldo * preco);
      }, 0)
    };
    
    // Criar cache estruturado
    GLOBAL_INVENTORY_CACHE = {
      rawData: allData,
      byProduct,
      byLocation,
      byWarehouse,
      byLot,
      stats,
      lastUpdate: new Date().toISOString()
    };
    
    CACHE_TIMESTAMP = Date.now();
    
    console.log('✅ DADOS CARREGADOS COM SUCESSO!');
    console.log(`📊 ${stats.totalRegistros} registros | ${stats.produtosUnicos} produtos únicos`);
    
    return GLOBAL_INVENTORY_CACHE;
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    throw error;
  }
}

// ============================================================
// ANALISADOR INTELIGENTE DE CONSULTAS
// ============================================================
function analyzeQuery(message) {
  const lower = message.toLowerCase();
  const query = {
    type: 'general',
    entities: {},
    intent: null,
    confidence: 0
  };
  
  // Extrair código do produto (múltiplos formatos)
  const productPatterns = [
    /\b(RM\s*\d+)\b/gi,              // RM 139, RM139
    /\b(PROD-\d+)\b/gi,              // PROD-001
    /\b([A-Z]{2,}\s*\d+)\b/gi,       // XX 123
    /\bproduto\s+(\S+)\b/gi,         // produto XXX
    /\bcódigo\s+(\S+)\b/gi,          // código XXX
    /\bitem\s+(\S+)\b/gi,            // item XXX
    /\b(\d{6})\b/g,                  // 6 dígitos
    /\b(\d{3,5})\b/g                 // 3-5 dígitos
  ];
  
  for (const pattern of productPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const code = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
      query.entities.productCode = code;
      query.confidence = 0.9;
      break;
    }
    if (query.entities.productCode) break;
  }
  
  // Extrair localização
  const locationPattern = /\blocal\s+(\S+)|localização\s+(\S+)|posição\s+(\S+)/gi;
  const locationMatch = message.match(locationPattern);
  if (locationMatch) {
    query.entities.location = locationMatch[1] || locationMatch[2] || locationMatch[3];
  }
  
  // Extrair lote
  const lotPattern = /\blote\s+(\S+)/gi;
  const lotMatch = message.match(lotPattern);
  if (lotMatch) {
    query.entities.lot = lotMatch[1];
  }
  
  // Identificar intenção principal
  if (/saldo|quantidade|estoque|disponível|quanto tem/i.test(lower)) {
    query.intent = query.entities.productCode ? 'product_balance' : 'inventory_summary';
    query.type = 'balance_query';
  } else if (/vencid|expirad|validade/i.test(lower)) {
    query.intent = 'expired_products';
    query.type = 'status_query';
  } else if (/avaria|danificad|defeito|problema/i.test(lower)) {
    query.intent = 'damaged_products';
    query.type = 'status_query';
  } else if (/local|onde|localização|posição|armazém/i.test(lower)) {
    query.intent = 'location_query';
    query.type = 'location';
  } else if (/lote/i.test(lower)) {
    query.intent = 'lot_query';
    query.type = 'lot';
  } else if (/total|soma|resumo|geral|inventário completo/i.test(lower)) {
    query.intent = 'inventory_summary';
    query.type = 'summary';
  } else if (/baixo|acabando|mínimo|pouco/i.test(lower)) {
    query.intent = 'low_stock';
    query.type = 'alert';
  } else if (/valor|custo|preço|financeiro/i.test(lower)) {
    query.intent = 'financial_summary';
    query.type = 'financial';
  } else if (/categoria|tipo|classe/i.test(lower)) {
    query.intent = 'category_query';
    query.type = 'category';
  }
  
  // Se não identificou intenção mas tem produto, assumir consulta de saldo
  if (!query.intent && query.entities.productCode) {
    query.intent = 'product_balance';
    query.type = 'balance_query';
  }
  
  return query;
}

// ============================================================
// GERADOR DE RESPOSTAS COM DADOS COMPLETOS
// ============================================================
function generateDetailedResponse(query, inventory) {
  const { intent, entities } = query;
  
  // CONSULTA DE PRODUTO ESPECÍFICO
  if (intent === 'product_balance' && entities.productCode) {
    const productData = inventory.byProduct[entities.productCode];
    
    if (!productData || productData.length === 0) {
      // Tentar busca parcial
      const possibleMatches = Object.keys(inventory.byProduct).filter(code => 
        code.includes(entities.productCode) || 
        code.replace(/\s+/g, '') === entities.productCode.replace(/\s+/g, '')
      );
      
      if (possibleMatches.length > 0) {
        const actualCode = possibleMatches[0];
        const actualData = inventory.byProduct[actualCode];
        return formatProductResponse(actualData, actualCode);
      }
      
      return `❌ Produto "${entities.productCode}" não encontrado no sistema.\n\n` +
             `💡 Produtos disponíveis similares:\n` +
             Object.keys(inventory.byProduct)
               .filter(code => code.toLowerCase().includes(entities.productCode.toLowerCase().substring(0, 3)))
               .slice(0, 5)
               .map(code => `• ${code}: ${inventory.byProduct[code][0].descricao_produto}`)
               .join('\n');
    }
    
    return formatProductResponse(productData, entities.productCode);
  }
  
  // CONSULTA POR LOCALIZAÇÃO
  if (intent === 'location_query' && entities.location) {
    const locationData = inventory.byLocation[entities.location];
    
    if (!locationData) {
      return `❌ Localização "${entities.location}" não encontrada.\n\n` +
             `📍 Localizações disponíveis:\n` +
             Object.keys(inventory.byLocation).slice(0, 10).join(', ');
    }
    
    return formatLocationResponse(locationData, entities.location);
  }
  
  // CONSULTA POR LOTE
  if (intent === 'lot_query' && entities.lot) {
    const lotData = inventory.byLot[entities.lot];
    
    if (!lotData) {
      return `❌ Lote "${entities.lot}" não encontrado.`;
    }
    
    return formatLotResponse(lotData, entities.lot);
  }
  
  // PRODUTOS VENCIDOS
  if (intent === 'expired_products') {
    const expired = inventory.rawData.filter(item => item.saldo_bloqueado_produto === 'Vencido');
    return formatExpiredResponse(expired);
  }
  
  // PRODUTOS COM AVARIA
  if (intent === 'damaged_products') {
    const damaged = inventory.rawData.filter(item => item.saldo_bloqueado_produto === 'Avaria');
    return formatDamagedResponse(damaged);
  }
  
  // ESTOQUE BAIXO
  if (intent === 'low_stock') {
    const lowStock = inventory.rawData.filter(item => 
      parseFloat(item.saldo_disponivel_produto) > 0 && 
      parseFloat(item.saldo_disponivel_produto) < 10
    );
    return formatLowStockResponse(lowStock);
  }
  
  // RESUMO FINANCEIRO
  if (intent === 'financial_summary') {
    return formatFinancialResponse(inventory.stats);
  }
  
  // RESUMO GERAL DO INVENTÁRIO
  if (intent === 'inventory_summary') {
    return formatInventorySummary(inventory.stats);
  }
  
  // RESPOSTA PADRÃO
  return formatGeneralResponse(query, inventory);
}

// ============================================================
// FORMATADORES DE RESPOSTA
// ============================================================
function formatProductResponse(productData, productCode) {
  const first = productData[0];
  const totalSaldo = productData.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
  const totalBloqueado = productData.reduce((sum, item) => sum + (parseFloat(item.saldo_bloqueado_produto) || 0), 0);
  
  let response = `📦 **PRODUTO ${productCode} - ANÁLISE COMPLETA**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Código**: ${first.codigo_produto}\n`;
  response += `**Descrição**: ${first.descricao_produto}\n`;
  response += `**Total de registros**: ${productData.length}\n\n`;
  
  response += `**SALDOS**:\n`;
  response += `• Saldo Disponível Total: ${totalSaldo.toLocaleString('pt-BR')} ${first.unidade_medida || 'UN'}\n`;
  response += `• Saldo Bloqueado Total: ${totalBloqueado.toLocaleString('pt-BR')} ${first.unidade_medida || 'UN'}\n\n`;
  
  if (first.preco_unitario) {
    const valorTotal = totalSaldo * parseFloat(first.preco_unitario);
    response += `**FINANCEIRO**:\n`;
    response += `• Preço Unitário: R$ ${parseFloat(first.preco_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    response += `• Valor Total em Estoque: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
  }
  
  response += `**DETALHAMENTO POR LOCAL**:\n`;
  productData.forEach((item, index) => {
    response += `${index + 1}. Local: ${item.local_produto || 'N/A'} | `;
    response += `Saldo: ${item.saldo_disponivel_produto} | `;
    response += `Lote: ${item.lote_industria_produto || 'N/A'}`;
    if (item.saldo_bloqueado_produto) {
      response += ` | ⚠️ ${item.saldo_bloqueado_produto}`;
    }
    response += '\n';
  });
  
  return response;
}

function formatLocationResponse(locationData, location) {
  let response = `📍 **LOCAL ${location} - PRODUTOS ARMAZENADOS**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Total de produtos neste local**: ${locationData.length}\n\n`;
  
  locationData.forEach((item, index) => {
    response += `${index + 1}. **${item.codigo_produto}** - ${item.descricao_produto}\n`;
    response += `   • Saldo: ${item.saldo_disponivel_produto} ${item.unidade_medida || 'UN'}\n`;
    response += `   • Lote: ${item.lote_industria_produto || 'N/A'}\n`;
    if (item.saldo_bloqueado_produto) {
      response += `   • ⚠️ Status: ${item.saldo_bloqueado_produto}\n`;
    }
    response += '\n';
  });
  
  return response;
}

function formatLotResponse(lotData, lot) {
  const totalSaldo = lotData.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
  
  let response = `📋 **LOTE ${lot} - INFORMAÇÕES COMPLETAS**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Total de itens no lote**: ${lotData.length}\n`;
  response += `**Saldo total do lote**: ${totalSaldo.toLocaleString('pt-BR')} unidades\n\n`;
  
  response += `**PRODUTOS NO LOTE**:\n`;
  lotData.forEach((item, index) => {
    response += `${index + 1}. ${item.codigo_produto} - ${item.descricao_produto}\n`;
    response += `   • Local: ${item.local_produto}\n`;
    response += `   • Saldo: ${item.saldo_disponivel_produto} ${item.unidade_medida || 'UN'}\n`;
    if (item.data_validade) {
      response += `   • Validade: ${new Date(item.data_validade).toLocaleDateString('pt-BR')}\n`;
    }
  });
  
  return response;
}

function formatExpiredResponse(expired) {
  if (expired.length === 0) {
    return `✅ **Nenhum produto vencido no estoque!**`;
  }
  
  let response = `⚠️ **PRODUTOS VENCIDOS - ATENÇÃO NECESSÁRIA**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Total de produtos vencidos**: ${expired.length}\n\n`;
  
  const byProduct = {};
  expired.forEach(item => {
    if (!byProduct[item.codigo_produto]) {
      byProduct[item.codigo_produto] = {
        descricao: item.descricao_produto,
        items: []
      };
    }
    byProduct[item.codigo_produto].items.push(item);
  });
  
  Object.entries(byProduct).forEach(([code, data]) => {
    const total = data.items.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
    response += `📦 **${code}** - ${data.descricao}\n`;
    response += `   • Quantidade total: ${total} unidades\n`;
    response += `   • Locais afetados: ${data.items.map(i => i.local_produto).join(', ')}\n\n`;
  });
  
  return response;
}

function formatDamagedResponse(damaged) {
  if (damaged.length === 0) {
    return `✅ **Nenhum produto com avaria no estoque!**`;
  }
  
  let response = `⚠️ **PRODUTOS COM AVARIA - QUARENTENA**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Total de produtos com avaria**: ${damaged.length}\n\n`;
  
  damaged.forEach((item, index) => {
    response += `${index + 1}. **${item.codigo_produto}** - ${item.descricao_produto}\n`;
    response += `   • Quantidade: ${item.saldo_disponivel_produto} ${item.unidade_medida || 'UN'}\n`;
    response += `   • Local: ${item.local_produto}\n`;
    response += `   • Armazém: ${item.armazem}\n\n`;
  });
  
  return response;
}

function formatLowStockResponse(lowStock) {
  if (lowStock.length === 0) {
    return `✅ **Todos os produtos com estoque adequado!**`;
  }
  
  let response = `⚠️ **ALERTA: PRODUTOS COM ESTOQUE BAIXO**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Total de produtos com estoque baixo**: ${lowStock.length}\n\n`;
  
  // Agrupar por produto
  const byProduct = {};
  lowStock.forEach(item => {
    if (!byProduct[item.codigo_produto]) {
      byProduct[item.codigo_produto] = {
        descricao: item.descricao_produto,
        total: 0,
        locais: []
      };
    }
    byProduct[item.codigo_produto].total += parseFloat(item.saldo_disponivel_produto) || 0;
    byProduct[item.codigo_produto].locais.push(item.local_produto);
  });
  
  Object.entries(byProduct)
    .sort((a, b) => a[1].total - b[1].total)
    .forEach(([code, data]) => {
      response += `🔴 **${code}** - ${data.descricao}\n`;
      response += `   • Saldo total: ${data.total} unidades\n`;
      response += `   • Locais: ${data.locais.join(', ')}\n\n`;
    });
  
  return response;
}

function formatFinancialResponse(stats) {
  let response = `💰 **RESUMO FINANCEIRO DO INVENTÁRIO**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Valor Total do Estoque**: R$ ${stats.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  response += `**Total de Produtos Únicos**: ${stats.produtosUnicos}\n`;
  response += `**Total de Unidades em Estoque**: ${stats.totalSaldoDisponivel.toLocaleString('pt-BR')}\n\n`;
  response += `**Valor Médio por Produto**: R$ ${(stats.valorTotalEstoque / stats.produtosUnicos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  response += `**Valor Médio por Unidade**: R$ ${(stats.valorTotalEstoque / stats.totalSaldoDisponivel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
  
  return response;
}

function formatInventorySummary(stats) {
  let response = `📊 **RESUMO COMPLETO DO INVENTÁRIO**\n`;
  response += `${'='.repeat(50)}\n\n`;
  
  response += `**📈 ESTATÍSTICAS GERAIS**:\n`;
  response += `• Total de Registros: ${stats.totalRegistros.toLocaleString('pt-BR')}\n`;
  response += `• Produtos Únicos: ${stats.produtosUnicos}\n`;
  response += `• Saldo Total Disponível: ${stats.totalSaldoDisponivel.toLocaleString('pt-BR')} unidades\n`;
  response += `• Valor Total do Estoque: R$ ${stats.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
  
  response += `**🏭 INFRAESTRUTURA**:\n`;
  response += `• Armazéns: ${stats.armazens.join(', ')}\n`;
  response += `• Locais de Armazenamento: ${stats.locaisUnicos}\n`;
  response += `• Lotes Únicos: ${stats.lotesUnicos}\n\n`;
  
  response += `**⚠️ ALERTAS E STATUS**:\n`;
  response += `• Produtos com Avaria: ${stats.produtosAvaria}\n`;
  response += `• Produtos Vencidos: ${stats.produtosVencidos}\n`;
  response += `• Produtos sem Estoque: ${stats.produtosSemEstoque}\n`;
  response += `• Produtos com Estoque Baixo: ${stats.produtosEstoqueBaixo}\n`;
  response += `• Total de Produtos Bloqueados: ${stats.totalSaldoBloqueado}\n\n`;
  
  if (stats.categorias && stats.categorias.length > 0) {
    response += `**📁 CATEGORIAS**:\n`;
    response += stats.categorias.map(cat => `• ${cat}`).join('\n');
  }
  
  return response;
}

function formatGeneralResponse(query, inventory) {
  return `📋 **Processando sua consulta...**\n\n` +
         `Tipo de consulta: ${query.type}\n` +
         `Intenção detectada: ${query.intent || 'geral'}\n` +
         `Confiança: ${Math.round(query.confidence * 100)}%\n\n` +
         `Total de produtos no sistema: ${inventory.stats.produtosUnicos}\n` +
         `Total de registros: ${inventory.stats.totalRegistros}`;
}

// ============================================================
// HANDLER PRINCIPAL DA API
// ============================================================
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Endpoint para forçar atualização do cache
  if (req.method === 'GET' && req.url === '/api/chat-complete/refresh') {
    try {
      await loadCompleteInventory(true);
      return res.status(200).json({ 
        success: true, 
        message: 'Cache atualizado com sucesso',
        stats: GLOBAL_INVENTORY_CACHE?.stats 
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    const { message, sessionId, forceRefresh = false } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📩 Nova mensagem: "${message}"`);
    console.log(`👤 Sessão: ${sessionId || 'anonymous'}`);
    
    // CARREGAR 100% DOS DADOS
    const inventory = await loadCompleteInventory(forceRefresh);
    
    // ANALISAR CONSULTA
    const query = analyzeQuery(message);
    console.log(`🔍 Análise:`, query);
    
    let response = '';
    let aiModel = 'enhanced-local';
    let usedOpenAI = false;
    
    // TENTAR OPENAI PARA CONSULTAS COMPLEXAS
    const openaiKey = process.env.OPENAI_API_KEY;
    const useOpenAI = openaiKey && 
                     !openaiKey.includes('your_') && 
                     !openaiKey.includes('xxx') &&
                     (query.confidence < 0.7 || query.type === 'general');
    
    if (useOpenAI) {
      try {
        console.log('🤖 Usando OpenAI para análise avançada...');
        const openai = new OpenAI({ apiKey: openaiKey });
        
        // Preparar contexto completo
        let systemPrompt = `Você é o Wiser IA Assistant, especialista em gestão de inventário.
        
DADOS COMPLETOS DO INVENTÁRIO (100% carregados):
${JSON.stringify(inventory.stats, null, 2)}

REGRAS CRÍTICAS:
1. Use APENAS os dados fornecidos, NUNCA invente números
2. Sempre forneça análises completas e detalhadas
3. Use formatação clara com emojis apropriados
4. Responda em português brasileiro
5. Para produtos específicos, liste TODOS os locais e saldos

CONSULTA DO USUÁRIO:
Tipo: ${query.type}
Intenção: ${query.intent}
Entidades: ${JSON.stringify(query.entities)}
`;

        // Se for consulta de produto específico, incluir dados completos
        if (query.entities.productCode && inventory.byProduct[query.entities.productCode]) {
          systemPrompt += `\nDADOS COMPLETOS DO PRODUTO ${query.entities.productCode}:\n`;
          systemPrompt += JSON.stringify(inventory.byProduct[query.entities.productCode], null, 2);
        }
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          max_tokens: 2000,
          temperature: 0.1
        });
        
        response = completion.choices[0].message.content;
        aiModel = 'gpt-4-turbo';
        usedOpenAI = true;
        console.log('✅ Resposta OpenAI gerada');
        
      } catch (error) {
        console.log('⚠️ OpenAI falhou, usando sistema local:', error.message);
      }
    }
    
    // SE OPENAI NÃO FOI USADA OU FALHOU, USAR SISTEMA LOCAL
    if (!response) {
      console.log('🔧 Gerando resposta com sistema local aprimorado...');
      response = generateDetailedResponse(query, inventory);
      aiModel = 'enhanced-local';
    }
    
    // ADICIONAR METADADOS
    const responseTime = Date.now() - startTime;
    response += `\n\n${'─'.repeat(50)}\n`;
    response += `📊 **Metadados da Resposta**:\n`;
    response += `• Modelo: ${aiModel}\n`;
    response += `• Tempo: ${responseTime}ms\n`;
    response += `• Confiança: ${Math.round(query.confidence * 100)}%\n`;
    response += `• Cache: ${CACHE_TIMESTAMP ? `Atualizado há ${Math.round((Date.now() - CACHE_TIMESTAMP) / 1000)}s` : 'Novo'}\n`;
    response += `• Total de dados analisados: ${inventory.stats.totalRegistros} registros`;
    
    // RETORNAR RESPOSTA
    return res.status(200).json({
      response,
      metadata: {
        aiModel,
        responseTime,
        query,
        dataStats: inventory.stats,
        cacheAge: CACHE_TIMESTAMP ? Date.now() - CACHE_TIMESTAMP : 0,
        usedOpenAI,
        sessionId
      },
      success: true
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return res.status(500).json({
      error: error.message,
      response: `❌ Erro ao processar sua mensagem: ${error.message}\n\nPor favor, tente novamente.`,
      success: false
    });
  }
}