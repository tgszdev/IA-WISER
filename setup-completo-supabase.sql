-- =====================================================
-- SCRIPT COMPLETO DE SETUP DO BANCO SUPABASE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. CRIAR A TABELA (se não existir)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge_base(title);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_content ON knowledge_base USING GIN(to_tsvector('portuguese', content));

-- 3. DESABILITAR RLS (Row Level Security) para permitir leitura
ALTER TABLE knowledge_base DISABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICA DE LEITURA PÚBLICA (caso RLS seja reativado)
DROP POLICY IF EXISTS "Allow public read" ON knowledge_base;
CREATE POLICY "Allow public read" ON knowledge_base
    FOR SELECT
    USING (true);

-- 5. LIMPAR DADOS ANTIGOS (OPCIONAL - descomente se quiser limpar)
-- TRUNCATE TABLE knowledge_base;

-- 6. INSERIR DADOS SOBRE WMS E ESTOQUE
INSERT INTO knowledge_base (title, content, category, tags) VALUES
(
    'O que é WMS - Warehouse Management System',
    'WMS (Warehouse Management System) é um sistema de gerenciamento de armazém que controla e otimiza as operações de estoque. Principais funções: controle de entrada e saída de produtos, gestão de localização de itens, picking e packing, inventário em tempo real, rastreabilidade completa, integração com ERPs, relatórios gerenciais. Benefícios: redução de erros, aumento de produtividade, melhor utilização do espaço, visibilidade total do estoque.',
    'WMS',
    ARRAY['wms', 'warehouse', 'sistema', 'armazém', 'gestão']
),
(
    'Funcionalidades do Sistema WMS',
    'Nosso WMS oferece: 1) Recebimento - conferência automática, etiquetagem, alocação inteligente. 2) Armazenagem - endereçamento automático, otimização de espaço, controle FIFO/LIFO. 3) Separação - picking por onda, batch ou ordem, roteirização otimizada. 4) Expedição - conferência final, geração de documentos, rastreamento. 5) Inventário - contagem cíclica, inventário rotativo, acuracidade em tempo real. 6) Dashboards - KPIs em tempo real, alertas automáticos.',
    'Funcionalidades',
    ARRAY['wms', 'funcionalidades', 'recursos', 'picking', 'inventário']
),
(
    'Controle de Estoque Avançado',
    'Sistema de controle de estoque com: rastreabilidade por lote, validade e número de série. Gestão multi-armazém e multi-empresa. Reserva automática de estoque. Controle de produtos perigosos e controlados. Gestão de devoluções e avarias. Cross-docking e transbordo. Integração com balanças e coletores. Suporte a código de barras, QR Code e RFID. Alertas de ruptura e excesso de estoque.',
    'Estoque',
    ARRAY['estoque', 'controle', 'inventário', 'rastreabilidade', 'lote']
),
(
    'Indicadores e KPIs do WMS',
    'Principais indicadores do sistema: Acuracidade de inventário (meta: 99,5%). Giro de estoque. Tempo médio de recebimento. Produtividade de separação (pedidos/hora). Taxa de erro na expedição. Ocupação do armazém. Custo por pedido processado. Lead time de atendimento. Nível de serviço (OTIF - On Time In Full). Todos os KPIs disponíveis em tempo real no dashboard.',
    'KPIs',
    ARRAY['kpi', 'indicadores', 'métricas', 'dashboard', 'relatórios']
),
(
    'Integração com ERPs e Sistemas',
    'O WMS integra nativamente com: SAP, Oracle, TOTVS, Microsoft Dynamics, Salesforce. Métodos de integração: API REST, Web Services SOAP, EDI, arquivos XML/JSON/CSV. Sincronização em tempo real ou batch. Mapeamento automático de campos. Log completo de todas as transações. Reprocessamento automático em caso de falha. Suporte a múltiplas integrações simultâneas.',
    'Integração',
    ARRAY['integração', 'erp', 'api', 'sap', 'totvs']
),
(
    'Processo de Recebimento no WMS',
    'Fluxo de recebimento: 1) Agendamento de descarga. 2) Conferência cega ou com pedido de compra. 3) Identificação e etiquetagem. 4) Inspeção de qualidade (se aplicável). 5) Registro de divergências. 6) Alocação automática baseada em regras (ABC, rotatividade). 7) Armazenagem direcionada. 8) Confirmação e atualização do estoque. Tempo médio: 30 minutos por carga.',
    'Processos',
    ARRAY['recebimento', 'conferência', 'processo', 'descarga']
),
(
    'Processo de Picking e Separação',
    'Estratégias de picking disponíveis: Picking discreto (ordem por ordem). Picking por lote (múltiplas ordens). Picking por zona. Picking por onda. Voice picking e pick-to-light opcionais. Otimização de rota reduz tempo em até 40%. Conferência em tempo real. Reabastecimento automático de picking. Priorização por urgência/cliente VIP.',
    'Processos',
    ARRAY['picking', 'separação', 'pedidos', 'expedição']
),
(
    'Custos e ROI do WMS',
    'Investimento: Licença a partir de R$ 2.000/mês. Implantação: R$ 15.000 a R$ 50.000 dependendo da complexidade. ROI médio: 6 a 12 meses. Redução de custos: 20-30% em mão de obra, 15-25% em erros de expedição, 30-40% em tempo de processamento. Aumento de produtividade: 25-35%. Melhoria na acuracidade: de 85% para 99,5%. Redução de devoluções em 50%.',
    'Custos',
    ARRAY['custos', 'preço', 'roi', 'investimento', 'retorno']
),
(
    'Suporte e Treinamento WMS',
    'Suporte técnico 24/7 via telefone, chat e email. SLA de atendimento: crítico 1h, alto 4h, médio 8h, baixo 24h. Treinamento completo na implantação (40 horas). Reciclagem trimestral. Material didático e vídeos disponíveis. Ambiente de homologação para testes. Atualizações mensais do sistema. Backup automático diário. Disaster recovery com RPO de 1 hora.',
    'Suporte',
    ARRAY['suporte', 'treinamento', 'sla', 'atendimento']
),
(
    'Segurança e Compliance',
    'Segurança: Criptografia AES-256. Autenticação multi-fator. Controle de acesso por perfil. Auditoria completa de todas as ações. Compliance: ISO 27001, LGPD, ANVISA (para farmacêuticos), Receita Federal (para produtos controlados). Segregação de ambientes. Testes de penetração semestrais. Certificado SSL. Redundância de dados.',
    'Segurança',
    ARRAY['segurança', 'compliance', 'lgpd', 'auditoria']
);

-- 7. VERIFICAR SE OS DADOS FORAM INSERIDOS
SELECT COUNT(*) as total_registros FROM knowledge_base;

-- 8. MOSTRAR AMOSTRA DOS DADOS
SELECT title, category, array_length(tags, 1) as num_tags 
FROM knowledge_base 
ORDER BY created_at DESC
LIMIT 5;

-- 9. MENSAGEM DE SUCESSO
DO $$
BEGIN
  RAISE NOTICE 'Setup concluído com sucesso! Tabela knowledge_base criada e populada com dados sobre WMS.';
END $$;