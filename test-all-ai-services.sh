#!/bin/bash

echo "=================================================="
echo "🧪 TESTE COMPLETO DAS IAs (OpenAI e Google)"
echo "=================================================="
echo ""

# Função para testar uma query
test_ai_query() {
    local question="$1"
    local test_name="$2"
    
    echo "📝 Teste: $test_name"
    echo "   Pergunta: \"$question\""
    echo "--------------------------------------------------"
    
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat-smart \
      -H "Content-Type: application/json" \
      -d "{
        \"message\": \"$question\",
        \"sessionId\": \"test-ai-$(date +%s)\"
      }")
    
    # Extrair informações da resposta
    echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    
    # Verificar qual IA respondeu
    ai_model = data.get('aiModel', 'unknown')
    response_time = data.get('responseTime', 0)
    confidence = data.get('confidence', 0)
    
    # Mostrar resultado
    if ai_model == 'gpt-4':
        print('   ✅ IA: OpenAI GPT-4 🧠')
    elif ai_model == 'gemini-1.5-flash':
        print('   ✅ IA: Google Gemini ✨')
    elif ai_model == 'local':
        print('   ✅ IA: Query Generator Local 🔧')
    else:
        print(f'   ❓ IA: {ai_model}')
    
    print(f'   ⏱️ Tempo: {response_time}ms')
    print(f'   📊 Confiança: {int(confidence * 100)}%')
    
    # Status das APIs
    if 'aiStatus' in data:
        openai_status = data['aiStatus'].get('openai', 'unknown')
        gemini_status = data['aiStatus'].get('gemini', 'unknown')
        print(f'   🔌 OpenAI: {openai_status}')
        print(f'   🔌 Gemini: {gemini_status}')
    
    # Preview da resposta
    response_text = data.get('response', '')
    lines = response_text.split('\\\\n')
    preview = lines[0] if lines else ''
    if len(preview) > 80:
        preview = preview[:80] + '...'
    print(f'   💬 Resposta: {preview}')
    
    # Verificar se houve erro
    if 'error' in data:
        print(f'   ❌ Erro: {data[\"error\"]}')
    
except Exception as e:
    print(f'   ❌ Erro ao processar: {e}')
"
    echo ""
}

# 1. Verificar status das APIs
echo "1️⃣ VERIFICANDO STATUS DAS APIs"
echo "=================================================="
curl -s http://localhost:3000/api/ai-status | python3 -c "
import json, sys
data = json.load(sys.stdin)

print(f'🎯 IA Primária: {data[\"primaryAI\"].upper()}')
print('')
print('📊 Status dos Serviços:')
print(f'   • OpenAI: {data[\"services\"][\"openai\"][\"status\"]}')
print(f'   • Gemini: {data[\"services\"][\"gemini\"][\"status\"]}')
print(f'   • Local: {data[\"services\"][\"local\"][\"status\"]}')
print('')

if data['services']['openai']['configured']:
    print(f'✅ OpenAI configurado: {data[\"services\"][\"openai\"][\"keyPrefix\"]}')
else:
    print('❌ OpenAI não configurado')

if data['services']['gemini']['configured']:
    print(f'✅ Gemini configurado: {data[\"services\"][\"gemini\"][\"keyPrefix\"]}')
else:
    print('❌ Gemini não configurado')
"

echo ""
echo "2️⃣ TESTANDO QUERIES COM AS IAs"
echo "=================================================="

# Testar diferentes tipos de perguntas
test_ai_query "Qual o saldo do produto 000004?" "Pergunta Simples"
test_ai_query "Me explique o que você pode fazer" "Pergunta sobre Sistema"
test_ai_query "Faça uma análise do inventário" "Análise Complexa"
test_ai_query "Produtos críticos que precisam atenção urgente" "Query Urgente"
test_ai_query "Compare produtos com estoque alto e baixo" "Comparação"

echo "3️⃣ TESTE DE FALLBACK (Simulando falha do OpenAI)"
echo "=================================================="
echo "Para testar fallback, seria necessário:"
echo "1. Desconfigurar OpenAI temporariamente"
echo "2. Verificar se usa Gemini"
echo "3. Se Gemini falhar, usa Local"
echo ""

echo "4️⃣ TESTE ESPECÍFICO DO OPENAI"
echo "=================================================="

# Teste direto com endpoint OpenAI
curl -s -X POST http://localhost:3000/api/chat-openai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Teste direto do OpenAI - me diga qual modelo você está usando",
    "sessionId": "test-openai-direct"
  }' | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    model = data.get('model', 'unknown')
    response = data.get('response', '')[:100]
    
    print('Teste direto do endpoint OpenAI:')
    print(f'   Modelo: {model}')
    print(f'   Resposta: {response}...')
except Exception as e:
    print(f'Erro: {e}')
"

echo ""
echo "=================================================="
echo "📊 RESUMO DOS TESTES"
echo "=================================================="
echo ""

# Verificar logs do PM2
echo "📝 Últimas linhas do log do servidor:"
echo "--------------------------------------------------"
pm2 logs wiser-ia --nostream --lines 5 | grep -E "(OpenAI|Gemini|configured|ready)"

echo ""
echo "✅ TESTE COMPLETO!"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Se OpenAI estiver funcionando, configure o Google Gemini"
echo "2. Teste o fallback entre as IAs"
echo "3. Configure as mesmas chaves no Vercel/Cloudflare"
echo ""
echo "=================================================="