# 🚀 Guia de Deploy - Wiser IA Assistant

Este guia detalha o processo completo de deploy do Wiser IA Assistant para o Cloudflare Pages.

## 📋 Pré-requisitos

1. **Conta no Cloudflare** - [Criar conta gratuita](https://dash.cloudflare.com/sign-up)
2. **Conta no Google AI Studio** - [Obter API Key](https://aistudio.google.com)
3. **Banco PostgreSQL** (opcional) - Recomendamos [Neon](https://neon.tech) ou [Supabase](https://supabase.com)

## 🔧 Passo 1: Preparação Local

### Clone o repositório
```bash
git clone https://github.com/tgszdev/IA-WISER.git
cd IA-WISER
```

### Instale as dependências
```bash
npm install
```

### Configure o Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

## 📦 Passo 2: Criar KV Namespace no Cloudflare

O KV é necessário para armazenar configurações e histórico de conversas.

```bash
# Criar namespace de produção
npx wrangler kv:namespace create wiser_config

# Criar namespace de preview (desenvolvimento)
npx wrangler kv:namespace create wiser_config --preview
```

Você receberá uma saída similar a:
```
🌀 Creating namespace with title "webapp-wiser_config"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "KV", id = "abcd1234..." }
```

### Atualize o wrangler.jsonc

Edite o arquivo `wrangler.jsonc` e substitua os IDs:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "SEU_ID_AQUI",        // ID do namespace de produção
      "preview_id": "SEU_PREVIEW_ID_AQUI"  // ID do namespace de preview
    }
  ]
}
```

## 🌐 Passo 3: Deploy via Cloudflare Dashboard (Recomendado)

### Opção A: Deploy Automático com GitHub

1. Acesse [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Clique em **"Create a project"**
3. Escolha **"Connect to Git"**
4. Autorize o Cloudflare a acessar seu GitHub
5. Selecione o repositório **IA-WISER**
6. Configure as build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (deixe vazio)
7. Clique em **"Save and Deploy"**

### Opção B: Deploy Manual via CLI

```bash
# Build do projeto
npm run build

# Deploy para Cloudflare Pages
npx wrangler pages project create wiser-ia-assistant
npx wrangler pages deploy dist --project-name wiser-ia-assistant
```

## ⚙️ Passo 4: Configurar KV Bindings no Cloudflare Pages

1. No dashboard do Cloudflare, acesse seu projeto
2. Vá em **Settings** → **Functions** → **KV namespace bindings**
3. Clique em **"Add binding"**
4. Configure:
   - **Variable name**: `KV`
   - **KV namespace**: Selecione `wiser_config` (criado anteriormente)
5. Salve as configurações

## 🔑 Passo 5: Configuração Inicial da Aplicação

### Acesse sua aplicação

Após o deploy, você receberá uma URL como:
```
https://wiser-ia-assistant.pages.dev
```

### Configure a aplicação

1. Acesse: `https://seu-projeto.pages.dev/config`
2. Configure os seguintes campos:

#### Senha de Administrador
- Na primeira vez, defina uma senha forte
- Esta senha será usada para futuras configurações

#### Chave API do Google AI
1. Acesse [Google AI Studio](https://aistudio.google.com)
2. Clique em **"Get API Key"**
3. Crie uma nova API key
4. Copie e cole na configuração

#### URL do PostgreSQL (Opcional)

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
Você é um assistente especializado em atendimento ao cliente da empresa XYZ.
Seja sempre cordial e profissional.
Use os dados fornecidos do banco de conhecimento para responder.
Se não souber a resposta, seja honesto e sugira contatar o suporte.
```

## 🗄️ Passo 6: Preparar Banco de Dados (Opcional)

Se você configurou um PostgreSQL, crie a estrutura:

```sql
-- Conecte ao seu banco e execute:
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicione índices para melhor performance
CREATE INDEX idx_knowledge_content ON knowledge_base 
USING gin(to_tsvector('portuguese', content));

CREATE INDEX idx_knowledge_title ON knowledge_base 
USING gin(to_tsvector('portuguese', title));

-- Insira dados de exemplo
INSERT INTO knowledge_base (title, content, category) VALUES
('Horário de Atendimento', 'Nosso atendimento funciona de segunda a sexta, das 9h às 18h.', 'suporte'),
('Planos Disponíveis', 'Oferecemos três planos: Básico (R$ 29/mês), Pro (R$ 79/mês) e Enterprise (personalizado).', 'vendas'),
('Política de Reembolso', 'Garantimos reembolso total em até 30 dias após a compra.', 'financeiro');
```

## 🔄 Passo 7: Atualizações Futuras

### Via GitHub (Automático)
Se configurou com GitHub, apenas faça push para main:
```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```
O Cloudflare fará o deploy automaticamente.

### Via CLI (Manual)
```bash
npm run build
npx wrangler pages deploy dist --project-name wiser-ia-assistant
```

## 🧪 Testando a Aplicação

1. **Teste o Chat**: Acesse a URL principal e faça perguntas
2. **Verifique Configurações**: Use o botão "Verificar Status" em `/config`
3. **Teste Conexão DB**: Use o botão "Testar Conexão" se configurou PostgreSQL

## 🛠️ Solução de Problemas

### Erro: "API do Google não configurada"
- Verifique se salvou a API key corretamente em `/config`
- Confirme que a API key está ativa no Google AI Studio

### Erro: "KV namespace not found"
- Verifique se criou o KV namespace
- Confirme que adicionou o binding no Cloudflare Pages

### Erro de Conexão com Banco
- Verifique se a URL está correta
- Para Neon/Supabase, confirme que o banco está ativo
- Teste a conexão usando o botão na página de configurações

## 📊 Monitoramento

No dashboard do Cloudflare Pages, você pode:
- Ver analytics de uso
- Monitorar erros
- Verificar logs de função
- Acompanhar performance

## 🔒 Segurança

- **Nunca commite** arquivos `.dev.vars` ou `.env`
- **Use sempre HTTPS** para acessar a aplicação
- **Mantenha a senha de admin** segura
- **Rotacione API keys** periodicamente

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/tgszdev/IA-WISER/issues)
- **Documentação**: Ver [README.md](README.md)

## 🎉 Pronto!

Sua aplicação Wiser IA Assistant está no ar! 

URL de produção: `https://seu-projeto.pages.dev`

---

**Dica**: Salve este guia para referência futura. Cada deploy segue estes mesmos passos.