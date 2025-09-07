# 🔧 Página de Debug - Instruções de Uso

## 📍 URL de Acesso
Após fazer deploy no Vercel, acesse:
**https://ia-wiser.vercel.app/debug.html**

## 🎯 O que a Página Faz

A página de debug permite testar todas as conexões e APIs do seu sistema:

### 1. **Teste de Conexão Supabase**
- Verifica se as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão configuradas
- Tenta conectar com o banco de dados
- Conta quantos registros existem na tabela `estoque`
- Mostra o status da conexão em tempo real

### 2. **Teste do Google AI**
- Verifica se `GOOGLE_API_KEY` está configurada
- Faz um teste simples com o modelo Gemini
- Confirma que a IA está respondendo

### 3. **Teste da API do Chat**
- Envia uma mensagem de teste para `/api/chat`
- Verifica se o estoque foi carregado
- Mostra quantos produtos foram encontrados

### 4. **Buscar Dados do Estoque**
- Busca todos os produtos do banco
- Mostra os primeiros 5 produtos como exemplo
- Calcula estatísticas (total, únicos, disponíveis)

## 🚀 Como Usar

### Passo 1: Configure as Variáveis no Vercel
Antes de testar, certifique-se de ter configurado no Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=https://tecvgnrqcfqcrcodrjtt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3ZnbnJxY2ZxY3Jjb2RyanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzYyNzUsImV4cCI6MjA3Mjc1MjI3NX0.zj1LLK8iDRCDq9SpedhTwZNnSOdG3WNc9nH5xBBcx1A
GOOGLE_API_KEY=[sua_google_api_key]
```

### Passo 2: Faça Deploy/Redeploy
Após adicionar as variáveis, faça redeploy no Vercel

### Passo 3: Acesse a Página de Debug
Vá para: https://ia-wiser.vercel.app/debug.html

### Passo 4: Execute os Testes

#### Opção A: Teste Individual
Clique em cada botão para testar componentes específicos:
- 🔵 **Testar Conexão Supabase** - Testa apenas o banco
- 🟢 **Testar API do Chat** - Testa o chat completo
- 🟣 **Testar Google AI** - Testa apenas a IA
- 🟦 **Buscar Dados do Estoque** - Lista produtos

#### Opção B: Teste Completo
Clique em **"Executar Todos os Testes"** para rodar tudo em sequência

## 📊 Interpretando os Resultados

### Status Cards (Topo da Página)

**Supabase:**
- 🟢 **Conectado** = Tudo OK, banco acessível
- 🔴 **Erro** = Verifique as credenciais
- ⚫ **Não testado** = Execute o teste

**Google AI:**
- 🟢 **Conectado** = API Key válida e funcionando
- 🔴 **Não configurado** = Adicione GOOGLE_API_KEY
- ⚫ **Não testado** = Execute o teste

**Banco de Dados:**
- 🟢 **Online** = Tabela estoque acessível
- 🔴 **Offline** = Problema de conexão
- Mostra quantidade de registros

### Console de Debug (Logs)

O console mostra logs detalhados com cores:
- 🔵 **Azul** = Informações gerais
- 🟢 **Verde** = Sucesso
- 🔴 **Vermelho** = Erros
- 🟡 **Amarelo** = Avisos
- ⚫ **Cinza** = Debug/detalhes

## 🛠️ Funcionalidades Extras

### Limpar Logs
Remove todos os logs do console para começar do zero

### Exportar Logs
Baixa um arquivo .txt com todos os logs para análise offline

### Recarregar Página
Recarrega a página para resetar todos os testes

## ❓ Troubleshooting

### "Supabase não configurado"
- Verifique se adicionou `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel
- Use EXATAMENTE estes nomes (com NEXT_PUBLIC_)
- Faça redeploy após adicionar

### "Google AI não configurado"
- Adicione `GOOGLE_API_KEY` no Vercel
- Obtenha a chave em: https://aistudio.google.com
- NÃO use NEXT_PUBLIC_ para esta variável

### "0 registros encontrados"
- A conexão funcionou mas a tabela está vazia
- Verifique se a tabela `estoque` tem dados no Supabase

### "Erro 401 - Unauthorized"
- A anon key está incorreta
- Verifique se copiou a chave "anon public" (não service_role)

## 📝 Resultado Esperado

Quando tudo estiver configurado corretamente:
1. **Supabase**: Status "Conectado" mostrando 1000 registros
2. **Google AI**: Status "Conectado" 
3. **Banco de Dados**: Status "Online" com contagem de registros
4. **Console**: Todos os testes em verde
5. **Buscar Estoque**: Lista produtos como "CAMP-D", "CLORPIRIFOS", etc.

---

**Após todos os testes passarem, seu chat estará 100% funcional!** 🎉