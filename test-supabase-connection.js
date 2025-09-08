#!/usr/bin/env node

// Teste de conexão com Supabase e envio de dados para OpenAI
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '.dev.vars' });

// Configurações do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MjE1MzQsImV4cCI6MjA0ODI5NzUzNH0.j6rk4Y9GMZu0CAr20gbLlGdZPnGCB-yiwfjxRWxiuZE';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('🔧 Testando conexão com Supabase e OpenAI...\n');

// Inicializa cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inicializa OpenAI
let openai = null;
if (OPENAI_API_KEY && !OPENAI_API_KEY.includes('your_')) {
  openai = new OpenAI.OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('✅ OpenAI configurado\n');
} else {
  console.log('⚠️ OpenAI não configurado\n');
}

async function testSupabaseConnection() {
  console.log('📊 1. Testando conexão com Supabase...');
  
  try {
    // Testa conexão básica
    const { data: testData, error: testError } = await supabase
      .from('estoque')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Erro na conexão:', testError.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase OK!\n');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    return false;
  }
}

async function fetchInventoryData() {
  console.log('📦 2. Buscando dados do inventário...');
  
  try {
    // Busca todos os produtos
    const { data, error, count } = await supabase
      .from('estoque')
      .select('*', { count: 'exact' })
      .limit(5); // Limita para teste
    
    if (error) {
      console.error('❌ Erro ao buscar dados:', error.message);
      return null;
    }
    
    console.log(`✅ Encontrados ${count} produtos no total`);
    console.log(`📋 Mostrando primeiros ${data.length} produtos:\n`);
    
    data.forEach((item, index) => {
      console.log(`Produto ${index + 1}:`);
      console.log(`  - Código: ${item.codigo_produto}`);
      console.log(`  - Descrição: ${item.descricao_produto}`);
      console.log(`  - Saldo: ${item.saldo_disponivel_produto}`);
      console.log(`  - Local: ${item.local_produto || 'N/A'}`);
      console.log('');
    });
    
    return { data, count };
  } catch (error) {
    console.error('❌ Erro ao buscar inventário:', error.message);
    return null;
  }
}

async function testOpenAIWithData(inventoryData) {
  if (!openai) {
    console.log('⚠️ 3. OpenAI não configurado, pulando teste...\n');
    return;
  }
  
  console.log('🤖 3. Testando OpenAI com dados do inventário...');
  
  try {
    // Formata dados para OpenAI
    const formattedData = {
      totalItems: inventoryData.count,
      products: inventoryData.data.map(item => ({
        codigo: item.codigo_produto,
        descricao: item.descricao_produto,
        saldo: item.saldo_disponivel_produto,
        bloqueado: item.saldo_bloqueado_produto,
        local: item.local_produto,
        armazem: item.armazem
      }))
    };
    
    // Prepara mensagens
    const messages = [
      {
        role: 'system',
        content: `Você é o Wiser IA Assistant, especializado em gestão de inventário.
        
DADOS DO INVENTÁRIO DISPONÍVEIS:
${JSON.stringify(formattedData, null, 2)}

Analise estes dados e forneça insights úteis.`
      },
      {
        role: 'user',
        content: 'Me dê um resumo do inventário e identifique produtos com saldo baixo (menos de 50 unidades).'
      }
    ];
    
    console.log('\n📤 Enviando dados para OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.3,
      max_tokens: 500
    });
    
    console.log('\n✅ Resposta do OpenAI:');
    console.log('─'.repeat(50));
    console.log(completion.choices[0].message.content);
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('❌ Erro ao processar com OpenAI:', error.message);
    if (error.status === 401) {
      console.log('💡 Dica: Verifique se sua API key do OpenAI está correta');
    }
  }
}

async function searchSpecificProduct(productCode) {
  console.log(`\n🔍 4. Buscando produto específico: ${productCode}...`);
  
  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .eq('codigo_produto', productCode);
    
    if (error) {
      console.error('❌ Erro na busca:', error.message);
      return null;
    }
    
    if (data && data.length > 0) {
      console.log(`✅ Produto ${productCode} encontrado:`);
      data.forEach(item => {
        console.log(`  - Descrição: ${item.descricao_produto}`);
        console.log(`  - Saldo: ${item.saldo_disponivel_produto}`);
        console.log(`  - Status: ${item.saldo_bloqueado_produto || 'Normal'}`);
      });
    } else {
      console.log(`⚠️ Produto ${productCode} não encontrado`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error.message);
    return null;
  }
}

// Executa testes
async function runTests() {
  console.log('═'.repeat(60));
  console.log('   TESTE DE CONEXÃO SUPABASE + OPENAI');
  console.log('═'.repeat(60));
  console.log('');
  
  // Teste 1: Conexão
  const isConnected = await testSupabaseConnection();
  
  if (!isConnected) {
    console.log('\n⚠️ Não foi possível conectar ao Supabase.');
    console.log('Verifique as credenciais em .dev.vars');
    return;
  }
  
  // Teste 2: Buscar dados
  const inventoryData = await fetchInventoryData();
  
  if (inventoryData && inventoryData.data.length > 0) {
    // Teste 3: OpenAI com dados
    await testOpenAIWithData(inventoryData);
  }
  
  // Teste 4: Buscar produto específico
  await searchSpecificProduct('123');
  await searchSpecificProduct('PROD-001');
  
  console.log('\n═'.repeat(60));
  console.log('   TESTE CONCLUÍDO');
  console.log('═'.repeat(60));
  
  // Mostra formato correto para OpenAI
  console.log('\n📋 FORMATO DE DADOS PARA OPENAI:');
  console.log('─'.repeat(50));
  console.log(JSON.stringify({
    intent: {
      type: 'productInfo',
      confidence: 0.95,
      entities: { productCode: '123' }
    },
    queryResults: inventoryData?.data.slice(0, 2) || [],
    totalItems: inventoryData?.count || 0,
    summary: {
      uniqueProducts: inventoryData?.data.length || 0,
      totalValue: 0
    }
  }, null, 2));
  console.log('─'.repeat(50));
}

// Executa
runTests().catch(console.error);