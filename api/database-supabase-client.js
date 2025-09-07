// Conexão usando Supabase Client oficial (mais robusto)
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

// Criar cliente Supabase
let supabase = null;

function getSupabaseClient() {
  if (!supabase && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false
      }
    });
  }
  return supabase;
}

// Função para buscar dados usando Supabase Client
export async function queryDatabaseSupabase(searchQuery) {
  console.log('Using Supabase JavaScript Client');
  
  const client = getSupabaseClient();
  
  if (!client) {
    return {
      query: searchQuery,
      results: [],
      error: 'Supabase client não configurado. Configure SUPABASE_ANON_KEY.'
    };
  }
  
  try {
    let query = client
      .from('estoque')
      .select('*');
    
    // Adicionar filtros de busca se houver query
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery}%`;
      
      query = query.or(`
        descricao_produto.ilike.${searchTerm},
        codigo_produto.ilike.${searchTerm},
        lote_industria_produto.ilike.${searchTerm},
        armazem.ilike.${searchTerm}
      `);
    }
    
    // Limitar e ordenar resultados
    query = query
      .limit(50)
      .order('codigo_produto', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase query error:', error);
      return {
        query: searchQuery,
        results: [],
        error: `Erro Supabase: ${error.message}`
      };
    }
    
    console.log(`Supabase client found ${data?.length || 0} records`);
    
    // Formatar resultados
    const results = (data || []).map(record => ({
      ...record,
      title: record.descricao_produto,
      content: `Produto: ${record.descricao_produto} | Código: ${record.codigo_produto} | Lote: ${record.lote_industria_produto} | Saldo: ${record.saldo_disponivel_produto} | Armazém: ${record.armazem} | Rua: ${record.rua} | Local: ${record.local_produto}`,
      category: record.armazem
    }));
    
    return {
      query: searchQuery,
      results: results,
      totalFound: results.length,
      method: 'Supabase Client'
    };
    
  } catch (error) {
    console.error('Supabase client error:', error);
    return {
      query: searchQuery,
      results: [],
      error: `Erro: ${error.message}`
    };
  }
}

// Função para testar conexão
export async function testConnectionSupabase() {
  const client = getSupabaseClient();
  
  if (!client) {
    return {
      success: false,
      message: 'Configure SUPABASE_ANON_KEY primeiro'
    };
  }
  
  try {
    const { data, error, count } = await client
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return {
        success: false,
        message: `Erro: ${error.message}`,
        details: error
      };
    }
    
    return {
      success: true,
      message: 'Conectado via Supabase Client',
      recordCount: count,
      method: 'Supabase JS Client'
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Erro de conexão: ${error.message}`
    };
  }
}

// Função para buscar estatísticas
export async function getEstoqueStats() {
  const client = getSupabaseClient();
  
  if (!client) {
    return null;
  }
  
  try {
    // Buscar todos os dados para calcular estatísticas
    const { data, error } = await client
      .from('estoque')
      .select('codigo_produto, descricao_produto, saldo_disponivel_produto, armazem');
    
    if (error || !data) {
      return null;
    }
    
    // Calcular estatísticas
    const stats = {
      totalProdutos: new Set(data.map(r => r.codigo_produto)).size,
      totalArmazens: new Set(data.map(r => r.armazem)).size,
      totalItens: data.length,
      totalSaldo: data.reduce((sum, r) => sum + (r.saldo_disponivel_produto || 0), 0)
    };
    
    return stats;
    
  } catch (error) {
    console.error('Stats error:', error);
    return null;
  }
}