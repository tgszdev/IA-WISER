# 🔧 Correção do Deploy - Wiser IA

## ❌ Problema Identificado

O erro "Method not allowed" no Vercel ocorre porque:
1. O projeto foi desenvolvido para **Cloudflare Pages/Workers**
2. Está tentando fazer deploy no **Vercel** (plataforma diferente)
3. As APIs são incompatíveis (Hono + Cloudflare vs Vercel)

## ✅ Soluções

### Opção 1: Deploy no Cloudflare Pages (RECOMENDADO)

O projeto foi criado especificamente para Cloudflare Pages. Para fazer o deploy correto:

#### 1. Acesse Cloudflare Pages
```
https://pages.cloudflare.com/
```

#### 2. Conecte seu GitHub
- Click "Create application"
- Select "Connect to Git"
- Authorize GitHub
- Select repository: tgszdev/IA-WISER

#### 3. Configure Build Settings
```
Framework preset: None
Build command: npm run build
Build output directory: dist
```

#### 4. Environment Variables
```
GOOGLE_API_KEY=sua_chave_aqui (opcional)
SUPABASE_URL=sua_url_aqui (opcional)
SUPABASE_ANON_KEY=sua_chave_aqui (opcional)
```

#### 5. Deploy
Click "Save and Deploy"

### Opção 2: Usar Sandbox Atual (FUNCIONANDO)

O sistema está 100% funcional no sandbox:

**URL Funcionando:**
```
https://3000-itd9ec3aegznw6o63t98q-6532622b.e2b.dev/
```

### Opção 3: Adaptar para Vercel (NÃO RECOMENDADO)

Se realmente quiser usar Vercel, seria necessário:
1. Reescrever todo o backend
2. Converter de Hono/Cloudflare para Next.js/Vercel
3. Mudar toda a estrutura do projeto

## 📝 Por que Cloudflare Pages?

### Vantagens do Cloudflare Pages para este projeto:
- ✅ **Grátis** para projetos pequenos
- ✅ **Edge Functions** com Hono
- ✅ **KV Storage** integrado para sessões
- ✅ **D1 Database** para dados SQL
- ✅ **Wrangler CLI** já configurado
- ✅ **Performance** global com CDN

### Problemas com Vercel:
- ❌ Incompatível com Hono + Cloudflare Workers
- ❌ Não suporta wrangler.json
- ❌ Requer reescrita completa
- ❌ Mais caro para este caso de uso

## 🚀 Deploy Rápido no Cloudflare

### Via Terminal (mais rápido):

```bash
# 1. Instale Wrangler globalmente
npm install -g wrangler

# 2. Faça login no Cloudflare
wrangler login

# 3. Clone o projeto
git clone https://github.com/tgszdev/IA-WISER.git
cd IA-WISER

# 4. Instale dependências
npm install

# 5. Build
npm run build

# 6. Deploy
npx wrangler pages deploy dist --project-name ia-wiser
```

### Via Interface Web:

1. Acesse: https://dash.cloudflare.com
2. Go to "Pages"
3. "Create application"
4. "Connect to Git"
5. Select "tgszdev/IA-WISER"
6. Deploy!

## 🎯 URLs Após Deploy no Cloudflare

Você receberá:
```
https://ia-wiser.pages.dev
https://ia-wiser-[branch].pages.dev
```

## ⚠️ Importante

**NÃO use Vercel para este projeto!**
- Foi desenvolvido especificamente para Cloudflare
- Usar Vercel requer reescrita completa
- Cloudflare é grátis e mais adequado

## 📊 Comparação de Plataformas

| Feature | Cloudflare Pages | Vercel | Sandbox Atual |
|---------|-----------------|---------|--------------|
| Compatível | ✅ 100% | ❌ 0% | ✅ 100% |
| Custo | Grátis | Pago | Grátis (temp) |
| Performance | Excelente | Boa | Boa |
| Setup | 5 min | Impossível | Já pronto |
| Hono Support | ✅ Nativo | ❌ Não | ✅ Sim |
| KV Storage | ✅ Incluído | ❌ Não | ✅ Sim |

## 🔧 Arquivo vercel.json (REMOVER)

O arquivo `vercel.json` atual não funciona para este projeto. 
**DELETE este arquivo** se for usar Cloudflare:

```bash
rm vercel.json
```

## 📞 Suporte

Se precisar de ajuda com o deploy no Cloudflare:
1. Use a documentação: https://developers.cloudflare.com/pages
2. O projeto já está configurado corretamente
3. Apenas siga os passos acima

---

**Resumo**: Use **Cloudflare Pages**, não Vercel! ✅