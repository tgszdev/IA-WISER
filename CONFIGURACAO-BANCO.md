# 📋 GUIA DE CONFIGURAÇÃO DO BANCO DE DADOS

## ❌ ERRO ATUAL: "Host não encontrado. Verifique a URL"

Este erro ocorre quando a URL de conexão está incompleta ou incorreta.

## ✅ FORMATO CORRETO DA URL DO POSTGRESQL

### Para Supabase:
```
postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres
```

### Para Neon:
```
postgresql://[USUARIO]:[SENHA]@[SEU-PROJETO].neon.tech/neondb
```

### Para outros providers:
```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[NOME-DO-BANCO]
```

## 🔍 ONDE ENCONTRAR A URL CORRETA

### No Supabase:
1. Acesse seu projeto em https://app.supabase.com
2. Vá em **Settings** (ícone de engrenagem)
3. Clique em **Database**
4. Procure por **Connection string** ou **URI**
5. Copie a URL que começa com `postgresql://`
6. **IMPORTANTE**: Substitua `[YOUR-PASSWORD]` pela senha real do seu banco

### No Neon:
1. Acesse https://console.neon.tech
2. Selecione seu projeto
3. Vá em **Connection Details**
4. Copie a **Connection string**

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### 1. URL Incompleta
❌ **Errado:** `postgresql://user:password@host:port/database`
✅ **Certo:** `postgresql://postgres:suasenha123@db.abcdefghijkl.supabase.co:5432/postgres`

### 2. Senha com Caracteres Especiais
Se sua senha tem `@`, substitua por `%40`:
- Senha: `Minha@Senha@123`
- Na URL: `Minha%40Senha%40123`

### 3. Faltando o Host Completo
❌ **Errado:** `postgresql://postgres:senha@supabase.co:5432/postgres`
✅ **Certo:** `postgresql://postgres:senha@db.seuprojetoid.supabase.co:5432/postgres`

## 📝 EXEMPLO REAL DE URL DO SUPABASE

```
postgresql://postgres:SuaSenhaAqui@db.xyzabc123456.supabase.co:5432/postgres
```

Onde:
- `postgres` = usuário (sempre postgres no Supabase)
- `SuaSenhaAqui` = sua senha do banco (definida na criação do projeto)
- `db.xyzabc123456.supabase.co` = host do seu projeto
- `5432` = porta padrão do PostgreSQL
- `postgres` = nome do banco de dados

## 🔧 COMO CORRIGIR AGORA

1. **Obtenha a URL correta** do seu provider (Supabase/Neon)
2. **Verifique** se tem todos os componentes:
   - Protocolo: `postgresql://`
   - Usuário: `postgres` (geralmente)
   - Senha: sua senha real
   - Host: endereço completo do servidor
   - Porta: `5432` ou `6543` (Supabase pooler)
   - Banco: `postgres` ou nome do seu banco

3. **Na página de Configurações**, cole a URL completa:
   ```
   postgresql://postgres:SUASENHA@db.SEUPROJETO.supabase.co:5432/postgres
   ```

4. **Clique em "Testar Conexão"** novamente

## 💡 DICA: Use Connection Pooler do Supabase

Se continuar com problemas, tente usar o **Connection Pooler**:
1. No Supabase, vá em Settings → Database
2. Procure por **Connection Pooling**
3. Ative o **Session Mode**
4. Use a URL do pooler (porta 6543):
   ```
   postgresql://postgres:SENHA@db.PROJETO.supabase.co:6543/postgres?pgbouncer=true
   ```

## 🆘 SE AINDA NÃO FUNCIONAR

1. Verifique se o projeto Supabase está ativo
2. Confirme que a senha está correta
3. Tente resetar a senha do banco no Supabase
4. Verifique se não há firewall bloqueando
5. Use a página `/debug.html` para mais detalhes do erro