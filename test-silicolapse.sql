-- Script SQL para inserir dados específicos do Silicolapse 1321
-- Execute este script no Supabase SQL Editor

-- Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Limpar dados antigos (OPCIONAL - remova esta linha se quiser manter dados existentes)
-- TRUNCATE TABLE knowledge_base;

-- Inserir informações sobre o Silicolapse 1321
INSERT INTO knowledge_base (title, content, category, tags) VALUES
(
    'Silicolapse 1321 - Informações do Produto',
    'O Silicolapse 1321 é um produto revolucionário desenvolvido pela nossa empresa. É um sistema avançado de gerenciamento de dados com tecnologia de ponta. Principais características: 1) Processamento ultra-rápido, 2) Interface intuitiva, 3) Segurança de nível militar, 4) Compatibilidade total com sistemas legados. Preço: R$ 4.999,00 para licença básica.',
    'Produtos',
    ARRAY['silicolapse', 'produto', '1321', 'sistema']
),
(
    'Especificações Técnicas - Silicolapse 1321',
    'Especificações do Silicolapse 1321: Processador mínimo: Intel i5 8ª geração ou AMD Ryzen 5. Memória RAM: 8GB mínimo, 16GB recomendado. Espaço em disco: 500GB SSD. Sistema operacional: Windows 10/11, Linux Ubuntu 20.04+, macOS 11+. Conectividade: Internet banda larga mínimo 10Mbps. Portas necessárias: 443, 8080, 3306.',
    'Especificações',
    ARRAY['silicolapse', '1321', 'especificações', 'requisitos']
),
(
    'Suporte e Garantia - Silicolapse 1321',
    'O Silicolapse 1321 possui garantia de 2 anos contra defeitos de fabricação. Suporte técnico disponível 24/7 através do telefone 0800-123-4567 ou email suporte@silicolapse.com. Atualizações gratuitas durante o primeiro ano. Treinamento incluído na compra. Manual completo disponível em PDF.',
    'Suporte',
    ARRAY['silicolapse', '1321', 'garantia', 'suporte']
),
(
    'Casos de Uso - Silicolapse 1321',
    'O Silicolapse 1321 é ideal para: empresas de médio e grande porte, instituições financeiras, hospitais e clínicas, universidades, órgãos governamentais. Já foi implementado com sucesso em mais de 500 organizações no Brasil. Redução média de 40% nos custos operacionais. ROI médio em 6 meses.',
    'Casos de Uso',
    ARRAY['silicolapse', '1321', 'casos', 'empresas']
),
(
    'Vantagens do Silicolapse 1321',
    'Principais vantagens do Silicolapse 1321: 1) Economia de até 40% em custos operacionais, 2) Aumento de 60% na produtividade, 3) Redução de 80% em erros manuais, 4) Integração com mais de 100 sistemas diferentes, 5) Dashboards em tempo real, 6) Relatórios automáticos, 7) Backup automático na nuvem.',
    'Vantagens',
    ARRAY['silicolapse', '1321', 'vantagens', 'benefícios']
);

-- Verificar se os dados foram inseridos
SELECT COUNT(*) as total_registros FROM knowledge_base WHERE title LIKE '%Silicolapse%';
SELECT title, category FROM knowledge_base WHERE title LIKE '%Silicolapse%';