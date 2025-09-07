# 🚀 Guia Completo - Configuração Supabase (Método que Funcionou)

## 📋 Passo a Passo Completo

### Passo 1: Obter as Credenciais do Supabase

1. **Acesse o Painel do Supabase**
   - URL: https://supabase.com/dashboard
   - Faça login com sua conta
   - Selecione seu projeto

2. **Copie as Credenciais**
   - No menu lateral, clique em **Settings** (⚙️)
   - Depois clique em **API**
   - Você verá:
     - **Project URL**: `https://tecvgnrqcfqcrcodrjtt.supabase.co`
     - **Project API keys - anon public**: `eyJ...` (esta é a chave que precisamos)

### Passo 2: Configurar no Vercel

1. **Acesse seu projeto no Vercel**
   - URL: https://vercel.com/dashboard
   - Selecione seu projeto

2. **Configure as Variáveis de Ambiente**
   - Vá em **Settings** → **Environment Variables**
   - Adicione estas variáveis:

   ```
   NEXT_PUBLIC_SUPABASE_URL = https://tecvgnrqcfqcrcodrjtt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [cole aqui a anon key do passo 1]
   ```

   ⚠️ **IMPORTANTE**: O prefixo `NEXT_PUBLIC_` permite que as variáveis sejam acessadas no cliente (frontend)

3. **Faça o Redeploy**
   - Após adicionar as variáveis, clique em **Redeploy** para aplicar as mudanças

### Passo 3: Atualizar o Código

Vou criar os arquivos necessários para usar este método:

## 📁 Estrutura de Arquivos Necessária

### 1. `/api/supabase-client.js`
```javascript
import { createClient } from '@supabase/supabase-js';

// Usando as variáveis com NEXT_PUBLIC_ que funcionaram no seu outro projeto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found!');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para buscar dados do estoque
export async function getEstoqueData(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching estoque:', error);
    throw error;
  }
}

// Função para buscar produto específico
export async function getProdutoByNome(nome) {
  try {
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .ilike('nome', `%${nome}%`);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching produto:', error);
    throw error;
  }
}
```

### 2. `/api/chat.js` (Atualizado)
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEstoqueData } from './supabase-client.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    // Buscar dados do estoque usando Supabase Client
    let estoqueData = [];
    try {
      estoqueData = await getEstoqueData();
      console.log(`✅ Dados do estoque carregados: ${estoqueData.length} produtos`);
    } catch (dbError) {
      console.error('❌ Erro ao carregar estoque:', dbError);
      // Continua mesmo se falhar, mas avisa o usuário
    }

    // Criar contexto do sistema com os dados do estoque
    const systemPrompt = `Você é um assistente de IA especializado em gerenciamento de estoque.
    
${estoqueData.length > 0 ? `
DADOS DO ESTOQUE ATUAL (${estoqueData.length} produtos):
${JSON.stringify(estoqueData, null, 2)}

Use estes dados reais do estoque para responder perguntas sobre:
- Produtos disponíveis
- Quantidades em estoque
- Preços
- Informações específicas dos produtos
` : 'Não foi possível carregar os dados do estoque no momento.'}

Responda sempre em português do Brasil de forma clara e útil.`;

    // Gerar resposta com o Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([systemPrompt, message]);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ 
      response: text,
      estoqueLoaded: estoqueData.length > 0
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      details: error.message 
    });
  }
}
```

### 3. `/.env.local` (Para desenvolvimento local)
```env
# Supabase - Método que funcionou no outro projeto
NEXT_PUBLIC_SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cole_aqui_sua_anon_key

# Google AI
GOOGLE_API_KEY=sua_google_api_key_aqui
```

## 🧪 Como Testar se Está Funcionando

### Teste 1: Verificar Conexão Básica
```bash
curl -X GET "https://tecvgnrqcfqcrcodrjtt.supabase.co/rest/v1/estoque?limit=1" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY"
```

### Teste 2: No Código JavaScript
```javascript
// test-connection.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tecvgnrqcfqcrcodrjtt.supabase.co',
  'SUA_ANON_KEY_AQUI'
);

async function testConnection() {
  const { data, error } = await supabase
    .from('estoque')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Sucesso! Dados:', data);
  }
}

testConnection();
```

## 🔧 Troubleshooting

### Se continuar com erro 401:
1. **Verifique o RLS (Row Level Security)**:
   - No Supabase, vá em **Table Editor** → **estoque**
   - Clique em **RLS disabled/enabled**
   - Se estiver enabled, você precisa criar políticas ou desabilitar temporariamente

2. **Crie uma política pública (se RLS estiver ativo)**:
   ```sql
   -- No SQL Editor do Supabase
   CREATE POLICY "Allow public read access" ON estoque
   FOR SELECT
   TO public
   USING (true);
   ```

### Se der erro de CORS:
Adicione no início da sua API:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

## ✅ Checklist Final

- [ ] Copiei a URL do projeto do Supabase
- [ ] Copiei a anon key (public) do Supabase
- [ ] Adicionei as variáveis no Vercel com prefixo `NEXT_PUBLIC_`
- [ ] Fiz redeploy no Vercel após adicionar as variáveis
- [ ] Verifiquei se RLS está configurado corretamente
- [ ] Testei a conexão com curl ou no navegador

## 📱 Resultado Esperado

Quando tudo estiver configurado corretamente:
1. O chat carregará os dados do estoque automaticamente
2. A IA responderá com informações reais dos produtos
3. Não haverá mais erros de "Host não encontrado" ou "401 Unauthorized"

---

**💡 Dica**: Este é exatamente o mesmo método que funcionou no seu outro projeto. A chave é usar `NEXT_PUBLIC_` nas variáveis!