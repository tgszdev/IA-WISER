// ============================================================
// EXPORTADOR DE DATASET COMPLETO PARA OPENAI
// Exporta 100% dos dados do Supabase em formato otimizado
// ============================================================

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔄 EXPORTANDO 100% DOS DADOS DO SUPABASE...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Obter contagem total
    const { count: totalCount, error: countError } = await supabase
      .from('estoque')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    console.log(`📊 Total de registros: ${totalCount}`);
    
    // Carregar TODOS os dados
    let allData = [];
    const batchSize = 1000;
    
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .range(offset, Math.min(offset + batchSize - 1, totalCount - 1))
        .order('codigo_produto');
      
      if (error) throw error;
      if (data) allData = [...allData, ...data];
      
      console.log(`📦 Exportados ${allData.length}/${totalCount} registros...`);
    }
    
    // Formato de resposta baseado no parâmetro
    const format = req.query.format || 'json';
    
    if (format === 'csv') {
      // Exportar como CSV
      const headers = Object.keys(allData[0] || {});
      let csv = headers.join(',') + '\n';
      
      allData.forEach(row => {
        csv += headers.map(header => {
          const value = row[header];
          // Escapar valores com vírgulas ou quebras de linha
          if (value && (value.toString().includes(',') || value.toString().includes('\n'))) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="estoque_completo.csv"');
      return res.status(200).send(csv);
      
    } else if (format === 'sql') {
      // Exportar como SQL INSERT statements
      let sql = '-- DATASET COMPLETO DA TABELA ESTOQUE\n';
      sql += `-- Total de registros: ${totalCount}\n`;
      sql += `-- Exportado em: ${new Date().toISOString()}\n\n`;
      
      sql += 'DELETE FROM estoque;\n\n';
      
      allData.forEach(row => {
        const columns = Object.keys(row).filter(k => row[k] !== null);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          return val;
        });
        
        sql += `INSERT INTO estoque (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      });
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="estoque_completo.sql"');
      return res.status(200).send(sql);
      
    } else if (format === 'openai') {
      // Formato otimizado para OpenAI
      const dataset = {
        metadata: {
          table_name: 'estoque',
          total_records: totalCount,
          columns: [
            { name: 'id', type: 'integer', description: 'ID único do registro' },
            { name: 'codigo_produto', type: 'string', description: 'Código do produto (ex: RM 123, PROD-001)' },
            { name: 'descricao_produto', type: 'string', description: 'Descrição completa do produto' },
            { name: 'saldo_disponivel_produto', type: 'number', description: 'Quantidade disponível em estoque' },
            { name: 'saldo_bloqueado_produto', type: 'string', description: 'Status de bloqueio (Avaria, Vencido, etc)' },
            { name: 'lote_industria_produto', type: 'string', description: 'Número do lote' },
            { name: 'local_produto', type: 'string', description: 'Localização física (9 dígitos)' },
            { name: 'armazem', type: 'string', description: 'Nome do armazém' },
            { name: 'preco_unitario', type: 'number', description: 'Preço unitário do produto' },
            { name: 'unidade_medida', type: 'string', description: 'Unidade de medida (UN, KG, etc)' },
            { name: 'categoria', type: 'string', description: 'Categoria do produto' },
            { name: 'data_validade', type: 'date', description: 'Data de validade do produto' }
          ],
          exported_at: new Date().toISOString(),
          source_database: 'Supabase PostgreSQL'
        },
        statistics: {
          total_records: totalCount,
          unique_products: [...new Set(allData.map(item => item.codigo_produto))].length,
          unique_locations: [...new Set(allData.map(item => item.local_produto))].length,
          unique_lots: [...new Set(allData.map(item => item.lote_industria_produto))].length,
          total_available_stock: allData.reduce((sum, item) => sum + (item.saldo_disponivel_produto || 0), 0),
          blocked_items: allData.filter(item => item.saldo_bloqueado_produto).length,
          damaged_items: allData.filter(item => item.saldo_bloqueado_produto === 'Avaria').length,
          expired_items: allData.filter(item => item.saldo_bloqueado_produto === 'Vencido').length
        },
        data: allData,
        instructions_for_ai: {
          language: 'Portuguese (pt-BR)',
          context: 'Este é um sistema de gestão de estoque/inventário de uma empresa brasileira',
          important_notes: [
            'codigo_produto pode ter formatos variados: RM 123, PROD-001, ou números simples',
            'local_produto são códigos de 9 dígitos que identificam posições físicas no armazém',
            'saldo_bloqueado_produto quando não é NULL indica produtos com problemas',
            'Um mesmo produto pode estar em múltiplos locais com lotes diferentes',
            'Para consultas de saldo total, sempre some todos os registros do mesmo codigo_produto'
          ],
          example_queries: [
            'Qual o saldo total do produto RM 123?',
            'Quais produtos estão no local 034083501?',
            'Quantos produtos estão vencidos?',
            'Qual o valor total do estoque?'
          ]
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="estoque_dataset_openai.json"');
      return res.status(200).json(dataset);
      
    } else {
      // JSON padrão
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="estoque_completo.json"');
      return res.status(200).json({
        total: totalCount,
        data: allData
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    return res.status(500).json({
      error: error.message,
      message: 'Erro ao exportar dados'
    });
  }
}