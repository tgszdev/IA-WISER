# 🚀 Guia Completo de Configuração na Vercel

## ⚠️ IMPORTANTE: A Vercel mudou suas opções de Storage

O KV Storage não está mais disponível diretamente. Vamos usar **Variáveis de Ambiente**, que é mais simples e gratuito!

## 📋 Passo a Passo Completo

### Passo 1: Deploy Inicial (se ainda não fez)

1. Acesse: https://vercel.com/new
2. Importe o repositório: `tgszdev/IA-WISER`
3. Clique em **Deploy**
4. Aguarde o deploy completar

### Passo 2: Configurar Variáveis de Ambiente (MAIS IMPORTANTE!)

#### No Dashboard da Vercel:

1. **Acesse seu projeto** IA-WISER
2. Clique em **Settings** (no menu superior)
3. No menu lateral, clique em **Environment Variables**
4. Adicione as seguintes variáveis:

#### Variável 1: GOOGLE_API_KEY
- **Key**: `GOOGLE_API_KEY`
- **Value**: Sua chave da API (obtida em https://aistudio.google.com)
- **Environment**: Marque todas (Production, Preview, Development)
- Clique em **Save**

#### Variável 2: ADMIN_PASSWORD
- **Key**: `ADMIN_PASSWORD`
- **Value**: Escolha uma senha forte (ex: `SuaSenhaForte@2024`)
- **Environment**: Marque todas
- Clique em **Save**

#### Variável 3: SYSTEM_PROMPT (Opcional)
- **Key**: `SYSTEM_PROMPT`
- **Value**: 
```
Você é um assistente de IA profissional e prestativo. 
Sempre responda de forma clara e objetiva.
Use os dados fornecidos para basear suas respostas.
Seja cordial e mantenha um tom profissional.
```
- **Environment**: Marque todas
- Clique em **Save**

#### Variável 4: DATABASE_URL (Opcional - se tiver PostgreSQL)
- **Key**: `DATABASE_URL`
- **Value**: URL do seu banco (ex: postgresql://user:pass@host/db)
- **Environment**: Marque todas
- Clique em **Save**

### Passo 3: Redeploy para Aplicar as Variáveis

**MUITO IMPORTANTE**: Após adicionar as variáveis, você DEVE fazer redeploy!

1. Ainda em **Settings**
2. Role até o final da página
3. Clique em **Redeploy** 
   
   OU

1. Vá em **Deployments** (menu superior)
2. Clique nos 3 pontos (...) do último deployment
3. Clique em **Redeploy**
4. Clique em **Redeploy** novamente para confirmar

### Passo 4: Testar a Aplicação

1. Acesse sua aplicação: `https://ia-wiser.vercel.app`
2. Clique no ícone de engrenagem (⚙️) no canto superior direito
3. Na página de configurações:
   - **Senha**: Use a senha que você definiu em `ADMIN_PASSWORD`
   - **API Key**: Já estará configurada via variável de ambiente
   - Clique em **Verificar Status** para confirmar

## 🎯 Como Obter a API Key do Google

1. Acesse: https://aistudio.google.com
2. Faça login com sua conta Google
3. Clique em **Get API key** (no menu lateral)
4. Clique em **Create API key**
5. Escolha **Create API key in new project**
6. Copie a chave gerada
7. Cole na variável `GOOGLE_API_KEY` na Vercel

## ✅ Verificação Final

Após configurar tudo, ao acessar `/config.html` e clicar em **Verificar Status**, você deve ver:

```
✅ API do Google configurada
✅ Prompt de comportamento configurado
ℹ️ Banco de dados não configurado (opcional)
```

## 🔧 Solução de Problemas

### Erro: "API do Google não configurada"
- Verifique se adicionou a variável `GOOGLE_API_KEY`
- Confirme que fez redeploy após adicionar
- Verifique se a API key está ativa no Google AI Studio

### Erro ao salvar configurações
- Use a senha definida em `ADMIN_PASSWORD`
- Se esqueceu a senha, mude a variável na Vercel e faça redeploy

### Chat não responde
- Verifique se a API key do Google está correta
- Teste a API key em: https://aistudio.google.com

## 💡 Dicas Importantes

1. **Variáveis de Ambiente são PERMANENTES**: Ao contrário do armazenamento em memória, as variáveis ficam salvas permanentemente na Vercel

2. **Segurança**: As variáveis de ambiente são seguras e não aparecem no código

3. **Sem custos extras**: Usar variáveis de ambiente é gratuito

4. **Histórico de Chat**: O histórico é mantido temporariamente em memória (até o próximo deploy)

## 📝 Resumo Rápido

1. ✅ Deploy o projeto na Vercel
2. ✅ Adicione a variável `GOOGLE_API_KEY` com sua chave
3. ✅ Adicione a variável `ADMIN_PASSWORD` com uma senha
4. ✅ Faça **Redeploy** para aplicar
5. ✅ Pronto para usar!

## 🆘 Precisa de Ajuda?

- Abra uma issue em: https://github.com/tgszdev/IA-WISER/issues
- Verifique o status em: https://status.vercel.com

---

**Nota**: Esta configuração usa variáveis de ambiente ao invés de KV Storage, pois o KV não está mais disponível diretamente na Vercel. As variáveis de ambiente funcionam perfeitamente para este caso de uso!