# 🔍 Guia de Debug - Wiser IA Assistant

## 📋 Status Atual do Problema

### Problema Identificado
**A IA não está utilizando os dados do banco de conhecimento configurado**, mesmo com conexão bem-sucedida ao PostgreSQL/Supabase.

### Melhorias Implementadas (Última Atualização)

#### 1. **Prompt Aprimorado** (`api/chat.js`)
- Instruções mais enfáticas e explícitas para forçar uso do contexto
- Adiciona indicadores visuais quando usa dados do banco
- Repete múltiplas vezes a instrução de usar a base de conhecimento

#### 2. **Logs Detalhados** (`api/database.js`)
- Log completo de cada resultado encontrado
- Mostra preview do conteúdo de cada registro
- Rastreia todas as etapas da query

#### 3. **Nova Página de Debug** (`/debug.html`)
- Interface visual para testar conexão com banco
- Testa queries personalizadas
- Mostra status detalhado do banco e tabela
- Log em tempo real de todas as ações

#### 4. **Endpoint de Diagnóstico** (`/api/debug`)
- Ações disponíveis:
  - `test`: Testa conexão e verifica tabela
  - `sample`: Busca dados de exemplo
  - `query`: Executa query personalizada

## 🛠️ Como Usar a Página de Debug

### 1. Acesse a Página de Debug
```
https://seu-app.vercel.app/debug.html
```

### 2. Execute os Testes na Ordem

#### Teste 1: Verificar Conexão
- Clique em **"Testar Conexão"**
- Verifica se consegue conectar ao banco
- Mostra se a tabela `knowledge_base` existe
- Conta quantos registros existem

#### Teste 2: Buscar Dados de Exemplo
- Clique em **"Buscar Dados de Exemplo"**
- Retorna até 10 registros da base
- Mostra o conteúdo completo de cada registro

#### Teste 3: Query Personalizada
- Digite uma pergunta no campo de busca
- Clique em **"Executar"**
- Mostra exatamente o que o banco retorna para aquela query

### 3. Interprete os Resultados

#### ✅ Conexão OK, Tabela Existe, Tem Dados
Se todos os indicadores estão verdes e há registros, o problema está no prompt da IA.

#### ⚠️ Tabela Não Existe
Execute o script SQL no Supabase:
```sql
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### ❌ Sem Registros
Insira dados de teste:
```sql
INSERT INTO knowledge_base (title, content, category, tags) VALUES
('Sobre a Empresa', 'Nossa empresa foi fundada em 2020 com o objetivo de revolucionar...', 'Institucional', ARRAY['empresa', 'sobre']),
('Produtos', 'Oferecemos três planos: Básico ($29/mês), Pro ($79/mês) e Enterprise (personalizado)...', 'Produtos', ARRAY['planos', 'preços']),
('Suporte', 'Nosso suporte funciona de segunda a sexta, das 9h às 18h...', 'Suporte', ARRAY['atendimento', 'horário']);
```

## 📊 Verificar Logs no Vercel

### 1. Acesse o Dashboard da Vercel
- Entre em https://vercel.com/dashboard
- Selecione seu projeto

### 2. Vá para Functions → Logs
- Clique na aba "Functions"
- Selecione "Logs"
- Filtre por `/api/chat` ou `/api/database`

### 3. O Que Procurar nos Logs

#### Logs de Sucesso Esperados:
```
Connecting to database...
Search query: [sua pergunta]
Search terms: ['palavra1', 'palavra2']
Found 3 results
Database results found:
  1. Title: Sobre a Empresa
     Content preview: Nossa empresa foi fundada em 2020...
  2. Title: Produtos
     Content preview: Oferecemos três planos...
Database status: found_data
Prompt includes context: true
```

#### Logs de Problema:
```
No database URL provided
Table knowledge_base does not exist
No matches found, fetching all records...
Found 0 results
Database status: not_configured
```

## 🔧 Soluções por Tipo de Problema

### Problema 1: "Table knowledge_base does not exist"
**Solução**: Execute o script de criação da tabela no Supabase SQL Editor

### Problema 2: "Found 0 results" mesmo com dados
**Possíveis Causas**:
1. Dados em schema diferente (não `public`)
2. Permissões incorretas no Supabase RLS
3. URL de conexão incorreta

**Solução**:
```sql
-- Desabilitar RLS temporariamente para teste
ALTER TABLE knowledge_base DISABLE ROW LEVEL SECURITY;

-- Ou criar política permitindo leitura
CREATE POLICY "Allow public read" ON knowledge_base
FOR SELECT USING (true);
```

### Problema 3: IA não usa contexto mesmo com dados
**Solução Implementada**: 
- Prompt foi modificado para ser EXTREMAMENTE enfático
- Adiciona múltiplas instruções para usar o contexto
- Inclui indicadores visuais quando usa dados

Se ainda não funcionar após essas mudanças, pode ser necessário:
1. Usar um modelo diferente (tentar gemini-1.5-pro)
2. Simplificar o prompt removendo instruções conflitantes
3. Testar com perguntas mais diretas sobre o conteúdo

## 📝 Checklist de Verificação

- [ ] Banco de dados conectado (teste na página de debug)
- [ ] Tabela `knowledge_base` existe
- [ ] Há pelo menos 1 registro na tabela
- [ ] Query personalizada retorna resultados
- [ ] Logs do Vercel mostram "found_data"
- [ ] Resposta da IA inclui indicador "📊"

## 🚀 Próximos Passos se Ainda Não Funcionar

1. **Teste com Prompt Simplificado**
   - Remova o system_prompt customizado
   - Use apenas as instruções padrão

2. **Teste com Query Exata**
   - Faça uma pergunta que contenha palavras exatas do banco
   - Ex: Se tem "Nossa empresa foi fundada em 2020", pergunte "Quando a empresa foi fundada?"

3. **Verifique Encoding**
   - Certifique que não há problemas de caracteres especiais
   - Use %40 para @ na URL do banco

4. **Debug Direto no Chat**
   - A resposta agora inclui indicadores:
     - `📊 [Resposta baseada na base de conhecimento]` = Usou dados
     - `💡 [Nenhum dado relevante encontrado]` = Não encontrou matches
     - Sem indicador = Banco não configurado

## 💡 Dica Final

Se após todos esses passos a IA ainda não usar o contexto, o problema pode estar na conta/cota da API do Gemini. Tente:
1. Criar uma nova API key
2. Verificar se não excedeu limites
3. Testar com uma pergunta simples sem contexto primeiro

---

**Última atualização**: Implementação de sistema de debug completo com logs detalhados e página de diagnóstico.