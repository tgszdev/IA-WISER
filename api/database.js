// Integração com PostgreSQL (Supabase) - Versão corrigida
import postgres from 'postgres';

// Função para conectar ao banco
export async function queryDatabase(dbUrl, searchQuery) {
  if (!dbUrl) {
    console.log('No database URL provided');
    return null;
  }
  
  try {
    console.log('Connecting to database...');
    console.log('Search query:', searchQuery);
    
    // Decodificar a URL se necessário
    const decodedUrl = dbUrl.replace(/%40/g, '@');
    
    // Conecta ao PostgreSQL
    const sql = postgres(decodedUrl, {
      ssl: 'require',
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      max: 1
    });
    
    // Primeiro, verifica se a tabela existe
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      console.log('Table knowledge_base does not exist');
      await sql.end();
      return {
        query: searchQuery,
        results: [],
        error: 'Tabela knowledge_base não encontrada. Execute o script SQL primeiro.'
      };
    }
    
    // Preparar termos de busca
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 2);
    console.log('Search terms:', searchTerms);
    
    // SEMPRE buscar dados - começar com TODOS os registros
    let results = [];
    
    // PRIMEIRO: Buscar TODOS os registros como base
    console.log('Fetching ALL records to ensure context...');
    const allRecords = await sql`
      SELECT 
        title,
        content,
        category,
        tags
      FROM knowledge_base
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    // DEPOIS: Tentar busca mais específica se houver query
    if (searchQuery && searchQuery.trim().length > 0) {
      const exactSearchTerm = `%${searchQuery.toLowerCase()}%`;
      results = await sql`
        SELECT 
          title,
          content,
          category,
          tags
        FROM knowledge_base
        WHERE 
          LOWER(title) LIKE ${exactSearchTerm}
          OR LOWER(content) LIKE ${exactSearchTerm}
          OR LOWER(category) LIKE ${exactSearchTerm}
        ORDER BY 
          CASE 
            WHEN LOWER(title) LIKE ${exactSearchTerm} THEN 1
            WHEN LOWER(category) LIKE ${exactSearchTerm} THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT 5
      `;
    }
    
    // Se não encontrou matches específicos, usar TODOS os registros
    if (results.length === 0) {
      console.log('Using ALL records as context');
      results = allRecords;
    }
    
    // GARANTIR que sempre temos dados
    if (results.length === 0 && allRecords.length > 0) {
      console.log('FORCING use of all available records');
      results = allRecords;
    }
    
    // Log detalhado dos resultados para debug
    if (results.length > 0) {
      console.log('Database results found:');
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. Title: ${r.title}`);
        console.log(`     Content preview: ${r.content.substring(0, 100)}...`);
      });
    }
    
    console.log(`Found ${results.length} results`);
    
    await sql.end();
    
    return {
      query: searchQuery,
      results: results,
      totalFound: results.length
    };
    
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', error.message);
    
    // Tratamento específico de erros
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      return {
        query: searchQuery,
        results: [],
        error: 'Tabela knowledge_base não encontrada. Execute o script SQL no Supabase primeiro.'
      };
    }
    
    if (error.message && error.message.includes('password')) {
      return {
        query: searchQuery,
        results: [],
        error: 'Erro de autenticação. Verifique a URL do banco (use %40 para @).'
      };
    }
    
    if (error.message && error.message.includes('ENOTFOUND')) {
      return {
        query: searchQuery,
        results: [],
        error: 'Host do banco não encontrado. Verifique a URL.'
      };
    }
    
    return {
      query: searchQuery,
      results: [],
      error: `Erro no banco: ${error.message}`
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
    console.log('Testing database connection...');
    
    // Decodificar a URL se necessário
    const decodedUrl = dbUrl.replace(/%40/g, '@');
    
    const sql = postgres(decodedUrl, {
      ssl: 'require',
      idle_timeout: 20,
      max: 1
    });
    
    // Testa conexão
    const result = await sql`SELECT NOW() as time, current_database() as database`;
    console.log('Connection successful:', result[0].database);
    
    // Verifica se a tabela knowledge_base existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      ) as exists
    `;
    
    // Conta registros se a tabela existir
    let recordCount = 0;
    if (tableExists[0].exists) {
      const count = await sql`SELECT COUNT(*) as total FROM knowledge_base`;
      recordCount = count[0].total;
    }
    
    await sql.end();
    
    return {
      success: true,
      message: `Conectado ao banco: ${result[0].database}`,
      serverTime: result[0].time,
      hasKnowledgeBase: tableExists[0].exists,
      recordCount: recordCount
    };
    
  } catch (error) {
    console.error('Connection test error:', error);
    
    let message = 'Erro de conexão';
    
    if (error.message && error.message.includes('password')) {
      message = 'Senha incorreta. Use %40 para @ na URL (ex: Nnyq2122%40%40%40)';
    } else if (error.message && error.message.includes('database')) {
      message = 'Banco de dados não encontrado';
    } else if (error.message && error.message.includes('ENOTFOUND')) {
      message = 'Host não encontrado. Verifique a URL';
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      message = 'Conexão recusada. Verifique se o banco está ativo';
    } else {
      message = error.message;
    }
    
    return {
      success: false,
      message: message
    };
  }
}