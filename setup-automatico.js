// Script de configuração automática para seu ambiente
// Execute com: node setup-automatico.js

console.log('🔧 CONFIGURAÇÃO AUTOMÁTICA DO WISER IA\n');
console.log('=' .repeat(50));

// Suas configurações
const CONFIG = {
  DATABASE_URL: 'postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres',
  DATABASE_HOST: 'db.tecvgnrqcfqcrcodrjtt.supabase.co',
  DATABASE_PASSWORD_ORIGINAL: 'Nnyq2122@@',
  DATABASE_PASSWORD_ENCODED: 'Nnyq2122%40%40',
  GOOGLE_API_KEY: 'Adicione sua API key aqui',
  SYSTEM_PROMPT: 'Você é um analista de estoque especializado em WMS.'
};

console.log('\n📋 SUAS CONFIGURAÇÕES:');
console.log('------------------------');
console.log(`Host Supabase: ${CONFIG.DATABASE_HOST}`);
console.log(`Senha Original: ${CONFIG.DATABASE_PASSWORD_ORIGINAL}`);
console.log(`Senha Codificada: ${CONFIG.DATABASE_PASSWORD_ENCODED}`);
console.log(`URL Completa: ${CONFIG.DATABASE_URL}`);

console.log('\n✅ O QUE FAZER AGORA:');
console.log('------------------------');
console.log('1. Na página de CONFIGURAÇÕES da aplicação:');
console.log('   - No campo "URL de Conexão PostgreSQL", cole:');
console.log(`   ${CONFIG.DATABASE_URL}`);
console.log('');
console.log('2. OU simplesmente cole a URL base e o sistema substituirá automaticamente:');
console.log('   postgresql://postgres:[YOUR-PASSWORD]@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres');
console.log('');
console.log('3. Configure sua Google API Key');
console.log('4. Clique em "Testar Conexão"');
console.log('5. Salve as configurações');

console.log('\n⚠️  IMPORTANTE:');
console.log('------------------------');
console.log('- Sua senha tem @@ que foi convertida para %40%40');
console.log('- Isso é necessário porque @ tem significado especial em URLs');
console.log('- O sistema já está configurado para fazer isso automaticamente');

console.log('\n🚀 TESTE DE CONEXÃO:');
console.log('------------------------');
console.log('Após configurar, teste com estas perguntas no chat:');
console.log('- "Qual o estoque total disponível?"');
console.log('- "Liste todos os produtos do armazém BARUERI"');
console.log('- "Onde está o produto CAMP-D?"');

console.log('\n✨ Configuração preparada com sucesso!\n');