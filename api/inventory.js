// API para buscar dados do inventário (usado pela página debug.html)
import { getEstoqueData } from './supabase-client.js';

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching inventory data...');
    
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(200).json({
        success: false,
        error: 'Supabase não configurado. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY',
        products: []
      });
    }

    // Fetch ALL inventory data without limit
    const products = await getEstoqueData(); // Sem limite - busca todos os registros
    
    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum produto encontrado no estoque',
        products: [],
        total: 0
      });
    }

    // Calculate summary statistics
    const summary = {
      totalProducts: products.length,
      uniqueProducts: [...new Set(products.map(p => p.codigo_produto))].length,
      totalAvailable: products.reduce((sum, p) => sum + (p.saldo_disponivel_produto || 0), 0),
      totalReserved: products.reduce((sum, p) => sum + (p.saldo_reservado_produto || 0), 0),
      totalBlocked: products.reduce((sum, p) => sum + (p.saldo_bloqueado_produto || 0), 0),
      warehouses: [...new Set(products.map(p => p.armazem).filter(Boolean))]
    };

    console.log(`Found ${products.length} products in inventory`);

    return res.status(200).json({
      success: true,
      products: products,
      summary: summary,
      total: products.length
    });

  } catch (error) {
    console.error('Inventory API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      products: []
    });
  }
}