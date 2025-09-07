# 🚨 CONFIGURAÇÃO FINAL VERCEL - CORREÇÃO DO ERRO

## ❌ Problema Identificado
O erro "Host não encontrado" ocorre porque a senha `Nnyq2122@@` precisa ser codificada como `Nnyq2122%40%40` em URLs.

## ✅ SOLUÇÃO: Use a URL Codificada

### Na Vercel Dashboard:

1. Vá em **Settings** → **Environment Variables**

2. **EXCLUA** a variável DATABASE_URL antiga se existir

3. **ADICIONE** novamente com a senha CODIFICADA:
   ```
   DATABASE_URL = postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
   ```
   
   **IMPORTANTE**: Use `%40%40` no lugar de `@@`

4. Adicione também sua Google API Key:
   ```
   GOOGLE_API_KEY = [sua chave aqui]
   ```

5. Adicione o prompt (opcional):
   ```
   SYSTEM_PROMPT = Você é um analista de estoque especializado em WMS.
   ```

6. Clique em **Save**

7. **IMPORTANTE**: Faça **Redeploy** do projeto
   - Vá em **Deployments**
   - Clique nos 3 pontos do deployment mais recente
   - Selecione **Redeploy**

## 📋 Verificação

### 1. Após o Redeploy, teste em:
```
https://seu-app.vercel.app/debug.html
```

- Clique em "Testar Conexão"
- Deve mostrar "✅ Conectado"

### 2. Se ainda der erro:

#### Tente com Connection Pooler:
```
DATABASE_URL = postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:6543/postgres
```
(Note a porta 6543 em vez de 5432)

## 🔍 Por que isso acontece?

- O caractere `@` tem significado especial em URLs (separa senha do host)
- Sua senha tem `@@` (dois arrobas)
- Em URLs, cada `@` deve ser codificado como `%40`
- Portanto: `Nnyq2122@@` → `Nnyq2122%40%40`

## ✅ O Código Agora:

O sistema foi atualizado para:
1. Detectar automaticamente senhas com `@@`
2. Converter para `%40%40` quando necessário
3. Usar a URL codificada para conexão

## 📊 Teste Final

Após configurar corretamente, no chat pergunte:
- "Quantos produtos temos em estoque?"
- "Liste os produtos do armazém BARUERI"
- "Qual o saldo do produto CAMP-D?"

## 🆘 Se Ainda Não Funcionar:

1. **Verifique no Supabase**:
   - O banco está ativo?
   - A senha está correta?
   - A tabela `estoque` existe?

2. **Tente resetar a senha**:
   - No Supabase, vá em Settings → Database
   - Reset database password
   - Use uma senha SEM caracteres especiais

3. **Verifique os logs**:
   - Vercel → Functions → Logs
   - Procure por erros de conexão

## ⚠️ RESUMO IMPORTANTE:

**USE ESTA URL NA VERCEL:**
```
postgresql://postgres:Nnyq2122%40%40@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

**NÃO USE:**
```
postgresql://postgres:Nnyq2122@@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
```

A diferença é: `%40%40` em vez de `@@`