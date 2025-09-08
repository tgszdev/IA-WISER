# Wiser IA Assistant - Sistema de Consulta em Tempo Real

## Visão Geral do Projeto
- **Nome**: Wiser IA Assistant v3.0
- **Objetivo**: Sistema inteligente de consulta de inventário com acesso em tempo real ao banco de dados
- **Características Principais**:
  - ✅ Consultas em tempo real ao Supabase (28.179 registros)
  - ✅ Análise inteligente de intenções (8 tipos de consultas)
  - ✅ Respostas completas mostrando TODOS os locais de produtos
  - ✅ Interface web otimizada e responsiva
  - ✅ Suporte para integração com OpenAI GPT-4 (opcional)
  - ✅ Zero cache - dados sempre atualizados

## URLs de Acesso
- **Produção**: https://wiser-ia-assistant.pages.dev (após deploy)
- **Desenvolvimento**: https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev
- **GitHub**: https://github.com/username/wiser-ia-assistant

## Interfaces Disponíveis
- `/chat-realtime.html` - Interface principal com consultas em tempo real
- `/chat-complete.html` - Interface com cache de 5 minutos (100% dos dados)
- `/chat-openai-simple.html` - Interface simplificada
- `/console-v2.html` - Console de debug avançado
- `/console.html` - Console de debug simples

## APIs Disponíveis

### 1. **API Enhanced (Recomendada)**
- **Endpoint**: `/api/openai-enhanced`
- **Método**: POST
- **Descrição**: Consultas inteligentes com análise de intenção
- **Intents suportados**:
  - `location_query` - Busca por local (9 dígitos)
  - `product_query` - Busca por produto (RM XXX)
  - `product_locations` - Todos os locais de um produto
  - `expired_query` - Produtos vencidos
  - `damaged_query` - Produtos com avaria
  - `blocked_query` - Produtos bloqueados
  - `warehouse_query` - Busca por armazém
  - `lot_query` - Busca por lote
  - `summary_query` - Resumo geral

### 2. **API Realtime (Básica)**
- **Endpoint**: `/api/openai-realtime`
- **Método**: POST
- **Descrição**: Consultas diretas ao banco sem análise avançada

### 3. **API Complete (Com Cache)**
- **Endpoint**: `/api/chat-complete`
- **Método**: POST
- **Descrição**: Carrega 100% dos dados em cache (5 minutos)

### 4. **Status Endpoints**
- `/api/openai-enhanced/status` - Status detalhado do sistema
- `/api/openai-realtime/status` - Status básico
- `/api/openai-enhanced/analyze` - Análise de mensagem (debug)

## Arquitetura de Dados

### Modelo de Dados Principal
```typescript
interface InventoryItem {
  codigo_produto: string;        // Código do produto (ex: "RM 139")
  descricao_produto: string;      // Descrição completa
  local_produto: string;          // Local de 9 dígitos
  saldo_disponivel_produto: number; // Quantidade disponível
  saldo_bloqueado_produto?: string; // Status (Vencido, Avaria, etc)
  lote_industria_produto?: string;  // Número do lote
  unidade_medida?: string;         // Unidade (UN, KG, etc)
  armazem_produto?: string;        // Código do armazém
  validade_produto?: string;       // Data de validade
}
```

### Banco de Dados
- **Plataforma**: Supabase (PostgreSQL)
- **Tabela**: `estoque`
- **Total de Registros**: 28.179
- **Produtos Únicos**: ~5.000
- **Locais Únicos**: ~15.000
- **Status**:
  - Produtos OK: 19.226
  - Produtos Vencidos: 3.996
  - Produtos com Avaria: 4.957

## Funcionalidades Implementadas ✅
1. **Consulta por Produto**: Retorna TODOS os locais onde o produto está armazenado
2. **Consulta por Local**: Lista todos os produtos em um local específico
3. **Produtos Vencidos**: Relatório completo de produtos vencidos
4. **Produtos com Avaria**: Análise de produtos danificados
5. **Resumo do Inventário**: Estatísticas gerais do sistema
6. **Análise Inteligente**: Detecção automática de intenção na mensagem
7. **Formatação Rica**: Respostas com markdown, emojis e estrutura visual
8. **Consultas Rápidas**: Botões para consultas frequentes
9. **Estatísticas em Tempo Real**: Contador de consultas e tempo médio

## Funcionalidades Pendentes 🔄
1. **Integração OpenAI GPT-4**: Adicionar API key para respostas ainda mais inteligentes
2. **Exportação de Relatórios**: Gerar PDF/Excel dos resultados
3. **Histórico de Consultas**: Salvar e recuperar consultas anteriores
4. **Dashboard Analítico**: Visualizações gráficas dos dados
5. **Alertas Automáticos**: Notificações para produtos vencidos/avaria

## Guia de Uso

### Para Usuários
1. Acesse a interface web em `/chat-realtime.html`
2. Digite sua pergunta na caixa de texto ou use os botões de consulta rápida
3. Exemplos de perguntas:
   - "Mostre todos os locais do produto RM 139"
   - "Quais produtos estão no local 034083501?"
   - "Liste produtos vencidos"
   - "Produtos com avaria"
   - "Resumo do inventário"
4. Aguarde a resposta em tempo real
5. Use o botão "Status" para verificar conexão

### Para Desenvolvedores

#### Instalação Local
```bash
# Clone o repositório
git clone https://github.com/username/wiser-ia-assistant.git
cd wiser-ia-assistant

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .dev.vars.example .dev.vars
# Edite .dev.vars com suas credenciais

# Build do projeto
npm run build

# Inicie localmente
npm run dev:sandbox
```

#### Configuração de API Keys
```bash
# Para desenvolvimento (arquivo .dev.vars)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key # Opcional

# Para produção (Cloudflare)
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put OPENAI_API_KEY # Opcional
```

## Deployment

### Deploy para Cloudflare Pages
```bash
# Build do projeto
npm run build

# Deploy para produção
npx wrangler pages deploy dist --project-name wiser-ia-assistant

# Ou use o script npm
npm run deploy:prod
```

### Configuração de Produção
- **Plataforma**: Cloudflare Pages
- **Framework**: Hono + TypeScript
- **Runtime**: Cloudflare Workers
- **Build Output**: `/dist`
- **Node Version**: 18+

## Stack Tecnológico
- **Backend**: Hono Framework (Cloudflare Workers)
- **Frontend**: HTML5 + TailwindCSS + Vanilla JS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 (opcional)
- **Deploy**: Cloudflare Pages
- **Language**: TypeScript
- **Build**: Vite

## Scripts NPM Disponíveis
```json
{
  "dev": "vite",
  "dev:sandbox": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
  "build": "vite build",
  "preview": "wrangler pages dev dist",
  "deploy": "npm run build && wrangler pages deploy dist",
  "deploy:prod": "npm run build && wrangler pages deploy dist --project-name wiser-ia-assistant",
  "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
  "test": "curl http://localhost:3000/api/openai-enhanced/status"
}
```

## Melhorias Recentes
- ✅ Sistema de consulta em tempo real sem cache
- ✅ Detecção inteligente de intenções (8 tipos)
- ✅ Formatação rica das respostas com markdown
- ✅ Interface responsiva com Tailwind CSS
- ✅ Botões de consulta rápida
- ✅ Estatísticas em tempo real
- ✅ Suporte para integração com GPT-4
- ✅ Análise completa mostrando TODOS os locais dos produtos

## Próximos Passos Recomendados
1. **Adicionar OpenAI API Key** para respostas ainda mais inteligentes
2. **Implementar cache Redis** para melhor performance em produção
3. **Criar dashboard analítico** com gráficos e visualizações
4. **Adicionar autenticação** para controle de acesso
5. **Implementar exportação** de relatórios em PDF/Excel
6. **Criar API REST completa** para integração com outros sistemas
7. **Adicionar testes automatizados** para garantir qualidade
8. **Implementar CI/CD** com GitHub Actions

## Status do Projeto
- **Versão**: 3.0.0
- **Status**: ✅ Ativo e Funcional
- **Última Atualização**: Janeiro 2025
- **Ambiente**: Desenvolvimento
- **URL Pública**: https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev

## Suporte e Contato
Para dúvidas ou sugestões sobre o sistema, entre em contato através do GitHub Issues.

---
*Sistema desenvolvido para consulta inteligente de inventário com acesso em tempo real a 28.179 registros.*