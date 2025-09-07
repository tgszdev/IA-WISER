# 🔑 Como Obter as Credenciais Corretas do Supabase

## Passo a Passo para Pegar as Credenciais

### 1. Acesse o Painel do Supabase
1. Vá para: https://supabase.com/dashboard
2. Faça login com sua conta
3. Selecione seu projeto: `tecvgnrqcfqcrcodrjtt`

### 2. Obtenha a URL e Anon Key
1. No menu lateral, clique em **Settings** (Configurações)
2. Clique em **API**
3. Você verá duas seções importantes:

#### Project URL
```
https://tecvgnrqcfqcrcodrjtt.supabase.co
```

#### Project API Keys
- **anon public**: Esta é a chave que precisamos (começa com `eyJ...`)
- **service_role**: NÃO use esta em aplicações client-side

### 3. Configure no Vercel

No painel do Vercel, adicione estas variáveis de ambiente:

```bash
SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co
SUPABASE_ANON_KEY=[copie a chave anon aqui]
DATABASE_URL=postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

### 4. Teste de Conexão Rápido

Depois de obter a anon key correta, você pode testar assim:

```bash
curl -X GET "https://tecvgnrqcfqcrcodrjtt.supabase.co/rest/v1/estoque?limit=1" \
  -H "apikey: SUA_ANON_KEY_AQUI" \
  -H "Authorization: Bearer SUA_ANON_KEY_AQUI"
```

## 📊 Estrutura da Tabela `estoque`

Com base no que vimos, sua tabela deve ter campos como:
- id
- nome/produto
- quantidade
- preco
- categoria
- etc.

## 🚨 Importante

- **NUNCA** exponha a `service_role` key em código frontend
- A `anon` key pode ser usada no frontend pois tem permissões limitadas
- Configure RLS (Row Level Security) no Supabase para proteger seus dados

## 📝 Após Obter as Credenciais

Me envie:
1. A **anon key** correta do seu projeto
2. Confirme se a URL está correta: `https://tecvgnrqcfqcrcodrjtt.supabase.co`
3. Se você tem RLS habilitado ou desabilitado na tabela `estoque`

Com essas informações, posso atualizar o código para funcionar corretamente!