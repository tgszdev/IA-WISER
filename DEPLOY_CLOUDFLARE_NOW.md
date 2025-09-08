# 🚀 Deploy AGORA no Cloudflare Pages (5 minutos)

## ⚠️ IMPORTANTE: NÃO USE VERCEL!
Este projeto foi criado para **Cloudflare Pages**, não funcionará no Vercel.

## ✅ Deploy Rápido - 2 Opções

### Opção 1: Via Browser (Mais Fácil)

1. **Acesse Cloudflare Pages:**
   ```
   https://pages.cloudflare.com/
   ```

2. **Clique em "Create application"**

3. **Selecione "Connect to Git"**

4. **Autorize o GitHub e selecione:**
   - Repository: `tgszdev/IA-WISER`

5. **Configure:**
   ```
   Framework preset: None
   Build command: npm run build
   Build output directory: dist
   ```

6. **Clique "Save and Deploy"**

7. **Aguarde 2-3 minutos**

8. **Pronto! Seu site estará em:**
   ```
   https://ia-wiser.pages.dev
   ```

### Opção 2: Via Terminal (Mais Rápido)

```bash
# 1. Clone o projeto
git clone https://github.com/tgszdev/IA-WISER.git
cd IA-WISER

# 2. Instale dependências
npm install

# 3. Build
npm run build

# 4. Deploy direto (sem login)
npx wrangler pages deploy dist --project-name ia-wiser

# Ou com login (recomendado)
npx wrangler login
npx wrangler pages deploy dist --project-name ia-wiser
```

## 🎯 URLs Disponíveis AGORA

### Enquanto não faz deploy no Cloudflare:
```
https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev/
```
☝️ **Este link está funcionando 100% AGORA!**

### Após deploy no Cloudflare:
```
https://ia-wiser.pages.dev
https://[seu-projeto].pages.dev
```

## 📊 Status Atual

| Plataforma | Status | URL |
|------------|--------|-----|
| Sandbox E2B | ✅ Funcionando | https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev/ |
| Vercel | ❌ Incompatível | Não use! |
| Cloudflare | ⏳ Aguardando deploy | Faça agora! |

## 🔧 Correção do Erro Vercel

O erro acontece porque:
1. Vercel não suporta Hono + Cloudflare Workers
2. As APIs são incompatíveis
3. Precisa usar Cloudflare Pages

**Solução**: Delete o deploy do Vercel e use Cloudflare Pages!

## 💡 Dicas

1. **Nome do projeto**: Se `ia-wiser` já existir, use:
   - `ia-wiser-2`
   - `wiser-assistant`
   - `wiser-ia-prod`

2. **Variáveis de ambiente** (opcional):
   ```
   GOOGLE_API_KEY=sua_chave (para Function Calling)
   SUPABASE_URL=sua_url (para banco real)
   SUPABASE_ANON_KEY=sua_chave (para banco real)
   ```

3. **Domínio customizado** (após deploy):
   - Vá em Settings → Custom domains
   - Adicione seu domínio

## ⚡ Comandos Rápidos

```bash
# Build local
npm run build

# Deploy para Cloudflare
npx wrangler pages deploy dist --project-name ia-wiser

# Ver logs
npx wrangler pages tail ia-wiser

# Adicionar secrets
npx wrangler pages secret put GOOGLE_API_KEY --project-name ia-wiser
```

## 🎉 Pronto!

Em 5 minutos você terá:
- ✅ Site funcionando em produção
- ✅ URL pública permanente
- ✅ 100% grátis
- ✅ Performance global
- ✅ Sem erros!

---

**NÃO PERCA TEMPO COM VERCEL! Use Cloudflare Pages AGORA!** 🚀