import { createClient } from '@supabase/supabase-js';

// Usando EXATAMENTE o mesmo padrão que funcionou no outro projeto
// Com NEXT_PUBLIC_ prefix para as variáveis
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log para debug
console.log('🔧 Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

// Verificar se as credenciais estão disponíveis
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials not found!');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

// Criar cliente Supabase
export const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    })
  : null;

// Função para buscar todos os dados do estoque
export async function getEstoqueData(limit = 100) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }

  try {
    console.log('📊 Buscando dados do estoque...');
    
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} produtos encontrados`);
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching estoque:', error);
    return [];
  }
}

// Função para buscar produto específico por nome
export async function getProdutoByNome(nome) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .ilike('nome', `%${nome}%`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching produto:', error);
    return [];
  }
}

// Função para buscar produtos por categoria
export async function getProdutosByCategoria(categoria) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .eq('categoria', categoria);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching produtos by categoria:', error);
    return [];
  }
}

// Função para verificar conexão
export async function testConnection() {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('count')
      .limit(1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Exportar função de teste para debug
export async function debugConnection() {
  console.log('🔍 Debug Supabase Connection:');
  console.log('URL:', supabaseUrl);
  console.log('Has Key:', !!supabaseAnonKey);
  console.log('Client Created:', !!supabase);
  
  if (supabase) {
    const result = await testConnection();
    console.log('Connection Test:', result);
    return result;
  }
  
  return { success: false, error: 'No client' };
}