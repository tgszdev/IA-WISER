// Supabase client configuration with proper error handling
import { createClient } from '@supabase/supabase-js'
import { getMockData, searchMockProduct, getMockSummary } from './mock-data'

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
  private useMockData: boolean = false;

  constructor(url?: string, anonKey?: string) {
    const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const supabaseKey = anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing, using mock data');
      this.isConnected = false;
      this.useMockData = true;
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
      console.error('❌ Failed to initialize Supabase client, using mock data:', error);
      this.isConnected = false;
      this.useMockData = true;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.log('⚠️ Using demonstration mode with sample data');
      return true; // Allow mock data
    }

    try {
      // Try a simple query to test connection
      const { data, error } = await this.client
        .from('estoque')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Database connection test failed:', error);
        this.useMockData = true;
        return false;
      }
      
      console.log('✅ Database connection successful');
      this.useMockData = false;
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      this.useMockData = true;
      return false;
    }
  }

  // Get all inventory items (no limit)
  async getAllInventory(): Promise<QueryResult> {
    // Try real database first
    if (this.isConnected && this.client && !this.useMockData) {
      try {
        const { data, error, count } = await this.client
          .from('estoque')
          .select('*', { count: 'exact' })
          .order('codigo_produto', { ascending: true });
        
        if (error) {
          console.error('❌ Database query error:', error);
          // Fall back to mock data
          const mockData = getMockData();
          return {
            type: 'success',
            data: mockData,
            count: mockData.length,
            message: `Loaded ${mockData.length} sample items (database error, using fallback)`
          };
        }
        
        if (data && data.length > 0) {
          console.log(`✅ Loaded ${data.length} items from database`);
          return {
            type: 'success',
            data: data,
            count: count || data.length,
            message: `Loaded ${data.length} items from inventory database`
          };
        }
      } catch (error) {
        console.error('❌ Query execution error:', error);
      }
    }
    
    // Use mock data as fallback
    const mockData = getMockData();
    return {
      type: 'success',
      data: mockData,
      count: mockData.length,
      message: `Loaded ${mockData.length} sample items from inventory (demonstration mode)`
    };
  }

  // Search product by code
  async searchByProductCode(productCode: string): Promise<QueryResult> {
    // Try real database first
    if (this.isConnected && this.client && !this.useMockData) {
      try {
        const { data, error, count } = await this.client
          .from('estoque')
          .select('*', { count: 'exact' })
          .eq('codigo_produto', productCode)
          .order('created_at', { ascending: false });
        
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
      }
    }
    
    // Use mock data as fallback
    const mockData = searchMockProduct(productCode);
    
    if (!mockData || mockData.length === 0) {
      return {
        type: 'not_found',
        message: `Product ${productCode} not found in sample data`,
        data: []
      };
    }

    return {
      type: 'product_found',
      data: mockData,
      count: mockData.length,
      message: `Found ${mockData.length} records for product ${productCode} (sample data)`
    };
  }

  // Check product status (avaria/vencido)
  async checkProductStatus(productCode: string, statusType?: string): Promise<QueryResult> {
    // Use mock data for demonstration
    const allData = searchMockProduct(productCode);

    if (!allData || allData.length === 0) {
      return {
        type: 'not_found',
        message: `Product ${productCode} not found in sample data`
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
      message: `Product ${productCode}: ${filteredData.length} of ${allData.length} items ${statusType ? `with status '${statusType}'` : 'blocked'} (sample data)`
    };
  }

  // Get inventory summary
  async getInventorySummary(): Promise<QueryResult> {
    // Use mock data for demonstration
    const mockSummary = getMockSummary();
    
    return {
      type: 'summary',
      data: mockSummary,
      message: `Inventory summary (sample data): ${mockSummary.totalRecords} records, ${mockSummary.uniqueProducts} unique products`
    };
  }

  // Execute custom query
  async executeCustomQuery(query: string, params?: any[]): Promise<QueryResult> {
    return {
      type: 'custom_query',
      message: 'Custom queries not available in demonstration mode'
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