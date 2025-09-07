-- =====================================================
-- QUERIES DE ANÁLISE PARA TABELA ESTOQUE
-- Execute estas queries no Supabase para análise
-- =====================================================

-- 1. VISÃO GERAL DO ESTOQUE
SELECT 
    COUNT(DISTINCT codigo_produto) as total_produtos_diferentes,
    COUNT(DISTINCT lote_industria_produto) as total_lotes,
    COUNT(DISTINCT armazem) as total_armazens,
    COUNT(*) as total_registros
FROM estoque;

-- 2. ANÁLISE POR PRODUTO
SELECT 
    codigo_produto,
    descricao_produto,
    COUNT(DISTINCT lote_industria_produto) as qtd_lotes,
    SUM(saldo_disponivel_produto) as total_disponivel,
    SUM(saldo_reservado_produto) as total_reservado,
    SUM(saldo_bloqueado_produto) as total_bloqueado,
    COUNT(DISTINCT armazem) as qtd_armazens
FROM estoque
GROUP BY codigo_produto, descricao_produto
ORDER BY total_disponivel DESC;

-- 3. ANÁLISE POR ARMAZÉM
SELECT 
    armazem,
    COUNT(DISTINCT codigo_produto) as produtos_diferentes,
    COUNT(DISTINCT lote_industria_produto) as lotes_diferentes,
    SUM(saldo_disponivel_produto) as total_disponivel,
    SUM(saldo_reservado_produto) as total_reservado,
    COUNT(*) as total_posicoes
FROM estoque
GROUP BY armazem
ORDER BY total_disponivel DESC;

-- 4. PRODUTOS COM MAIOR ESTOQUE
SELECT 
    descricao_produto,
    codigo_produto,
    SUM(saldo_disponivel_produto) as estoque_total,
    STRING_AGG(DISTINCT armazem, ', ') as armazens
FROM estoque
GROUP BY codigo_produto, descricao_produto
ORDER BY estoque_total DESC
LIMIT 10;

-- 5. ANÁLISE DE OCUPAÇÃO POR RUA
SELECT 
    armazem,
    rua,
    COUNT(DISTINCT local_produto) as posicoes_ocupadas,
    COUNT(DISTINCT codigo_produto) as produtos_diferentes,
    SUM(saldo_disponivel_produto) as total_na_rua
FROM estoque
GROUP BY armazem, rua
ORDER BY armazem, rua;

-- 6. LOTES COM MAIOR QUANTIDADE
SELECT 
    lote_industria_produto,
    descricao_produto,
    SUM(saldo_disponivel_produto) as qtd_total,
    COUNT(DISTINCT local_produto) as qtd_locais,
    STRING_AGG(DISTINCT CONCAT(armazem, ' - ', rua), ', ') as localizacoes
FROM estoque
GROUP BY lote_industria_produto, descricao_produto
ORDER BY qtd_total DESC
LIMIT 20;

-- 7. PRODUTOS COM SALDO RESERVADO
SELECT 
    codigo_produto,
    descricao_produto,
    lote_industria_produto,
    saldo_disponivel_produto,
    saldo_reservado_produto,
    armazem,
    rua,
    local_produto
FROM estoque
WHERE saldo_reservado_produto > 0
ORDER BY saldo_reservado_produto DESC;

-- 8. PRODUTOS COM SALDO BLOQUEADO
SELECT 
    codigo_produto,
    descricao_produto,
    lote_industria_produto,
    saldo_bloqueado_produto,
    armazem,
    rua,
    local_produto
FROM estoque
WHERE saldo_bloqueado_produto IS NOT NULL AND saldo_bloqueado_produto > 0
ORDER BY saldo_bloqueado_produto DESC;

-- 9. VERIFICAR EXEMPLO ESPECÍFICO (CAMP-D)
SELECT 
    codigo_produto,
    descricao_produto,
    lote_industria_produto,
    saldo_disponivel_produto,
    saldo_reservado_produto,
    saldo_bloqueado_produto,
    armazem,
    rua,
    local_produto
FROM estoque
WHERE descricao_produto LIKE '%CAMP-D%'
ORDER BY lote_industria_produto, local_produto;

-- 10. RESUMO ESTATÍSTICO
SELECT 
    'Total de SKUs' as metrica,
    COUNT(DISTINCT codigo_produto)::TEXT as valor
FROM estoque
UNION ALL
SELECT 
    'Total de Lotes',
    COUNT(DISTINCT lote_industria_produto)::TEXT
FROM estoque
UNION ALL
SELECT 
    'Total Disponível',
    SUM(saldo_disponivel_produto)::TEXT
FROM estoque
UNION ALL
SELECT 
    'Total Reservado',
    COALESCE(SUM(saldo_reservado_produto), 0)::TEXT
FROM estoque
UNION ALL
SELECT 
    'Total Bloqueado',
    COALESCE(SUM(saldo_bloqueado_produto), 0)::TEXT
FROM estoque;