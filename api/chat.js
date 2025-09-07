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
      console.log('🔄 Buscando dados do estoque via Supabase...');
      estoqueData = await getEstoqueData(100);
      
      if (estoqueData && estoqueData.length > 0) {
        console.log(`✅ ${estoqueData.length} produtos carregados do estoque`);
        dbStatus = 'connected';
        
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
    let systemPrompt = `Você é o Wiser IA Assistant, um assistente especializado em gerenciamento de estoque.
    
${estoqueData.length > 0 ? `
📦 DADOS REAIS DO ESTOQUE (${estoqueData.length} produtos):
=====================================
${JSON.stringify(estoqueData, null, 2)}
=====================================

INSTRUÇÕES IMPORTANTES:
1. Use SEMPRE os dados acima para responder sobre o estoque
2. Cite produtos específicos, quantidades e informações exatas
3. Se perguntado sobre um produto que não está na lista, informe que não está no estoque
4. Forneça análises detalhadas quando solicitado
5. Sempre responda em português do Brasil

CAPACIDADES:
- Listar produtos disponíveis
- Informar quantidades em estoque
- Buscar produtos por nome ou categoria
- Calcular totais e estatísticas
- Sugerir produtos relacionados
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

    // Gerar resposta com o Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([systemPrompt, message]);
    const response = await result.response;
    let text = response.text();

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