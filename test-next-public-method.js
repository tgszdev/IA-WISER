#!/usr/bin/env node

/**
 * Teste do método NEXT_PUBLIC_ que funcionou no outro projeto
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

console.log('🔍 TESTE DO MÉTODO NEXT_PUBLIC_SUPABASE\n');
console.log('============================================================\n');

// Simular as variáveis NEXT_PUBLIC_
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('📋 Configuração:');
console.log(`URL: ${NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`Anon Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY ? NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'NÃO CONFIGURADA'}`);
console.log('');

if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('❌ ERRO: NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada!');
  console.log('\n📝 INSTRUÇÕES:');
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá em Settings → API');
  console.log('4. Copie a chave "anon public"');
  console.log('5. Adicione no Vercel:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=' + NEXT_PUBLIC_SUPABASE_URL);
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=[sua_anon_key_aqui]');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Teste 1: Verificar conexão básica
async function testBasicConnection() {
  console.log('📌 TESTE 1: Conexão Básica');
  console.log('----------------------------------------');
  
  try {
    // Tentar listar tabelas (metadata)
    const { data, error } = await supabase
      .from('estoque')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ FALHOU: Tabela "estoque" não existe');
        console.log('   Crie a tabela no Supabase primeiro');
        return false;
      } else if (error.message.includes('JWT')) {
        console.log('❌ FALHOU: Anon Key inválida');
        console.log('   Verifique se copiou a chave correta');
        return false;
      } else {
        console.log(`❌ FALHOU: ${error.message}`);
        return false;
      }
    }
    
    console.log('✅ SUCESSO: Conexão estabelecida!');
    return true;
  } catch (err) {
    console.log(`❌ ERRO: ${err.message}`);
    return false;
  }
}

// Teste 2: Buscar dados da tabela
async function testFetchData() {
  console.log('\n📌 TESTE 2: Buscar Dados do Estoque');
  console.log('----------------------------------------');
  
  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log(`❌ FALHOU: ${error.message}`);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Tabela existe mas está vazia');
      return true;
    }
    
    console.log(`✅ SUCESSO: ${data.length} produtos encontrados`);
    console.log('\n📦 Amostra dos dados:');
    data.forEach((item, index) => {
      console.log(`\n  Produto ${index + 1}:`);
      Object.keys(item).slice(0, 5).forEach(key => {
        console.log(`    ${key}: ${item[key]}`);
      });
    });
    
    return true;
  } catch (err) {
    console.log(`❌ ERRO: ${err.message}`);
    return false;
  }
}

// Teste 3: Verificar RLS
async function testRLS() {
  console.log('\n📌 TESTE 3: Verificar RLS (Row Level Security)');
  console.log('----------------------------------------');
  
  try {
    // Tentar fazer INSERT (deve falhar se RLS estiver configurado corretamente)
    const { data, error } = await supabase
      .from('estoque')
      .insert({ test: 'test' })
      .select();
    
    if (error) {
      if (error.message.includes('new row violates') || error.message.includes('permission')) {
        console.log('✅ RLS está ativo (INSERT bloqueado - correto)');
      } else {
        console.log(`⚠️ Erro diferente: ${error.message}`);
      }
    } else {
      console.log('⚠️ INSERT permitido - considere ativar RLS para segurança');
    }
  } catch (err) {
    console.log(`Verificação RLS: ${err.message}`);
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Iniciando testes...\n');
  
  const test1 = await testBasicConnection();
  if (!test1) {
    console.log('\n❌ Conexão falhou. Verifique as credenciais.');
    return;
  }
  
  const test2 = await testFetchData();
  await testRLS();
  
  console.log('\n============================================================');
  console.log('📊 RESUMO\n');
  
  if (test1 && test2) {
    console.log('🎉 SUCESSO TOTAL! Método NEXT_PUBLIC_ funcionando!');
    console.log('\n✅ Próximos passos:');
    console.log('1. Configure estas variáveis no Vercel:');
    console.log(`   NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
    console.log('2. Faça redeploy do projeto');
    console.log('3. Teste o chat - deve carregar os dados do estoque!');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os erros acima.');
  }
}

// Executar
runAllTests().catch(console.error);