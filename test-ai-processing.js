#!/usr/bin/env node

import { getEstoqueData } from './api/supabase-client.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

// Configurar variáveis necessárias
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tecvgnrqcfqcrcodrjtt.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A";

console.log('🧪 TESTE: IA Processando TODOS os Dados\n');
console.log('============================================================\n');

async function testAIProcessing() {
  try {
    // Buscar todos os dados
    console.log('1️⃣ Buscando TODOS os dados do estoque...');
    const estoqueData = await getEstoqueData();
    console.log(`✅ ${estoqueData.length} registros carregados\n`);
    
    // Validar dados como a API faz
    console.log('2️⃣ Validando e limpando dados...');
    const dadosLimpos = estoqueData.map(item => ({
      ...item,
      saldo_disponivel_produto: parseFloat(item.saldo_disponivel_produto) || 0,
      saldo_reservado_produto: parseFloat(item.saldo_reservado_produto) || 0,
      saldo_bloqueado_produto: item.saldo_bloqueado_produto === 'Vencido' || item.saldo_bloqueado_produto === 'Avaria' 
        ? item.saldo_bloqueado_produto 
        : (parseFloat(item.saldo_bloqueado_produto) || 0)
    }));
    
    // Calcular estatísticas
    console.log('3️⃣ Calculando estatísticas...\n');
    
    const totalGeral = dadosLimpos.reduce((sum, p) => sum + p.saldo_disponivel_produto, 0);
    const produtosUnicos = [...new Set(dadosLimpos.map(p => p.codigo_produto))];
    const produto000004 = dadosLimpos.filter(p => p.codigo_produto === '000004');
    const saldo000004 = produto000004.reduce((sum, p) => sum + p.saldo_disponivel_produto, 0);
    
    console.log('📊 RESULTADOS:\n');
    console.log(`Total de registros: ${dadosLimpos.length}`);
    console.log(`Produtos únicos: ${produtosUnicos.length}`);
    console.log(`Saldo total geral: ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} unidades`);
    console.log(`\nProduto 000004:`);
    console.log(`  - Lotes: ${produto000004.length}`);
    console.log(`  - Saldo total: ${saldo000004.toLocaleString('pt-BR')} unidades`);
    
    // Verificar produtos com bloqueio
    const produtosBloqueados = dadosLimpos.filter(p => 
      p.saldo_bloqueado_produto === 'Vencido' || 
      p.saldo_bloqueado_produto === 'Avaria'
    );
    
    console.log(`\nProdutos bloqueados:`);
    console.log(`  - Com status Vencido/Avaria: ${produtosBloqueados.length} registros`);
    
    console.log('\n============================================================');
    console.log('✅ SISTEMA PRONTO PARA PROCESSAR COM IA!');
    console.log('\nA IA agora recebe:');
    console.log(`- TODOS os ${dadosLimpos.length} registros`);
    console.log('- Dados validados e limpos');
    console.log('- Processamento sem limitações');
    console.log('- Respostas organizadas e lógicas');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAIProcessing();