#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('📦 ANÁLISE COMPLETA DO ESTOQUE\n');
console.log('============================================================\n');

async function analyzeInventory() {
  try {
    // Buscar TODOS os produtos
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .order('codigo_produto', { ascending: true });
    
    if (error) {
      console.error('Erro:', error);
      return;
    }
    
    console.log(`✅ Total de registros no estoque: ${data.length}\n`);
    
    // Análise por produto único
    const produtos = {};
    
    data.forEach(item => {
      const key = item.codigo_produto;
      if (!produtos[key]) {
        produtos[key] = {
          descricao: item.descricao_produto,
          lotes: [],
          totalDisponivel: 0,
          totalReservado: 0,
          totalBloqueado: 0,
          localizacoes: new Set()
        };
      }
      
      produtos[key].lotes.push(item.lote_industria_produto);
      produtos[key].totalDisponivel += item.saldo_disponivel_produto || 0;
      produtos[key].totalReservado += item.saldo_reservado_produto || 0;
      produtos[key].totalBloqueado += item.saldo_bloqueado_produto || 0;
      
      if (item.armazem) produtos[key].localizacoes.add(item.armazem);
    });
    
    console.log('📊 RESUMO POR PRODUTO:\n');
    console.log('-----------------------------------');
    
    Object.entries(produtos).forEach(([codigo, info]) => {
      console.log(`\n📦 Código: ${codigo}`);
      console.log(`   Descrição: ${info.descricao}`);
      console.log(`   Lotes: ${info.lotes.length} diferentes`);
      console.log(`   Saldo Disponível: ${info.totalDisponivel} unidades`);
      console.log(`   Saldo Reservado: ${info.totalReservado} unidades`);
      console.log(`   Saldo Bloqueado: ${info.totalBloqueado} unidades`);
      console.log(`   Armazéns: ${Array.from(info.localizacoes).join(', ') || 'Não especificado'}`);
    });
    
    // Estatísticas gerais
    console.log('\n\n📈 ESTATÍSTICAS GERAIS:');
    console.log('-----------------------------------');
    console.log(`Total de produtos únicos: ${Object.keys(produtos).length}`);
    console.log(`Total de registros: ${data.length}`);
    
    const totalGeral = Object.values(produtos).reduce((acc, p) => acc + p.totalDisponivel, 0);
    console.log(`Total geral disponível: ${totalGeral} unidades`);
    
    // Mostrar campos disponíveis
    if (data.length > 0) {
      console.log('\n\n🔍 CAMPOS DISPONÍVEIS NA TABELA:');
      console.log('-----------------------------------');
      Object.keys(data[0]).forEach(field => {
        console.log(`- ${field}`);
      });
    }
    
  } catch (err) {
    console.error('Erro:', err);
  }
}

analyzeInventory();