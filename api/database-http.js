// Conexão via HTTP REST API do Supabase (mais confiável)
export async function queryDatabaseHTTP(searchQuery) {
  console.log('Using HTTP REST API connection to Supabase');
  
  // Configuração do Supabase
  const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'SUA_ANON_KEY_AQUI';
  
  try {
    // Endpoint REST API do Supabase
    const apiUrl = `${SUPABASE_URL}/rest/v1/estoque`;
    
    // Headers para autenticação
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    
    // Construir query parameters
    let queryParams = new URLSearchParams();
    
    if (searchQuery && searchQuery.trim()) {
      // Busca em múltiplos campos
      queryParams.append('or', `(descricao_produto.ilike.*${searchQuery}*,codigo_produto.ilike.*${searchQuery}*,armazem.ilike.*${searchQuery}*)`);
    }
    
    // Limitar resultados
    queryParams.append('limit', '50');
    queryParams.append('order', 'codigo_produto.asc');
    
    const fullUrl = `${apiUrl}?${queryParams.toString()}`;
    console.log('Fetching from:', fullUrl);
    
    // Fazer requisição
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      
      if (response.status === 401) {
        return {
          query: searchQuery,
          results: [],
          error: 'Não autorizado. Configure SUPABASE_ANON_KEY nas variáveis de ambiente.'
        };
      }
      
      return {
        query: searchQuery,
        results: [],
        error: `Erro HTTP: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    console.log(`Found ${data.length} records via HTTP API`);
    
    // Formatar resultados para o formato esperado
    const results = data.map(record => ({
      codigo_produto: record.codigo_produto,
      descricao_produto: record.descricao_produto,
      lote_industria_produto: record.lote_industria_produto,
      saldo_disponivel_produto: record.saldo_disponivel_produto,
      saldo_reservado_produto: record.saldo_reservado_produto,
      saldo_bloqueado_produto: record.saldo_bloqueado_produto,
      armazem: record.armazem,
      rua: record.rua,
      local_produto: record.local_produto,
      title: record.descricao_produto,
      content: `Produto: ${record.descricao_produto} | Código: ${record.codigo_produto} | Lote: ${record.lote_industria_produto} | Saldo: ${record.saldo_disponivel_produto} | Armazém: ${record.armazem} | Rua: ${record.rua} | Local: ${record.local_produto}`,
      category: record.armazem
    }));
    
    return {
      query: searchQuery,
      results: results,
      totalFound: results.length,
      method: 'HTTP REST API'
    };
    
  } catch (error) {
    console.error('HTTP API Error:', error);
    return {
      query: searchQuery,
      results: [],
      error: `Erro na API: ${error.message}`
    };
  }
}

// Função alternativa usando PostgREST direto
export async function queryDatabasePostgREST(searchQuery) {
  console.log('Using PostgREST direct connection');
  
  const POSTGREST_URL = process.env.POSTGREST_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co/rest/v1';
  const API_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!API_KEY) {
    return {
      query: searchQuery,
      results: [],
      error: 'Configure SUPABASE_ANON_KEY ou SUPABASE_SERVICE_KEY nas variáveis de ambiente'
    };
  }
  
  try {
    const headers = {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    };
    
    // Query com filtros
    let url = `${POSTGREST_URL}/estoque?select=*`;
    
    if (searchQuery) {
      // Busca parcial em múltiplos campos
      const searchTerm = encodeURIComponent(searchQuery);
      url += `&or=(descricao_produto.ilike.*${searchTerm}*,codigo_produto.eq.${searchTerm})`;
    }
    
    url += '&limit=100';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PostgREST Error:', errorText);
      return {
        query: searchQuery,
        results: [],
        error: `PostgREST Error: ${response.status}`
      };
    }
    
    const data = await response.json();
    
    // Formatar para o sistema
    const results = data.map(record => ({
      ...record,
      title: record.descricao_produto,
      content: `${record.descricao_produto} - Saldo: ${record.saldo_disponivel_produto} - Local: ${record.armazem}/${record.rua}/${record.local_produto}`,
      category: record.armazem
    }));
    
    return {
      query: searchQuery,
      results: results,
      totalFound: results.length,
      method: 'PostgREST'
    };
    
  } catch (error) {
    console.error('PostgREST Error:', error);
    return {
      query: searchQuery,
      results: [],
      error: error.message
    };
  }
}

// Função para testar conexão HTTP
export async function testConnectionHTTP() {
  const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  
  if (!SUPABASE_ANON_KEY) {
    return {
      success: false,
      message: 'SUPABASE_ANON_KEY não configurada. Obtenha no Supabase Dashboard → Settings → API'
    };
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/estoque?limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Conectado via HTTP REST API',
        recordCount: data.length,
        method: 'HTTP/REST'
      };
    } else {
      return {
        success: false,
        message: `HTTP Error: ${response.status}`,
        details: await response.text()
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro de conexão: ${error.message}`
    };
  }
}