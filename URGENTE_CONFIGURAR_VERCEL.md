# 🚨 URGENTE: CONFIGURAR VARIÁVEIS NO VERCEL

## ⚠️ PROBLEMA IDENTIFICADO
O sistema está retornando respostas genéricas porque as variáveis de ambiente NÃO estão configuradas no Vercel.

## ✅ SOLUÇÃO: Adicionar Variáveis de Ambiente no Vercel

### 1. Acesse o Painel do Vercel
https://vercel.com/dashboard

### 2. Selecione o projeto "ia-wiser"

### 3. Vá em Settings → Environment Variables

### 4. Adicione ESTAS variáveis EXATAMENTE assim:

```env
SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A

OPENAI_API_KEY=[SUA_CHAVE_OPENAI_AQUI]
```

### 5. Clique em "Save"

### 6. IMPORTANTE: Faça Redeploy
- Vá na aba "Deployments"
- Clique nos 3 pontinhos do último deploy
- Selecione "Redeploy"
- Aguarde concluir

---

## 🧪 TESTE APÓS CONFIGURAR

### Teste 1: Produto Específico
```
"qual o saldo do produto 000004"
```
**Resposta esperada:** Deve mostrar dados REAIS do banco (850 unidades, 2 localizações)

### Teste 2: Resumo do Inventário  
```
"qual o saldo total do meu estoque"
```
**Resposta esperada:** Deve mostrar total REAL de 28.179 produtos

---

## ❌ SE NÃO FUNCIONAR

### Verifique no Console de Debug:
1. Acesse https://ia-wiser.vercel.app/debug.html
2. Clique em "Testar Conexão Supabase"
3. Veja se aparece "Erro" ou "Conectado"

### Se aparecer "Method not allowed":
- As variáveis NÃO foram configuradas
- Volte ao passo 3 e adicione as variáveis

### Se aparecer "Invalid API key":
- A chave do Supabase está errada
- Use EXATAMENTE a chave fornecida acima

---

## ✅ MUDANÇAS REALIZADAS NO CÓDIGO

1. **REMOVIDO TODO MOCK DATA** - Não existe mais dados falsos
2. **Implementado getSupabaseData()** - Busca dados reais sempre
3. **OpenAI recebe dados do banco** - IA analisa dados reais
4. **Todas respostas são baseadas em dados reais**

---

## 📊 COMO FUNCIONA AGORA

```javascript
// ANTES (ERRADO - usando mock):
const mockInventory = [
  { codigo: '000004', saldo: 850 } // DADOS FALSOS
];

// AGORA (CORRETO - dados reais):
const produtos = await supabase
  .from('estoque')
  .select('*')
  .eq('codigo_produto', '000004'); // DADOS REAIS DO BANCO
```

---

## 🚀 RESULTADO ESPERADO

Após configurar as variáveis:
- ✅ Respostas com dados REAIS do banco (28.179 produtos)
- ✅ Saldos corretos e atualizados
- ✅ Localizações e armazéns reais
- ✅ OpenAI analisa dados verdadeiros

---

**IMPORTANTE:** O sistema SÓ funcionará corretamente após adicionar as variáveis no Vercel!