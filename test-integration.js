// Script de teste para verificar integração completa
// Execute com: node test-integration.js

import { queryDatabase, testConnection } from './api/database.js';

const DB_URL = process.env.DATABASE_URL || 'postgresql://user:pass@host/db';

async function runTests() {
  console.log('🔍 TESTE DE INTEGRAÇÃO - Wiser IA Assistant\n');
  console.log('=' .repeat(50));
  
  // Teste 1: Conexão
  console.log('\n📌 Teste 1: Verificando conexão com banco...');
  const connectionTest = await testConnection(DB_URL);
  
  if (connectionTest.success) {
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`   Banco: ${connectionTest.message}`);
    console.log(`   Tabela knowledge_base existe: ${connectionTest.hasKnowledgeBase ? '✅ Sim' : '❌ Não'}`);
    console.log(`   Registros encontrados: ${connectionTest.recordCount}`);
  } else {
    console.log('❌ Erro na conexão:', connectionTest.message);
    console.log('\n⚠️  Configure DATABASE_URL corretamente e tente novamente.');
    process.exit(1);
  }
  
  // Teste 2: Query vazia (busca todos)
  console.log('\n📌 Teste 2: Buscando todos os registros...');
  const allRecords = await queryDatabase(DB_URL, '');
  
  if (allRecords && allRecords.results) {
    console.log(`✅ Encontrados ${allRecords.results.length} registros`);
    
    if (allRecords.results.length > 0) {
      console.log('\n📊 Primeiros 3 registros:');
      allRecords.results.slice(0, 3).forEach((record, i) => {
        console.log(`\n   ${i + 1}. ${record.title}`);
        console.log(`      ${record.content.substring(0, 100)}...`);
      });
    }
  } else {
    console.log('⚠️  Nenhum registro encontrado ou erro na query');
  }
  
  // Teste 3: Query específica
  console.log('\n📌 Teste 3: Testando busca específica...');
  const testQueries = ['empresa', 'produto', 'suporte', 'preço'];
  
  for (const query of testQueries) {
    const result = await queryDatabase(DB_URL, query);
    
    if (result && result.results && result.results.length > 0) {
      console.log(`   ✅ Query "${query}": ${result.results.length} resultado(s)`);
    } else {
      console.log(`   ⚠️  Query "${query}": Nenhum resultado`);
    }
  }
  
  // Resumo
  console.log('\n' + '=' .repeat(50));
  console.log('📋 RESUMO DO TESTE\n');
  
  if (connectionTest.success && connectionTest.hasKnowledgeBase && connectionTest.recordCount > 0) {
    console.log('✅ Sistema pronto para uso!');
    console.log('   - Banco conectado');
    console.log('   - Tabela existe');
    console.log(`   - ${connectionTest.recordCount} registros disponíveis`);
    console.log('\n💡 Próximo passo: Teste o chat para verificar se a IA usa o contexto.');
  } else if (connectionTest.success && !connectionTest.hasKnowledgeBase) {
    console.log('⚠️  Tabela knowledge_base não existe!');
    console.log('\n💡 Execute o seguinte SQL no seu banco:');
    console.log(`
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados de exemplo
INSERT INTO knowledge_base (title, content, category, tags) VALUES
('Sobre a Empresa', 'Nossa empresa foi fundada em 2020...', 'Institucional', ARRAY['empresa', 'sobre']),
('Produtos', 'Oferecemos três planos: Básico, Pro e Enterprise...', 'Produtos', ARRAY['planos', 'preços']);
    `);
  } else if (connectionTest.success && connectionTest.recordCount === 0) {
    console.log('⚠️  Tabela existe mas está vazia!');
    console.log('\n💡 Insira alguns dados de teste no banco.');
  }
  
  console.log('\n✨ Teste concluído!\n');
}

// Executar testes
runTests().catch(error => {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
});