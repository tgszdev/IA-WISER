// Teste completo de todas as variações possíveis de conexão
import postgres from 'postgres';

console.log('🔍 TESTE COMPLETO DE CONEXÃO SUPABASE\n');
console.log('=' .repeat(50));

// Dados de conexão
const config = {
  host: 'db.tecvgnrqcfqcrcodrjtt.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Nnyq2122@@'
};

// Diferentes formatos de URL para testar
const urlVariations = [
  {
    name: 'Senha Original',
    url: `postgresql://postgres:Nnyq2122@@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres`
  },
  {
    name: 'Senha Codificada (%40%40)',
    url: `postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres`
  },
  {
    name: 'Com SSL Mode',
    url: `postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres?sslmode=require`
  },
  {
    name: 'Connection Pooler (porta 6543)',
    url: `postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:6543/postgres`
  },
  {
    name: 'Pooler com pgbouncer',
    url: `postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:6543/postgres?pgbouncer=true`
  }
];

async function testUrl(variation) {
  console.log(`\n📋 Testando: ${variation.name}`);
  console.log(`   URL: ${variation.url.substring(0, 60)}...`);
  
  try {
    const sql = postgres(variation.url, {
      ssl: 'require',
      connect_timeout: 10,
      idle_timeout: 10,
      max: 1
    });
    
    const result = await sql`SELECT current_database() as db, NOW() as time`;
    console.log(`   ✅ SUCESSO!`);
    console.log(`   Database: ${result[0].db}`);
    console.log(`   Time: ${result[0].time}`);
    
    // Testar tabela estoque
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'estoque'
      ) as exists
    `;
    
    if (tableCheck[0].exists) {
      const count = await sql`SELECT COUNT(*) as total FROM estoque`;
      console.log(`   Tabela estoque: ✅ (${count[0].total} registros)`);
    } else {
      console.log(`   Tabela estoque: ❌ não encontrada`);
    }
    
    await sql.end();
    return true;
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message.split('\n')[0]}`);
    
    // Diagnóstico específico
    if (error.code === 'ENOTFOUND') {
      console.log('   → Host não encontrado (problema de DNS)');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   → Conexão recusada (porta ou firewall)');
    } else if (error.message.includes('password')) {
      console.log('   → Erro de autenticação (senha incorreta)');
    } else if (error.message.includes('SASL')) {
      console.log('   → Erro SASL (formato de senha)');
    }
    
    return false;
  }
}

// Teste com configuração de objeto
async function testWithConfig() {
  console.log('\n📋 Testando: Configuração por Objeto');
  
  try {
    const sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.user,
      password: config.password,
      ssl: 'require'
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log(`   ✅ SUCESSO com objeto de configuração!`);
    console.log(`   Time: ${result[0].time}`);
    
    await sql.end();
    return true;
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message.split('\n')[0]}`);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('\n🔄 Iniciando testes de conexão...\n');
  
  let successCount = 0;
  
  // Testar todas as URLs
  for (const variation of urlVariations) {
    const success = await testUrl(variation);
    if (success) successCount++;
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre testes
  }
  
  // Testar com objeto
  const objSuccess = await testWithConfig();
  if (objSuccess) successCount++;
  
  console.log('\n' + '=' .repeat(50));
  console.log(`\n📊 RESULTADO: ${successCount} de ${urlVariations.length + 1} testes bem-sucedidos`);
  
  if (successCount > 0) {
    console.log('\n✅ Use o formato que funcionou na sua aplicação!');
  } else {
    console.log('\n❌ Nenhum formato funcionou. Possíveis causas:');
    console.log('1. Problema de rede no ambiente de teste');
    console.log('2. Senha precisa ser atualizada no Supabase');
    console.log('3. Banco de dados pausado ou inativo');
    console.log('4. Firewall ou restrição de IP');
  }
  
  console.log('\n💡 RECOMENDAÇÃO:');
  console.log('Use a senha codificada: Nnyq2122%40%40');
  console.log('URL recomendada:');
  console.log('postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres');
}

// Executar
runAllTests().catch(console.error);