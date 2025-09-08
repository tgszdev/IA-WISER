// Script para testar conexão REAL com Supabase e buscar 100% dos dados
import { createClient } from '@supabase/supabase-js';

// CREDENCIAIS NOVAS DO SUPABASE
const SUPABASE_URL = 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';

async function testSupabase() {
  console.log('🔍 Iniciando teste de conexão com Supabase...\n');
  
  try {
    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Cliente Supabase criado\n');
    
    // 1. Testar conexão obtendo contagem total
    console.log('📊 Obtendo contagem total de registros...');
    const { count: totalCount, error: countError } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao obter contagem:', countError);
      return;
    }
    
    console.log(`✅ Total de registros na tabela 'estoque': ${totalCount}\n`);
    
    // 2. Buscar uma amostra de dados
    console.log('📦 Buscando amostra de 10 produtos...');
    const { data: sample, error: sampleError } = await supabase
      .from('estoque')
      .select('*')
      .limit(10);
    
    if (sampleError) {
      console.error('❌ Erro ao buscar amostra:', sampleError);
      return;
    }
    
    console.log(`✅ Amostra obtida: ${sample.length} registros\n`);
    
    // Mostrar alguns produtos da amostra
    console.log('📋 Primeiros 3 produtos da amostra:');
    sample.slice(0, 3).forEach((item, index) => {
      console.log(`\n${index + 1}. Produto ${item.codigo_produto}:`);
      console.log(`   - Descrição: ${item.descricao_produto}`);
      console.log(`   - Saldo: ${item.saldo_disponivel_produto}`);
      console.log(`   - Local: ${item.local_produto || 'N/A'}`);
      console.log(`   - Armazém: ${item.armazem || 'N/A'}`);
    });
    
    // 3. Buscar 100% dos dados em lotes
    console.log('\n🌐 INICIANDO CARREGAMENTO DE 100% DOS DADOS...');
    
    let allData = [];
    const batchSize = 1000;
    
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const endRange = Math.min(offset + batchSize - 1, totalCount - 1);
      
      const { data: batch, error: batchError } = await supabase
        .from('estoque')
        .select('*')
        .range(offset, endRange);
      
      if (batchError) {
        console.error(`❌ Erro ao buscar lote ${offset}-${endRange}:`, batchError);
        continue;
      }
      
      allData = [...allData, ...batch];
      console.log(`   📥 Carregados ${allData.length}/${totalCount} registros (${Math.round(allData.length/totalCount*100)}%)`);
    }
    
    console.log(`\n✅ CARREGAMENTO COMPLETO: ${allData.length} registros!\n`);
    
    // 4. Calcular estatísticas completas
    console.log('📊 ESTATÍSTICAS COMPLETAS (100% DOS DADOS):');
    
    const stats = {
      totalRegistros: allData.length,
      produtosUnicos: [...new Set(allData.map(item => item.codigo_produto))].length,
      totalSaldo: allData.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0),
      produtosBloqueados: allData.filter(item => item.saldo_bloqueado_produto).length,
      produtosAvaria: allData.filter(item => item.saldo_bloqueado_produto === 'Avaria').length,
      produtosVencidos: allData.filter(item => item.saldo_bloqueado_produto === 'Vencido').length,
      armazens: [...new Set(allData.map(item => item.armazem).filter(Boolean))],
      locais: [...new Set(allData.map(item => item.local_produto).filter(Boolean))].length
    };
    
    console.log(`\n   - Total de registros: ${stats.totalRegistros.toLocaleString('pt-BR')}`);
    console.log(`   - Produtos únicos: ${stats.produtosUnicos}`);
    console.log(`   - Saldo total: ${stats.totalSaldo.toLocaleString('pt-BR')} unidades`);
    console.log(`   - Produtos bloqueados: ${stats.produtosBloqueados}`);
    console.log(`     • Com avaria: ${stats.produtosAvaria}`);
    console.log(`     • Vencidos: ${stats.produtosVencidos}`);
    console.log(`   - Armazéns: ${stats.armazens.join(', ')}`);
    console.log(`   - Locais diferentes: ${stats.locais}`);
    
    // 5. Testar busca por produto específico
    console.log('\n🔍 Testando busca por produto específico (000004)...');
    const { data: produto, error: prodError } = await supabase
      .from('estoque')
      .select('*')
      .eq('codigo_produto', '000004');
    
    if (prodError) {
      console.error('❌ Erro ao buscar produto:', prodError);
    } else if (produto && produto.length > 0) {
      console.log(`✅ Produto 000004 encontrado: ${produto.length} registros`);
      console.log(`   - Descrição: ${produto[0].descricao_produto}`);
      console.log(`   - Saldo total: ${produto.reduce((sum, p) => sum + parseFloat(p.saldo_disponivel_produto || 0), 0)} unidades`);
    } else {
      console.log('⚠️ Produto 000004 não encontrado');
    }
    
    console.log('\n✅ TESTE COMPLETO! Supabase conectado e funcionando com 100% dos dados!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testSupabase();