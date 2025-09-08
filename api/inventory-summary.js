// Vercel API - Inventory Summary with 100% Real Data
export default async function handler(req, res) {
  // Enable CORS
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
    const { createClient } = await import('@supabase/supabase-js');
    
    // Usar credenciais do ambiente
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('🌐 Buscando 100% dos dados para resumo completo...');
    
    // Obter contagem total
    const { count: totalCount } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de registros: ${totalCount}`);
    
    // Carregar TODOS os dados em lotes
    let allData = [];
    const batchSize = 1000;
    
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const { data, error } = await supabase
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
    
    return res.status(200).json({
      success: true,
      data: summary,
      message: `Resumo do inventário (100% DOS DADOS): ${summary.totalRecords} registros, ${summary.uniqueProducts} produtos únicos`,
      fullDataLoaded: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar resumo do inventário'
    });
  }
}