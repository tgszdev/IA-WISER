// Chat API com integração Supabase usando NEXT_PUBLIC_ (método que funcionou)
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEstoqueData } from './supabase-client.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    }

    console.log('📨 Processando mensagem:', message);

    // Buscar dados do estoque usando Supabase Client (método NEXT_PUBLIC_)
    let estoqueData = [];
    let dbStatus = 'not_connected';
    
    try {
      console.log('🔄 Buscando TODOS os dados do estoque via Supabase (sem limite)...');
      estoqueData = await getEstoqueData(); // Sem limite - busca todos os registros
      
      if (estoqueData && estoqueData.length > 0) {
        console.log(`✅ ${estoqueData.length} produtos carregados do estoque`);
        dbStatus = 'connected';
        
        // Validar e limpar dados
        estoqueData = estoqueData.map(item => ({
          ...item,
          saldo_disponivel_produto: parseFloat(item.saldo_disponivel_produto) || 0,
          saldo_reservado_produto: parseFloat(item.saldo_reservado_produto) || 0,
          saldo_bloqueado_produto: item.saldo_bloqueado_produto === 'Vencido' || item.saldo_bloqueado_produto === 'Avaria' 
            ? item.saldo_bloqueado_produto 
            : (parseFloat(item.saldo_bloqueado_produto) || 0)
        }));
        
        // Calcular estatísticas corretas
        const totalGeral = estoqueData.reduce((sum, p) => sum + p.saldo_disponivel_produto, 0);
        const produtosCodigos = [...new Set(estoqueData.map(p => p.codigo_produto))];
        
        console.log('📊 Estatísticas do estoque:');
        console.log(`  - Total de registros: ${estoqueData.length}`);
        console.log(`  - Produtos únicos: ${produtosCodigos.length}`);
        console.log(`  - Saldo total disponível: ${totalGeral.toFixed(2)} unidades`);
        
        // Log dos primeiros produtos para debug
        console.log('Amostra dos dados:', estoqueData.slice(0, 3));
      } else {
        console.log('⚠️ Nenhum produto encontrado no estoque');
        dbStatus = 'empty';
      }
    } catch (dbError) {
      console.error('❌ Erro ao conectar com Supabase:', dbError);
      dbStatus = 'error';
    }

    // Criar contexto do sistema com os dados do estoque
    let systemPrompt = `Você é o Wiser IA Assistant, um assistente especializado em gerenciamento de estoque com acesso COMPLETO a TODOS os dados.
    
${estoqueData.length > 0 ? `
📦 DADOS COMPLETOS DO ESTOQUE (TODOS OS ${estoqueData.length} REGISTROS):
=====================================
${JSON.stringify(estoqueData, null, 2)}
=====================================

INSTRUÇÕES PARA RESPOSTAS ORGANIZADAS E LÓGICAS:

1. ANÁLISE DOS DADOS:
   - Você tem acesso a TODOS os ${estoqueData.length} registros do estoque
   - SEMPRE procure nos dados fornecidos antes de responder
   - NUNCA invente informações - use apenas os dados reais

2. ORGANIZAÇÃO DA RESPOSTA:
   - Comece com um título claro do que está respondendo
   - Use formatação markdown para melhor legibilidade
   - Organize informações em tópicos ou tabelas quando apropriado
   - Sempre forneça números exatos dos dados

3. CÁLCULOS PRECISOS:
   - Para saldo de produto: SOME saldo_disponivel_produto de todos os lotes
   - Para totais: AGRUPE por código_produto e depois some
   - Ignore textos "Vencido"/"Avaria" em campos numéricos
   - Formate números no padrão brasileiro (1.234,56)

4. ESTRUTURA LÓGICA:
   - Resposta direta primeiro (o que foi perguntado)
   - Detalhes relevantes em seguida
   - Informações adicionais úteis por último
   - Sempre em português do Brasil

5. EXEMPLO DE RESPOSTA ORGANIZADA:
   "📦 **Produto X - Descrição**
   
   **Saldo Total**: X.XXX unidades
   **Lotes**: XX diferentes
   **Localização**: Armazém Y
   
   **Detalhes por Lote**:
   1. Lote ABC: XXX unidades
   2. Lote DEF: XXX unidades
   ..."

CAPACIDADES COM DADOS COMPLETOS:
- Acesso a TODOS os ${estoqueData.length} registros do estoque
- Buscar qualquer produto por código ou descrição
- Calcular saldos totais somando todos os lotes
- Listar todos os lotes de um produto
- Analisar produtos vencidos ou com avaria
- Estatísticas completas do inventário
` : `
⚠️ ATENÇÃO: Não foi possível carregar os dados do estoque.

Possíveis causas:
1. As credenciais do Supabase não estão configuradas (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)
2. A tabela 'estoque' não existe ou está vazia
3. Problema de conectividade com o banco de dados

Por favor, verifique as configurações no Vercel.
`}

Responda sempre em português do Brasil de forma clara, profissional e útil.`;

    // Verificar se tem Google API Key
    if (!process.env.GOOGLE_API_KEY) {
      console.log('❌ Google API Key não encontrada');
      return res.status(200).json({
        response: `⚠️ API do Google não configurada!

Para configurar:
1. Obtenha sua API key em: https://aistudio.google.com
2. No Vercel, adicione GOOGLE_API_KEY nas Environment Variables
3. Faça redeploy do projeto

Status do banco: ${dbStatus}
Produtos no estoque: ${estoqueData.length}`,
        estoqueLoaded: false,
        dbStatus
      });
    }

    // SEMPRE usar IA para processar TODOS os dados sem limitação
    console.log(`🤖 Enviando TODOS os ${estoqueData.length} registros para a IA processar...`);
    
    let text = '';
    
    try {
      // Usar o modelo mais recente e poderoso do Gemini
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      });
      
      // Criar prompt completo com TODOS os dados
      const fullPrompt = systemPrompt + '\n\n' + 
                        'PERGUNTA DO USUÁRIO: ' + message + '\n\n' +
                        'RESPONDA DE FORMA ORGANIZADA E LÓGICA USANDO OS DADOS FORNECIDOS.';
      
      console.log(`📤 Processando com IA: ${estoqueData.length} registros completos`);
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      text = response.text();
      console.log('✅ IA processou todos os dados e gerou resposta organizada');
      
    } catch (aiError) {
      console.error('❌ Erro ao processar com IA:', aiError);
      
      // Fallback básico apenas se a IA falhar
      if (estoqueData.length > 0) {
        text = `⚠️ Erro ao processar com IA.\n\n`;
        text += `Informações disponíveis:\n`;
        text += `- Total de registros: ${estoqueData.length}\n`;
        text += `- Produtos únicos: ${[...new Set(estoqueData.map(p => p.codigo_produto))].length}\n`;
        text += `\nPor favor, verifique se a GOOGLE_API_KEY está configurada no Vercel.`;
      } else {
        throw aiError;
      }
    }

    // Adicionar indicador se usou dados do banco
    if (estoqueData.length > 0) {
      text += "\n\n📊 *[Resposta baseada em dados reais do estoque]*";
    }

    res.status(200).json({ 
      response: text,
      estoqueLoaded: estoqueData.length > 0,
      totalProdutos: estoqueData.length,
      dbStatus
    });

  } catch (error) {
    console.error('❌ Erro na API do Chat:', error);
    
    let errorMessage = 'Erro ao processar mensagem';
    
    if (error.message?.includes('API_KEY_INVALID')) {
      errorMessage = 'API Key do Google inválida. Verifique a configuração.';
    } else if (error.message?.includes('401')) {
      errorMessage = 'Erro de autenticação. Verifique as credenciais do Supabase.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      estoqueLoaded: false
    });
  }
}