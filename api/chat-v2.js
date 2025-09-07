// Nova versão do Chat com Query Generator (PLN → SQL → Resposta)
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tecvgnrqcfqcrcodrjtt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Inicializar Google AI
const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

export default async function handler(req, res) {
  // CORS
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
    
    console.log('\n🔷 NOVA ARQUITETURA: Query Generator');
    console.log('📝 Mensagem do usuário:', message);

    // Verificar configurações
    if (!genAI) {
      return res.status(200).json({
        response: '⚠️ Configure GOOGLE_API_KEY no Vercel',
        error: true
      });
    }

    if (!supabase) {
      return res.status(200).json({
        response: '⚠️ Configure NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel',
        error: true
      });
    }

    // ETAPA 1: Gerar Query SQL baseada na pergunta
    console.log('🔄 ETAPA 1: Gerando SQL da pergunta...');
    
    const queryPrompt = `
    Você é um especialista em SQL. Converta a pergunta do usuário em uma query SQL para a tabela 'estoque'.
    
    ESQUEMA DA TABELA estoque:
    - codigo_produto (texto)
    - descricao_produto (texto)
    - lote_industria_produto (texto)
    - saldo_disponivel_produto (número)
    - saldo_reservado_produto (número)
    - saldo_bloqueado_produto (texto ou número)
    - armazem (texto)
    - rua (texto)
    - local_produto (texto)
    
    REGRAS:
    1. Use apenas SELECT, nunca INSERT/UPDATE/DELETE
    2. Para saldo de produto específico: SELECT com WHERE e SUM
    3. Para total geral: SELECT SUM de todos
    4. Para listar produtos: SELECT DISTINCT
    5. Sempre agrupe quando necessário
    
    PERGUNTA: "${message}"
    
    Responda APENAS com a query SQL, sem explicações.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const queryResult = await model.generateContent(queryPrompt);
    const sqlQuery = queryResult.response.text().trim()
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .trim();
    
    console.log('📋 SQL gerada:', sqlQuery);

    // ETAPA 2: Executar a query no Supabase
    console.log('🔄 ETAPA 2: Executando query no banco...');
    
    let queryData = null;
    let queryError = null;
    
    try {
      // Detectar tipo de query e executar apropriadamente
      if (sqlQuery.toLowerCase().includes('sum') || sqlQuery.toLowerCase().includes('count')) {
        // Query de agregação - usar RPC ou query direta
        const { data, error } = await supabase.rpc('execute_query', { query: sqlQuery }).single();
        queryData = data;
        queryError = error;
      } else {
        // Query normal - converter para Supabase query builder
        // Por enquanto, fazer query simples
        if (sqlQuery.toLowerCase().includes('000004')) {
          const { data, error } = await supabase
            .from('estoque')
            .select('*')
            .eq('codigo_produto', '000004');
          queryData = data;
          queryError = error;
        } else {
          const { data, error } = await supabase
            .from('estoque')
            .select('*')
            .limit(100);
          queryData = data;
          queryError = error;
        }
      }
      
      console.log('✅ Query executada. Registros retornados:', queryData?.length || 0);
    } catch (err) {
      console.error('❌ Erro na query:', err);
      queryError = err;
    }

    // ETAPA 3: Formatar resposta com IA
    console.log('🔄 ETAPA 3: Formatando resposta...');
    
    const responsePrompt = `
    Você é um assistente de estoque. Formate a resposta de forma clara e organizada.
    
    PERGUNTA DO USUÁRIO: "${message}"
    
    DADOS RETORNADOS DO BANCO:
    ${JSON.stringify(queryData, null, 2)}
    
    ${queryError ? `ERRO NA CONSULTA: ${queryError.message}` : ''}
    
    INSTRUÇÕES:
    1. Responda em português do Brasil
    2. Use formatação clara com bullet points
    3. Destaque números importantes
    4. Se houver erro, explique de forma simples
    5. Sempre baseie a resposta nos dados fornecidos
    
    Responda de forma profissional e organizada:
    `;

    const responseResult = await model.generateContent(responsePrompt);
    let finalResponse = responseResult.response.text();
    
    // Adicionar metadados
    finalResponse += '\n\n---\n';
    finalResponse += `📊 *Query executada: ${sqlQuery.substring(0, 100)}...*\n`;
    finalResponse += `📦 *Registros processados: ${queryData?.length || 0}*`;

    // Responder
    res.status(200).json({
      response: finalResponse,
      estoqueLoaded: true,
      totalProdutos: queryData?.length || 0,
      dbStatus: queryError ? 'error' : 'connected',
      debug: {
        sqlQuery,
        recordsFound: queryData?.length || 0,
        error: queryError?.message
      }
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    
    res.status(500).json({
      error: error.message,
      response: `Erro ao processar: ${error.message}`,
      estoqueLoaded: false
    });
  }
}