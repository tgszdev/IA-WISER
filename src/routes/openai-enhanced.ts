import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

// Configuração do Supabase
const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';

// Interface para tipos
interface QueryResult {
  queryType: string;
  data: any;
  count: number;
  summary: string;
  location?: string;
  productCode?: string;
  totalSaldo?: number;
}

interface InventoryItem {
  codigo_produto: string;
  descricao_produto: string;
  local_produto: string;
  saldo_disponivel_produto: number;
  saldo_bloqueado_produto?: string;
  lote_industria_produto?: string;
  unidade_medida?: string;
  armazem_produto?: string;
  validade_produto?: string;
}

// Análise inteligente da mensagem
function analyzeMessage(message: string): { intent: string; entities: any } {
  const lower = message.toLowerCase();
  const entities: any = {};
  let intent = 'general_query';

  // Detectar localização (9 dígitos)
  const locationMatch = message.match(/\b(\d{9})\b/);
  if (locationMatch) {
    entities.location = locationMatch[1];
    intent = 'location_query';
  }

  // Detectar produto
  const productPatterns = [
    /\bRM\s*(\d+)\b/gi,  // RM seguido de números
    /\b(RM\s*\d+)\b/gi,   // RM com espaço e números
    /\b(PROD-\d+)\b/gi,
    /produto\s+(RM\s*\d+|\S+)/gi,
    /código\s+(RM\s*\d+|\S+)/gi
  ];

  for (const pattern of productPatterns) {
    const match = message.match(pattern);
    if (match) {
      // Capturar o produto do match - pode estar em match[0] ou match[1]
      let productCode = match[1] || match[0];
      // Limpar e formatar o código do produto
      productCode = productCode.replace(/\s+/g, ' ').trim().toUpperCase();
      // Se for apenas números após RM, adicionar RM
      if (/^\d+$/.test(productCode)) {
        productCode = 'RM ' + productCode;
      }
      entities.product = productCode;
      intent = 'product_query';
      break;
    }
  }

  // Detectar intenções especiais
  if (/vencid|expirad|validade/i.test(lower)) {
    intent = 'expired_query';
  } else if (/avaria|danificad|problema|defeito/i.test(lower)) {
    intent = 'damaged_query';
  } else if (/bloqueado|restrição|impedido/i.test(lower)) {
    intent = 'blocked_query';
  } else if (/resumo|total|geral|estat|visão\s+geral|overview/i.test(lower)) {
    intent = 'summary_query';
  } else if (/todos?\s+os?\s+loca/i.test(lower) && entities.product) {
    intent = 'product_locations';
  } else if (/quantos?|quantidade|contagem|contar/i.test(lower)) {
    intent = 'count_query';
  } else if (/armazém|warehouse|deposito/i.test(lower)) {
    const warehouseMatch = message.match(/armazém\s+(\S+)/i);
    if (warehouseMatch) {
      entities.warehouse = warehouseMatch[1];
      intent = 'warehouse_query';
    }
  } else if (/lote\s+(\S+)/i.test(lower)) {
    const lotMatch = message.match(/lote\s+(\S+)/i);
    if (lotMatch) {
      entities.lot = lotMatch[1];
      intent = 'lot_query';
    }
  }

  return { intent, entities };
}

// Executar consulta SQL otimizada baseada na análise
async function executeOptimizedQuery(intent: string, entities: any): Promise<QueryResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  switch (intent) {
    case 'location_query': {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('local_produto', entities.location)
        .order('codigo_produto');
      
      if (error) throw error;
      
      // Agrupar por produto
      const productGroups: { [key: string]: any } = {};
      data?.forEach(item => {
        if (!productGroups[item.codigo_produto]) {
          productGroups[item.codigo_produto] = {
            codigo: item.codigo_produto,
            descricao: item.descricao_produto,
            totalSaldo: 0,
            lotes: [],
            unidade: item.unidade_medida
          };
        }
        productGroups[item.codigo_produto].totalSaldo += item.saldo_disponivel_produto || 0;
        productGroups[item.codigo_produto].lotes.push({
          lote: item.lote_industria_produto,
          saldo: item.saldo_disponivel_produto,
          status: item.saldo_bloqueado_produto
        });
      });
      
      return {
        queryType: 'location',
        location: entities.location,
        data: Object.values(productGroups),
        count: data?.length || 0,
        summary: `Local ${entities.location} contém ${Object.keys(productGroups).length} produtos únicos em ${data?.length || 0} registros`
      };
    }

    case 'product_query':
    case 'product_locations': {
      const productCode = entities.product;
      
      // Buscar todas as ocorrências do produto
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .or(`codigo_produto.eq.${productCode},codigo_produto.ilike.%${productCode}%`)
        .order('local_produto');
      
      if (error) throw error;
      
      // Agrupar por local
      const locationGroups: { [key: string]: any } = {};
      let totalGeral = 0;
      
      data?.forEach(item => {
        const local = item.local_produto || 'SEM LOCAL';
        if (!locationGroups[local]) {
          locationGroups[local] = {
            local: local,
            armazem: item.armazem_produto,
            totalSaldo: 0,
            lotes: []
          };
        }
        locationGroups[local].totalSaldo += item.saldo_disponivel_produto || 0;
        locationGroups[local].lotes.push({
          lote: item.lote_industria_produto,
          saldo: item.saldo_disponivel_produto,
          validade: item.validade_produto,
          status: item.saldo_bloqueado_produto
        });
        totalGeral += item.saldo_disponivel_produto || 0;
      });
      
      return {
        queryType: 'product',
        productCode: productCode,
        data: Object.values(locationGroups),
        count: data?.length || 0,
        totalSaldo: totalGeral,
        summary: `Produto ${productCode} encontrado em ${Object.keys(locationGroups).length} locais diferentes, total de ${data?.length} registros, saldo total: ${totalGeral}`
      };
    }

    case 'expired_query': {
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .eq('saldo_bloqueado_produto', 'Vencido')
        .order('codigo_produto');
      
      if (error) throw error;
      
      // Agrupar por produto
      const productSummary: { [key: string]: any } = {};
      data?.forEach(item => {
        if (!productSummary[item.codigo_produto]) {
          productSummary[item.codigo_produto] = {
            codigo: item.codigo_produto,
            descricao: item.descricao_produto,
            quantidade_total: 0,
            locais: new Set()
          };
        }
        productSummary[item.codigo_produto].quantidade_total += item.saldo_disponivel_produto || 0;
        productSummary[item.codigo_produto].locais.add(item.local_produto);
      });
      
      return {
        queryType: 'expired',
        data: Object.values(productSummary),
        count: count || 0,
        summary: `${count || 0} produtos vencidos encontrados, ${Object.keys(productSummary).length} produtos únicos afetados`
      };
    }

    case 'damaged_query': {
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .eq('saldo_bloqueado_produto', 'Avaria')
        .order('codigo_produto');
      
      if (error) throw error;
      
      return {
        queryType: 'damaged',
        data: data || [],
        count: count || 0,
        summary: `${count || 0} produtos com avaria encontrados`
      };
    }

    case 'blocked_query': {
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .not('saldo_bloqueado_produto', 'is', null)
        .order('saldo_bloqueado_produto');
      
      if (error) throw error;
      
      // Agrupar por tipo de bloqueio
      const blockTypes: { [key: string]: number } = {};
      data?.forEach(item => {
        const blockType = item.saldo_bloqueado_produto || 'OUTRO';
        blockTypes[blockType] = (blockTypes[blockType] || 0) + 1;
      });
      
      return {
        queryType: 'blocked',
        data: { items: data?.slice(0, 100), blockTypes },
        count: count || 0,
        summary: `${count || 0} produtos bloqueados: ${Object.entries(blockTypes).map(([type, count]) => `${type} (${count})`).join(', ')}`
      };
    }

    case 'warehouse_query': {
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .eq('armazem_produto', entities.warehouse)
        .order('codigo_produto');
      
      if (error) throw error;
      
      return {
        queryType: 'warehouse',
        data: data || [],
        count: count || 0,
        summary: `Armazém ${entities.warehouse}: ${count || 0} registros encontrados`
      };
    }

    case 'lot_query': {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('lote_industria_produto', entities.lot);
      
      if (error) throw error;
      
      return {
        queryType: 'lot',
        data: data || [],
        count: data?.length || 0,
        summary: `Lote ${entities.lot}: ${data?.length || 0} registros encontrados`
      };
    }

    case 'summary_query': {
      // Buscar estatísticas gerais
      const { count: totalCount } = await supabase
        .from('estoque')
        .select('*', { count: 'exact', head: true });
      
      // Contar produtos com problemas
      const { count: vencidosCount } = await supabase
        .from('estoque')
        .select('*', { count: 'exact', head: true })
        .eq('saldo_bloqueado_produto', 'Vencido');
      
      const { count: avariaCount } = await supabase
        .from('estoque')
        .select('*', { count: 'exact', head: true })
        .eq('saldo_bloqueado_produto', 'Avaria');
      
      // Buscar amostra para análise
      const { data: sample } = await supabase
        .from('estoque')
        .select('*')
        .limit(1000);
      
      // Análise da amostra
      const uniqueProducts = new Set(sample?.map(item => item.codigo_produto));
      const uniqueLocations = new Set(sample?.map(item => item.local_produto));
      const uniqueWarehouses = new Set(sample?.map(item => item.armazem_produto).filter(Boolean));
      
      // Estimar totais baseado na amostra
      const estimatedUniqueProducts = Math.round((uniqueProducts.size / 1000) * (totalCount || 0));
      const estimatedUniqueLocations = Math.round((uniqueLocations.size / 1000) * (totalCount || 0));
      
      return {
        queryType: 'summary',
        data: {
          totalRegistros: totalCount || 0,
          produtosVencidos: vencidosCount || 0,
          produtosAvaria: avariaCount || 0,
          produtosUnicos: estimatedUniqueProducts,
          locaisUnicos: estimatedUniqueLocations,
          armazensUnicos: uniqueWarehouses.size
        },
        count: totalCount || 0,
        summary: `Sistema com ${totalCount?.toLocaleString('pt-BR')} registros, ~${estimatedUniqueProducts} produtos únicos, ~${estimatedUniqueLocations} locais`
      };
    }

    case 'count_query': {
      // Contar baseado no contexto
      let query = supabase.from('estoque').select('*', { count: 'exact', head: true });
      
      if (entities.product) {
        query = query.or(`codigo_produto.eq.${entities.product},codigo_produto.ilike.%${entities.product}%`);
      }
      if (entities.location) {
        query = query.eq('local_produto', entities.location);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return {
        queryType: 'count',
        data: { count },
        count: count || 0,
        summary: `Total de registros encontrados: ${count?.toLocaleString('pt-BR')}`
      };
    }

    default: {
      // Query genérica - buscar exemplos
      const { data, error, count } = await supabase
        .from('estoque')
        .select('*', { count: 'exact' })
        .limit(20);
      
      if (error) throw error;
      
      return {
        queryType: 'general',
        data: data || [],
        count: count || 0,
        summary: `Mostrando ${data?.length} de ${count} registros totais`
      };
    }
  }
}

// Formatar resposta de forma inteligente
function formatIntelligentResponse(queryResult: QueryResult, originalMessage: string): string {
  const { queryType, data, count, summary } = queryResult;
  let response = '';
  
  switch (queryType) {
    case 'location':
      response = `📍 **ANÁLISE DO LOCAL ${queryResult.location}**\n`;
      response += `${'═'.repeat(50)}\n\n`;
      
      if (data.length === 0) {
        response += `❌ Nenhum produto encontrado neste local.\n`;
      } else {
        response += `✅ **${data.length} produtos únicos** armazenados neste local\n\n`;
        response += `**LISTA DETALHADA DE PRODUTOS:**\n\n`;
        
        data.forEach((product: any, index: number) => {
          response += `${index + 1}. **${product.codigo}** - ${product.descricao}\n`;
          response += `   📊 Saldo Total: **${product.totalSaldo.toLocaleString('pt-BR')} ${product.unidade || 'UN'}**\n`;
          if (product.lotes.length > 1) {
            response += `   📦 ${product.lotes.length} lotes diferentes\n`;
          }
          product.lotes.forEach((lote: any) => {
            if (lote.status) {
              response += `   ⚠️ Lote ${lote.lote || 'N/A'}: ${lote.saldo} (${lote.status})\n`;
            }
          });
          response += '\n';
        });
      }
      break;

    case 'product':
      if (data.length === 0) {
        response = `❌ **Produto ${queryResult.productCode} não encontrado no inventário.**`;
      } else {
        response = `📦 **ANÁLISE COMPLETA DO PRODUTO ${queryResult.productCode}**\n`;
        response += `${'═'.repeat(50)}\n\n`;
        response += `✅ **PRODUTO ENCONTRADO EM ${data.length} LOCAIS DIFERENTES**\n`;
        response += `📊 **SALDO TOTAL GERAL: ${queryResult.totalSaldo?.toLocaleString('pt-BR')} unidades**\n\n`;
        response += `**DISTRIBUIÇÃO POR LOCAL:**\n`;
        response += `${'─'.repeat(40)}\n\n`;
        
        data.forEach((location: any, index: number) => {
          response += `**${index + 1}. LOCAL: ${location.local}**\n`;
          if (location.armazem) {
            response += `   🏭 Armazém: ${location.armazem}\n`;
          }
          response += `   📊 Saldo neste local: **${location.totalSaldo.toLocaleString('pt-BR')}**\n`;
          
          if (location.lotes.length > 0) {
            response += `   📦 Lotes:\n`;
            location.lotes.forEach((lote: any) => {
              response += `      • Lote ${lote.lote || 'S/N'}: ${lote.saldo}`;
              if (lote.validade) {
                response += ` (Val: ${lote.validade})`;
              }
              if (lote.status) {
                response += ` ⚠️ ${lote.status}`;
              }
              response += '\n';
            });
          }
          response += '\n';
        });
        
        response += `${'─'.repeat(40)}\n`;
        response += `**RESUMO:** ${data.length} locais | ${queryResult.count} registros | ${queryResult.totalSaldo?.toLocaleString('pt-BR')} unidades totais`;
      }
      break;

    case 'expired':
      response = `⚠️ **PRODUTOS VENCIDOS - RELATÓRIO COMPLETO**\n`;
      response += `${'═'.repeat(50)}\n\n`;
      response += `🔴 **ALERTA: ${count} registros de produtos vencidos**\n`;
      response += `📊 **${data.length} produtos únicos afetados**\n\n`;
      
      if (data.length > 0) {
        response += `**PRODUTOS VENCIDOS (TOP 10):**\n\n`;
        data.slice(0, 10).forEach((product: any, index: number) => {
          response += `${index + 1}. **${product.codigo}** - ${product.descricao}\n`;
          response += `   • Quantidade total vencida: ${product.quantidade_total.toLocaleString('pt-BR')}\n`;
          response += `   • Presente em ${product.locais.size} local(is)\n\n`;
        });
        
        if (data.length > 10) {
          response += `... e mais ${data.length - 10} produtos vencidos.\n`;
        }
      }
      break;

    case 'damaged':
      response = `🔧 **PRODUTOS COM AVARIA - RELATÓRIO**\n`;
      response += `${'═'.repeat(50)}\n\n`;
      response += `⚠️ **Total: ${count} produtos com avaria registrados**\n\n`;
      
      if (data.length > 0) {
        const productGroups: { [key: string]: any[] } = {};
        data.forEach((item: any) => {
          if (!productGroups[item.codigo_produto]) {
            productGroups[item.codigo_produto] = [];
          }
          productGroups[item.codigo_produto].push(item);
        });
        
        response += `**PRODUTOS AFETADOS:**\n\n`;
        Object.entries(productGroups).slice(0, 10).forEach(([code, items], index) => {
          const first = items[0];
          const total = items.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0);
          response += `${index + 1}. **${code}** - ${first.descricao_produto}\n`;
          response += `   • Quantidade com avaria: ${total.toLocaleString('pt-BR')}\n`;
          response += `   • Locais afetados: ${items.length}\n\n`;
        });
      }
      break;

    case 'summary':
      response = `📊 **VISÃO GERAL DO INVENTÁRIO**\n`;
      response += `${'═'.repeat(50)}\n\n`;
      response += `**ESTATÍSTICAS PRINCIPAIS:**\n\n`;
      response += `📦 **Total de Registros:** ${data.totalRegistros.toLocaleString('pt-BR')}\n`;
      response += `🏷️ **Produtos Únicos (estimado):** ~${data.produtosUnicos.toLocaleString('pt-BR')}\n`;
      response += `📍 **Locais Únicos (estimado):** ~${data.locaisUnicos.toLocaleString('pt-BR')}\n`;
      response += `🏭 **Armazéns:** ${data.armazensUnicos}\n\n`;
      
      response += `**STATUS DOS PRODUTOS:**\n`;
      response += `🔴 Produtos Vencidos: ${data.produtosVencidos.toLocaleString('pt-BR')}\n`;
      response += `🟠 Produtos com Avaria: ${data.produtosAvaria.toLocaleString('pt-BR')}\n`;
      response += `🟢 Produtos OK: ${(data.totalRegistros - data.produtosVencidos - data.produtosAvaria).toLocaleString('pt-BR')}\n\n`;
      
      response += `💡 **Informação:** Este inventário é consultado em tempo real diretamente do banco de dados Supabase.`;
      break;

    case 'blocked':
      response = `🔒 **PRODUTOS BLOQUEADOS - ANÁLISE**\n`;
      response += `${'═'.repeat(50)}\n\n`;
      response += `⚠️ **Total: ${count} produtos com algum tipo de bloqueio**\n\n`;
      
      if (data.blockTypes) {
        response += `**TIPOS DE BLOQUEIO:**\n`;
        Object.entries(data.blockTypes).forEach(([type, typeCount]) => {
          const percentage = ((typeCount as number / count) * 100).toFixed(1);
          response += `• ${type}: ${typeCount} (${percentage}%)\n`;
        });
      }
      break;

    default:
      response = `📋 **RESULTADO DA CONSULTA**\n\n`;
      response += summary + '\n\n';
      if (data && data.length > 0) {
        response += `**Amostra dos dados:**\n`;
        data.slice(0, 5).forEach((item: any, index: number) => {
          response += `${index + 1}. ${item.codigo_produto} - ${item.descricao_produto}\n`;
          response += `   Local: ${item.local_produto} | Saldo: ${item.saldo_disponivel_produto}\n`;
        });
      }
  }
  
  return response;
}

// Integração com OpenAI (preparado para futuro)
async function enhanceWithOpenAI(response: string, context: any, apiKey?: string): Promise<string> {
  // Se não houver API key, retornar resposta padrão
  if (!apiKey) {
    return response;
  }

  try {
    // Preparar contexto para OpenAI
    const systemPrompt = `Você é um assistente especializado em gestão de inventário. 
    Você tem acesso a um banco de dados com 28.179 registros de produtos.
    Forneça respostas precisas, detalhadas e bem formatadas sobre o inventário.
    Use emojis apropriados para melhorar a legibilidade.
    Sempre que possível, inclua insights e recomendações baseadas nos dados.`;

    const userPrompt = `Baseado nos seguintes dados do inventário, forneça uma resposta completa e útil:
    
    ${response}
    
    Contexto adicional:
    - Query type: ${context.queryType}
    - Registros encontrados: ${context.count}
    - Consulta original: ${context.originalMessage}
    
    Por favor, mantenha a formatação com markdown e adicione insights relevantes.`;

    // Chamada para OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (openAIResponse.ok) {
      const data = await openAIResponse.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('Erro ao chamar OpenAI:', error);
  }

  // Retornar resposta original se houver erro
  return response;
}

// API endpoint principal com análise inteligente
app.post('/api/openai-enhanced', async (c) => {
  const startTime = Date.now();
  
  try {
    const { message } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    console.log(`🤖 Análise inteligente: "${message}"`);
    
    // Analisar mensagem
    const analysis = analyzeMessage(message);
    console.log(`📊 Intent: ${analysis.intent}, Entities:`, analysis.entities);
    
    // Executar consulta otimizada
    const queryResult = await executeOptimizedQuery(analysis.intent, analysis.entities);
    
    // Formatar resposta inteligente
    let response = formatIntelligentResponse(queryResult, message);
    
    // Tentar melhorar com OpenAI se houver API key
    const openAIKey = c.env?.OPENAI_API_KEY;
    if (openAIKey) {
      response = await enhanceWithOpenAI(response, {
        ...queryResult,
        originalMessage: message
      }, openAIKey);
    }
    
    // Adicionar metadados finais
    const finalResponse = response + `\n\n` +
      `${'─'.repeat(50)}\n` +
      `⚡ **Consulta em tempo real**\n` +
      `• Intent: ${analysis.intent}\n` +
      `• Registros: ${queryResult.count.toLocaleString('pt-BR')}\n` +
      `• Tempo: ${Date.now() - startTime}ms\n` +
      `• Fonte: Supabase Direct${openAIKey ? ' + GPT-4' : ''}`;
    
    return c.json({
      success: true,
      response: finalResponse,
      metadata: {
        intent: analysis.intent,
        entities: analysis.entities,
        queryType: queryResult.queryType,
        recordsFound: queryResult.count,
        responseTime: Date.now() - startTime,
        realtime: true,
        enhanced: !!openAIKey,
        source: 'supabase-direct'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro na consulta:', error);
    return c.json({
      success: false,
      error: error.message,
      response: `❌ Erro ao processar consulta: ${error.message}`
    }, 500);
  }
})

// Endpoint de status melhorado
app.get('/api/openai-enhanced/status', async (c) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Testar conexão e coletar estatísticas
    const [
      { count: totalCount, error: totalError },
      { count: vencidosCount, error: vencidosError },
      { count: avariaCount, error: avariaError }
    ] = await Promise.all([
      supabase.from('estoque').select('*', { count: 'exact', head: true }),
      supabase.from('estoque').select('*', { count: 'exact', head: true }).eq('saldo_bloqueado_produto', 'Vencido'),
      supabase.from('estoque').select('*', { count: 'exact', head: true }).eq('saldo_bloqueado_produto', 'Avaria')
    ]);
    
    if (totalError) throw totalError;
    
    const hasOpenAI = !!c.env?.OPENAI_API_KEY;
    
    return c.json({
      status: 'online',
      database: 'connected',
      features: {
        realtime: true,
        openai: hasOpenAI,
        intents: [
          'location_query',
          'product_query',
          'expired_query',
          'damaged_query',
          'blocked_query',
          'warehouse_query',
          'lot_query',
          'summary_query'
        ]
      },
      statistics: {
        totalRecords: totalCount || 0,
        expiredProducts: vencidosCount || 0,
        damagedProducts: avariaCount || 0,
        healthyProducts: (totalCount || 0) - (vencidosCount || 0) - (avariaCount || 0)
      },
      message: `✅ Sistema online | ${totalCount} registros | ${hasOpenAI ? 'GPT-4 ativo' : 'Modo padrão'}`
    });
    
  } catch (error: any) {
    return c.json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    }, 500);
  }
})

// Endpoint para análise de mensagem (útil para debug)
app.post('/api/openai-enhanced/analyze', async (c) => {
  try {
    const { message } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    
    const analysis = analyzeMessage(message);
    
    return c.json({
      success: true,
      message: message,
      analysis: analysis,
      description: `Detectado intent "${analysis.intent}" com entidades: ${JSON.stringify(analysis.entities)}`
    });
    
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
})

export default app