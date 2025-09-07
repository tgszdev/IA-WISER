-- Script para criar a tabela knowledge_base no Supabase
-- Execute este SQL no Supabase SQL Editor

-- Criar tabela knowledge_base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance de busca
CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge_base(title);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_content ON knowledge_base USING GIN(to_tsvector('portuguese', content));

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_knowledge_base_updated_at 
    BEFORE UPDATE ON knowledge_base 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO knowledge_base (title, content, category, tags) VALUES
('Sobre a Empresa', 'Nossa empresa foi fundada em 2020 com o objetivo de democratizar o acesso à inteligência artificial. Trabalhamos com tecnologias de ponta para oferecer soluções inovadoras.', 'sobre', ARRAY['empresa', 'história', 'missão']),

('Planos e Preços', 'Oferecemos três planos principais: 
- Plano Básico: R$ 29/mês - Ideal para uso pessoal
- Plano Pro: R$ 79/mês - Para pequenas empresas
- Plano Enterprise: Preço sob consulta - Soluções personalizadas', 'vendas', ARRAY['preços', 'planos', 'assinatura']),

('Horário de Atendimento', 'Nosso suporte está disponível:
- Segunda a Sexta: 9h às 18h
- Sábados: 9h às 13h
- Domingos e feriados: Fechado
- Suporte prioritário 24/7 para planos Enterprise', 'suporte', ARRAY['horário', 'atendimento', 'suporte']),

('Política de Reembolso', 'Garantimos reembolso total em até 30 dias após a compra. Condições:
- Produto não pode ter sido usado em produção
- Solicitação deve ser feita pelo mesmo email da compra
- Reembolso processado em até 5 dias úteis', 'financeiro', ARRAY['reembolso', 'garantia', 'devolução']),

('Recursos do Sistema', 'Nosso sistema oferece:
- Integração com IA avançada
- Dashboard personalizado
- API RESTful completa
- Suporte a múltiplos idiomas
- Backup automático diário', 'produto', ARRAY['recursos', 'funcionalidades', 'sistema']),

('Segurança e Privacidade', 'Levamos segurança a sério:
- Criptografia de ponta a ponta
- Conformidade com LGPD
- Certificação ISO 27001
- Auditorias de segurança trimestrais
- Seus dados nunca são compartilhados', 'segurança', ARRAY['privacidade', 'lgpd', 'segurança']),

('Como Começar', 'Para começar a usar nosso sistema:
1. Crie sua conta gratuitamente
2. Escolha seu plano
3. Configure sua API key
4. Faça a integração
5. Comece a usar!', 'tutorial', ARRAY['início', 'tutorial', 'configuração']);

-- Verificar se os dados foram inseridos
SELECT COUNT(*) as total_registros FROM knowledge_base;