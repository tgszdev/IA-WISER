import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

// Configuração do Supabase
const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';

// Função para executar consultas SQL baseadas na pergunta
async function executeSmartQuery(message: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const lower = message.toLowerCase();
  
  // Detectar o que o usuário quer
  let query;
  let queryType = 'general';
  
  // Consulta por localização (9 dígitos)
  const locationMatch = message.match(/\b(\d{9})\b/);
  if (locationMatch) {
    const location = locationMatch[1];
    queryType = 'location';
    
    // Buscar todos os produtos no local
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .eq('local_produto', location);
    
    if (error) throw error;
    
    return {
      queryType,
      location,
      data: data || [],
      count: data?.length || 0,
      summary: `Local ${location} contém ${data?.length || 0} produtos`
    };
  }
  
  // Consulta por produto
  const productPatterns = [
    /\b(RM\s*\d+)\b/gi,
    /\b(PROD-\d+)\b/gi,
    /produto\s+(\S+)/gi
  ];
  
  for (const pattern of productPatterns) {
    const match = message.match(pattern);
    if (match) {
      const productCode = match[1].replace(/\s+/g, ' ').trim().toUpperCase();
      queryType = 'product';
      
      // Buscar produto em todos os locais
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .or(`codigo_produto.eq.${productCode},codigo_produto.eq.${productCode.replace(/\s+/g, '')}`);
      
      if (error) throw error;
      
      // Calcular totais
      const totalSaldo = data?.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0) || 0;
      
      return {
        queryType,
        productCode,
        data: data || [],
        count: data?.length || 0,
        totalSaldo,
        summary: `Produto ${productCode}: ${data?.length || 0} registros, saldo total: ${totalSaldo}`
      };
    }
  }
  
  // Consultas especiais
  if (/vencid|expirad/i.test(lower)) {
    queryType = 'expired';
    const { data, error, count } = await supabase
      .from('estoque')
      .select('*', { count: 'exact' })
      .eq('saldo_bloqueado_produto', 'Vencido');
    
    if (error) throw error;
    
    return {
      queryType,
      data: data || [],
      count: count || 0,
      summary: `${count || 0} produtos vencidos encontrados`
    };
  }
  
  if (/avaria|danificad/i.test(lower)) {
    queryType = 'damaged';
    const { data, error, count } = await supabase
      .from('estoque')
      .select('*', { count: 'exact' })
      .eq('saldo_bloqueado_produto', 'Avaria');
    
    if (error) throw error;
    
    return {
      queryType,
      data: data || [],
      count: count || 0,
      summary: `${count || 0} produtos com avaria encontrados`
    };
  }
  
  // Resumo geral - buscar estatísticas
  if (/resumo|total|geral|estat/i.test(lower)) {
    queryType = 'summary';
    
    // Contar total de registros
    const { count: totalCount } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    // Buscar amostra para estatísticas
    const { data: sample } = await supabase
      .from('estoque')
      .select('*')
      .limit(1000);
    
    // Contar produtos únicos (aproximado)
    const uniqueProducts = new Set(sample?.map(item => item.codigo_produto));
    const uniqueLocations = new Set(sample?.map(item => item.local_produto));
    
    return {
      queryType,
      data: {
        totalRegistros: totalCount || 0,
        produtosUnicos: uniqueProducts.size * (totalCount! / 1000), // Estimativa
        locaisUnicos: uniqueLocations.size * (totalCount! / 1000), // Estimativa
        amostra: sample?.slice(0, 10) // Primeiros 10 como exemplo
      },
      count: totalCount || 0,
      summary: `Inventário com ${totalCount} registros totais`
    };
  }
  
  // Query padrão - buscar alguns exemplos
  const { data, error, count } = await supabase
    .from('estoque')
    .select('*', { count: 'exact' })
    .limit(100);
  
  if (error) throw error;
  
  return {
    queryType: 'general',
    data: data || [],
    count: count || 0,
    summary: `Consulta geral: ${count} registros no total`
  };
}

// Função para formatar resposta baseada nos dados
function formatResponse(queryResult: any): string {
  const { queryType, data, count, summary } = queryResult;
  
  let response = '';
  
  switch (queryType) {
    case 'location':
      response = `📍 **LOCAL ${queryResult.location} - PRODUTOS ARMAZENADOS**\n`;
      response += `${'='.repeat(50)}\n\n`;
      response += `**Total de produtos neste local**: ${data.length}\n\n`;
      
      if (data.length > 0) {
        response += `**PRODUTOS**:\n`;
        data.forEach((item: any, index: number) => {
          response += `${index + 1}. **${item.codigo_produto}** - ${item.descricao_produto}\n`;
          response += `   • Saldo: ${item.saldo_disponivel_produto} ${item.unidade_medida || 'UN'}\n`;
          response += `   • Lote: ${item.lote_industria_produto || 'N/A'}\n`;
          if (item.saldo_bloqueado_produto) {
            response += `   • ⚠️ Status: ${item.saldo_bloqueado_produto}\n`;
          }
          response += '\n';
        });
      }
      break;
      
    case 'product':
      if (data.length === 0) {
        response = `❌ Produto ${queryResult.productCode} não encontrado.`;
      } else {
        const first = data[0];
        response = `📦 **PRODUTO ${queryResult.productCode} - ANÁLISE COMPLETA**\n`;
        response += `${'='.repeat(50)}\n\n`;
        response += `**Código**: ${first.codigo_produto}\n`;
        response += `**Descrição**: ${first.descricao_produto}\n`;
        response += `**Total de registros**: ${data.length}\n`;
        response += `**Saldo Total**: ${queryResult.totalSaldo.toLocaleString('pt-BR')} ${first.unidade_medida || 'UN'}\n\n`;
        
        response += `**DETALHAMENTO POR LOCAL**:\n`;
        data.forEach((item: any, index: number) => {
          response += `${index + 1}. Local: ${item.local_produto || 'N/A'} | `;
          response += `Saldo: ${item.saldo_disponivel_produto} | `;
          response += `Lote: ${item.lote_industria_produto || 'N/A'}\n`;
        });
      }
      break;
      
    case 'expired':
      response = `⚠️ **PRODUTOS VENCIDOS**\n`;
      response += `${'='.repeat(50)}\n\n`;
      response += `**Total**: ${count} produtos vencidos\n\n`;
      
      if (data.length > 0) {
        const byProduct: any = {};
        data.forEach((item: any) => {
          if (!byProduct[item.codigo_produto]) {
            byProduct[item.codigo_produto] = {
              descricao: item.descricao_produto,
              quantidade: 0,
              locais: []
            };
          }
          byProduct[item.codigo_produto].quantidade += item.saldo_disponivel_produto || 0;
          byProduct[item.codigo_produto].locais.push(item.local_produto);
        });
        
        Object.entries(byProduct).slice(0, 10).forEach(([code, info]: any) => {
          response += `• **${code}** - ${info.descricao}\n`;
          response += `  Quantidade: ${info.quantidade} | Locais: ${info.locais.length}\n`;
        });
        
        if (Object.keys(byProduct).length > 10) {
          response += `\n... e mais ${Object.keys(byProduct).length - 10} produtos`;
        }
      }
      break;
      
    case 'damaged':
      response = `🔧 **PRODUTOS COM AVARIA**\n`;
      response += `${'='.repeat(50)}\n\n`;
      response += `**Total**: ${count} produtos com avaria\n\n`;
      
      if (data.length > 0) {
        data.slice(0, 10).forEach((item: any, index: number) => {
          response += `${index + 1}. **${item.codigo_produto}** - ${item.descricao_produto}\n`;
          response += `   Local: ${item.local_produto} | Saldo: ${item.saldo_disponivel_produto}\n`;
        });
        
        if (data.length > 10) {
          response += `\n... e mais ${data.length - 10} produtos`;
        }
      }
      break;
      
    case 'summary':
      response = `📊 **RESUMO DO INVENTÁRIO**\n`;
      response += `${'='.repeat(50)}\n\n`;
      response += `**Total de Registros**: ${data.totalRegistros.toLocaleString('pt-BR')}\n`;
      response += `**Produtos Únicos** (estimado): ${Math.round(data.produtosUnicos).toLocaleString('pt-BR')}\n`;
      response += `**Locais Únicos** (estimado): ${Math.round(data.locaisUnicos).toLocaleString('pt-BR')}\n\n`;
      response += `📌 *Dados consultados em tempo real do banco de dados*`;
      break;
      
    default:
      response = `📋 **RESULTADO DA CONSULTA**\n\n`;
      response += summary + '\n\n';
      if (data.length > 0) {
        response += `Primeiros registros:\n`;
        data.slice(0, 5).forEach((item: any) => {
          response += `• ${item.codigo_produto} - ${item.descricao_produto}\n`;
        });
      }
  }
  
  return response;
}

// API endpoint principal
app.post('/api/openai-realtime', async (c) => {
  const startTime = Date.now();
  
  try {
    const { message } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    
    console.log(`🔍 Consulta em tempo real: "${message}"`);
    
    // Executar consulta inteligente no Supabase
    const queryResult = await executeSmartQuery(message);
    
    // Formatar resposta
    const response = formatResponse(queryResult);
    
    // Adicionar metadados
    const finalResponse = response + `\n\n` +
      `──────────────────────\n` +
      `⚡ **Consulta em tempo real**\n` +
      `• Registros analisados: ${queryResult.count}\n` +
      `• Tempo: ${Date.now() - startTime}ms\n` +
      `• Fonte: Supabase (ao vivo)`;
    
    return c.json({
      success: true,
      response: finalResponse,
      metadata: {
        queryType: queryResult.queryType,
        recordsFound: queryResult.count,
        responseTime: Date.now() - startTime,
        realtime: true,
        source: 'supabase-direct'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro na consulta:', error);
    return c.json({
      success: false,
      error: error.message,
      response: `❌ Erro ao consultar banco de dados: ${error.message}`
    }, 500);
  }
})

// Endpoint para verificar status
app.get('/api/openai-realtime/status', async (c) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Testar conexão
    const { count, error } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return c.json({
      status: 'online',
      database: 'connected',
      totalRecords: count,
      message: `✅ Sistema online com ${count} registros`
    });
    
  } catch (error: any) {
    return c.json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    }, 500);
  }
})

export default app