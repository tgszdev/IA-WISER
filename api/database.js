// Integração com PostgreSQL (Supabase)
import postgres from 'postgres';

// Função para conectar ao banco
export async function queryDatabase(dbUrl, searchQuery) {
  if (!dbUrl) return null;
  
  try {
    // Conecta ao PostgreSQL
    const sql = postgres(dbUrl, {
      ssl: 'require',
      idle_timeout: 20,
      max_lifetime: 60 * 30
    });
    
    // Busca inteligente na knowledge_base
    const searchTerm = `%${searchQuery.toLowerCase()}%`;
    
    const results = await sql`
      SELECT 
        title,
        content,
        category,
        tags
      FROM knowledge_base
      WHERE 
        LOWER(title) LIKE ${searchTerm}
        OR LOWER(content) LIKE ${searchTerm}
        OR LOWER(category) LIKE ${searchTerm}
        OR EXISTS (
          SELECT 1 FROM unnest(tags) AS tag 
          WHERE LOWER(tag) LIKE ${searchTerm}
        )
      ORDER BY 
        CASE 
          WHEN LOWER(title) LIKE ${searchTerm} THEN 1
          WHEN LOWER(category) LIKE ${searchTerm} THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 5
    `;
    
    await sql.end();
    
    return {
      query: searchQuery,
      results: results
    };
    
  } catch (error) {
    console.error('Database error:', error);
    
    // Se a tabela não existir, retorna instrução
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      return {
        query: searchQuery,
        results: [],
        error: 'Tabela knowledge_base não encontrada. Execute o script SQL no Supabase primeiro.'
      };
    }
    
    return {
      query: searchQuery,
      results: [],
      error: error.message
    };
  }
}

// Função para testar conexão
export async function testConnection(dbUrl) {
  if (!dbUrl) {
    return {
      success: false,
      message: 'URL de conexão não fornecida'
    };
  }
  
  try {
    const sql = postgres(dbUrl, {
      ssl: 'require',
      idle_timeout: 20
    });
    
    // Testa conexão
    const result = await sql`SELECT NOW() as time, current_database() as database`;
    
    // Verifica se a tabela knowledge_base existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      ) as exists
    `;
    
    await sql.end();
    
    return {
      success: true,
      message: `Conectado ao banco: ${result[0].database}`,
      serverTime: result[0].time,
      hasKnowledgeBase: tableExists[0].exists
    };
    
  } catch (error) {
    console.error('Connection test error:', error);
    
    let message = 'Erro de conexão';
    
    if (error.message && error.message.includes('password')) {
      message = 'Senha incorreta. Verifique se está usando URL encoding para caracteres especiais (@==%40)';
    } else if (error.message && error.message.includes('database')) {
      message = 'Banco de dados não encontrado';
    } else if (error.message && error.message.includes('host')) {
      message = 'Host não encontrado. Verifique a URL';
    } else {
      message = error.message;
    }
    
    return {
      success: false,
      message: message
    };
  }
}