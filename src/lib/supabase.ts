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
    const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const supabaseKey = anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      this.isConnected = false;
      return;
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
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const { count, error } = await this.client
        .from('estoque')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Connection test failed:', error);
        return false;
      }

      console.log(`✅ Connection successful. Total records: ${count}`);
      return true;
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return false;
    }
  }

  // Get all inventory items (no limit)
  async getAllInventory(): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return { type: 'error', error: 'Database not connected' };
    }

    try {
      const { data, error, count } = await this.client
        .from('estoque')
        .select('*', { count: 'exact' });

      if (error) {
        return { type: 'error', error: error.message };
      }

      return {
        type: 'success',
        data: data,
        count: count || data?.length || 0,
        message: `Loaded ${count || data?.length || 0} items from inventory`
      };
    } catch (error: any) {
      return { type: 'error', error: error.message };
    }
  }

  // Search product by code
  async searchByProductCode(productCode: string): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return { type: 'error', error: 'Database not connected' };
    }

    try {
      const { data, error } = await this.client
        .from('estoque')
        .select('*')
        .eq('codigo_produto', productCode);

      if (error) {
        return { type: 'error', error: error.message };
      }

      if (!data || data.length === 0) {
        return {
          type: 'not_found',
          message: `Product ${productCode} not found`,
          data: []
        };
      }

      return {
        type: 'product_found',
        data: data,
        count: data.length,
        message: `Found ${data.length} records for product ${productCode}`
      };
    } catch (error: any) {
      return { type: 'error', error: error.message };
    }
  }

  // Check product status (avaria/vencido)
  async checkProductStatus(productCode: string, statusType?: string): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return { type: 'error', error: 'Database not connected' };
    }

    try {
      // First get all records for the product
      const { data: allData, error: allError } = await this.client
        .from('estoque')
        .select('*')
        .eq('codigo_produto', productCode);

      if (allError) {
        return { type: 'error', error: allError.message };
      }

      if (!allData || allData.length === 0) {
        return {
          type: 'not_found',
          message: `Product ${productCode} not found`
        };
      }

      // Filter by status if specified
      let filteredData = allData;
      if (statusType) {
        filteredData = allData.filter((item: EstoqueItem) => 
          item.saldo_bloqueado_produto === statusType
        );
      } else {
        // Check for any blocked status
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
        message: `Product ${productCode}: ${filteredData.length} of ${allData.length} items ${statusType ? `with status '${statusType}'` : 'blocked'}`
      };
    } catch (error: any) {
      return { type: 'error', error: error.message };
    }
  }

  // Get inventory summary
  async getInventorySummary(): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return { type: 'error', error: 'Database not connected' };
    }

    try {
      const { data, error } = await this.client
        .from('estoque')
        .select('codigo_produto, descricao_produto, saldo_disponivel_produto, saldo_bloqueado_produto');

      if (error) {
        return { type: 'error', error: error.message };
      }

      // Calculate summary statistics
      const totalItems = data?.length || 0;
      const uniqueProducts = new Set(data?.map((item: EstoqueItem) => item.codigo_produto));
      const totalBalance = data?.reduce((sum: number, item: EstoqueItem) => 
        sum + (parseFloat(String(item.saldo_disponivel_produto)) || 0), 0) || 0;
      
      const blockedItems = data?.filter((item: EstoqueItem) => 
        item.saldo_bloqueado_produto === 'Avaria' || 
        item.saldo_bloqueado_produto === 'Vencido'
      ) || [];

      return {
        type: 'summary',
        data: {
          totalRecords: totalItems,
          uniqueProducts: uniqueProducts.size,
          totalBalance: totalBalance,
          blockedCount: blockedItems.length,
          blockedDetails: blockedItems
        },
        message: `Inventory summary: ${totalItems} records, ${uniqueProducts.size} unique products`
      };
    } catch (error: any) {
      return { type: 'error', error: error.message };
    }
  }

  // Execute custom query
  async executeCustomQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.isConnected || !this.client) {
      return { type: 'error', error: 'Database not connected' };
    }

    try {
      // This is a simplified version - Supabase doesn't support raw SQL directly
      // You would need to use Supabase's RPC functions for complex queries
      return {
        type: 'custom_query',
        message: 'Custom queries require RPC functions in Supabase'
      };
    } catch (error: any) {
      return { type: 'error', error: error.message };
    }
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