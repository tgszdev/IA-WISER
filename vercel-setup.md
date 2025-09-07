# 🚀 CONFIGURAÇÃO PARA VERCEL

## 📋 Seus Dados de Conexão

```
Host: db.tecvgnrqcfqcrcodrjtt.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: Nnyq2122@@
```

## 🔧 Configuração na Vercel

### Método 1: Variáveis de Ambiente (RECOMENDADO)

1. Acesse o dashboard da Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione estas variáveis:

```bash
DATABASE_URL = postgresql://postgres:Nnyq2122@@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
GOOGLE_API_KEY = [Sua chave do Google AI]
SYSTEM_PROMPT = Você é um analista de estoque especializado em WMS.
```

4. Clique em **Save**
5. Faça **Redeploy** do projeto

### Método 2: Via Interface Web

Após o deploy, acesse `https://seu-app.vercel.app/config.html`:

1. **URL de Conexão PostgreSQL**: Cole exatamente:
   ```
   postgresql://postgres:Nnyq2122@@db.tecvgnrqcfqcrcodrjtt.supabase.co:5432/postgres
   ```

2. **Chave API Google**: Sua chave do Google AI Studio

3. **Prompt**: 
   ```
   Você é um analista de estoque especializado em WMS.
   ```

4. Clique em **Testar Conexão**
5. Clique em **Salvar Configurações**

## 🔍 Verificação

### 1. Teste de Debug
Acesse: `https://seu-app.vercel.app/debug.html`

- Clique em **Testar Conexão**
- Deve mostrar:
  - ✅ Status do Banco: Conectado
  - ✅ Tabela Estoque: Encontrada
  - ✅ Total de Registros: [número]

### 2. Teste no Chat
Acesse: `https://seu-app.vercel.app/`

Pergunte:
- "Qual o estoque total disponível?"
- "Liste os produtos do armazém BARUERI"
- "Onde está o produto CAMP-D?"
- "Qual o saldo do código 000004?"

## ⚠️ Importante

- A senha `Nnyq2122@@` é usada EXATAMENTE como está
- NÃO precisa converter @@ para %40%40
- O sistema já está configurado para usar seus dados

## 🎯 Resultado Esperado

Quando funcionando corretamente:
1. Debug mostrará conexão bem-sucedida
2. Chat responderá com dados reais do estoque
3. Respostas incluirão códigos, lotes e quantidades exatas

## 📞 Suporte

Se houver problemas:
1. Verifique os logs em Vercel → Functions → Logs
2. Confirme que a tabela `estoque` existe no Supabase
3. Verifique se há dados na tabela