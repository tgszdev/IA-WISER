// Teste SIMPLES - Exatamente como Supabase mostra
import postgres from 'postgres'

// URL CORRETA (sem o [ antes da senha)
const connectionString = 'postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres'

console.log('🔍 TESTE SIMPLES DE CONEXÃO\n');
console.log('URL correta:', connectionString.replace('38016863884', '***'));

async function test() {
  try {
    // Conectar exatamente como Supabase mostra
    const sql = postgres(connectionString, {
      ssl: 'require'
    });
    
    // Teste básico
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    
    console.log('✅ SUCESSO!');
    console.log('Database:', result[0].db);
    console.log('Time:', result[0].time);
    
    // Testar tabela estoque
    const count = await sql`SELECT COUNT(*) as total FROM estoque`;
    console.log('Total de registros:', count[0].total);
    
    // Buscar uma amostra
    const sample = await sql`SELECT * FROM estoque LIMIT 3`;
    console.log('\nAmostra de dados:');
    sample.forEach(item => {
      console.log(`- ${item.descricao_produto}: ${item.saldo_disponivel_produto} unidades`);
    });
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('→ Erro de DNS/Rede (comum no sandbox)');
    } else if (error.message.includes('password')) {
      console.log('→ Erro de senha');
    }
  }
}

test();