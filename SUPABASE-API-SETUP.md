# 🚀 CONFIGURAÇÃO ALTERNATIVA - SUPABASE REST API

## ❌ Problema com PostgreSQL Direct
A conexão direta PostgreSQL está falhando. Vamos usar a **REST API do Supabase** que é mais confiável!

## ✅ SOLUÇÃO: Use a API REST do Supabase

### 📋 Passo 1: Obtenha sua ANON KEY

1. Acesse seu projeto Supabase: https://app.supabase.com
2. Vá em **Settings** (ícone de engrenagem)
3. Clique em **API**
4. Copie a **anon public key** (é uma string longa que começa com "eyJ...")

### 📋 Passo 2: Configure na Vercel

No dashboard da Vercel, adicione estas variáveis:

```bash
SUPABASE_ANON_KEY = eyJ... (sua anon key completa aqui)
USE_HTTP_API = true
```

Opcional - mantenha também:
```bash
DATABASE_URL = postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
GOOGLE_API_KEY = [sua chave do Google AI]
```

### 📋 Passo 3: Configure Permissões no Supabase

1. No Supabase, vá em **Authentication** → **Policies**
2. Na tabela `estoque`, verifique se existe uma política de leitura pública
3. Se não existir, crie uma:

```sql
-- No SQL Editor do Supabase, execute:

-- Permitir leitura pública na tabela estoque
CREATE POLICY "Allow public read access" ON public.estoque
FOR SELECT
USING (true);

-- Garantir que RLS está ativo
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
```

### 📋 Passo 4: Teste Alternativo

Se ainda houver problemas, desabilite o RLS temporariamente:

```sql
-- APENAS PARA TESTE - No SQL Editor
ALTER TABLE public.estoque DISABLE ROW LEVEL SECURITY;
```

## 🎯 Vantagens da REST API

1. **Mais confiável** - Usa HTTPS padrão
2. **Sem problemas de rede** - Funciona em qualquer lugar
3. **Sem problemas de senha** - Usa token de API
4. **Mais rápido** - Cache automático
5. **Mais seguro** - Não expõe credenciais do banco

## 📊 Como Funciona

Em vez de:
```
PostgreSQL → Direct Connection → Database
```

Agora usa:
```
HTTPS → Supabase API → PostgREST → Database
```

## 🔍 Verificação

Após configurar, teste em `/debug.html`:
- Deve mostrar "Conectado via HTTP REST API"
- Deve listar os produtos

## 💡 Alternativa: Supabase JavaScript Client

Se preferir, também podemos usar o cliente oficial:

```bash
# Na Vercel, configure:
SUPABASE_URL = https://tecvgnrqcfqcrcodrjtt.supabase.co
SUPABASE_ANON_KEY = eyJ... (sua anon key)
```

## 🆘 Se Ainda Não Funcionar

1. **Verifique a ANON KEY** - Deve ser a chave completa
2. **Verifique RLS** - Pode estar bloqueando acesso
3. **Verifique CORS** - Supabase permite seu domínio?
4. **Use Service Key** - Tem mais permissões (cuidado!)

## 📝 Exemplo de ANON KEY

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg3NjU0MzIsImV4cCI6MjAxNDM0MTQzMn0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Esta é a melhor alternativa quando a conexão PostgreSQL direta falha!**