#!/usr/bin/env node

import { getEstoqueData } from './api/supabase-client.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

console.log('🔍 TESTE: Verificando se busca TODOS os dados\n');
console.log('============================================================\n');

async function testFullDataLoad() {
  try {
    console.log('1️⃣ Buscando com limite de 100...');
    const dataWith100 = await getEstoqueData(100);
    console.log(`   Resultado: ${dataWith100.length} registros\n`);
    
    console.log('2️⃣ Buscando com limite de 500...');
    const dataWith500 = await getEstoqueData(500);
    console.log(`   Resultado: ${dataWith500.length} registros\n`);
    
    console.log('3️⃣ Buscando SEM LIMITE (todos os dados)...');
    const dataWithoutLimit = await getEstoqueData();
    console.log(`   Resultado: ${dataWithoutLimit.length} registros\n`);
    
    console.log('============================================================');
    console.log('📊 RESUMO:\n');
    
    if (dataWithoutLimit.length === 1000) {
      console.log('✅ SUCESSO! Buscando TODOS os 1000 registros!');
    } else if (dataWithoutLimit.length > dataWith100.length) {
      console.log(`✅ Melhorou! Agora busca ${dataWithoutLimit.length} registros (antes era ${dataWith100.length})`);
    } else {
      console.log(`⚠️ Ainda limitado a ${dataWithoutLimit.length} registros`);
    }
    
    // Verificar produto 000004
    const produto000004 = dataWithoutLimit.filter(p => p.codigo_produto === '000004');
    console.log(`\n📦 Produto 000004 encontrado em ${produto000004.length} lotes`);
    
    if (produto000004.length > 0) {
      const totalSaldo = produto000004.reduce((sum, p) => sum + (p.saldo_disponivel_produto || 0), 0);
      console.log(`   Saldo total: ${totalSaldo} unidades`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testFullDataLoad();