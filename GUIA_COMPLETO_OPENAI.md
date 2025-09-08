# 🚀 GUIA COMPLETO - Configurar OpenAI com 100% dos Dados

## 📋 Índice
1. [Obter API Key da OpenAI](#1-obter-api-key-da-openai)
2. [Configurar no Projeto](#2-configurar-no-projeto)
3. [Testar a Conexão](#3-testar-a-conexão)
4. [Usar em Produção](#4-usar-em-produção)
5. [Exemplos Práticos](#5-exemplos-práticos)

---

## 1️⃣ Obter API Key da OpenAI

### Passo 1: Criar conta na OpenAI
1. Acesse: https://platform.openai.com/signup
2. Crie uma conta ou faça login
3. Você receberá $5 de créditos grátis (novo usuário)

### Passo 2: Gerar API Key
1. Após login, acesse: https://platform.openai.com/api-keys
2. Clique em **"+ Create new secret key"**
3. Dê um nome: "Wiser IA Assistant"
4. Clique em **"Create secret key"**
5. **IMPORTANTE**: Copie a key agora! Ela começa com `sk-proj-...`
6. Guarde em local seguro

### Passo 3: Adicionar créditos (se necessário)
1. Acesse: https://platform.openai.com/account/billing
2. Clique em **"Add payment method"**
3. Adicione cartão de crédito
4. Configure limite de uso mensal (ex: $10)

**Custos estimados**:
- GPT-4 Turbo: ~$0.03 por consulta
- GPT-3.5 Turbo: ~$0.002 por consulta
- Com cache: 90% menos uso de tokens

---

## 2️⃣ Configurar no Projeto

### Opção A: Desenvolvimento Local (arquivo .env)

#### 1. Criar arquivo `.env` na raiz do projeto
```bash
cd /home/user/webapp
nano .env
```

#### 2. Adicionar as variáveis
```env
# OpenAI - COLE SUA KEY AQUI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (já configurado)
SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A
```

#### 3. Proteger o arquivo
```bash
# Adicionar ao .gitignore
echo ".env" >> .gitignore

# Criar exemplo sem keys
cp .env .env.example
nano .env.example
# Remover valores sensíveis, deixar só:
# OPENAI_API_KEY=your_openai_api_key_here
```

### Opção B: Vercel (Produção)

#### 1. Acessar Dashboard do Vercel
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto "IA-WISER"
3. Vá em **"Settings"** → **"Environment Variables"**

#### 2. Adicionar variáveis
Clique em **"Add New"** e adicione:

| Key | Value | Environment |
|-----|-------|-------------|
| `OPENAI_API_KEY` | `sk-proj-xxxxx...` | Production |
| `SUPABASE_URL` | `https://tecvgnrqcfqcrcodrjtt.supabase.co` | Production |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Production |

#### 3. Redeployar
1. Vá em **"Deployments"**
2. Clique em **"..."** no último deploy
3. Selecione **"Redeploy"**
4. Aguarde 1-2 minutos

### Opção C: Cloudflare Pages

#### 1. Acessar Dashboard
1. Acesse: https://dash.cloudflare.com
2. Vá em **"Pages"** → Seu projeto
3. Clique em **"Settings"** → **"Environment variables"**

#### 2. Adicionar variáveis
Clique em **"Add variable"** para cada:

```
OPENAI_API_KEY = sk-proj-xxxxx...
SUPABASE_URL = https://tecvgnrqcfqcrcodrjtt.supabase.co
SUPABASE_ANON_KEY = eyJhbG...
```

#### 3. Redeployar
```bash
npm run deploy
# ou
wrangler pages deploy dist --project-name seu-projeto
```

---

## 3️⃣ Testar a Conexão

### Teste 1: Via cURL (Terminal)
```bash
# Teste local
curl -X POST http://localhost:3000/api/openai-direct-connection \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual o saldo total do produto RM 123?",
    "use_openai": true
  }'

# Teste produção
curl -X POST https://sua-url.vercel.app/api/openai-direct-connection \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Qual o saldo total do produto RM 123?",
    "use_openai": true
  }'
```

### Teste 2: Via JavaScript (Browser Console)
```javascript
// Abra o Console do navegador (F12)
// Cole e execute:

async function testarOpenAI() {
    const response = await fetch('/api/openai-direct-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "Qual o saldo total do produto RM 123?",
            use_openai: true
        })
    });
    
    const data = await response.json();
    console.log('Resposta:', data.response);
    console.log('Metadados:', data.metadata);
    return data;
}

// Executar teste
testarOpenAI();
```

### Teste 3: Via Interface Web
1. Acesse: `/openai-dataset.html`
2. No chat, digite: "Qual o saldo do RM 123?"
3. Marque ✅ "Usar OpenAI GPT-4"
4. Clique em enviar
5. Deve retornar análise completa com 16 locais

---

## 4️⃣ Usar em Produção

### Criar arquivo HTML completo
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Chat OpenAI - Inventário</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-6">Chat com OpenAI (100% dos Dados)</h1>
        
        <!-- Área de mensagens -->
        <div id="chat" class="bg-white rounded-lg shadow p-6 h-96 overflow-y-auto mb-4">
            <div class="text-gray-500">Faça uma pergunta...</div>
        </div>
        
        <!-- Input -->
        <div class="flex gap-2">
            <input 
                type="text" 
                id="input" 
                placeholder="Ex: Qual o saldo do produto RM 123?"
                class="flex-1 p-3 border rounded-lg"
                onkeypress="if(event.key==='Enter') enviar()"
            >
            <button 
                onclick="enviar()" 
                class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
                Enviar
            </button>
        </div>
        
        <!-- Status -->
        <div id="status" class="mt-4 text-sm text-gray-600"></div>
    </div>

    <script>
        async function enviar() {
            const input = document.getElementById('input');
            const chat = document.getElementById('chat');
            const status = document.getElementById('status');
            
            const mensagem = input.value.trim();
            if (!mensagem) return;
            
            // Adicionar mensagem do usuário
            chat.innerHTML += `
                <div class="mb-4">
                    <div class="font-bold text-blue-600">Você:</div>
                    <div>${mensagem}</div>
                </div>
            `;
            
            // Limpar input
            input.value = '';
            
            // Mostrar loading
            status.innerHTML = '⏳ Analisando 28.179 registros...';
            
            try {
                // Fazer requisição para API
                const response = await fetch('/api/openai-direct-connection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: mensagem,
                        use_openai: true  // Usar OpenAI
                    })
                });
                
                // Processar resposta
                const data = await response.json();
                
                // Adicionar resposta da IA
                chat.innerHTML += `
                    <div class="mb-4">
                        <div class="font-bold text-green-600">OpenAI:</div>
                        <div class="whitespace-pre-wrap">${data.response}</div>
                        <div class="text-xs text-gray-500 mt-2">
                            Modelo: ${data.metadata.model} | 
                            Registros analisados: ${data.metadata.total_records_analyzed} |
                            Tempo: ${data.metadata.processing_time}ms
                        </div>
                    </div>
                `;
                
                // Atualizar status
                status.innerHTML = `✅ Resposta recebida (${data.metadata.total_records_analyzed} registros analisados)`;
                
            } catch (error) {
                // Mostrar erro
                chat.innerHTML += `
                    <div class="mb-4">
                        <div class="font-bold text-red-600">Erro:</div>
                        <div>${error.message}</div>
                    </div>
                `;
                status.innerHTML = '❌ Erro ao processar';
            }
            
            // Scroll para baixo
            chat.scrollTop = chat.scrollHeight;
        }
        
        // Focar no input ao carregar
        document.getElementById('input').focus();
    </script>
</body>
</html>
```

### Integração em React
```jsx
import React, { useState } from 'react';

function ChatOpenAI() {
    const [mensagem, setMensagem] = useState('');
    const [respostas, setRespostas] = useState([]);
    const [carregando, setCarregando] = useState(false);
    
    const enviarMensagem = async () => {
        if (!mensagem.trim()) return;
        
        // Adicionar mensagem do usuário
        setRespostas(prev => [...prev, {
            tipo: 'usuario',
            texto: mensagem
        }]);
        
        setCarregando(true);
        
        try {
            const response = await fetch('/api/openai-direct-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: mensagem,
                    use_openai: true
                })
            });
            
            const data = await response.json();
            
            // Adicionar resposta da IA
            setRespostas(prev => [...prev, {
                tipo: 'ia',
                texto: data.response,
                metadata: data.metadata
            }]);
            
        } catch (error) {
            setRespostas(prev => [...prev, {
                tipo: 'erro',
                texto: error.message
            }]);
        }
        
        setCarregando(false);
        setMensagem('');
    };
    
    return (
        <div className="chat-container">
            <div className="mensagens">
                {respostas.map((resp, i) => (
                    <div key={i} className={`mensagem ${resp.tipo}`}>
                        {resp.texto}
                        {resp.metadata && (
                            <small>
                                {resp.metadata.total_records_analyzed} registros analisados
                            </small>
                        )}
                    </div>
                ))}
                {carregando && <div>Analisando 28.179 registros...</div>}
            </div>
            
            <div className="input-area">
                <input
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                    placeholder="Pergunte sobre o inventário..."
                />
                <button onClick={enviarMensagem}>Enviar</button>
            </div>
        </div>
    );
}
```

---

## 5️⃣ Exemplos Práticos

### Exemplo 1: Dashboard com Estatísticas
```javascript
async function carregarDashboard() {
    // Buscar resumo geral
    const resumo = await fetch('/api/openai-direct-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "Me dê um resumo executivo do inventário com principais métricas",
            use_openai: true
        })
    }).then(r => r.json());
    
    // Buscar produtos críticos
    const criticos = await fetch('/api/openai-direct-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "Liste os 5 produtos com menor estoque",
            use_openai: true
        })
    }).then(r => r.json());
    
    // Exibir no dashboard
    document.getElementById('resumo').innerHTML = resumo.response;
    document.getElementById('criticos').innerHTML = criticos.response;
}
```

### Exemplo 2: Busca Inteligente
```javascript
async function buscarProduto(codigo) {
    const response = await fetch('/api/openai-direct-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: `Análise completa do produto ${codigo}: saldo total, todos os locais, lotes, valor financeiro`,
            use_openai: true
        })
    });
    
    const data = await response.json();
    return data.response;
}

// Usar
buscarProduto('RM 123').then(console.log);
```

### Exemplo 3: Relatório Automático
```javascript
async function gerarRelatorio() {
    const perguntas = [
        "Qual o valor total do inventário?",
        "Quantos produtos estão vencidos?",
        "Quais locais têm mais produtos?",
        "Qual a taxa de produtos com avaria?",
        "Sugestões de otimização do estoque"
    ];
    
    const relatorio = {};
    
    for (const pergunta of perguntas) {
        const resp = await fetch('/api/openai-direct-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: pergunta,
                use_openai: true
            })
        }).then(r => r.json());
        
        relatorio[pergunta] = resp.response;
    }
    
    return relatorio;
}
```

### Exemplo 4: Webhook/API Externa
```javascript
// Endpoint para sistemas externos
app.post('/webhook/inventory-query', async (req, res) => {
    const { query, format = 'json' } = req.body;
    
    const response = await fetch('https://sua-url/api/openai-direct-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: query,
            use_openai: true
        })
    });
    
    const data = await response.json();
    
    if (format === 'xml') {
        res.type('xml').send(convertToXML(data));
    } else {
        res.json(data);
    }
});
```

---

## 🔒 Segurança

### Boas Práticas
1. **NUNCA** exponha a API key no frontend
2. **SEMPRE** use variáveis de ambiente
3. **Configure** limites de uso na OpenAI
4. **Implemente** rate limiting
5. **Monitore** uso e custos

### Rate Limiting
```javascript
// Adicionar ao backend
const rateLimit = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const limit = rateLimit.get(ip);
    
    if (limit && now - limit.time < 60000) {
        if (limit.count >= 10) {
            throw new Error('Rate limit excedido');
        }
        limit.count++;
    } else {
        rateLimit.set(ip, { time: now, count: 1 });
    }
}
```

---

## 📊 Monitoramento

### Verificar uso da OpenAI
1. Acesse: https://platform.openai.com/usage
2. Veja consumo diário
3. Configure alertas de limite

### Logs no servidor
```javascript
// Adicionar logging
console.log({
    timestamp: new Date().toISOString(),
    query: message,
    tokens_used: data.usage?.total_tokens,
    cost_estimate: (data.usage?.total_tokens || 0) * 0.00003,
    response_time: Date.now() - startTime
});
```

---

## 🚨 Troubleshooting

### Erro: "Invalid API key"
```bash
# Verificar se a key está configurada
echo $OPENAI_API_KEY

# Testar diretamente
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-xxxxx"
```

### Erro: "Rate limit exceeded"
- Aguarde 1 minuto
- Verifique limites em: https://platform.openai.com/account/limits
- Considere upgrade do plano

### Erro: "Insufficient quota"
- Adicione créditos: https://platform.openai.com/account/billing
- Use GPT-3.5 em vez de GPT-4
- Implemente cache mais agressivo

---

## 💡 Dicas Finais

1. **Cache é seu amigo**: Dados são válidos por 10 minutos
2. **Use GPT-3.5 para testes**: 15x mais barato
3. **Batch queries**: Agrupe perguntas relacionadas
4. **Monitore custos**: Configure alertas de billing
5. **Documente tudo**: Mantenha log de queries úteis

---

**Desenvolvido para**: Wiser IA Assistant
**Versão**: 4.0
**Suporte**: GitHub Issues