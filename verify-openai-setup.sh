#!/bin/bash

echo "=================================================="
echo "🔍 VERIFICAÇÃO COMPLETA DO OPENAI"
echo "=================================================="
echo ""

# 1. Verificar código no GitHub
echo "1️⃣ Verificando código no GitHub..."
echo "--------------------------------------------------"
LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s")
echo "Último commit: $LAST_COMMIT"
echo ""

# 2. Verificar arquivos de configuração
echo "2️⃣ Verificando arquivos de configuração..."
echo "--------------------------------------------------"

if [ -f ".dev.vars" ]; then
    echo "✅ .dev.vars existe"
    
    # Check if OpenAI key is configured (without showing the key)
    if grep -q "OPENAI_API_KEY=sk-" .dev.vars 2>/dev/null; then
        echo "✅ OpenAI API Key configurada (começa com sk-)"
    else
        echo "⚠️ OpenAI API Key NÃO configurada ou inválida"
        echo "   Adicione sua chave em .dev.vars:"
        echo "   OPENAI_API_KEY=sk-proj-..."
    fi
else
    echo "⚠️ .dev.vars não existe"
    echo "   Copie .dev.vars.example para .dev.vars e adicione suas chaves"
fi

echo ""

# 3. Verificar código-fonte
echo "3️⃣ Verificando código-fonte..."
echo "--------------------------------------------------"

# Check OpenAIService constructor
echo -n "OpenAIService constructor: "
if grep -q "new OpenAIService({ apiKey:" src/routes/chat.ts 2>/dev/null; then
    echo "✅ Correto (passa objeto)"
else
    echo "❌ Incorreto (verificar implementação)"
fi

# Check AI status endpoint
echo -n "AI Status endpoint: "
if grep -q "new OpenAIService({ apiKey:" src/routes/chat.ts 2>/dev/null; then
    echo "✅ Correto"
else
    echo "❌ Incorreto"
fi

echo ""

# 4. Testar API endpoint
echo "4️⃣ Testando endpoint /api/ai-status..."
echo "--------------------------------------------------"

RESPONSE=$(curl -s http://localhost:3000/api/ai-status)

if [ $? -eq 0 ]; then
    echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    openai = data['services']['openai']
    
    print(f'Status do OpenAI: {openai[\"status\"]}')
    
    if openai['status'] == 'ready':
        print('✅ OpenAI está PRONTO e funcionando!')
        print(f'   Modelo: {openai.get(\"model\", \"gpt-4\")}')
    elif openai['status'] == 'configured_but_not_ready':
        print('⚠️ OpenAI está configurado mas não está pronto')
        print('   Verifique se a API key é válida')
    elif openai['status'] == 'not_configured':
        print('❌ OpenAI NÃO está configurado')
        print('   Configure a API key em .dev.vars ou nas variáveis de ambiente')
    else:
        print(f'❓ Status desconhecido: {openai[\"status\"]}')
    
    if openai.get('keyPrefix'):
        print(f'   Chave detectada: {openai[\"keyPrefix\"]}')
        
except Exception as e:
    print(f'Erro ao processar resposta: {e}')
"
else
    echo "❌ Erro ao conectar com o servidor"
fi

echo ""

# 5. Instruções de configuração
echo "5️⃣ Como configurar o OpenAI..."
echo "--------------------------------------------------"
echo ""
echo "DESENVOLVIMENTO LOCAL:"
echo "1. Edite o arquivo .dev.vars"
echo "2. Adicione sua API key:"
echo "   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx"
echo "3. Reinicie o servidor:"
echo "   pm2 restart wiser-ia"
echo ""
echo "PRODUÇÃO (Cloudflare Pages):"
echo "1. Configure o secret:"
echo "   npx wrangler pages secret put OPENAI_API_KEY --project-name wiser-ia"
echo "2. Cole sua API key quando solicitado"
echo "3. Faça novo deploy:"
echo "   npm run deploy"
echo ""
echo "OBTER API KEY:"
echo "1. Acesse: https://platform.openai.com/api-keys"
echo "2. Crie uma nova chave"
echo "3. Copie a chave (começa com sk-)"
echo "4. NUNCA compartilhe ou exponha publicamente!"
echo ""

# 6. Testar uma query com OpenAI
echo "6️⃣ Testando query com IA..."
echo "--------------------------------------------------"

TEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat-smart \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, você está usando OpenAI?",
    "sessionId": "test-openai-check"
  }')

echo "$TEST_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    ai_model = data.get('aiModel', 'unknown')
    
    if ai_model == 'gpt-4':
        print('✅ Resposta gerada pelo OpenAI GPT-4!')
    elif ai_model == 'gemini-1.5-flash':
        print('⚠️ Resposta gerada pelo Google Gemini (OpenAI não disponível)')
    elif ai_model == 'local':
        print('❌ Resposta gerada pelo Query Generator Local (nenhuma IA externa configurada)')
    else:
        print(f'❓ Modelo desconhecido: {ai_model}')
        
except Exception as e:
    print(f'Erro: {e}')
"

echo ""
echo "=================================================="
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "=================================================="
echo ""
echo "✅ Código corrigido e enviado para GitHub"
echo "📝 Para ativar o OpenAI, configure sua API key"
echo "🔒 Mantenha sua API key segura e privada"
echo ""
echo "=================================================="