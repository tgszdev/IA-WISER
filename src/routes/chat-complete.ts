import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

// Cache global para armazenar todos os dados em memória
let GLOBAL_INVENTORY_CACHE: any = null;
let CACHE_TIMESTAMP: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // Cache por 5 minutos

// Tipos TypeScript
interface InventoryItem {
  id: number;
  codigo_produto: string;
  descricao_produto: string;
  saldo_disponivel_produto: number;
  saldo_bloqueado_produto?: string;
  lote_industria_produto?: string;
  local_produto?: string;
  armazem?: string;
  preco_unitario?: number;
  unidade_medida?: string;
  categoria?: string;
  data_validade?: string;
}

interface Query {
  type: string;
  entities: {
    productCode?: string;
    location?: string;
    lot?: string;
  };
  intent: string | null;
  confidence: number;
}

// Função para carregar 100% dos dados
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
    const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Obter contagem total
    const { count: totalCount } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de registros: ${totalCount}`);
    
    // Carregar todos os dados
    let allData: InventoryItem[] = [];
    const batchSize = 1000;
    
    if (totalCount) {
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const { data, error } = await supabase
          .from('estoque')
          .select('*')
          .range(offset, Math.min(offset + batchSize - 1, totalCount - 1))
          .order('codigo_produto');
        
        if (error) throw error;
        if (data) allData = [...allData, ...data];
      }
    }
    
    // Criar índices
    const byProduct: Record<string, InventoryItem[]> = {};
    const byLocation: Record<string, InventoryItem[]> = {};
    const byWarehouse: Record<string, InventoryItem[]> = {};
    const byLot: Record<string, InventoryItem[]> = {};
    
    allData.forEach(item => {
      // Por produto
      if (!byProduct[item.codigo_produto]) {
        byProduct[item.codigo_produto] = [];
      }
      byProduct[item.codigo_produto].push(item);
      
      // Por localização
      if (item.local_produto) {
        if (!byLocation[item.local_produto]) {
          byLocation[item.local_produto] = [];
        }
        byLocation[item.local_produto].push(item);
      }
      
      // Por armazém
      if (item.armazem) {
        if (!byWarehouse[item.armazem]) {
          byWarehouse[item.armazem] = [];
        }
        byWarehouse[item.armazem].push(item);
      }
      
      // Por lote
      if (item.lote_industria_produto) {
        if (!byLot[item.lote_industria_produto]) {
          byLot[item.lote_industria_produto] = [];
        }
        byLot[item.lote_industria_produto].push(item);
      }
    });
    
    // Calcular estatísticas
    const stats = {
      totalRegistros: allData.length,
      produtosUnicos: Object.keys(byProduct).length,
      totalSaldoDisponivel: allData.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0),
      totalSaldoBloqueado: allData.filter(item => item.saldo_bloqueado_produto).length,
      produtosAvaria: allData.filter(item => item.saldo_bloqueado_produto === 'Avaria').length,
      produtosVencidos: allData.filter(item => item.saldo_bloqueado_produto === 'Vencido').length,
      produtosSemEstoque: allData.filter(item => item.saldo_disponivel_produto === 0).length,
      produtosEstoqueBaixo: allData.filter(item => item.saldo_disponivel_produto > 0 && item.saldo_disponivel_produto < 10).length,
      armazens: [...new Set(allData.map(item => item.armazem).filter(Boolean))],
      locaisUnicos: [...new Set(allData.map(item => item.local_produto).filter(Boolean))].length,
      lotesUnicos: [...new Set(allData.map(item => item.lote_industria_produto).filter(Boolean))].length,
      categorias: [...new Set(allData.map(item => item.categoria).filter(Boolean))],
      valorTotalEstoque: allData.reduce((sum, item) => {
        const saldo = item.saldo_disponivel_produto || 0;
        const preco = item.preco_unitario || 0;
        return sum + (saldo * preco);
      }, 0)
    };
    
    // Criar cache
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
    
    console.log('✅ Dados carregados com sucesso!');
    return GLOBAL_INVENTORY_CACHE;
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados:', error);
    throw error;
  }
}

// Analisar consulta
function analyzeQuery(message: string): Query {
  const lower = message.toLowerCase();
  const query: Query = {
    type: 'general',
    entities: {},
    intent: null,
    confidence: 0
  };
  
  // Extrair localização primeiro (formato específico)
  const locationPattern = /\b(\d{9})\b/g;
  const locationMatch = message.match(locationPattern);
  if (locationMatch) {
    query.entities.location = locationMatch[0];
    query.intent = 'location_query';
    query.type = 'location';
    query.confidence = 0.95;
  }
  
  // Extrair código do produto
  const productPatterns = [
    /\b(RM\s*\d+)\b/gi,
    /\b(PROD-\d+)\b/gi,
    /\b([A-Z]{2,}\s*\d+)\b/gi,
    /\bproduto\s+(\S+)\b/gi,
    /\b(\d{6})\b/g,
    /\b(\d{3,5})\b/g
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
  
  // Identificar intenção
  if (/saldo|quantidade|estoque|disponível/i.test(lower)) {
    query.intent = query.entities.productCode ? 'product_balance' : 'inventory_summary';
    query.type = 'balance_query';
  } else if (/vencid|expirad/i.test(lower)) {
    query.intent = 'expired_products';
    query.type = 'status_query';
  } else if (/avaria|danificad/i.test(lower)) {
    query.intent = 'damaged_products';
    query.type = 'status_query';
  } else if (/local|onde|localização/i.test(lower)) {
    query.intent = 'location_query';
    query.type = 'location';
  } else if (/total|soma|resumo|geral/i.test(lower)) {
    query.intent = 'inventory_summary';
    query.type = 'summary';
  } else if (/baixo|acabando/i.test(lower)) {
    query.intent = 'low_stock';
    query.type = 'alert';
  } else if (/valor|custo|preço/i.test(lower)) {
    query.intent = 'financial_summary';
    query.type = 'financial';
  }
  
  if (!query.intent && query.entities.productCode) {
    query.intent = 'product_balance';
    query.type = 'balance_query';
  }
  
  // Se não identificou intenção mas tem número de 9 dígitos, é localização
  if (!query.intent && locationMatch) {
    query.intent = 'location_query';
    query.type = 'location';
    query.confidence = 0.9;
  }
  
  return query;
}

// Formatar resposta de localização
function formatLocationResponse(locationData: InventoryItem[], location: string): string {
  if (!locationData || locationData.length === 0) {
    return `❌ Nenhum produto encontrado no local ${location}`;
  }
  
  let response = `📍 **LOCAL ${location} - PRODUTOS ARMAZENADOS**\n`;
  response += `${'='.repeat(50)}\n\n`;
  response += `**Total de produtos neste local**: ${locationData.length}\n\n`;
  response += `**DETALHAMENTO DOS PRODUTOS**:\n\n`;
  
  // Agrupar por produto
  const byProduct: Record<string, InventoryItem[]> = {};
  locationData.forEach(item => {
    if (!byProduct[item.codigo_produto]) {
      byProduct[item.codigo_produto] = [];
    }
    byProduct[item.codigo_produto].push(item);
  });
  
  let index = 1;
  Object.entries(byProduct).forEach(([code, items]) => {
    const totalSaldo = items.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0);
    const first = items[0];
    
    response += `${index}. **${code}** - ${first.descricao_produto}\n`;
    response += `   • Saldo Total: ${totalSaldo.toLocaleString('pt-BR')} ${first.unidade_medida || 'UN'}\n`;
    
    if (items.length === 1) {
      response += `   • Lote: ${first.lote_industria_produto || 'N/A'}\n`;
      if (first.saldo_bloqueado_produto) {
        response += `   • ⚠️ Status: ${first.saldo_bloqueado_produto}\n`;
      }
    } else {
      response += `   • Lotes: `;
      items.forEach((item, i) => {
        if (i > 0) response += ', ';
        response += item.lote_industria_produto || 'N/A';
      });
      response += '\n';
    }
    
    if (first.armazem) {
      response += `   • Armazém: ${first.armazem}\n`;
    }
    
    response += '\n';
    index++;
  });
  
  return response;
}

// Gerar resposta detalhada
function generateDetailedResponse(query: Query, inventory: any): string {
  const { intent, entities } = query;
  
  // Consulta por localização PRIMEIRO
  if (intent === 'location_query' && entities.location) {
    const locationData = inventory.byLocation[entities.location];
    
    if (!locationData || locationData.length === 0) {
      // Tentar busca parcial
      const possibleLocations = Object.keys(inventory.byLocation).filter(loc => 
        loc.includes(entities.location)
      );
      
      if (possibleLocations.length > 0) {
        const actualLocation = possibleLocations[0];
        const actualData = inventory.byLocation[actualLocation];
        return formatLocationResponse(actualData, actualLocation);
      }
      
      return `❌ Local "${entities.location}" não encontrado no sistema.\n\n` +
             `📍 Alguns locais disponíveis:\n` +
             Object.keys(inventory.byLocation).slice(0, 10).join(', ');
    }
    
    return formatLocationResponse(locationData, entities.location);
  }
  
  // Produto específico
  if (intent === 'product_balance' && entities.productCode) {
    const productData = inventory.byProduct[entities.productCode];
    
    if (!productData || productData.length === 0) {
      return `❌ Produto "${entities.productCode}" não encontrado.`;
    }
    
    const first = productData[0];
    const totalSaldo = productData.reduce((sum: number, item: InventoryItem) => 
      sum + (item.saldo_disponivel_produto || 0), 0);
    
    let response = `📦 **PRODUTO ${entities.productCode} - ANÁLISE COMPLETA**\n`;
    response += `${'='.repeat(50)}\n\n`;
    response += `**Código**: ${first.codigo_produto}\n`;
    response += `**Descrição**: ${first.descricao_produto}\n`;
    response += `**Total de registros**: ${productData.length}\n\n`;
    response += `**SALDOS**:\n`;
    response += `• Saldo Disponível Total: ${totalSaldo.toLocaleString('pt-BR')} ${first.unidade_medida || 'UN'}\n\n`;
    response += `**DETALHAMENTO POR LOCAL**:\n`;
    
    productData.forEach((item: InventoryItem, index: number) => {
      response += `${index + 1}. Local: ${item.local_produto || 'N/A'} | `;
      response += `Saldo: ${item.saldo_disponivel_produto} | `;
      response += `Lote: ${item.lote_industria_produto || 'N/A'}\n`;
    });
    
    return response;
  }
  
  // Resumo do inventário
  if (intent === 'inventory_summary') {
    const stats = inventory.stats;
    let response = `📊 **RESUMO COMPLETO DO INVENTÁRIO**\n`;
    response += `${'='.repeat(50)}\n\n`;
    response += `**Total de Registros**: ${stats.totalRegistros.toLocaleString('pt-BR')}\n`;
    response += `**Produtos Únicos**: ${stats.produtosUnicos}\n`;
    response += `**Saldo Total**: ${stats.totalSaldoDisponivel.toLocaleString('pt-BR')} unidades\n`;
    response += `**Valor Total**: R$ ${stats.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    response += `**ALERTAS**:\n`;
    response += `• Produtos com Avaria: ${stats.produtosAvaria}\n`;
    response += `• Produtos Vencidos: ${stats.produtosVencidos}\n`;
    response += `• Estoque Baixo: ${stats.produtosEstoqueBaixo}\n`;
    return response;
  }
  
  // Produtos vencidos
  if (intent === 'expired_products') {
    const expired = inventory.rawData.filter((item: InventoryItem) => 
      item.saldo_bloqueado_produto === 'Vencido');
    
    if (expired.length === 0) {
      return `✅ **Nenhum produto vencido no estoque!**`;
    }
    
    let response = `⚠️ **PRODUTOS VENCIDOS**\n`;
    response += `Total: ${expired.length} produtos\n\n`;
    expired.slice(0, 10).forEach((item: InventoryItem) => {
      response += `• ${item.codigo_produto} - ${item.descricao_produto}\n`;
    });
    return response;
  }
  
  // Produtos com avaria
  if (intent === 'damaged_products') {
    const damaged = inventory.rawData.filter((item: InventoryItem) => 
      item.saldo_bloqueado_produto === 'Avaria');
    
    if (damaged.length === 0) {
      return `✅ **Nenhum produto com avaria!**`;
    }
    
    let response = `⚠️ **PRODUTOS COM AVARIA**\n`;
    response += `Total: ${damaged.length} produtos\n\n`;
    damaged.slice(0, 10).forEach((item: InventoryItem) => {
      response += `• ${item.codigo_produto} - ${item.descricao_produto}\n`;
    });
    return response;
  }
  
  // Estoque baixo
  if (intent === 'low_stock') {
    const lowStock = inventory.rawData.filter((item: InventoryItem) => 
      item.saldo_disponivel_produto > 0 && item.saldo_disponivel_produto < 10);
    
    if (lowStock.length === 0) {
      return `✅ **Todos os produtos com estoque adequado!**`;
    }
    
    let response = `⚠️ **PRODUTOS COM ESTOQUE BAIXO**\n`;
    response += `Total: ${lowStock.length} produtos\n\n`;
    
    const byProduct: Record<string, { descricao: string; total: number }> = {};
    lowStock.forEach((item: InventoryItem) => {
      if (!byProduct[item.codigo_produto]) {
        byProduct[item.codigo_produto] = {
          descricao: item.descricao_produto,
          total: 0
        };
      }
      byProduct[item.codigo_produto].total += item.saldo_disponivel_produto || 0;
    });
    
    Object.entries(byProduct).slice(0, 10).forEach(([code, data]) => {
      response += `• ${code} - ${data.descricao}: ${data.total} un\n`;
    });
    
    return response;
  }
  
  // Valor financeiro
  if (intent === 'financial_summary') {
    const stats = inventory.stats;
    let response = `💰 **RESUMO FINANCEIRO**\n`;
    response += `${'='.repeat(50)}\n\n`;
    response += `**Valor Total**: R$ ${stats.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    response += `**Produtos Únicos**: ${stats.produtosUnicos}\n`;
    response += `**Total de Unidades**: ${stats.totalSaldoDisponivel.toLocaleString('pt-BR')}\n`;
    return response;
  }
  
  return `📋 Processando: "${query.entities.productCode || 'consulta geral'}"`;
}

// Criar aplicação Hono
const app = new Hono()

// Rota principal
app.post('/api/chat-complete', async (c) => {
  const startTime = Date.now();
  
  try {
    const { message, sessionId, forceRefresh = false } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    
    console.log(`📩 Mensagem: "${message}"`);
    
    // Carregar dados
    const inventory = await loadCompleteInventory(forceRefresh);
    
    // Analisar consulta
    const query = analyzeQuery(message);
    
    // Gerar resposta
    const response = generateDetailedResponse(query, inventory);
    
    const responseTime = Date.now() - startTime;
    
    return c.json({
      response,
      metadata: {
        aiModel: 'enhanced-local-v2',
        responseTime,
        query,
        dataStats: inventory.stats,
        cacheAge: CACHE_TIMESTAMP ? Date.now() - CACHE_TIMESTAMP : 0,
        sessionId
      },
      success: true
    });
    
  } catch (error: any) {
    console.error('❌ Erro:', error);
    return c.json({
      error: error.message,
      response: `❌ Erro: ${error.message}`,
      success: false
    }, 500);
  }
})

// Rota para atualizar cache
app.get('/api/chat-complete/refresh', async (c) => {
  try {
    await loadCompleteInventory(true);
    return c.json({ 
      success: true, 
      message: 'Cache atualizado',
      stats: GLOBAL_INVENTORY_CACHE?.stats 
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
})

export default app