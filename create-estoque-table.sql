-- =====================================================
-- SCRIPT PARA CRIAR TABELA DE ESTOQUE NO SUPABASE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. CRIAR A TABELA ESTOQUE (se não existir)
CREATE TABLE IF NOT EXISTS estoque (
    id SERIAL PRIMARY KEY,
    codigo_produto VARCHAR(50) NOT NULL,
    descricao_produto VARCHAR(255) NOT NULL,
    saldo_disponivel_produto NUMERIC(15,2) DEFAULT 0,
    saldo_bloqueado_produto VARCHAR(50),
    lote_industria_produto VARCHAR(50),
    local_produto VARCHAR(100),
    armazem VARCHAR(50),
    preco_unitario NUMERIC(15,2) DEFAULT 0,
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    categoria VARCHAR(50),
    data_validade DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_estoque_codigo ON estoque(codigo_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_descricao ON estoque(descricao_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_local ON estoque(local_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_armazem ON estoque(armazem);
CREATE INDEX IF NOT EXISTS idx_estoque_categoria ON estoque(categoria);
CREATE INDEX IF NOT EXISTS idx_estoque_saldo_bloqueado ON estoque(saldo_bloqueado_produto);

-- 3. DESABILITAR RLS (Row Level Security) para permitir leitura
ALTER TABLE estoque DISABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICA DE LEITURA PÚBLICA (caso RLS seja reativado)
DROP POLICY IF EXISTS "Allow public read" ON estoque;
CREATE POLICY "Allow public read" ON estoque
    FOR SELECT
    USING (true);

-- 5. FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. TRIGGER PARA ATUALIZAR updated_at
DROP TRIGGER IF EXISTS update_estoque_updated_at ON estoque;
CREATE TRIGGER update_estoque_updated_at 
    BEFORE UPDATE ON estoque 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. LIMPAR DADOS ANTIGOS (OPCIONAL - descomente se quiser limpar)
-- TRUNCATE TABLE estoque;

-- 8. INSERIR DADOS DE EXEMPLO PARA TESTE
INSERT INTO estoque (
    codigo_produto, 
    descricao_produto, 
    saldo_disponivel_produto, 
    saldo_bloqueado_produto,
    lote_industria_produto,
    local_produto,
    armazem,
    preco_unitario,
    unidade_medida,
    categoria,
    data_validade
) VALUES
-- Produtos normais
('PROD-001', 'Notebook Dell Inspiron 15', 45, NULL, 'LT2024001', 'A-01-01', 'PRINCIPAL', 3500.00, 'UN', 'ELETRÔNICOS', NULL),
('PROD-002', 'Mouse Logitech MX Master', 120, NULL, 'LT2024002', 'B-02-05', 'PRINCIPAL', 250.00, 'UN', 'PERIFÉRICOS', NULL),
('PROD-003', 'Teclado Mecânico Razer', 30, NULL, 'LT2024003', 'B-02-06', 'PRINCIPAL', 450.00, 'UN', 'PERIFÉRICOS', NULL),
('PROD-004', 'Monitor LG 27" 4K', 15, NULL, 'LT2024004', 'C-03-01', 'PRINCIPAL', 1800.00, 'UN', 'MONITORES', NULL),
('PROD-005', 'Cadeira Gamer ThunderX3', 25, NULL, 'LT2024005', 'D-01-01', 'SECUNDÁRIO', 1200.00, 'UN', 'MÓVEIS', NULL),

-- Produtos com saldo baixo
('PROD-006', 'Webcam Logitech C920', 8, NULL, 'LT2024006', 'B-03-02', 'PRINCIPAL', 350.00, 'UN', 'PERIFÉRICOS', NULL),
('PROD-007', 'Headset HyperX Cloud', 5, NULL, 'LT2024007', 'B-03-03', 'PRINCIPAL', 400.00, 'UN', 'ÁUDIO', NULL),

-- Produtos com avaria
('PROD-008', 'Impressora HP LaserJet', 10, 'Avaria', 'LT2024008', 'E-01-01', 'QUARENTENA', 1500.00, 'UN', 'IMPRESSORAS', NULL),
('PROD-009', 'Scanner Epson Workforce', 3, 'Avaria', 'LT2024009', 'E-01-02', 'QUARENTENA', 800.00, 'UN', 'SCANNERS', NULL),

-- Produtos vencidos (para produtos com validade)
('PROD-010', 'Cartucho de Tinta HP', 50, 'Vencido', 'LT2023010', 'F-01-01', 'DESCARTE', 80.00, 'UN', 'SUPRIMENTOS', '2024-01-15'),
('PROD-011', 'Papel Sulfite A4', 200, 'Vencido', 'LT2023011', 'F-01-02', 'DESCARTE', 25.00, 'PCT', 'PAPELARIA', '2024-02-20'),

-- Produtos em múltiplos locais
('PROD-012', 'Cabo HDMI 2.0', 100, NULL, 'LT2024012', 'G-01-01', 'PRINCIPAL', 30.00, 'UN', 'CABOS', NULL),
('PROD-012', 'Cabo HDMI 2.0', 50, NULL, 'LT2024013', 'G-01-02', 'SECUNDÁRIO', 30.00, 'UN', 'CABOS', NULL),

-- Produtos com código numérico simples (para teste)
('123', 'Produto Teste 123', 100, NULL, 'LT2024100', 'Z-01-01', 'TESTE', 50.00, 'UN', 'TESTE', NULL),
('456', 'Produto Teste 456', 75, NULL, 'LT2024101', 'Z-01-02', 'TESTE', 75.00, 'UN', 'TESTE', NULL),
('789', 'Produto Teste 789', 20, 'Avaria', 'LT2024102', 'Z-01-03', 'TESTE', 100.00, 'UN', 'TESTE', NULL),

-- Produtos de alto valor
('PROD-020', 'Servidor Dell PowerEdge', 5, NULL, 'LT2024020', 'H-01-01', 'DATACENTER', 25000.00, 'UN', 'SERVIDORES', NULL),
('PROD-021', 'Storage NetApp 10TB', 3, NULL, 'LT2024021', 'H-01-02', 'DATACENTER', 45000.00, 'UN', 'STORAGE', NULL),

-- Produtos com estoque zero
('PROD-030', 'Tablet Samsung Galaxy Tab', 0, NULL, 'LT2024030', 'I-01-01', 'PRINCIPAL', 2000.00, 'UN', 'TABLETS', NULL),
('PROD-031', 'Apple iPad Pro 12.9', 0, NULL, 'LT2024031', 'I-01-02', 'PRINCIPAL', 8000.00, 'UN', 'TABLETS', NULL);

-- 9. CRIAR VIEW PARA RESUMO DO ESTOQUE
CREATE OR REPLACE VIEW vw_resumo_estoque AS
SELECT 
    COUNT(DISTINCT codigo_produto) as total_produtos,
    SUM(saldo_disponivel_produto) as total_unidades,
    SUM(saldo_disponivel_produto * preco_unitario) as valor_total_estoque,
    COUNT(CASE WHEN saldo_bloqueado_produto = 'Avaria' THEN 1 END) as produtos_com_avaria,
    COUNT(CASE WHEN saldo_bloqueado_produto = 'Vencido' THEN 1 END) as produtos_vencidos,
    COUNT(CASE WHEN saldo_disponivel_produto < 10 THEN 1 END) as produtos_estoque_baixo,
    COUNT(CASE WHEN saldo_disponivel_produto = 0 THEN 1 END) as produtos_sem_estoque
FROM estoque;

-- 10. VERIFICAR SE OS DADOS FORAM INSERIDOS
SELECT COUNT(*) as total_registros FROM estoque;

-- 11. MOSTRAR RESUMO
SELECT * FROM vw_resumo_estoque;

-- 12. MOSTRAR AMOSTRA DOS DADOS
SELECT 
    codigo_produto, 
    descricao_produto, 
    saldo_disponivel_produto,
    saldo_bloqueado_produto,
    local_produto,
    armazem
FROM estoque 
ORDER BY created_at DESC
LIMIT 10;

-- 13. MENSAGEM DE SUCESSO
DO $$
BEGIN
  RAISE NOTICE '✅ Setup concluído com sucesso! Tabela ESTOQUE criada e populada com dados de teste.';
  RAISE NOTICE '📊 Execute SELECT * FROM vw_resumo_estoque; para ver o resumo do inventário.';
END $$;