// API para buscar produtos com suporte a diferentes formatos de código
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Get product code from query or body
    const productCode = req.query.code || req.body?.code || req.query.q || req.body?.q;
    
    if (!productCode) {
      return res.status(400).json({ 
        error: 'Product code required',
        usage: 'Use ?code=RM139 or ?code=RM%20139' 
      });
    }
    
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log(`🔍 Buscando produto: ${productCode}`);
    
    // Preparar variações do código
    const codeVariations = [
      productCode,                           // Como veio
      productCode.toUpperCase(),             // MAIÚSCULAS
      productCode.replace(/\s+/g, ''),       // Sem espaços
      productCode.replace(/\s+/g, ' '),      // Com 1 espaço
      productCode.padStart(6, '0')           // Com zeros à esquerda se for número
    ];
    
    // Criar query OR para todas as variações
    const orConditions = [...new Set(codeVariations)]
      .map(code => `codigo_produto.eq.${code}`)
      .join(',');
    
    // Buscar produto
    const { data, error, count } = await supabase
      .from('estoque')
      .select('*', { count: 'exact' })
      .or(orConditions);
    
    if (error) {
      console.error('Erro na busca:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      // Tentar busca parcial
      const { data: partial } = await supabase
        .from('estoque')
        .select('*')
        .ilike('codigo_produto', `%${productCode}%`)
        .limit(10);
      
      return res.status(200).json({
        found: false,
        message: `Produto '${productCode}' não encontrado exatamente`,
        suggestions: partial || [],
        searchedFor: productCode
      });
    }
    
    // Calcular estatísticas do produto
    const saldoTotal = data.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0);
    const saldoBloqueado = data.filter(item => item.saldo_bloqueado_produto).length;
    
    return res.status(200).json({
      found: true,
      product: {
        codigo: data[0].codigo_produto,
        descricao: data[0].descricao_produto,
        totalRegistros: data.length,
        saldoTotal: saldoTotal,
        saldoBloqueado: saldoBloqueado,
        armazem: data[0].armazem,
        locais: [...new Set(data.map(item => item.local_produto))],
        lotes: [...new Set(data.map(item => item.lote_industria_produto))]
      },
      details: data,
      searchedFor: productCode,
      message: `Produto encontrado: ${data.length} registros, saldo total: ${saldoTotal}`
    });
    
  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({ 
      error: error.message,
      searchedFor: req.query.code || req.body?.code
    });
  }
}