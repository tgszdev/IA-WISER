// Conexão DIRETA com PostgreSQL - Exatamente como Supabase recomenda
import postgres from 'postgres'

// URL correta sem o [ antes da senha
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres'

// Criar conexão única global
let sql = null;

function getConnection() {
  if (!sql) {
    console.log('Creating PostgreSQL connection...');
    sql = postgres(connectionString, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  return sql;
}

// Função simplificada para query
export async function queryEstoque(searchQuery = '') {
  const sql = getConnection();
  
  try {
    let results;
    
    if (searchQuery) {
      // Busca com filtro
      results = await sql`
        SELECT * FROM estoque
        WHERE 
          descricao_produto ILIKE ${'%' + searchQuery + '%'}
          OR codigo_produto ILIKE ${'%' + searchQuery + '%'}
          OR armazem ILIKE ${'%' + searchQuery + '%'}
        ORDER BY codigo_produto
        LIMIT 50
      `;
    } else {
      // Busca todos
      results = await sql`
        SELECT * FROM estoque
        ORDER BY codigo_produto
        LIMIT 100
      `;
    }
    
    console.log(`Found ${results.length} records`);
    
    // Formatar para o sistema
    return {
      success: true,
      results: results.map(r => ({
        ...r,
        title: r.descricao_produto,
        content: `${r.descricao_produto} - Código: ${r.codigo_produto} - Saldo: ${r.saldo_disponivel_produto} - Local: ${r.armazem}/${r.rua}/${r.local_produto}`,
        category: r.armazem
      })),
      totalFound: results.length
    };
    
  } catch (error) {
    console.error('Query error:', error);
    return {
      success: false,
      results: [],
      error: error.message
    };
  }
}

// Função para testar conexão
export async function testDirectConnection() {
  const sql = getConnection();
  
  try {
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    
    const tableCheck = await sql`
      SELECT COUNT(*) as count FROM estoque
    `;
    
    return {
      success: true,
      message: 'Conectado com sucesso',
      database: result[0].db,
      time: result[0].time,
      recordCount: tableCheck[0].count
    };
    
  } catch (error) {
    console.error('Connection test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Exportar sql para uso direto se necessário
export default getConnection();