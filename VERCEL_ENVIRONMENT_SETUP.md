# 🔧 Como Configurar as Variáveis de Ambiente no Vercel

## Você está no lugar certo! 

Na imagem que você enviou, vejo o menu "Project Settings". Agora siga estes passos:

### 📍 Passo 1: Acessar Environment Variables

No menu lateral que você está vendo:
1. Clique em **"Environment Variables"** (está na lista, abaixo de "Environments")

### 📍 Passo 2: Adicionar as Variáveis

Quando abrir a página de Environment Variables, você verá:
- Um campo para "Name" (nome da variável)
- Um campo para "Value" (valor da variável)
- Checkboxes para ambientes (Production, Preview, Development)

### 📍 Passo 3: Adicionar Cada Variável

Adicione estas 3 variáveis, uma por vez:

#### Variável 1 - URL do Supabase:
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://tecvgnrqcfqcrcodrjtt.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development
```
Clique em "Save"

#### Variável 2 - Anon Key do Supabase:
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [cole aqui a anon key do Supabase - veja instruções abaixo]
Environments: ✅ Production ✅ Preview ✅ Development
```
Clique em "Save"

#### Variável 3 - Google API Key:
```
Name: GOOGLE_API_KEY
Value: [cole aqui sua Google API key]
Environments: ✅ Production ✅ Preview ✅ Development
```
Clique em "Save"

### 📍 Passo 4: Obter a Anon Key do Supabase

Se você ainda não tem a anon key:

1. Abra uma nova aba no navegador
2. Vá para: https://supabase.com/dashboard
3. Faça login
4. Selecione seu projeto (tecvgnrqcfqcrcodrjtt)
5. No menu lateral, clique em **Settings** (ícone de engrenagem ⚙️)
6. Clique em **API**
7. Você verá duas seções:
   - **Project URL**: já temos (https://tecvgnrqcfqcrcodrjtt.supabase.co)
   - **Project API keys**: 
     - Copie a chave **"anon public"** (NÃO use "service_role")
     - Ela começa com `eyJ...`

### 📍 Passo 5: Fazer Redeploy

Após adicionar todas as variáveis:
1. Vá para a aba "Deployments" do seu projeto
2. Clique nos 3 pontinhos (...) do deployment mais recente
3. Selecione "Redeploy"
4. Confirme o redeploy

### ✅ Verificação

Após o redeploy, seu chat deve:
1. Conectar com o Supabase automaticamente
2. Carregar os dados da tabela `estoque`
3. Responder perguntas usando os dados reais

### 🆘 Se Precisar de Ajuda

**Para obter a Google API Key:**
1. Acesse: https://aistudio.google.com
2. Clique em "Get API Key"
3. Crie uma nova API key
4. Copie e use no Vercel

**Estrutura Final das Variáveis:**
```
NEXT_PUBLIC_SUPABASE_URL = https://tecvgnrqcfqcrcodrjtt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...[sua chave completa]...
GOOGLE_API_KEY = [sua google api key]
```

### 🎯 Importante

- Use EXATAMENTE estes nomes de variáveis (com NEXT_PUBLIC_ onde indicado)
- Marque todos os ambientes (Production, Preview, Development)
- Faça redeploy após adicionar as variáveis
- A anon key pode ser exposta no frontend (é segura para isso)
- A Google API key NÃO deve ter NEXT_PUBLIC_ (fica só no backend)

---

**Após configurar, me avise para testarmos se está funcionando!**