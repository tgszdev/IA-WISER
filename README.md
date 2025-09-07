# Wiser IA Assistant

## 🎯 Visão Geral do Projeto

**Wiser IA Assistant** é uma aplicação web minimalista de chat com IA que fornece respostas inteligentes baseadas em uma base de conhecimento personalizada. A aplicação é altamente configurável, permitindo que o usuário conecte seu próprio banco de dados PostgreSQL, defina o comportamento da IA e gerencie as chaves de API sem precisar alterar o código-fonte.

### Características Principais
- 💬 **Interface de Chat Minimalista** - Design limpo e focado na experiência do usuário
- 🤖 **Integração com Google AI (Gemini)** - Respostas inteligentes usando IA avançada
- 🗄️ **Suporte a PostgreSQL** - Conecte sua própria base de conhecimento
- ⚙️ **Configuração via Interface** - Configure tudo pela interface web, sem editar código
- 🔒 **Autenticação Segura** - Proteção por senha para área administrativa
- 💾 **Histórico de Conversas** - Mantém contexto das conversas por 24 horas
- 🌐 **Deploy em Cloudflare Pages** - Hospedagem gratuita e escalável

## 🔗 URLs de Acesso

- **Desenvolvimento Local**: https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev
- **Página de Configurações**: https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev/config
- **Produção (após deploy)**: https://wiser-ia-assistant.pages.dev

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológico
- **Backend**: Hono Framework (Edge-first, ultra-leve)
- **Frontend**: HTML5, TailwindCSS, JavaScript Vanilla
- **IA**: Google Generative AI (Gemini Pro)
- **Banco de Dados**: PostgreSQL (via REST API - Neon, Supabase)
- **Armazenamento**: Cloudflare KV (configurações e histórico)
- **Deploy**: Cloudflare Pages/Workers

### Estrutura de Dados

#### Tabela PostgreSQL Recomendada
```sql
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_content ON knowledge_base USING gin(to_tsvector('portuguese', content));
CREATE INDEX idx_knowledge_title ON knowledge_base USING gin(to_tsvector('portuguese', title));
```

#### Dados Armazenados no KV
- `google_api_key` - Chave da API do Google AI
- `db_url` - URL de conexão do PostgreSQL
- `system_prompt` - Prompt de comportamento da IA
- `admin_password` - Senha de administrador (hash)
- `session_[id]` - Histórico de conversas (TTL: 24h)

## 📋 Funcionalidades Implementadas

### ✅ Completadas
- [x] Interface de chat responsiva e minimalista
- [x] Integração com Google AI (Gemini Pro)
- [x] Página de configurações protegida por senha
- [x] Conexão com PostgreSQL via REST API
- [x] Busca inteligente no banco de dados
- [x] Histórico de conversas com contexto
- [x] Sistema de configuração via interface web
- [x] Indicador de digitação animado
- [x] Teste de conexão com banco de dados
- [x] Verificação de status das configurações
- [x] Mensagens de erro detalhadas

### 🚀 Funcionalidades Futuras (Roadmap)
- [ ] Busca vetorial com pgvector para melhor precisão
- [ ] Streaming de respostas em tempo real
- [ ] Múltiplos prompts/personalidades salvos
- [ ] Interface para gerenciar dados da knowledge_base
- [ ] Exportação de histórico de conversas
- [ ] Suporte a múltiplos idiomas
- [ ] Integração com outros modelos de IA
- [ ] Sistema de tags e categorias
- [ ] Analytics de uso e métricas
- [ ] Modo escuro

## 🚀 Como Usar

### 1. Configuração Inicial

1. Acesse a página de configurações: `/config`
2. Configure os seguintes campos:
   - **Senha de Administrador**: Defina uma senha forte (será usada em configurações futuras)
   - **Chave API do Google**: Obtenha em [aistudio.google.com](https://aistudio.google.com)
   - **URL do PostgreSQL**: Use serviços compatíveis como Neon ou Supabase
   - **Prompt de Comportamento**: Defina a personalidade e contexto da IA

### 2. Preparação do Banco de Dados

Para melhor funcionamento, crie uma tabela `knowledge_base` em seu PostgreSQL:

```sql
-- Estrutura básica
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados de exemplo
INSERT INTO knowledge_base (title, content) VALUES
('Sobre a Empresa', 'Nossa empresa foi fundada em 2020...'),
('Produtos', 'Oferecemos três planos: Básico, Pro e Enterprise...'),
('Suporte', 'Atendimento disponível de segunda a sexta...');
```

### 3. Usando o Chat

1. Acesse a página principal `/`
2. Digite sua pergunta no campo de entrada
3. A IA responderá usando:
   - O contexto do banco de dados
   - O histórico da conversa
   - O prompt de comportamento configurado

## 🛠️ Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Cloudflare (para deploy)

### Instalação

```bash
# Clone o repositório
git clone <seu-repo>
cd webapp

# Instale as dependências
npm install

# Configure as variáveis de ambiente (opcional)
cp .dev.vars.example .dev.vars
# Edite .dev.vars com suas credenciais

# Build do projeto
npm run build

# Inicie o servidor de desenvolvimento
npm run dev:sandbox
```

### Scripts Disponíveis

```bash
npm run dev           # Desenvolvimento com Vite
npm run build         # Build para produção
npm run preview       # Preview local do build
npm run deploy        # Deploy para Cloudflare Pages
npm run kv:create     # Criar KV namespace no Cloudflare
npm run test          # Testar servidor local
```

## 📦 Deploy para Produção

### 1. Criar KV Namespace no Cloudflare

```bash
# Login no Cloudflare
npx wrangler login

# Criar KV namespace
npx wrangler kv:namespace create wiser_config
npx wrangler kv:namespace create wiser_config --preview
```

### 2. Atualizar wrangler.jsonc

Substitua os IDs do KV namespace no arquivo `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "SEU_KV_ID_AQUI",
      "preview_id": "SEU_PREVIEW_ID_AQUI"
    }
  ]
}
```

### 3. Deploy

```bash
# Build e deploy
npm run deploy

# Ou manualmente
npm run build
npx wrangler pages deploy dist --project-name wiser-ia-assistant
```

### 4. Configurar Variáveis no Cloudflare Dashboard

Após o deploy, configure as variáveis de ambiente no Cloudflare Dashboard:
1. Acesse o projeto no Cloudflare Pages
2. Vá em Settings > Environment Variables
3. Configure as variáveis necessárias

## 🔧 Serviços de Banco de Dados Compatíveis

### Neon (Recomendado)
- Crie uma conta em [neon.tech](https://neon.tech)
- Crie um banco PostgreSQL
- Use a connection string fornecida

### Supabase
- Crie um projeto em [supabase.com](https://supabase.com)
- Use a connection string do PostgreSQL

### Outros Serviços
Qualquer PostgreSQL com API REST é compatível. A aplicação detecta automaticamente o tipo de serviço pela URL.

## 🔒 Segurança

- **Senhas e API Keys**: Armazenadas de forma segura no Cloudflare KV
- **Autenticação Admin**: Proteção por senha para configurações
- **HTTPS**: Todas as comunicações são criptografadas
- **Sem dados sensíveis no código**: Todas as configurações via interface

## 📝 Notas de Implementação

### Limitações do Cloudflare Workers
- Não suporta bibliotecas Node.js nativas (como `pg`)
- Conexões com banco devem ser via HTTP/REST API
- Limite de 10MB para o bundle do Worker
- Timeout máximo de 30 segundos por requisição

### Soluções Implementadas
- Uso de REST APIs para PostgreSQL ao invés de drivers nativos
- Implementação customizada de cliente de banco de dados
- Cache de conversas no KV com TTL de 24 horas
- Bundle otimizado com apenas dependências essenciais

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT.

## 👥 Público-Alvo

- **Pequenas e médias empresas** que precisam de um assistente de IA personalizado
- **Desenvolvedores** que buscam uma solução self-hosted e configurável
- **Equipes de suporte** que precisam de respostas baseadas em documentação
- **Startups** que querem um chatbot inteligente sem complexidade

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Consulte a documentação
- Verifique as configurações na página `/config`

---

**Desenvolvido com ❤️ usando Hono Framework e Cloudflare Pages**

*Última atualização: Setembro 2025*