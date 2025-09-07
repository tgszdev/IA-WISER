# 🏗️ Arquitetura Completa - Wiser IA Assistant

## 📋 Visão Geral

O **Wiser IA Assistant** é uma aplicação web de chat com IA que integra com banco de dados PostgreSQL/Supabase para fornecer respostas inteligentes baseadas em dados reais de inventário. A aplicação utiliza a arquitetura **Query Generator** para evitar timeouts e processar grandes volumes de dados eficientemente.

## 🎯 Objetivos Principais

1. **Processamento de 100% dos dados** - Sem limitações de registros
2. **Respostas em tempo real** - Query Generator evita timeouts
3. **Sessões persistentes** - Mantém contexto da conversa
4. **Debug completo** - Console avançado para monitoramento
5. **Análise de intenção** - Detecta automaticamente o que o usuário quer

## 🏛️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Chat UI   │  │ Console Debug │  │  Session Manager │  │
│  └──────┬──────┘  └───────┬──────┘  └────────┬─────────┘  │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Cloudflare Workers/Pages (Edge)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Hono Framework                     │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  Chat API  │  │ Query Gen.  │  │ Session Mgr. │  │  │
│  │  └──────┬─────┘  └──────┬──────┘  └──────┬───────┘  │  │
│  └─────────┼────────────────┼─────────────────┼─────────┘  │
│            │                │                 │             │
│  ┌─────────▼────────────────▼─────────────────▼─────────┐  │
│  │              Cloudflare KV Storage                    │  │
│  │         (Sessions, Config, Cache)                     │  │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬────────────────┬──────────────────────┘
                      │                │
        ┌─────────────▼──────┐   ┌────▼──────────┐
        │  Supabase/PostgreSQL│   │  Google AI    │
        │   (Inventory Data)  │   │ (Gemini 1.5) │
        └─────────────────────┘   └───────────────┘
```

## 🔧 Componentes Principais

### 1. **Frontend Components**

#### Chat UI (`/public/index.html`)
- Interface principal do chat
- Gerenciamento de sessão local
- Auto-scroll e indicadores visuais
- Integração com API via Axios

#### Console Debug (`/public/console-v2.html`)
- Monitor em tempo real de requisições
- Visualização de processamento
- Análise de intenções
- Export de logs

### 2. **Backend Services**

#### Query Generator (`/src/lib/query-generator.ts`)
```typescript
class QueryGenerator {
  // Análise de intenção com padrões regex
  analyzeIntent(message, sessionHistory) → Intent
  
  // Geração de plano de consulta
  generateQueryPlan(intent) → QueryPlan
  
  // Execução otimizada de queries
  executeQueryPlan(plan) → QueryResult[]
  
  // Formatação inteligente de respostas
  formatResults(intent, results) → string
}
```

**Tipos de Intenção Detectados:**
- `productInfo` - Informações gerais do produto
- `productBalance` - Saldo específico
- `productStatus` - Status de avaria/vencido
- `productExists` - Verificar existência
- `totalInventory` - Total do estoque
- `blockedItems` - Itens bloqueados
- `summary` - Resumo geral

#### Session Manager (`/src/lib/session.ts`)
```typescript
class SessionManager {
  // Gerenciamento de sessões com TTL de 24h
  getSession(sessionId) → Session
  
  // Adiciona mensagens mantendo histórico
  addMessage(sessionId, role, content, metadata)
  
  // Limita a 50 mensagens por sessão
  saveSession(session)
  
  // Estatísticas e export
  getSessionStats(sessionId)
  exportSession(sessionId)
}
```

#### Supabase Service (`/src/lib/supabase.ts`)
```typescript
class SupabaseService {
  // Conexão e teste
  testConnection() → boolean
  
  // Queries específicas
  getAllInventory() → QueryResult
  searchByProductCode(code) → QueryResult
  checkProductStatus(code, status) → QueryResult
  getInventorySummary() → QueryResult
}
```

### 3. **API Routes**

#### `/api/chat-smart` (POST)
Endpoint principal do chat com:
- Análise de intenção
- Execução de Query Plan
- Gestão de sessão
- Resposta formatada

**Request:**
```json
{
  "message": "o produto 000032 esta com avaria?",
  "sessionId": "session_123456",
  "history": []
}
```

**Response:**
```json
{
  "response": "⚠️ Produto 000032 - Status Avaria...",
  "estoqueLoaded": true,
  "totalProdutos": 15,
  "queryType": "productStatus",
  "confidence": 0.9,
  "responseTime": 145,
  "sessionStats": {...}
}
```

#### `/api/session/:sessionId` (GET)
Recupera sessão completa com histórico

#### `/api/test-connection` (GET)
Testa conexão com Supabase e retorna summary

## 🔄 Fluxo de Processamento

### 1. **Recepção da Mensagem**
```
User Input → Frontend → /api/chat-smart
```

### 2. **Análise de Intenção**
```
Message → QueryGenerator.analyzeIntent() → Intent {
  type: "productStatus",
  confidence: 0.9,
  parameters: {
    productCode: "000032",
    statusType: "Avaria"
  }
}
```

### 3. **Geração do Query Plan**
```
Intent → QueryGenerator.generateQueryPlan() → QueryPlan {
  queries: [
    {
      type: "product_status",
      description: "Verificar status Avaria do produto 000032",
      parameters: {...}
    }
  ]
}
```

### 4. **Execução das Queries**
```
QueryPlan → SupabaseService.checkProductStatus() → QueryResult {
  type: "status_check",
  data: {
    totalCount: 10,
    blockedCount: 3,
    hasBlocked: true,
    details: [...]
  }
}
```

### 5. **Formatação da Resposta**
```
QueryResult → QueryGenerator.formatResults() → 
"⚠️ Produto 000032 - Status Avaria
Situação: 3 de 10 lotes com Avaria..."
```

### 6. **Persistência da Sessão**
```
Response → SessionManager.addMessage() → KV Storage
```

## 🗄️ Estrutura de Dados

### Tabela `estoque` (Supabase)
```sql
CREATE TABLE estoque (
  id SERIAL PRIMARY KEY,
  codigo_produto VARCHAR(20),
  descricao_produto TEXT,
  saldo_disponivel_produto DECIMAL,
  saldo_bloqueado_produto VARCHAR(50), -- 'Avaria', 'Vencido', null
  lote_industria_produto VARCHAR(50),
  local_produto VARCHAR(100),
  armazem VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Session Storage (KV)
```json
{
  "id": "session_123456",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "qual o saldo do produto 000004?",
      "timestamp": "2024-01-15T10:00:00Z",
      "metadata": {
        "intent": "productBalance",
        "queryType": "product_balance",
        "confidence": 0.9
      }
    }
  ],
  "createdAt": "2024-01-15T09:00:00Z",
  "lastActivity": "2024-01-15T10:00:00Z"
}
```

## 🚀 Deployment

### Local Development
```bash
# Install dependencies
npm install

# Configure environment
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your credentials

# Build project
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs

# Access
# Chat: http://localhost:3000
# Console: http://localhost:3000/console-v2.html
```

### Production (Cloudflare Pages)
```bash
# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name wiser-ia

# Set secrets
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name wiser-ia
npx wrangler pages secret put GOOGLE_API_KEY --project-name wiser-ia
```

## 🔒 Segurança

1. **API Keys**: Armazenadas em Cloudflare Secrets, nunca no código
2. **Supabase RLS**: Row Level Security para proteção de dados
3. **Session TTL**: Sessões expiram após 24 horas
4. **CORS**: Configurado para aceitar apenas origens autorizadas
5. **Rate Limiting**: Implementado via Cloudflare

## 📊 Métricas e Monitoramento

### Console Debug Fornece:
- Total de requisições
- Taxa de sucesso/erro
- Tempo médio de resposta
- Queries executadas
- Sessões ativas
- Log detalhado de processamento

### Estatísticas de Sessão:
- Total de mensagens
- Duração da sessão
- Tempo médio de resposta
- Histórico de intenções

## 🔧 Troubleshooting

### Problema: "Host não encontrado"
**Solução**: Verificar SUPABASE_URL e SUPABASE_ANON_KEY em .dev.vars

### Problema: Timeout em queries grandes
**Solução**: Query Generator já divide em queries menores automaticamente

### Problema: Sessão não mantida
**Solução**: Verificar se KV namespace está configurado corretamente

### Problema: IA não responde
**Solução**: Verificar GOOGLE_API_KEY e quota da API

## 📈 Otimizações Implementadas

1. **Query Generator**: Evita timeouts dividindo queries complexas
2. **Cache em KV**: Reduz latência para dados frequentes
3. **Session Limiting**: Máximo 50 mensagens por sessão
4. **Índices DB**: Otimização nas colunas mais consultadas
5. **Edge Computing**: Resposta rápida via Cloudflare Workers

## 🎯 Próximos Passos

1. [ ] Implementar cache mais agressivo para queries frequentes
2. [ ] Adicionar suporte a múltiplos idiomas
3. [ ] Criar dashboard de analytics
4. [ ] Implementar export de relatórios
5. [ ] Adicionar autenticação de usuários
6. [ ] Implementar webhooks para notificações

## 👥 Quem Faz O Quê

### **Frontend (Browser)**
- Captura input do usuário
- Mantém sessionId localmente
- Exibe respostas formatadas
- Intercepta fetch() para debug

### **Cloudflare Workers**
- Roteia requisições
- Gerencia sessões em KV
- Executa lógica de negócio
- Serve arquivos estáticos

### **Query Generator**
- Analisa intenção do usuário
- Cria plano de execução
- Formata respostas

### **Supabase**
- Armazena dados de inventário
- Executa queries SQL
- Retorna resultados filtrados

### **Google AI (Gemini)**
- Melhora respostas quando confiança < 70%
- Adiciona contexto natural
- Fallback para queries complexas

### **Session Manager**
- Mantém histórico de conversa
- Limita tamanho das sessões
- Fornece contexto para IA

## 📝 Conclusão

O sistema está arquitetado para ser **escalável**, **resiliente** e **eficiente**, processando 100% dos dados sem timeouts através do Query Generator, mantendo sessões persistentes e fornecendo debug completo para troubleshooting.

---

**Versão**: 2.0.0  
**Última Atualização**: Janeiro 2025  
**Autor**: Wiser IA Team