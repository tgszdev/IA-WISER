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
    
    // Verificar qual tabela usar - primeiro tenta 'estoque', depois 'knowledge_base'
    const estoqueCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'estoque'
      ) as exists
    `;
    
    const knowledgeCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      ) as exists
    `;
    
    // Determinar qual tabela usar
    const useEstoque = estoqueCheck[0].exists;
    const useKnowledge = !useEstoque && knowledgeCheck[0].exists;
    
    if (!useEstoque && !useKnowledge) {
      console.log('No tables found (estoque or knowledge_base)');
      await sql.end();
      return {
        query: searchQuery,
        results: [],
        error: 'Nenhuma tabela encontrada (estoque ou knowledge_base).'
      };
    }
    
    console.log(`Using table: ${useEstoque ? 'estoque' : 'knowledge_base'}`);
    
    // Preparar termos de busca
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 2);
    console.log('Search terms:', searchTerms);
    
    // SEMPRE buscar dados - começar com TODOS os registros
    let results = [];
    let allRecords = [];
    
    // PRIMEIRO: Buscar TODOS os registros como base
    console.log('Fetching ALL records to ensure context...');
    
    if (useEstoque) {
      // Buscar dados da tabela ESTOQUE
      allRecords = await sql`
        SELECT 
          codigo_produto,
          descricao_produto,
          lote_industria_produto,
          saldo_disponivel_produto,
          saldo_reservado_produto,
          saldo_bloqueado_produto,
          armazem,
          rua,
          local_produto,
          CONCAT(
            'Produto: ', descricao_produto, 
            ' | Código: ', codigo_produto,
            ' | Lote: ', lote_industria_produto,
            ' | Saldo Disponível: ', saldo_disponivel_produto,
            ' | Saldo Reservado: ', COALESCE(saldo_reservado_produto, 0),
            ' | Saldo Bloqueado: ', COALESCE(saldo_bloqueado_produto, 0),
            ' | Armazém: ', armazem,
            ' | Rua: ', rua,
            ' | Local: ', local_produto
          ) as content,
          descricao_produto as title,
          armazem as category
        FROM estoque
        ORDER BY codigo_produto, lote_industria_produto
        LIMIT 50
      `;
    } else {
      // Buscar dados da tabela knowledge_base (fallback)
      allRecords = await sql`
        SELECT 
          title,
          content,
          category,
          tags
        FROM knowledge_base
        ORDER BY created_at DESC
        LIMIT 10
      `;
    }
    
    // DEPOIS: Tentar busca mais específica se houver query
    if (searchQuery && searchQuery.trim().length > 0) {
      const exactSearchTerm = `%${searchQuery.toLowerCase()}%`;
      
      if (useEstoque) {
        // Busca na tabela ESTOQUE
        results = await sql`
          SELECT 
            codigo_produto,
            descricao_produto,
            lote_industria_produto,
            saldo_disponivel_produto,
            saldo_reservado_produto,
            saldo_bloqueado_produto,
            armazem,
            rua,
            local_produto,
            CONCAT(
              'Produto: ', descricao_produto, 
              ' | Código: ', codigo_produto,
              ' | Lote: ', lote_industria_produto,
              ' | Saldo Disponível: ', saldo_disponivel_produto,
              ' | Saldo Reservado: ', COALESCE(saldo_reservado_produto, 0),
              ' | Saldo Bloqueado: ', COALESCE(saldo_bloqueado_produto, 0),
              ' | Armazém: ', armazem,
              ' | Rua: ', rua,
              ' | Local: ', local_produto
            ) as content,
            descricao_produto as title,
            armazem as category
          FROM estoque
          WHERE 
            LOWER(codigo_produto) LIKE ${exactSearchTerm}
            OR LOWER(descricao_produto) LIKE ${exactSearchTerm}
            OR LOWER(lote_industria_produto) LIKE ${exactSearchTerm}
            OR LOWER(armazem) LIKE ${exactSearchTerm}
            OR LOWER(rua) LIKE ${exactSearchTerm}
            OR LOWER(local_produto) LIKE ${exactSearchTerm}
          ORDER BY codigo_produto, lote_industria_produto
          LIMIT 20
        `;
      } else {
        // Busca na tabela knowledge_base (fallback)
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
    
    // Verifica quais tabelas existem
    const estoqueExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'estoque'
      ) as exists
    `;
    
    const knowledgeExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      ) as exists
    `;
    
    // Conta registros da tabela que existir
    let recordCount = 0;
    let tableInfo = '';
    
    if (estoqueExists[0].exists) {
      const count = await sql`SELECT COUNT(*) as total FROM estoque`;
      recordCount = count[0].total;
      tableInfo = 'Tabela ESTOQUE encontrada';
      
      // Buscar estatísticas do estoque
      const stats = await sql`
        SELECT 
          COUNT(DISTINCT codigo_produto) as produtos_unicos,
          COUNT(DISTINCT armazem) as armazens,
          SUM(saldo_disponivel_produto) as total_disponivel,
          SUM(saldo_reservado_produto) as total_reservado
        FROM estoque
      `;
      
      tableInfo += ` - ${stats[0].produtos_unicos} produtos, ${stats[0].armazens} armazéns`;
    } else if (knowledgeExists[0].exists) {
      const count = await sql`SELECT COUNT(*) as total FROM knowledge_base`;
      recordCount = count[0].total;
      tableInfo = 'Tabela KNOWLEDGE_BASE encontrada';
    } else {
      tableInfo = 'Nenhuma tabela encontrada';
    }
    
    await sql.end();
    
    return {
      success: true,
      message: `Conectado ao banco: ${result[0].database}`,
      serverTime: result[0].time,
      hasEstoque: estoqueExists[0].exists,
      hasKnowledgeBase: knowledgeExists[0].exists,
      tableInfo: tableInfo,
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