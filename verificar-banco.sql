-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DO BANCO
-- Execute após o setup para confirmar que está tudo OK
-- =====================================================

-- 1. Verificar se a tabela existe
SELECT 
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
    ) as tabela_existe;

-- 2. Contar total de registros
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT category) as categorias_diferentes
FROM knowledge_base;

-- 3. Mostrar todas as categorias e quantidade
SELECT 
    category,
    COUNT(*) as quantidade
FROM knowledge_base
GROUP BY category
ORDER BY quantidade DESC;

-- 4. Testar busca por "WMS"
SELECT 
    title,
    LEFT(content, 100) || '...' as preview_conteudo
FROM knowledge_base
WHERE 
    LOWER(title) LIKE '%wms%' 
    OR LOWER(content) LIKE '%wms%'
LIMIT 3;

-- 5. Testar busca por "estoque"
SELECT 
    title,
    LEFT(content, 100) || '...' as preview_conteudo
FROM knowledge_base
WHERE 
    LOWER(title) LIKE '%estoque%' 
    OR LOWER(content) LIKE '%estoque%'
LIMIT 3;

-- 6. Verificar se RLS está desabilitado
SELECT 
    relname as tabela,
    relrowsecurity as rls_ativo
FROM pg_class
WHERE relname = 'knowledge_base';

-- 7. Listar todos os títulos disponíveis
SELECT 
    id,
    title,
    category
FROM knowledge_base
ORDER BY id;

-- Mensagem final
SELECT 'VERIFICAÇÃO COMPLETA! Se você vê dados acima, o banco está pronto para uso.' as status;