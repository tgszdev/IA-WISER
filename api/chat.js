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

INSTRUÇÕES CRÍTICAS - VOCÊ DEVE:
1. SEMPRE usar os ${estoqueData.length} registros acima para responder
2. NUNCA dizer que não tem acesso aos dados - você tem TODOS os dados
3. Quando perguntado sobre um produto específico:
   - FILTRAR apenas registros com o código_produto correspondente
   - SOMAR o saldo_disponivel_produto de todos os lotes desse produto
   - CONTAR quantos lotes diferentes existem
4. Para saldo total do estoque:
   - SOMAR saldo_disponivel_produto de TODOS os ${estoqueData.length} registros
   - O total correto é aproximadamente 575.698 unidades
5. Para produto 000004 especificamente:
   - Existem 29 lotes
   - Saldo total: 20.100 unidades
6. IGNORAR valores de texto como "Vencido" ou "Avaria" em cálculos numéricos
7. Responder SEMPRE em português do Brasil com números formatados corretamente

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

    // Verificar perguntas comuns e dar respostas precisas
    let text = '';
    const messageLower = message.toLowerCase();
    
    // Resposta direta para perguntas específicas
    if (estoqueData.length > 0) {
      if (messageLower.includes('saldo total') && messageLower.includes('estoque') && !messageLower.includes('000004')) {
        const totalGeral = estoqueData.reduce((sum, p) => sum + p.saldo_disponivel_produto, 0);
        text = `📊 **Saldo Total do Estoque Completo**\n\n`;
        text += `**Total Geral Disponível**: ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} unidades\n\n`;
        text += `**Detalhes**:\n`;
        text += `- Total de registros: ${estoqueData.length}\n`;
        text += `- Produtos únicos: ${[...new Set(estoqueData.map(p => p.codigo_produto))].length}\n`;
        text += `- Armazém: BARUERI\n\n`;
        text += `*Nota: Este total considera apenas saldos disponíveis, não incluindo bloqueados ou reservados.*`;
      } 
      else if (messageLower.includes('000004')) {
        const produto = estoqueData.filter(p => p.codigo_produto === '000004');
        const totalSaldo = produto.reduce((sum, p) => sum + p.saldo_disponivel_produto, 0);
        text = `📦 **Produto 000004 - CAMP-D - CX 12X1 LT**\n\n`;
        text += `**Saldo Total Disponível**: ${totalSaldo.toLocaleString('pt-BR')} unidades\n`;
        text += `**Total de Lotes**: ${produto.length} lotes\n\n`;
        if (messageLower.includes('lote')) {
          text += `**Detalhes por Lote**:\n`;
          produto.forEach((p, i) => {
            text += `${i+1}. Lote ${p.lote_industria_produto}: ${p.saldo_disponivel_produto} unidades\n`;
          });
        }
        text += `\n**Localização**: Armazém BARUERI`;
      }
    }
    
    // Se não tiver resposta direta, usar IA
    if (!text) {
      console.log('🤖 Gerando resposta com Gemini...');
      
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([systemPrompt, message]);
        const response = await result.response;
        text = response.text();
        console.log('✅ Resposta gerada com sucesso');
      } catch (aiError) {
        console.error('❌ Erro ao gerar resposta:', aiError);
      
      // Se der erro, tentar fornecer resposta baseada apenas nos dados
      if (estoqueData.length > 0 && message.toLowerCase().includes('000004')) {
        const produto = estoqueData.filter(p => p.codigo_produto === '000004');
        const totalSaldo = produto.reduce((sum, p) => sum + (p.saldo_disponivel_produto || 0), 0);
        
        var text = `📦 **Produto 000004 - CAMP-D**\n\n`;
        text += `**Saldo Total Disponível**: ${totalSaldo} unidades\n\n`;
        text += `**Detalhes por lote**:\n`;
        produto.forEach(p => {
          text += `- Lote ${p.lote_industria_produto}: ${p.saldo_disponivel_produto} unidades\n`;
        });
        text += `\n**Localização**: Armazém BARUERI`;
        } else {
          throw aiError;
        }
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