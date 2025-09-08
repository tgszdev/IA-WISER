// Test OpenAI configuration
import { OpenAIService } from './src/lib/openai-service.js';

console.log('========================================');
console.log('🧪 TESTE DE CONFIGURAÇÃO DO OPENAI');
console.log('========================================');
console.log('');

// Test with different configurations
const testConfigs = [
  {
    name: 'Sem API Key',
    config: {}
  },
  {
    name: 'Com API Key inválida',
    config: { apiKey: 'sk-invalid-key-xxx' }
  },
  {
    name: 'Com API Key placeholder',
    config: { apiKey: 'your_openai_api_key_here' }
  },
  {
    name: 'Com API Key válida (formato)',
    config: { apiKey: 'sk-proj-' + 'x'.repeat(48) }
  }
];

for (const test of testConfigs) {
  console.log(`📝 Teste: ${test.name}`);
  console.log('-----------------------------------');
  
  try {
    const openAI = new OpenAIService(test.config);
    const isReady = openAI.isReady();
    
    console.log(`✅ Instância criada`);
    console.log(`📊 Status: ${isReady ? 'PRONTO' : 'NÃO CONFIGURADO'}`);
    
    if (isReady && test.config.apiKey && test.config.apiKey.startsWith('sk-')) {
      // Test a simple query
      const response = await openAI.processInventoryQuery(
        'Teste de configuração',
        { test: true },
        []
      );
      console.log(`💬 Resposta de teste: ${response.substring(0, 50)}...`);
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }
  
  console.log('');
}

console.log('========================================');
console.log('📋 RESUMO DA CONFIGURAÇÃO');
console.log('========================================');
console.log('');
console.log('Para configurar o OpenAI corretamente:');
console.log('');
console.log('1. DESENVOLVIMENTO (.dev.vars):');
console.log('   OPENAI_API_KEY=sk-proj-...');
console.log('');
console.log('2. PRODUÇÃO (Cloudflare Pages):');
console.log('   npx wrangler pages secret put OPENAI_API_KEY');
console.log('');
console.log('3. FORMATO DA API KEY:');
console.log('   - Deve começar com "sk-"');
console.log('   - Geralmente "sk-proj-" seguido de 48+ caracteres');
console.log('   - NÃO pode conter "xxx" ou placeholders');
console.log('');
console.log('========================================');