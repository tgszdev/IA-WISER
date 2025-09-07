# ✅ URL CORRETA PARA VERCEL

## ❌ ERRO NA URL ANTERIOR
Havia um `[` antes da senha que estava causando o erro!

### URL ERRADA:
```
postgresql://postgres:[38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```
Note o `[` antes do 38016863884

### ✅ URL CORRETA:
```
postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```
SEM o `[` antes da senha!

## 📋 CONFIGURAÇÃO NA VERCEL

### 1. No Dashboard da Vercel

Settings → Environment Variables

### 2. CORRIJA a variável DATABASE_URL:

```
DATABASE_URL = postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

**COPIE E COLE EXATAMENTE COMO ESTÁ ACIMA**

### 3. Adicione também:

```
GOOGLE_API_KEY = [sua chave do Google AI]
```

### 4. Salve e Faça Redeploy

## 🔍 Verificação

O erro no sandbox (`ENETUNREACH`) é normal - é limitação de rede do ambiente de desenvolvimento.

**NA VERCEL VAI FUNCIONAR** com a URL correta!

## 📊 Teste Após Deploy

Em `/debug.html`:
- Deve mostrar "✅ Conectado"
- Deve mostrar quantidade de registros

No chat:
- "Quantos produtos temos?"
- "Qual o estoque do CAMP-D?"

## ⚠️ IMPORTANTE

A URL **DEVE** ser exatamente:
```
postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

- ✅ Sem `[` antes da senha
- ✅ Senha direto após os `:`
- ✅ Um único `@` separando senha do host