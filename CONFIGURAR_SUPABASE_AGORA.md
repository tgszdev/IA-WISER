# 🚨 CONFIGURAÇÃO URGENTE DO SUPABASE

## ⚠️ PROBLEMA IDENTIFICADO
A conexão com o Supabase não está funcionando. O banco de dados não tem a tabela `estoque` criada, por isso o sistema está usando dados mock/demonstração.

---

## ✅ SOLUÇÃO RÁPIDA (5 minutos)

### Passo 1: Acesse o Supabase
1. Acesse: https://supabase.com/dashboard
2. Entre no seu projeto: `tecvgnrqcfqcrcodrjtt`

### Passo 2: Execute o Script SQL
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. **COPIE E COLE TODO O CONTEÚDO** do arquivo: `create-estoque-table.sql`
4. Clique em **RUN** (botão verde)

### Passo 3: Verifique o Resultado
Após executar, você deve ver:
- ✅ "Setup concluído com sucesso!"
- 📊 20+ registros inseridos na tabela

### Passo 4: Teste a Conexão
Execute no terminal:
```bash
cd /home/user/webapp
node test-supabase-connection.mjs
```

---

## 📋 O QUE O SCRIPT FAZ

1. **Cria a tabela `estoque`** com todos os campos necessários
2. **Insere 20+ produtos de exemplo** incluindo:
   - Produtos normais (notebooks, monitores, etc.)
   - Produtos com saldo baixo (< 10 unidades)
   - Produtos com avaria
   - Produtos vencidos
   - Produto código "123" para teste
3. **Cria índices** para performance
4. **Desabilita RLS** para permitir acesso público
5. **Cria uma view de resumo** para estatísticas

---

## 🔍 VERIFICAÇÃO NO SUPABASE

Após executar o script, vá em **Table Editor** e verifique:

1. **Tabela `estoque` existe** ✅
2. **Tem 20+ registros** ✅
3. **Produto "123" está lá** ✅

Execute esta query para confirmar:
```sql
SELECT * FROM estoque WHERE codigo_produto = '123';
```

Deve retornar:
- Código: 123
- Descrição: Produto Teste 123
- Saldo: 100

---

## 🤖 COMO O OPENAI VAI RECEBER OS DADOS

Quando você perguntar "qual o saldo do produto 123", o sistema vai:

1. **Buscar no Supabase**: 
   ```sql
   SELECT * FROM estoque WHERE codigo_produto = '123'
   ```

2. **Formatar para o OpenAI**:
   ```json
   {
     "queryResults": [{
       "codigo_produto": "123",
       "descricao_produto": "Produto Teste 123",
       "saldo_disponivel_produto": 100,
       "local_produto": "Z-01-01",
       "armazem": "TESTE"
     }],
     "totalItems": 1,
     "intent": {
       "type": "productInfo",
       "confidence": 0.95,
       "entities": { "productCode": "123" }
     }
   }
   ```

3. **OpenAI vai responder** usando esses dados reais:
   ```
   📦 **Produto 123 - Produto Teste 123**
   
   ✅ Saldo disponível: 100 unidades
   📍 Localização: Z-01-01 (Armazém: TESTE)
   💰 Preço unitário: R$ 50,00
   
   Status: Produto com estoque adequado.
   ```

---

## ⚡ TESTE RÁPIDO APÓS CONFIGURAR

1. **Reinicie o serviço**:
```bash
pm2 restart wiser-ia
```

2. **Teste perguntas**:
```bash
curl -X POST http://localhost:3000/api/chat-smart \
  -H "Content-Type: application/json" \
  -d '{"message": "qual o saldo do produto 123", "sessionId": "test"}'
```

3. **Perguntas para testar**:
- "qual o saldo do produto 123"
- "mostre produtos com avaria"
- "liste produtos com estoque baixo"
- "qual o valor total do inventário"

---

## 🎯 RESULTADO ESPERADO

Após configurar:
- ✅ Conexão com Supabase funcionando
- ✅ Dados reais sendo enviados para OpenAI
- ✅ Respostas baseadas no inventário real
- ✅ 20+ produtos disponíveis para consulta

---

## 📞 SUPORTE

Se houver erro:
1. Verifique se o script SQL foi executado completamente
2. Confirme que a tabela `estoque` existe
3. Teste a query: `SELECT COUNT(*) FROM estoque;`
4. Deve retornar 20+ registros

---

**IMPORTANTE**: Sem executar este script, o sistema continuará usando dados mock/demonstração e não terá acesso ao inventário real!