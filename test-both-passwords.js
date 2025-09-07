// Teste com AMBAS as versões da senha
import postgres from 'postgres';

console.log('🔍 TESTANDO AMBAS AS VERSÕES DA SENHA\n');
console.log('=' .repeat(50));

const BASE_URL = 'postgresql://postgres:[PASSWORD]@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres';

// Testar ambas as versões
const passwords = [
  { version: 'Original', value: 'Nnyq2122@@' },
  { version: 'Codificada', value: 'Nnyq2122%40%40' }
];

async function testPassword(password) {
  const url = BASE_URL.replace('[PASSWORD]', password.value);
  console.log(`\n📋 Testando: ${password.version}`);
  console.log(`   Senha: ${password.value}`);
  
  try {
    const sql = postgres(url, {
      ssl: 'require',
      idle_timeout: 5,
      max: 1,
      connect_timeout: 5
    });
    
    const result = await sql`SELECT NOW() as time`;
    console.log(`   ✅ SUCESSO! Conectado com ${password.version}`);
    console.log(`   Hora do servidor: ${result[0].time}`);
    
    await sql.end();
    return true;
  } catch (error) {
    console.log(`   ❌ FALHOU: ${error.message.split('\n')[0]}`);
    return false;
  }
}

// Testar ambas
async function runTests() {
  for (const pwd of passwords) {
    await testPassword(pwd);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('Teste concluído!');
}

runTests().catch(console.error);