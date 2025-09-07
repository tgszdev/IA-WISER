#!/usr/bin/env node

/**
 * Script para testar conexões HTTP/REST com Supabase
 * Contorna limitações de rede do sandbox
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0Mjg4NDIsImV4cCI6MjA1MjAwNDg0Mn0.aDYYedC0e31vUWxRQy7E2JYWUt6Xtx8JRFKmxvkJbqc';

console.log('🔍 TESTANDO MÉTODOS HTTP/REST COM SUPABASE\n');
console.log('============================================================\n');

const tests = [];

// Teste 1: REST API com anon key
async function testRestApiWithKey() {
  console.log('📌 TESTE 1: REST API com Anon Key');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/estoque?limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCESSO: Conectou via REST API');
      console.log(`   Dados retornados: ${JSON.stringify(data).substring(0, 100)}...`);
      return { method: 'REST API com Anon Key', success: true };
    } else {
      console.log(`❌ FALHOU: Status ${response.status} - ${response.statusText}`);
      return { method: 'REST API com Anon Key', success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    return { method: 'REST API com Anon Key', success: false, error: error.message };
  }
}

// Teste 2: PostgREST direto
async function testPostgrest() {
  console.log('\n📌 TESTE 2: PostgREST Direto');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('✅ SUCESSO: PostgREST endpoint acessível');
      return { method: 'PostgREST Direto', success: true };
    } else {
      console.log(`❌ FALHOU: Status ${response.status}`);
      return { method: 'PostgREST Direto', success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    return { method: 'PostgREST Direto', success: false, error: error.message };
  }
}

// Teste 3: Verificar se a tabela existe
async function testTableExists() {
  console.log('\n📌 TESTE 3: Verificar Tabela estoque');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/estoque`, {
      method: 'HEAD',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });
    
    if (response.ok || response.status === 200 || response.status === 206) {
      console.log('✅ SUCESSO: Tabela estoque existe');
      return { method: 'Verificar Tabela', success: true };
    } else if (response.status === 404) {
      console.log('❌ FALHOU: Tabela estoque não encontrada');
      return { method: 'Verificar Tabela', success: false, error: 'Tabela não existe' };
    } else {
      console.log(`❌ FALHOU: Status ${response.status}`);
      return { method: 'Verificar Tabela', success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    return { method: 'Verificar Tabela', success: false, error: error.message };
  }
}

// Teste 4: Query completa
async function testFullQuery() {
  console.log('\n📌 TESTE 4: Query Completa na Tabela');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/estoque?select=*&limit=5`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCESSO: Query executada');
      console.log(`   Registros retornados: ${data.length}`);
      if (data.length > 0) {
        console.log(`   Campos disponíveis: ${Object.keys(data[0]).join(', ')}`);
      }
      return { method: 'Query Completa', success: true, data };
    } else {
      const errorText = await response.text();
      console.log(`❌ FALHOU: Status ${response.status}`);
      console.log(`   Erro: ${errorText}`);
      return { method: 'Query Completa', success: false, error: errorText };
    }
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    return { method: 'Query Completa', success: false, error: error.message };
  }
}

// Teste 5: Contar registros
async function testCount() {
  console.log('\n📌 TESTE 5: Contar Registros');
  console.log('----------------------------------------');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/estoque?select=count`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (response.ok) {
      const count = response.headers.get('content-range');
      console.log('✅ SUCESSO: Contagem obtida');
      console.log(`   Total de registros: ${count || 'não especificado'}`);
      return { method: 'Contar Registros', success: true };
    } else {
      console.log(`❌ FALHOU: Status ${response.status}`);
      return { method: 'Contar Registros', success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    return { method: 'Contar Registros', success: false, error: error.message };
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Iniciando testes HTTP/REST...');
  console.log(`URL Base: ${SUPABASE_URL}`);
  console.log(`Anon Key: ${ANON_KEY.substring(0, 20)}...`);
  
  tests.push(await testRestApiWithKey());
  tests.push(await testPostgrest());
  tests.push(await testTableExists());
  tests.push(await testFullQuery());
  tests.push(await testCount());
  
  // Resumo
  console.log('\n============================================================');
  console.log('📊 RESUMO DOS TESTES HTTP/REST\n');
  
  const successful = tests.filter(t => t.success);
  const failed = tests.filter(t => !t.success);
  
  if (successful.length > 0) {
    console.log('✅ MÉTODOS QUE FUNCIONARAM:');
    successful.forEach(t => {
      console.log(`   ✓ ${t.method}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ MÉTODOS QUE FALHARAM:');
    failed.forEach(t => {
      console.log(`   ✗ ${t.method}: ${t.error}`);
    });
  }
  
  console.log('\n============================================================');
  
  if (successful.length > 0) {
    console.log('🎉 SUCESSO! Conexão HTTP/REST funcionando!');
    console.log('Use o método REST API no seu aplicativo Vercel.');
    
    // Mostrar exemplo de código
    console.log('\n📝 CÓDIGO RECOMENDADO PARA VERCEL:\n');
    console.log(`
// api/database-http.js
export async function queryDatabase(query) {
  const response = await fetch('${SUPABASE_URL}/rest/v1/estoque', {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': \`Bearer \${process.env.SUPABASE_ANON_KEY}\`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(\`Database query failed: \${response.status}\`);
  }
  
  return response.json();
}
`);
  } else {
    console.log('⚠️  Nenhum método HTTP funcionou.');
    console.log('Verifique suas credenciais e configurações.');
  }
}

// Executar
runAllTests().catch(console.error);