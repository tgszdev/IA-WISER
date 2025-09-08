# 🔐 Configuração SEGURA da OpenAI API

## ⚠️ ALERTA DE SEGURANÇA CRÍTICO

**VOCÊ EXPÔS SUA API KEY!** Siga estes passos IMEDIATAMENTE:

### 1️⃣ REVOGUE A API KEY EXPOSTA AGORA

1. Acesse: https://platform.openai.com/api-keys
2. Encontre a key que começa com `sk-proj-uTs3...`
3. Clique em "Revoke" ou "Delete"
4. **FAÇA ISSO AGORA ANTES DE CONTINUAR!**

### 2️⃣ Crie uma NOVA API Key

1. No mesmo site, clique "Create new secret key"
2. Dê um nome descritivo: "Wiser IA Assistant"
3. Copie a nova key (começará com `sk-...`)
4. **NUNCA compartilhe esta key publicamente!**

## 🔒 Configuração Segura no Sistema

### Opção A: Arquivo .dev.vars (Desenvolvimento Local)

```bash
# Crie ou edite o arquivo .dev.vars
OPENAI_API_KEY=sk-proj-suaNOVAchaveAQUI
```

**IMPORTANTE**: Este arquivo já está no .gitignore

### Opção B: Variável de Ambiente (Cloudflare Pages)

```bash
# No Cloudflare Dashboard
npx wrangler pages secret put OPENAI_API_KEY --project-name ia-wiser
# Cole a API key quando solicitado
```

### Opção C: Via Interface Cloudflare

1. Acesse Cloudflare Pages Dashboard
2. Vá em Settings → Environment variables
3. Adicione: `OPENAI_API_KEY = sua_nova_key`

## 📝 Como Usar no Código

### ✅ FORMA CORRETA (Segura)

```typescript
// Sempre use variáveis de ambiente
const openaiKey = process.env.OPENAI_API_KEY;

// ou no Cloudflare Workers
const openaiKey = c.env.OPENAI_API_KEY;
```

### ❌ NUNCA FAÇA ISSO

```typescript
// NUNCA hardcode a API key
const openaiKey = "sk-proj-abc123..."; // NUNCA!
```

## 🚀 Testando a Integração

### 1. Instale as dependências
```bash
npm install openai
```

### 2. Teste local
```bash
# Com .dev.vars configurado
npm run dev:sandbox
```

### 3. Acesse o endpoint OpenAI
```bash
curl -X POST http://localhost:3000/api/chat-openai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual o saldo do produto 000032?",
    "sessionId": "test-openai"
  }'
```

## 📊 Comparação: OpenAI vs Gemini

| Feature | OpenAI GPT-4 | Google Gemini |
|---------|-------------|---------------|
| Custo | $0.03/1K tokens | $0.00001875/1K tokens |
| Velocidade | Médio | Rápido |
| Qualidade | Excelente | Muito Boa |
| Limite Free | Não tem | 2M tokens/mês |
| Function Calling | ✅ Sim | ✅ Sim |
| Vision | ✅ Sim | ✅ Sim |

## 🎯 Endpoints Disponíveis com OpenAI

### 1. Chat com OpenAI
```
POST /api/chat-openai
{
  "message": "sua pergunta",
  "sessionId": "session-id"
}
```

### 2. Análise de Tendências
```
POST /api/analyze-trends
{
  "data": [array de produtos]
}
```

### 3. Geração de Relatório
```
POST /api/generate-report
{
  "data": {inventário},
  "type": "summary|detailed|critical"
}
```

### 4. Melhorar Resposta Local
```
POST /api/enhance-response
{
  "query": "pergunta original",
  "localResponse": "resposta do sistema local"
}
```

## 💰 Custos Estimados

### Com GPT-3.5-turbo (Econômico)
- Input: $0.0005/1K tokens
- Output: $0.0015/1K tokens
- **Custo médio por query**: $0.001 (0.1 centavo)

### Com GPT-4 (Premium)
- Input: $0.03/1K tokens
- Output: $0.06/1K tokens
- **Custo médio por query**: $0.05 (5 centavos)

## 🔧 Alternar Entre Modelos

No código, você pode escolher o modelo:

```typescript
// Para economizar
const openAI = getOpenAIService({ 
  apiKey: key,
  model: 'gpt-3.5-turbo'  // 60x mais barato
});

// Para máxima qualidade
const openAI = getOpenAIService({ 
  apiKey: key,
  model: 'gpt-4-turbo-preview'  // Melhor qualidade
});
```

## ⚠️ Boas Práticas de Segurança

1. **NUNCA** commite API keys no Git
2. **SEMPRE** use variáveis de ambiente
3. **REVOGUE** keys expostas imediatamente
4. **ROTACIONE** keys regularmente
5. **MONITORE** uso no dashboard OpenAI
6. **LIMITE** gastos no dashboard OpenAI

## 🚨 Se a Key Foi Comprometida

1. Revogue imediatamente
2. Crie nova key
3. Verifique logs de uso
4. Configure limites de gasto
5. Ative alertas de uso

## 📞 Suporte

- OpenAI Dashboard: https://platform.openai.com
- Documentação: https://platform.openai.com/docs
- Preços: https://openai.com/pricing

---

**LEMBRE-SE: SEGURANÇA PRIMEIRO! Nunca exponha API keys!** 🔐