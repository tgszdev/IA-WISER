# 📤 Deploy para GitHub - Instruções

## ✅ Status do Projeto
- **Código**: 100% pronto e commitado localmente
- **Branch**: main
- **Repositório**: https://github.com/tgszdev/IA-WISER

## 🚀 Como Fazer o Deploy

### Opção 1: Via Terminal (Recomendado)

Abra seu terminal local e execute:

```bash
# 1. Clone o repositório (se ainda não tiver)
git clone https://github.com/tgszdev/IA-WISER.git
cd IA-WISER

# 2. Baixe o código do sandbox
# Copie todos os arquivos deste projeto para a pasta IA-WISER

# 3. Adicione e commite as mudanças
git add .
git commit -m "Deploy completo - Wiser IA Assistant com Supabase funcionando"

# 4. Faça o push
git push origin main
```

### Opção 2: Via GitHub Web

1. Acesse: https://github.com/tgszdev/IA-WISER
2. Clique em "Add file" → "Upload files"
3. Arraste todos os arquivos do projeto
4. Escreva a mensagem de commit: "Deploy completo - Wiser IA Assistant com Supabase funcionando"
5. Clique em "Commit changes"

## 📁 Arquivos Principais do Projeto

### APIs (/api)
- `chat.js` - API principal do chat com IA
- `supabase-client.js` - Cliente Supabase configurado
- `test-connection.js` - API para testar conexões
- `inventory.js` - API para buscar dados do estoque
- `database.js` - Conexão com banco (backup)
- Outros arquivos de suporte

### Frontend (/public)
- `index.html` - Interface do chat
- `debug.html` - Página de debug e testes
- `style.css` - Estilos customizados

### Configuração
- `package.json` - Dependências do projeto
- `vercel.json` - Configuração do Vercel
- `.env.local.example` - Template de variáveis

### Documentação
- `README.md` - Documentação principal
- `GUIA_CONFIGURACAO_SUPABASE.md` - Guia do Supabase
- `DEBUG_PAGE_INSTRUCTIONS.md` - Como usar a página de debug
- `VERCEL_ENVIRONMENT_SETUP.md` - Configurar Vercel

### Scripts de Teste
- `test-next-public-method.js` - Testa conexão Supabase
- `test-full-inventory.js` - Analisa inventário completo
- `test-all-methods.js` - Testa todos os métodos
- `test-http-methods.js` - Testa conexões HTTP

## ⚠️ Arquivo Importante

O arquivo `.env.local` contém as credenciais reais:
```
NEXT_PUBLIC_SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**NÃO commite este arquivo!** Ele já está no `.gitignore`.

## 🔄 Após o Push

1. O código estará disponível em: https://github.com/tgszdev/IA-WISER
2. O Vercel detectará automaticamente as mudanças
3. Um novo deploy será iniciado automaticamente
4. Em poucos minutos, estará online em: https://ia-wiser.vercel.app

## ✅ Checklist Final

- [ ] Fazer push do código para GitHub
- [ ] Verificar se o Vercel iniciou o deploy automático
- [ ] Testar em: https://ia-wiser.vercel.app/debug.html
- [ ] Verificar se o chat está funcionando
- [ ] Confirmar que está carregando os 1000 produtos

---

**Sucesso! Seu projeto está pronto para deploy!** 🎉