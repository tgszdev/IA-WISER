#!/bin/bash

echo "==================================="
echo "🤖 TESTE DO SISTEMA MULTI-IA"
echo "==================================="
echo ""

# Verificar status das IAs
echo "1️⃣ Verificando status das IAs..."
echo "-----------------------------------"
curl -s http://localhost:3000/api/ai-status | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'IA Primária Ativa: {data[\"primaryAI\"].upper()}')
print('')
print('Status dos Serviços:')
print(f'  • OpenAI: {data[\"services\"][\"openai\"][\"status\"]}')
print(f'  • Gemini: {data[\"services\"][\"gemini\"][\"status\"]}')
print(f'  • Local: {data[\"services\"][\"local\"][\"status\"]}')
print('')
print(f'Recomendação: {data[\"recommendation\"]}')
"

echo ""
echo "2️⃣ Fazendo uma pergunta de teste..."
echo "-----------------------------------"

# Fazer uma pergunta e ver qual IA responde
RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat-smart \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual o saldo do produto 000004?",
    "sessionId": "test-session-123"
  }')

# Extrair informações da resposta
echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    
    # Mostrar qual IA foi usada
    ai_model = data.get('aiModel', 'unknown')
    if ai_model == 'gpt-4':
        print('🧠 Resposta gerada por: OpenAI GPT-4')
    elif ai_model == 'gemini-1.5-flash':
        print('✨ Resposta gerada por: Google Gemini')
    elif ai_model == 'local':
        print('🔧 Resposta gerada por: Query Generator Local')
    else:
        print(f'❓ Modelo de IA: {ai_model}')
    
    # Mostrar tempo de resposta
    response_time = data.get('responseTime', 0)
    print(f'⏱️ Tempo de resposta: {response_time}ms')
    
    # Mostrar confiança
    confidence = data.get('confidence', 0)
    print(f'📊 Confiança na detecção: {int(confidence * 100)}%')
    
    # Mostrar status das IAs
    if 'aiStatus' in data:
        print('')
        print('Status de Configuração:')
        print(f\"  • OpenAI: {data['aiStatus']['openai']}\")
        print(f\"  • Gemini: {data['aiStatus']['gemini']}\")
    
    # Mostrar parte da resposta
    print('')
    print('Preview da resposta:')
    response_text = data.get('response', '')
    preview = response_text[:200] + '...' if len(response_text) > 200 else response_text
    print(preview)
    
except Exception as e:
    print(f'Erro ao processar resposta: {e}')
"

echo ""
echo "==================================="
echo "📋 COMO IDENTIFICAR QUAL IA ESTÁ SENDO USADA:"
echo "==================================="
echo ""
echo "1. No CHAT: Veja o indicador no rodapé da mensagem"
echo "   • 🧠 GPT-4 = OpenAI"
echo "   • ✨ Gemini = Google"
echo "   • 🔧 Local = Query Generator"
echo ""
echo "2. Na INTERFACE: Badge verde no canto inferior"
echo ""
echo "3. Via API: Campo 'aiModel' na resposta JSON"
echo ""
echo "4. Página de STATUS: http://localhost:3000/ai-status.html"
echo ""
echo "==================================="
echo "✅ Teste completo!"