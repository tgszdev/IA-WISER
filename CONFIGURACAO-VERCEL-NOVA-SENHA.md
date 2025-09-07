# ✅ CONFIGURAÇÃO VERCEL - NOVA SENHA

## 🎯 Sua Nova Configuração

### Dados Atualizados:
```
Host: db.tecvgnrqcfqcrcodrjtt.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: 38016863884 (SEM caracteres especiais!)
```

## 📋 INSTRUÇÕES PARA VERCEL

### 1. Acesse o Dashboard da Vercel

### 2. Vá em Settings → Environment Variables

### 3. ATUALIZE ou ADICIONE estas variáveis:

```bash
DATABASE_URL = postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

**NOTA**: Agora é simples! Sem %40%40, sem codificação, apenas números!

### 4. Adicione também (se ainda não tiver):

```bash
GOOGLE_API_KEY = [sua chave do Google AI]
SYSTEM_PROMPT = Você é um analista de estoque especializado em WMS.
```

### 5. Clique em SAVE

### 6. IMPORTANTE: Faça REDEPLOY
- Vá em Deployments
- Clique nos 3 pontos do último deploy
- Selecione "Redeploy"

## 🔍 Verificação Após Deploy

### 1. Teste de Conexão
Acesse: `https://seu-app.vercel.app/debug.html`
- Clique em "Testar Conexão"
- Deve mostrar: ✅ Conectado

### 2. Teste no Chat
Acesse: `https://seu-app.vercel.app/`

Pergunte:
- "Quantos produtos temos em estoque?"
- "Qual o estoque do produto CAMP-D?"
- "Liste os produtos do armazém BARUERI"

## ✨ Vantagens da Nova Senha

1. **Sem caracteres especiais** - não precisa codificar
2. **Mais simples** - apenas números
3. **Menos erros** - não há confusão com @ ou %40
4. **Funciona direto** - cole e use

## 🚀 URL Completa para Copiar

```
postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

## 🔄 Se Precisar do Connection Pooler

Use porta 6543 em vez de 5432:
```
postgresql://postgres:38016863884@db.tecvgnrqcfqcrcodrjtt.supabase.co:6543/postgres
```

## ✅ Status

- Senha atualizada no código ✅
- Sistema configurado ✅
- Pronto para deploy ✅

**Agora é só configurar na Vercel e funcionará!**