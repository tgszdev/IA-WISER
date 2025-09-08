// Inventory API Routes - Acesso a 100% dos dados
import { Hono } from 'hono'
import { getSupabaseService } from '../lib/supabase'

type Bindings = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

const inventoryRoutes = new Hono<{ Bindings: Bindings }>()

// Get inventory summary - 100% DOS DADOS
inventoryRoutes.get('/api/inventory/summary', async (c) => {
  try {
    const { env } = c;
    const supabaseService = getSupabaseService(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

    // Testar conexão
    const isConnected = await supabaseService.testConnection();
    if (!isConnected) {
      return c.json({
        success: false,
        error: 'Falha na conexão com o banco de dados'
      }, 500);
    }

    // Buscar resumo completo do inventário
    const result = await supabaseService.getInventorySummary();
    
    if (result.type === 'error') {
      return c.json({
        success: false,
        error: result.error || result.message
      }, 500);
    }

    return c.json({
      success: true,
      data: result.data,
      message: result.message,
      fullDataLoaded: result.fullDataLoaded || false
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar resumo:', error);
    return c.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, 500);
  }
});

// Get all inventory - 100% DOS DADOS
inventoryRoutes.get('/api/inventory/all', async (c) => {
  try {
    const { env } = c;
    const limit = c.req.query('limit');
    
    const supabaseService = getSupabaseService(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

    // Testar conexão
    const isConnected = await supabaseService.testConnection();
    if (!isConnected) {
      return c.json({
        success: false,
        error: 'Falha na conexão com o banco de dados'
      }, 500);
    }

    // Buscar TODOS os dados
    const result = await supabaseService.getAllInventory(limit ? parseInt(limit) : undefined);
    
    if (result.type === 'error') {
      return c.json({
        success: false,
        error: result.error || result.message
      }, 500);
    }

    return c.json({
      success: true,
      data: result.data,
      count: result.count,
      summary: result.summary,
      message: result.message,
      fullDataLoaded: result.fullDataLoaded || false
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar inventário:', error);
    return c.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, 500);
  }
});

// Search product by code
inventoryRoutes.get('/api/inventory/product/:code', async (c) => {
  try {
    const { env } = c;
    const productCode = c.req.param('code');
    
    if (!productCode) {
      return c.json({
        success: false,
        error: 'Código do produto é obrigatório'
      }, 400);
    }

    const supabaseService = getSupabaseService(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

    // Testar conexão
    const isConnected = await supabaseService.testConnection();
    if (!isConnected) {
      return c.json({
        success: false,
        error: 'Falha na conexão com o banco de dados'
      }, 500);
    }

    // Buscar produto
    const result = await supabaseService.searchByProductCode(productCode);
    
    if (result.type === 'error') {
      return c.json({
        success: false,
        error: result.error || result.message
      }, 500);
    }

    return c.json({
      success: true,
      data: result.data,
      count: result.count,
      message: result.message,
      found: result.type === 'product_found'
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar produto:', error);
    return c.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, 500);
  }
});

// Check product status
inventoryRoutes.get('/api/inventory/product/:code/status', async (c) => {
  try {
    const { env } = c;
    const productCode = c.req.param('code');
    const statusType = c.req.query('type'); // 'Avaria' ou 'Vencido'
    
    if (!productCode) {
      return c.json({
        success: false,
        error: 'Código do produto é obrigatório'
      }, 400);
    }

    const supabaseService = getSupabaseService(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

    // Testar conexão
    const isConnected = await supabaseService.testConnection();
    if (!isConnected) {
      return c.json({
        success: false,
        error: 'Falha na conexão com o banco de dados'
      }, 500);
    }

    // Verificar status do produto
    const result = await supabaseService.checkProductStatus(productCode, statusType);
    
    if (result.type === 'error') {
      return c.json({
        success: false,
        error: result.error || result.message
      }, 500);
    }

    return c.json({
      success: true,
      data: result.data,
      message: result.message,
      found: result.type !== 'not_found'
    });
  } catch (error: any) {
    console.error('❌ Erro ao verificar status:', error);
    return c.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, 500);
  }
});

// Health check
inventoryRoutes.get('/api/inventory/health', async (c) => {
  try {
    const { env } = c;
    const supabaseService = getSupabaseService(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

    const isConnected = await supabaseService.testConnection();
    
    return c.json({
      success: true,
      status: isConnected ? 'healthy' : 'degraded',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({
      success: false,
      status: 'error',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default inventoryRoutes;