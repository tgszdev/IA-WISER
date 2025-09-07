// Teste com a NOVA senha
import postgres from 'postgres';

console.log('🔍 TESTANDO CONEXÃO COM NOVA SENHA\n');
console.log('=' .repeat(50));

const URL = 'postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres';

console.log('📋 Configuração:');
console.log('Host: db.tecvgnrqcfqcrcodrjtt.supabase.co');
console.log('Senha: 38016863884 (sem caracteres especiais!)');
console.log('URL:', URL.replace('38016863884', '***'));

async function testConnection() {
  console.log('\n🔄 Conectando...\n');
  
  try {
    const sql = postgres(URL, {
      ssl: 'require',
      connect_timeout: 10,
      idle_timeout: 10,
      max: 1
    });
    
    // Teste básico
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    console.log('✅ CONEXÃO SUCEDIDA!');
    console.log(`Database: ${result[0].db}`);
    console.log(`Time: ${result[0].time}`);
    
    // Verificar tabela estoque
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'estoque'
      ) as exists
    `;
    
    if (tableCheck[0].exists) {
      const count = await sql`SELECT COUNT(*) as total FROM estoque`;
      console.log(`\n📦 Tabela estoque encontrada!`);
      console.log(`Total de registros: ${count[0].total}`);
      
      // Buscar amostra
      const sample = await sql`
        SELECT codigo_produto, descricao_produto, saldo_disponivel_produto
        FROM estoque 
        LIMIT 3
      `;
      
      if (sample.length > 0) {
        console.log('\nPrimeiros produtos:');
        sample.forEach(p => {
          console.log(`- ${p.descricao_produto}: ${p.saldo_disponivel_produto} unidades`);
        });
      }
    }
    
    await sql.end();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ NOVA SENHA FUNCIONANDO PERFEITAMENTE!');
    console.log('Pode configurar na Vercel com segurança.');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    
    if (error.message.includes('password')) {
      console.error('→ Senha incorreta. Verifique no Supabase.');
    } else if (error.message.includes('ENETUNREACH')) {
      console.error('→ Erro de rede (normal no sandbox, funcionará na Vercel)');
    }
  }
}

testConnection().catch(console.error);