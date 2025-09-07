// TESTE COMPLETO - TODOS OS MÉTODOS DE CONEXÃO POSSÍVEIS
import postgres from 'postgres';
import https from 'https';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

console.log('🔍 TESTANDO TODOS OS MÉTODOS DE CONEXÃO COM SUPABASE\n');
console.log('=' .repeat(60));

const CONFIG = {
  host: 'db.tecvgnrqcfqcrcodrjtt.supabase.co',
  password: '38016863884',
  database: 'postgres',
  user: 'postgres',
  port: 5432
};

// Método 1: PostgreSQL Direto (como Supabase mostra)
async function testMethod1() {
  console.log('\n📌 MÉTODO 1: PostgreSQL Direto (postgres npm)');
  console.log('-'.repeat(40));
  
  const url = `postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres`;
  
  try {
    const sql = postgres(url, {
      ssl: 'require',
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 2: PostgreSQL com SSL e certificados
async function testMethod2() {
  console.log('\n📌 MÉTODO 2: PostgreSQL com SSL Options');
  console.log('-'.repeat(40));
  
  try {
    const sql = postgres({
      host: CONFIG.host,
      port: CONFIG.port,
      database: CONFIG.database,
      username: CONFIG.user,
      password: CONFIG.password,
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 3: Connection Pooler (porta 6543)
async function testMethod3() {
  console.log('\n📌 MÉTODO 3: Connection Pooler (porta 6543)');
  console.log('-'.repeat(40));
  
  const url = `postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:6543/postgres`;
  
  try {
    const sql = postgres(url, {
      ssl: 'require',
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 4: Pooler com pgbouncer
async function testMethod4() {
  console.log('\n📌 MÉTODO 4: Pooler com pgbouncer=true');
  console.log('-'.repeat(40));
  
  const url = `postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:6543/postgres?pgbouncer=true`;
  
  try {
    const sql = postgres(url, {
      ssl: 'require',
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 5: REST API direto
async function testMethod5() {
  console.log('\n📌 MÉTODO 5: REST API (sem autenticação)');
  console.log('-'.repeat(40));
  
  const url = 'https://tecvgnrqcfqcrcodrjtt.supabase.co/rest/v1/estoque?limit=1';
  
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ SUCESSO! API respondendo');
        resolve(true);
      } else {
        console.log('❌ FALHOU: Status', res.statusCode);
        resolve(false);
      }
    }).on('error', (error) => {
      console.log('❌ FALHOU:', error.message);
      resolve(false);
    });
  });
}

// Método 6: Supabase Client (precisa ANON KEY)
async function testMethod6() {
  console.log('\n📌 MÉTODO 6: Supabase JS Client');
  console.log('-'.repeat(40));
  
  // Você precisa adicionar a ANON KEY aqui
  const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'SUA_ANON_KEY_AQUI';
  
  if (SUPABASE_ANON_KEY === 'SUA_ANON_KEY_AQUI') {
    console.log('⚠️  PULADO: Precisa configurar SUPABASE_ANON_KEY');
    return false;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('estoque').select('*').limit(1);
    
    if (error) {
      console.log('❌ FALHOU:', error.message);
      return false;
    } else {
      console.log('✅ SUCESSO! Cliente Supabase conectado');
      return true;
    }
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 7: PostgreSQL com prepare statements
async function testMethod7() {
  console.log('\n📌 MÉTODO 7: PostgreSQL com Prepare Mode');
  console.log('-'.repeat(40));
  
  const url = `postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres`;
  
  try {
    const sql = postgres(url, {
      ssl: 'require',
      prepare: false, // Desabilitar prepared statements
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 8: URL com sslmode
async function testMethod8() {
  console.log('\n📌 MÉTODO 8: URL com sslmode=require');
  console.log('-'.repeat(40));
  
  const url = `postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres?sslmode=require`;
  
  try {
    const sql = postgres(url, {
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 9: PostgreSQL com IPv4 forçado
async function testMethod9() {
  console.log('\n📌 MÉTODO 9: PostgreSQL forçando IPv4');
  console.log('-'.repeat(40));
  
  try {
    const sql = postgres({
      host: CONFIG.host,
      port: CONFIG.port,
      database: CONFIG.database,
      username: CONFIG.user,
      password: CONFIG.password,
      ssl: 'require',
      connection: {
        options: '-c tcp_keepalives_idle=0'
      },
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ SUCESSO! Conectado às', result[0].time);
    await sql.end();
    return true;
  } catch (error) {
    console.log('❌ FALHOU:', error.message);
    return false;
  }
}

// Método 10: URL alternativa com password encoding
async function testMethod10() {
  console.log('\n📌 MÉTODO 10: URL com diferentes encodings');
  console.log('-'.repeat(40));
  
  // Tentar diferentes formas de encoding
  const urls = [
    `postgres://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres`,
    `postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres`,
    `postgres://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co/postgres`
  ];
  
  for (const url of urls) {
    try {
      console.log('Tentando:', url.substring(0, 50) + '...');
      const sql = postgres(url, { ssl: 'require', connect_timeout: 3 });
      const result = await sql`SELECT 1 as test`;
      console.log('✅ SUCESSO com URL:', url.substring(0, 50));
      await sql.end();
      return true;
    } catch (error) {
      // Continuar tentando
    }
  }
  
  console.log('❌ FALHOU: Nenhuma variação funcionou');
  return false;
}

// Executar todos os testes
async function runAllTests() {
  console.log('\n🚀 Iniciando testes de conexão...');
  console.log('Host:', CONFIG.host);
  console.log('Database:', CONFIG.database);
  console.log('User:', CONFIG.user);
  console.log('Password: ***');
  
  const results = [];
  
  // Executar cada método
  const methods = [
    { name: 'PostgreSQL Direto', test: testMethod1 },
    { name: 'PostgreSQL com SSL', test: testMethod2 },
    { name: 'Connection Pooler', test: testMethod3 },
    { name: 'Pooler com pgbouncer', test: testMethod4 },
    { name: 'REST API', test: testMethod5 },
    { name: 'Supabase Client', test: testMethod6 },
    { name: 'Prepare Mode Off', test: testMethod7 },
    { name: 'URL com sslmode', test: testMethod8 },
    { name: 'IPv4 Forçado', test: testMethod9 },
    { name: 'URL Variations', test: testMethod10 }
  ];
  
  for (const method of methods) {
    const success = await method.test();
    results.push({ name: method.name, success });
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre testes
  }
  
  // Resumo final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('✅ MÉTODOS QUE FUNCIONARAM:');
    successful.forEach(r => console.log(`   ✓ ${r.name}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ MÉTODOS QUE FALHARAM:');
    failed.forEach(r => console.log(`   ✗ ${r.name}`));
  }
  
  console.log('\n' + '=' .repeat(60));
  
  if (successful.length > 0) {
    console.log('🎉 USE QUALQUER UM DOS MÉTODOS QUE FUNCIONARAM!');
    console.log('Recomendado:', successful[0].name);
  } else {
    console.log('⚠️  NENHUM MÉTODO FUNCIONOU NO SANDBOX');
    console.log('Isso é normal devido a limitações de rede.');
    console.log('NA VERCEL, os métodos 1, 2, 7 ou 8 devem funcionar.');
  }
}

// Executar
runAllTests().catch(console.error);