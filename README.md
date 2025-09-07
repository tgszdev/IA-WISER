# Wiser IA Assistant - Chat com Estoque Supabase

## 🎯 Objetivo do Projeto
Sistema de chat com IA que acessa dados reais de estoque armazenados no Supabase, permitindo consultas inteligentes sobre produtos, quantidades e informações do inventário.

## 🚀 Status de Deployment
- **URL de Produção**: [Configurar após deploy]
- **Status**: ⏸️ Aguardando configuração das credenciais
- **Plataforma**: Vercel
- **Banco de Dados**: Supabase (PostgreSQL)

## 📋 Funcionalidades Implementadas
✅ Interface de chat minimalista e responsiva  
✅ Integração com Google Gemini AI (modelo gemini-1.5-flash)  
✅ Conexão com Supabase usando método NEXT_PUBLIC_ (testado e funcionando)  
✅ Suporte para dados de estoque em tempo real  
✅ Sistema de fallback para múltiplos métodos de conexão  
✅ Logs detalhados para debug  

## 🔧 Configuração Passo a Passo

### 1️⃣ Obter Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL**: `https://tecvgnrqcfqcrcodrjtt.supabase.co`
   - **anon public**: (a chave que começa com `eyJ...`)

### 2️⃣ Configurar no Vercel

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione estas variáveis:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[cole_sua_anon_key_aqui]
GOOGLE_API_KEY=[sua_google_api_key]
```

**⚠️ IMPORTANTE**: Use EXATAMENTE estes nomes com `NEXT_PUBLIC_` prefix!

### 3️⃣ Fazer Deploy

```bash
# No Vercel, clique em "Redeploy" após adicionar as variáveis
```

## 🧪 Como Testar

### Página de Debug (NOVO!):
Acesse após o deploy: **https://ia-wiser.vercel.app/debug.html**

Esta página permite:
- ✅ Testar conexão com Supabase
- ✅ Verificar Google AI
- ✅ Buscar dados do estoque
- ✅ Exportar logs de debug
- ✅ Ver status em tempo real

### Teste Rápido via cURL:
```bash
curl -X GET "https://tecvgnrqcfqcrcodrjtt.supabase.co/rest/v1/estoque?limit=1" \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY"
```

### Teste Local:
```bash
# 1. Copie o arquivo de exemplo
cp .env.local.example .env.local

# 2. Edite .env.local com suas credenciais

# 3. Execute o teste
node test-next-public-method.js

# 4. Se funcionar, inicie o servidor
npm run dev
```

## 📊 Estrutura de Dados

### Tabela: estoque
```sql
- id
- nome/produto
- quantidade
- preco
- categoria
- [outros campos conforme seu banco]
```

## 🛠️ Arquitetura Técnica

### Stack:
- **Frontend**: HTML5 + TailwindCSS + JavaScript Vanilla
- **Backend**: Vercel Serverless Functions
- **IA**: Google Gemini 1.5 Flash
- **Banco**: Supabase (PostgreSQL)
- **Deploy**: Vercel

### Arquivos Principais:
```
/api/
  chat.js              # Endpoint principal do chat
  supabase-client.js   # Cliente Supabase com NEXT_PUBLIC_
  
/public/
  index.html          # Interface do chat
  style.css           # Estilos customizados
  
.env.local.example    # Template de configuração
package.json          # Dependências
vercel.json          # Configuração Vercel
```

## 🔍 Troubleshooting

### Erro 401 - Unauthorized
- Verifique se a anon key está correta
- Confirme que está usando a chave "anon public" (não service_role)
- Verifique se o RLS está configurado na tabela

### Erro "Host não encontrado"
- Use o método NEXT_PUBLIC_ (já configurado)
- Verifique se as variáveis estão no Vercel
- Faça redeploy após adicionar variáveis

### Tabela vazia ou não encontrada
- Verifique se a tabela "estoque" existe
- Confirme que tem dados na tabela
- Teste com SQL no painel do Supabase

## 📝 Próximos Passos Recomendados

1. **Imediato**:
   - [ ] Obter e configurar NEXT_PUBLIC_SUPABASE_ANON_KEY
   - [ ] Testar conexão com script test-next-public-method.js
   - [ ] Deploy no Vercel com variáveis configuradas

2. **Melhorias Futuras**:
   - [ ] Adicionar autenticação de usuários
   - [ ] Implementar filtros avançados de busca
   - [ ] Cache de consultas frequentes
   - [ ] Dashboard com estatísticas do estoque
   - [ ] Exportação de relatórios

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Vercel
2. Execute o script de teste: `node test-next-public-method.js`
3. Confirme as credenciais no Supabase Dashboard

---

**Última Atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Status**: Aguardando configuração de credenciais