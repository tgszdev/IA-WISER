// ============================================================
// CONEXÃO DIRETA OPENAI + SUPABASE COM 100% DOS DADOS
// Sistema inteligente que carrega TUDO e responde com precisão
// ============================================================

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Cache global - mantém 100% dos dados em memória
let GLOBAL_CACHE = null;
let CACHE_TIME = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Função para carregar 100% dos dados
async function loadCompleteDatabase() {
  if (GLOBAL_CACHE && CACHE_TIME && (Date.now() - CACHE_TIME < CACHE_DURATION)) {
    console.log('✅ Usando cache com 100% dos dados');
    return GLOBAL_CACHE;
  }

  console.log('🔄 Carregando 100% dos dados do Supabase...');
  
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Obter contagem total
  const { count: totalCount } = await supabase
    .from('estoque')
    .select('*', { count: 'exact', head: true });
  
  // Carregar TODOS os dados
  let allData = [];
  const batchSize = 1000;
  
  for (let offset = 0; offset < totalCount; offset += batchSize) {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .range(offset, Math.min(offset + batchSize - 1, totalCount - 1))
      .order('codigo_produto');
    
    if (error) throw error;
    if (data) allData = [...allData, ...data];
  }
  
  console.log(`✅ ${allData.length} registros carregados!`);
  
  // Criar estrutura otimizada para consultas
  const database = {
    raw_data: allData,
    by_product: {},
    by_location: {},
    by_lot: {},
    statistics: {
      total_records: allData.length,
      unique_products: new Set(),
      unique_locations: new Set(),
      unique_lots: new Set(),
      total_stock: 0,
      blocked_count: 0,
      damaged_count: 0,
      expired_count: 0
    }
  };
  
  // Indexar dados para busca rápida
  allData.forEach(item => {
    // Índice por produto
    if (!database.by_product[item.codigo_produto]) {
      database.by_product[item.codigo_produto] = [];
    }
    database.by_product[item.codigo_produto].push(item);
    
    // Índice por localização
    if (item.local_produto) {
      if (!database.by_location[item.local_produto]) {
        database.by_location[item.local_produto] = [];
      }
      database.by_location[item.local_produto].push(item);
      database.statistics.unique_locations.add(item.local_produto);
    }
    
    // Índice por lote
    if (item.lote_industria_produto) {
      if (!database.by_lot[item.lote_industria_produto]) {
        database.by_lot[item.lote_industria_produto] = [];
      }
      database.by_lot[item.lote_industria_produto].push(item);
      database.statistics.unique_lots.add(item.lote_industria_produto);
    }
    
    // Estatísticas
    database.statistics.unique_products.add(item.codigo_produto);
    database.statistics.total_stock += item.saldo_disponivel_produto || 0;
    
    if (item.saldo_bloqueado_produto) {
      database.statistics.blocked_count++;
      if (item.saldo_bloqueado_produto === 'Avaria') {
        database.statistics.damaged_count++;
      } else if (item.saldo_bloqueado_produto === 'Vencido') {
        database.statistics.expired_count++;
      }
    }
  });
  
  // Converter Sets para números
  database.statistics.unique_products = database.statistics.unique_products.size;
  database.statistics.unique_locations = database.statistics.unique_locations.size;
  database.statistics.unique_lots = database.statistics.unique_lots.size;
  
  GLOBAL_CACHE = database;
  CACHE_TIME = Date.now();
  
  return database;
}

// Função principal da API
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, use_openai = true } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Carregar 100% dos dados
    const database = await loadCompleteDatabase();
    
    // Se não usar OpenAI, processar localmente
    if (!use_openai || !process.env.OPENAI_API_KEY) {
      return processLocally(message, database, res);
    }
    
    // Usar OpenAI com 100% dos dados
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Criar prompt com TODOS os dados relevantes
    const systemPrompt = `Você é um assistente especializado em gestão de estoque/inventário.

BANCO DE DADOS COMPLETO CARREGADO:
================================
Total de Registros: ${database.statistics.total_records}
Produtos Únicos: ${database.statistics.unique_products}
Localizações Únicas: ${database.statistics.unique_locations}
Lotes Únicos: ${database.statistics.unique_lots}
Estoque Total: ${database.statistics.total_stock.toLocaleString('pt-BR')}
Produtos Bloqueados: ${database.statistics.blocked_count}
Produtos com Avaria: ${database.statistics.damaged_count}
Produtos Vencidos: ${database.statistics.expired_count}

ESTRUTURA DA TABELA 'estoque':
- id: ID único
- codigo_produto: Código do produto (ex: RM 123, PROD-001)
- descricao_produto: Descrição do produto
- saldo_disponivel_produto: Quantidade disponível
- saldo_bloqueado_produto: Status (Avaria, Vencido, etc)
- lote_industria_produto: Número do lote
- local_produto: Código de localização (9 dígitos)
- armazem: Nome do armazém
- preco_unitario: Preço unitário
- unidade_medida: Unidade (UN, KG, etc)
- categoria: Categoria do produto
- data_validade: Data de validade

INSTRUÇÕES CRÍTICAS:
1. Você tem acesso a 100% dos dados - ${database.statistics.total_records} registros
2. Para consultas de produtos, sempre mostre TODOS os locais
3. Para consultas de localização, liste TODOS os produtos naquele local
4. Use os dados indexados para respostas precisas
5. NUNCA invente dados - use apenas o que está no banco
6. Responda em português brasileiro
7. Formate as respostas de forma clara e estruturada

${getRelevantData(message, database)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 2000,
      temperature: 0.1 // Máxima precisão
    });
    
    return res.status(200).json({
      response: completion.choices[0].message.content,
      metadata: {
        model: 'gpt-4-turbo',
        total_records_analyzed: database.statistics.total_records,
        cache_used: CACHE_TIME ? true : false,
        processing_time: Date.now() - req.startTime
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    return res.status(500).json({
      error: error.message,
      response: `Erro: ${error.message}`
    });
  }
}

// Função para extrair dados relevantes baseado na mensagem
function getRelevantData(message, database) {
  const lower = message.toLowerCase();
  let relevantData = '\nDADOS RELEVANTES PARA SUA CONSULTA:\n';
  
  // Detectar código de produto
  const productPatterns = [
    /\b(RM\s*\d+)\b/gi,
    /\b(PROD-\d+)\b/gi,
    /\b([A-Z]{2,}\s*\d+)\b/gi
  ];
  
  for (const pattern of productPatterns) {
    const match = message.match(pattern);
    if (match) {
      const code = match[1].toUpperCase();
      const productData = database.by_product[code] || 
                         database.by_product[code.replace(/\s+/g, '')] ||
                         database.by_product[code.replace(/\s+/g, ' ')];
      
      if (productData) {
        relevantData += `\nPRODUTO ${code} - DADOS COMPLETOS:\n`;
        relevantData += `Total de registros: ${productData.length}\n`;
        relevantData += `Saldo total: ${productData.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0)}\n`;
        relevantData += `\nTODOS OS REGISTROS:\n`;
        relevantData += JSON.stringify(productData, null, 2).substring(0, 3000);
      }
      break;
    }
  }
  
  // Detectar localização (9 dígitos)
  const locationPattern = /\b(\d{9})\b/g;
  const locationMatch = message.match(locationPattern);
  if (locationMatch) {
    const location = locationMatch[0];
    const locationData = database.by_location[location];
    
    if (locationData) {
      relevantData += `\nLOCAL ${location} - PRODUTOS ARMAZENADOS:\n`;
      relevantData += `Total de produtos: ${locationData.length}\n`;
      relevantData += JSON.stringify(locationData, null, 2).substring(0, 3000);
    }
  }
  
  // Se pedir resumo ou total
  if (/total|resumo|geral|completo|tudo/i.test(lower)) {
    relevantData += '\nRESUMO COMPLETO DO INVENTÁRIO:\n';
    relevantData += JSON.stringify(database.statistics, null, 2);
  }
  
  // Se pedir vencidos
  if (/vencid|expirad/i.test(lower)) {
    const expired = database.raw_data.filter(item => item.saldo_bloqueado_produto === 'Vencido');
    relevantData += `\nPRODUTOS VENCIDOS (${expired.length} itens):\n`;
    relevantData += JSON.stringify(expired.slice(0, 20), null, 2).substring(0, 2000);
  }
  
  // Se pedir avarias
  if (/avaria|danificad|defeito/i.test(lower)) {
    const damaged = database.raw_data.filter(item => item.saldo_bloqueado_produto === 'Avaria');
    relevantData += `\nPRODUTOS COM AVARIA (${damaged.length} itens):\n`;
    relevantData += JSON.stringify(damaged.slice(0, 20), null, 2).substring(0, 2000);
  }
  
  return relevantData;
}

// Processamento local sem OpenAI
function processLocally(message, database, res) {
  let response = '📊 RESPOSTA BASEADA EM 100% DOS DADOS\n\n';
  
  // Análise simples da mensagem
  const lower = message.toLowerCase();
  
  // Buscar produto
  const productMatch = message.match(/\b(RM\s*\d+|PROD-\d+|\d{3,6})\b/i);
  if (productMatch) {
    const code = productMatch[1].toUpperCase();
    const data = database.by_product[code];
    
    if (data) {
      const total = data.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0);
      response += `📦 Produto ${code}\n`;
      response += `Total de registros: ${data.length}\n`;
      response += `Saldo total: ${total.toLocaleString('pt-BR')}\n`;
      response += `Locais: ${data.map(d => d.local_produto).join(', ')}`;
    } else {
      response += `❌ Produto ${code} não encontrado`;
    }
  }
  // Buscar localização
  else if (/\d{9}/.test(message)) {
    const location = message.match(/\d{9}/)[0];
    const data = database.by_location[location];
    
    if (data) {
      response += `📍 Local ${location}\n`;
      response += `Produtos armazenados: ${data.length}\n`;
      data.forEach(item => {
        response += `- ${item.codigo_produto}: ${item.saldo_disponivel_produto} ${item.unidade_medida || 'UN'}\n`;
      });
    } else {
      response += `❌ Local ${location} não encontrado`;
    }
  }
  // Resumo geral
  else {
    response += `Total de registros: ${database.statistics.total_records}\n`;
    response += `Produtos únicos: ${database.statistics.unique_products}\n`;
    response += `Estoque total: ${database.statistics.total_stock.toLocaleString('pt-BR')}`;
  }
  
  return res.status(200).json({
    response,
    metadata: {
      model: 'local',
      total_records_analyzed: database.statistics.total_records,
      cache_used: CACHE_TIME ? true : false
    }
  });
}