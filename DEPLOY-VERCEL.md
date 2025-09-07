# 🚀 Guia de Deploy para Vercel - Wiser IA Assistant

Este guia detalha o processo completo de deploy do Wiser IA Assistant para a Vercel.

## 📋 Pré-requisitos

1. **Conta na Vercel** - [Criar conta gratuita](https://vercel.com/signup)
2. **Conta no Google AI Studio** - [Obter API Key](https://aistudio.google.com)
3. **Banco PostgreSQL** (opcional) - Use [Vercel Postgres](https://vercel.com/storage/postgres), [Neon](https://neon.tech) ou [Supabase](https://supabase.com)

## 🔧 Passo 1: Deploy Automático (Recomendado)

### Deploy com um clique

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tgszdev/IA-WISER)

Ou siga os passos manuais:

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **"Add New Project"**
3. Importe o repositório do GitHub: `tgszdev/IA-WISER`
4. Clique em **"Deploy"**

## 📦 Passo 2: Configurar Vercel KV Storage

O Vercel KV é necessário para armazenar configurações e histórico de conversas.

### No Dashboard da Vercel:

1. Acesse seu projeto
2. Vá em **"Storage"** no menu lateral
3. Clique em **"Create Database"**
4. Escolha **"KV"**
5. Dê um nome (ex: `wiser-kv`)
6. Selecione a região mais próxima
7. Clique em **"Create"**

### Conectar KV ao projeto:

1. Após criar o KV, clique em **"Connect Project"**
2. Selecione seu projeto
3. As variáveis de ambiente serão adicionadas automaticamente:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

## 🗄️ Passo 3: (Opcional) Configurar Vercel Postgres

Se você quiser usar Vercel Postgres como banco de dados:

### Criar banco Vercel Postgres:

1. No Dashboard, vá em **"Storage"**
2. Clique em **"Create Database"**
3. Escolha **"Postgres"**
4. Configure:
   - Nome: `wiser-db`
   - Região: Escolha a mais próxima
5. Clique em **"Create"**

### Criar tabela knowledge_base:

1. Vá em **"Data"** no banco criado
2. Clique em **"Query"**
3. Execute o seguinte SQL:

```sql
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX idx_knowledge_title ON knowledge_base(title);
CREATE INDEX idx_knowledge_category ON knowledge_base(category);

-- Inserir dados de exemplo
INSERT INTO knowledge_base (title, content, category) VALUES
('Sobre a Empresa', 'Nossa empresa foi fundada em 2020 com o objetivo de democratizar o acesso à inteligência artificial.', 'sobre'),
('Planos e Preços', 'Oferecemos três planos: Básico (R$ 29/mês), Pro (R$ 79/mês) e Enterprise (personalizado).', 'vendas'),
('Horário de Atendimento', 'Nosso suporte funciona de segunda a sexta, das 9h às 18h.', 'suporte'),
('Política de Reembolso', 'Garantimos reembolso total em até 30 dias após a compra.', 'financeiro');
```

## ⚙️ Passo 4: Configuração Inicial da Aplicação

### Acesse sua aplicação

Após o deploy, você terá uma URL como:
```
https://wiser-ia-assistant.vercel.app
```

### Configure a aplicação

1. Acesse: `https://seu-projeto.vercel.app/config.html`
2. Configure os seguintes campos:

#### Senha de Administrador
- Na primeira vez, defina uma senha forte
- Exemplo: `SuaSenhaForte@123`

#### Chave API do Google AI
1. Acesse [Google AI Studio](https://aistudio.google.com)
2. Clique em **"Get API Key"**
3. Crie uma nova API key
4. Copie e cole na configuração

#### URL do PostgreSQL (Opcional)

**Para Vercel Postgres:**
- A URL já estará disponível nas variáveis de ambiente
- Copie de: Settings → Environment Variables → POSTGRES_URL

**Para Neon:**
```
postgresql://user:password@ep-xxx.region.neon.tech/database
```

**Para Supabase:**
```
postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

#### Prompt de Comportamento
Exemplo:
```
Você é um assistente especializado em atendimento ao cliente.
Seja sempre cordial, profissional e objetivo.
Use os dados fornecidos do banco de conhecimento para responder.
Se não souber a resposta, seja honesto e sugira contatar o suporte.
Nunca invente informações.
```

## 🔄 Passo 5: Atualizações Futuras

### Deploy Automático
Qualquer push para o branch `main` no GitHub fará deploy automático.

### Deploy Manual
```bash
# Clone o repositório
git clone https://github.com/tgszdev/IA-WISER.git
cd IA-WISER

# Instale a Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

## 🧪 Testando a Aplicação

1. **Teste o Chat**: 
   - Acesse a URL principal
   - Digite uma pergunta
   - Verifique se recebe resposta

2. **Verifique Configurações**: 
   - Use o botão "Verificar Status" em `/config.html`
   - Confirme que todas as configurações estão corretas

3. **Teste Conexão DB** (se configurado):
   - Use o botão "Testar Conexão"
   - Verifique se conecta com sucesso

## 🛠️ Solução de Problemas

### Erro: "API do Google não configurada"
- Verifique se salvou a API key em `/config.html`
- Confirme que a API key está ativa no Google AI Studio
- Tente gerar uma nova API key

### Erro: "Cannot read properties of undefined"
- Verifique se o Vercel KV está conectado
- Confirme que as variáveis KV_* estão configuradas
- Faça redeploy após conectar o KV

### Erro de CORS
- As APIs já incluem headers CORS
- Se persistir, verifique o domínio de origem

### Erro 500 nas APIs
- Verifique os logs em: Vercel Dashboard → Functions → Logs
- Confirme que todas as variáveis de ambiente estão configuradas

## 📊 Monitoramento

No Dashboard da Vercel, você pode:
- Ver analytics em tempo real
- Monitorar uso de funções
- Verificar logs de erro
- Acompanhar performance
- Ver uso do KV Storage

## 🔒 Variáveis de Ambiente

Essas variáveis são configuradas automaticamente ao conectar os serviços:

### Vercel KV (obrigatório)
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### Vercel Postgres (opcional)
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## 💰 Limites do Plano Gratuito

### Vercel
- 100GB de bandwidth/mês
- Unlimited deployments
- Serverless Functions: 100GB-hours

### Vercel KV
- 256MB de storage
- 30k requests/mês
- 3k requests/dia

### Vercel Postgres
- 256MB de storage
- 60 horas de compute/mês

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/tgszdev/IA-WISER/issues)
- **Documentação Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Status Vercel**: [status.vercel.com](https://status.vercel.com)

## 🎉 Pronto!

Sua aplicação está no ar! 

- **URL Principal**: `https://seu-projeto.vercel.app`
- **Configurações**: `https://seu-projeto.vercel.app/config.html`

---

**Dica**: Após configurar, teste enviando uma mensagem no chat. Se tudo estiver correto, você receberá uma resposta da IA!