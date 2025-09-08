// Supabase client configuration with proper error handling
import { createClient } from '@supabase/supabase-js'

// Interface para o registro de estoque
export interface EstoqueItem {
  id?: number;
  codigo_produto: string;
  descricao_produto: string;
  saldo_disponivel_produto: number;
  saldo_bloqueado_produto?: string;
  lote_industria_produto?: string;
  local_produto?: string;
  armazem?: string;
  created_at?: string;
}

// Interface para resultado de consulta
export interface QueryResult {
  type: string;
  data?: any;
  error?: string;
  count?: number;
  message?: string;
}

export class SupabaseService {
  private client: any;
  private isConnected: boolean = false;

  constructor(url?: string, anonKey?: string) {
    const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const supabaseKey = anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing - DADOS REAIS OBRIGATÓRIOS');
      this.isConnected = false;
      throw new Error('Credenciais Supabase não configuradas');
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        db: {
          schema: 'public'
        }
      });
      this.isConnected = true;
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      this.isConnected = false;
      throw new Error(`Erro ao inicializar cliente Supabase: ${error.message}`);
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.log('⚠️ No client initialized');
      return false;
    }

    try {
      // Try a simple query to test connection
      const { count, error } = await this.client
        .from('estoque')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }
      
      console.log(`✅ Database connection successful - ${count} registros na tabela`);
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      return false;
    }
  }

  // Get all inventory items - 100% dos dados
  async getAllInventory(limit?: number): Promise<QueryResult> {
    // SEMPRE TENTAR BUSCAR DADOS REAIS - NUNCA USAR MOCK
    if (this.isConnected && this.client) {
      try {
        console.log('📦 Buscando 100% dos dados do inventário...');
        
        // Primeiro obter o total
        const { count: totalCount } = await this.client
          .from('estoque')
          .select('*', { count: 'exact', head: true });
        
        console.log(`📊 Total de registros no banco: ${totalCount}`);
        
        // Se houver limite, usar ele, senão buscar TUDO
        if (limit && limit < totalCount) {
          const { data, error } = await this.client
            .from('estoque')
            .select('*')
            .limit(limit);
          
          if (error) throw error;
          
          return {
            type: 'success',
            data: data,
            count: totalCount,
            message: `Loaded ${data.length} of ${totalCount} items (limited view)`
          };
        }
        
        // BUSCAR 100% DOS DADOS EM LOTES
        let allData = [];
        const batchSize = 1000;
        
        for (let offset = 0; offset < totalCount; offset += batchSize) {
          const { data, error } = await this.client
            .from('estoque')
            .select('*')
            .range(offset, Math.min(offset + batchSize - 1, totalCount - 1));
          
          if (error) throw error;
          allData = [...allData, ...data];
          
          console.log(`📥 Carregados ${allData.length}/${totalCount} registros...`);
        }
        
        // Calcular estatísticas completas
        const stats = {
          totalRegistros: allData.length,
          produtosUnicos: new Set(allData.map(item => item.codigo_produto)).size,
          totalSaldo: allData.reduce((sum, item) => 
            sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0
          ),
          produtosBloqueados: allData.filter(item => item.saldo_bloqueado_produto).length,
          armazens: [...new Set(allData.map(item => item.armazem).filter(Boolean))]
        };
        
        console.log('✅ 100% dos dados carregados com sucesso!');
        console.log('📊 Estatísticas:', stats);
        
        return {
          type: 'success',
          data: allData,
          count: totalCount,
          summary: stats,
          message: `Loaded 100% of inventory (${totalCount} items)`,
          fullDataLoaded: true
        };
      } catch (error) {
        console.error('❌ Database query error:', error);
        // NÃO USAR DADOS MOCK - RETORNAR ERRO REAL
        return {
          type: 'error',
          data: [],
          count: 0,
          error: error.message || 'Erro ao acessar banco de dados',
          message: `Erro ao carregar dados: ${error.message}`
        };
      }
    }
    
    // Se não houver cliente, retornar erro
    return {
      type: 'error',
      data: [],
      count: 0,
      error: 'Cliente Supabase não inicializado',
      message: 'Erro: Cliente de banco de dados não configurado'
    };
  }

  // Search product by code
  async searchByProductCode(productCode: string): Promise<QueryResult> {
    // SEMPRE USAR DADOS REAIS
    if (this.isConnected && this.client) {
      try {
        const { data, error, count } = await this.client
          .from('estoque')
          .select('*', { count: 'exact' })
          .eq('codigo_produto', productCode);
        
        if (error) {
          console.error('❌ Database search error:', error);
        } else if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} records for product ${productCode}`);
          return {
            type: 'product_found',
            data: data,
            count: count || data.length,
            message: `Found ${data.length} records for product ${productCode}`
          };
        } else {
          return {
            type: 'not_found',
            message: `Product ${productCode} not found in database`,
            data: []
          };
        }
      } catch (error) {
        console.error('❌ Search execution error:', error);
        return {
          type: 'error',
          message: `Erro ao buscar produto ${productCode}: ${error.message}`,
          data: [],
          error: error.message
        };
      }
    }
    
    // Se não houver cliente, retornar erro
    return {
      type: 'error',
      message: `Erro: Cliente de banco de dados não configurado`,
      data: [],
      error: 'Cliente Supabase não inicializado'
    };
  }

  // Check product status (avaria/vencido)
  async checkProductStatus(productCode: string, statusType?: string): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return {
        type: 'error',
        message: 'Cliente de banco de dados não configurado',
        error: 'Cliente Supabase não inicializado'
      };
    }

    try {
      // Buscar TODOS os registros do produto
      const { data: allData, error } = await this.client
        .from('estoque')
        .select('*')
        .eq('codigo_produto', productCode);

      if (error) throw error;

      if (!allData || allData.length === 0) {
        return {
          type: 'not_found',
          message: `Produto ${productCode} não encontrado no banco de dados`
        };
      }

      // Filtrar por status se especificado
      let filteredData = allData;
      if (statusType) {
        filteredData = allData.filter((item: EstoqueItem) => 
          item.saldo_bloqueado_produto === statusType
        );
      } else {
        // Verificar qualquer status bloqueado
        filteredData = allData.filter((item: EstoqueItem) => 
          item.saldo_bloqueado_produto === 'Avaria' || 
          item.saldo_bloqueado_produto === 'Vencido'
        );
      }

      return {
        type: 'status_check',
        data: {
          all: allData,
          filtered: filteredData,
          totalCount: allData.length,
          blockedCount: filteredData.length,
          hasBlocked: filteredData.length > 0
        },
        message: `Produto ${productCode}: ${filteredData.length} de ${allData.length} itens ${statusType ? `com status '${statusType}'` : 'bloqueados'} (DADOS REAIS)`
      };
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      return {
        type: 'error',
        message: `Erro ao verificar status do produto ${productCode}: ${error.message}`,
        error: error.message
      };
    }
  }

  // Get inventory summary - 100% DOS DADOS
  async getInventorySummary(): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return {
        type: 'error',
        message: 'Cliente de banco de dados não configurado',
        error: 'Cliente Supabase não inicializado'
      };
    }

    try {
      console.log('🌐 Buscando 100% dos dados para resumo completo...');
      
      // Obter contagem total
      const { count: totalCount } = await this.client
        .from('estoque')
        .select('*', { count: 'exact', head: true });
      
      // Carregar TODOS os dados em lotes
      let allData = [];
      const batchSize = 1000;
      
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const { data, error } = await this.client
          .from('estoque')
          .select('*')
          .range(offset, Math.min(offset + batchSize - 1, totalCount - 1));
        
        if (error) throw error;
        allData = [...allData, ...data];
        console.log(`📥 Carregados ${allData.length}/${totalCount} registros...`);
      }
      
      // Calcular estatísticas completas
      const summary = {
        totalRecords: allData.length,
        uniqueProducts: [...new Set(allData.map(item => item.codigo_produto))].length,
        totalBalance: allData.reduce((sum, item) => 
          sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0
        ),
        blockedProducts: allData.filter(item => item.saldo_bloqueado_produto).length,
        damageProducts: allData.filter(item => item.saldo_bloqueado_produto === 'Avaria').length,
        expiredProducts: allData.filter(item => item.saldo_bloqueado_produto === 'Vencido').length,
        warehouses: [...new Set(allData.map(item => item.armazem).filter(Boolean))],
        locations: [...new Set(allData.map(item => item.local_produto).filter(Boolean))].length
      };
      
      console.log('✅ 100% dos dados carregados para resumo!');
      
      return {
        type: 'summary',
        data: summary,
        message: `Resumo do inventário (100% DOS DADOS): ${summary.totalRecords} registros, ${summary.uniqueProducts} produtos únicos`,
        fullDataLoaded: true
      };
    } catch (error) {
      console.error('❌ Erro ao gerar resumo:', error);
      return {
        type: 'error',
        message: `Erro ao gerar resumo do inventário: ${error.message}`,
        error: error.message
      };
    }
  }

  // Execute custom query
  async executeCustomQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return {
        type: 'error',
        message: 'Cliente de banco de dados não configurado',
        error: 'Cliente Supabase não inicializado'
      };
    }

    return {
      type: 'custom_query',
      message: 'Consultas customizadas não implementadas ainda'
    };
  }
}

// Singleton instance
let supabaseService: SupabaseService | null = null;

export function getSupabaseService(url?: string, anonKey?: string): SupabaseService {
  if (!supabaseService) {
    supabaseService = new SupabaseService(url, anonKey);
  }
  return supabaseService;
}