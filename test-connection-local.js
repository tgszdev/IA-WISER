// Script de teste de conexão LOCAL - executar ANTES do deploy
// Execute com: node test-connection-local.js

import postgres from 'postgres';

console.log('🔍 TESTE DE CONEXÃO COM SUPABASE\n');
console.log('=' .repeat(50));

// Configurações do banco
const SUPABASE_URL = 'postgresql://postgres:[YOUR-PASSWORD]@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres';
const PASSWORD = 'Nnyq2122@@';

// Substituir [YOUR-PASSWORD] pela senha real
const FINAL_URL = SUPABASE_URL.replace('[YOUR-PASSWORD]', PASSWORD);

console.log('\n📋 CONFIGURAÇÕES:');
console.log('Host: db.tecvgnrqcfqcrcodrjtt.supabase.co');
console.log('Senha: Nnyq2122@@ (SEM CONVERSÃO)');
console.log('URL Final:', FINAL_URL.replace(PASSWORD, '***SENHA***'));

async function testConnection() {
  console.log('\n🔄 Testando conexão...\n');
  
  try {
    // Conectar ao PostgreSQL - forçar IPv4
    const sql = postgres(FINAL_URL, {
      ssl: 'require',
      idle_timeout: 20,
      max: 1,
      connection: {
        options: '--tcp_keepalives_idle=0'
      }
    });
    
    // Teste 1: Conexão básica
    console.log('✅ Teste 1: Verificando conexão...');
    const result = await sql`SELECT NOW() as time, current_database() as database`;
    console.log(`   Conectado ao banco: ${result[0].database}`);
    console.log(`   Hora do servidor: ${result[0].time}`);
    
    // Teste 2: Verificar tabela estoque
    console.log('\n✅ Teste 2: Verificando tabela estoque...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'estoque'
      ) as exists
    `;
    
    if (tableCheck[0].exists) {
      console.log('   Tabela "estoque" encontrada!');
      
      // Teste 3: Contar registros
      console.log('\n✅ Teste 3: Contando registros...');
      const count = await sql`SELECT COUNT(*) as total FROM estoque`;
      console.log(`   Total de registros: ${count[0].total}`);
      
      // Teste 4: Buscar amostra
      console.log('\n✅ Teste 4: Buscando amostra de dados...');
      const sample = await sql`
        SELECT 
          codigo_produto,
          descricao_produto,
          saldo_disponivel_produto,
          armazem
        FROM estoque 
        LIMIT 3
      `;
      
      console.log('   Primeiros 3 produtos:');
      sample.forEach((prod, i) => {
        console.log(`   ${i+1}. ${prod.descricao_produto} (Código: ${prod.codigo_produto})`);
        console.log(`      Saldo: ${prod.saldo_disponivel_produto} | Armazém: ${prod.armazem}`);
      });
      
      // Teste 5: Estatísticas
      console.log('\n✅ Teste 5: Estatísticas do estoque...');
      const stats = await sql`
        SELECT 
          COUNT(DISTINCT codigo_produto) as produtos,
          COUNT(DISTINCT armazem) as armazens,
          SUM(saldo_disponivel_produto) as total_disponivel
        FROM estoque
      `;
      
      console.log(`   Produtos únicos: ${stats[0].produtos}`);
      console.log(`   Armazéns: ${stats[0].armazens}`);
      console.log(`   Total disponível: ${stats[0].total_disponivel}`);
      
    } else {
      console.log('   ⚠️  Tabela "estoque" NÃO encontrada!');
      console.log('   Execute o script SQL para criar a tabela.');
    }
    
    await sql.end();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ CONEXÃO FUNCIONANDO PERFEITAMENTE!');
    console.log('A senha Nnyq2122@@ está funcionando SEM conversão.');
    console.log('Pode fazer o deploy com segurança!');
    console.log('=' .repeat(50) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO NA CONEXÃO:');
    console.error('Mensagem:', error.message);
    
    if (error.message.includes('password')) {
      console.error('\n💡 Problema de autenticação. Verifique:');
      console.error('1. A senha está correta?');
      console.error('2. Tente com a senha codificada: Nnyq2122%40%40');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Host não encontrado. Verifique a URL.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Conexão recusada. Verifique se o banco está ativo.');
    }
    
    console.error('\nURL testada:', FINAL_URL.replace(PASSWORD, '***SENHA***'));
    process.exit(1);
  }
}

// Executar teste
testConnection().catch(console.error);