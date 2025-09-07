-- Função para executar queries dinâmicas de forma segura
-- Execute este SQL no Supabase SQL Editor

-- Primeiro, criar a função
CREATE OR REPLACE FUNCTION execute_safe_query(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Verificar se é uma query SELECT (segurança)
    IF NOT (query_text ~* '^\s*SELECT') THEN
        RAISE EXCEPTION 'Apenas queries SELECT são permitidas';
    END IF;
    
    -- Bloquear comandos perigosos
    IF query_text ~* '(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)' THEN
        RAISE EXCEPTION 'Comando não permitido';
    END IF;
    
    -- Executar a query e retornar como JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
    
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar erro como JSON
        RETURN json_build_object(
            'error', true,
            'message', SQLERRM
        );
END;
$$;

-- Dar permissão para anon usar a função
GRANT EXECUTE ON FUNCTION execute_safe_query TO anon;

-- Criar uma versão simplificada para queries específicas
CREATE OR REPLACE FUNCTION get_product_balance(product_code text)
RETURNS TABLE(
    codigo_produto text,
    descricao_produto text,
    total_disponivel numeric,
    total_lotes bigint,
    lotes json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.codigo_produto,
        MAX(e.descricao_produto) as descricao_produto,
        SUM(e.saldo_disponivel_produto::numeric) as total_disponivel,
        COUNT(*) as total_lotes,
        json_agg(json_build_object(
            'lote', e.lote_industria_produto,
            'saldo', e.saldo_disponivel_produto,
            'armazem', e.armazem
        )) as lotes
    FROM estoque e
    WHERE e.codigo_produto = product_code
    GROUP BY e.codigo_produto;
END;
$$;

-- Dar permissão
GRANT EXECUTE ON FUNCTION get_product_balance TO anon;

-- Função para obter estatísticas gerais
CREATE OR REPLACE FUNCTION get_inventory_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_registros', COUNT(*),
        'produtos_unicos', COUNT(DISTINCT codigo_produto),
        'saldo_total', SUM(saldo_disponivel_produto::numeric),
        'saldo_reservado', SUM(saldo_reservado_produto::numeric),
        'armazens', json_agg(DISTINCT armazem)
    ) INTO stats
    FROM estoque;
    
    RETURN stats;
END;
$$;

-- Dar permissão
GRANT EXECUTE ON FUNCTION get_inventory_stats TO anon;