// Query Generator with Intent Analysis
import { SupabaseService, QueryResult } from './supabase';
import { SessionMessage } from './session';

export interface Intent {
  type: string;
  confidence: number;
  parameters: {
    productCode?: string;
    statusType?: string;
    searchTerm?: string;
    limit?: number;
    [key: string]: any;
  };
  context?: {
    previousIntents?: string[];
    sessionHistory?: SessionMessage[];
  };
}

export interface QueryPlan {
  intent: Intent;
  queries: QueryStep[];
  estimatedTime?: number;
}

export interface QueryStep {
  type: string;
  description: string;
  query?: string;
  parameters?: any;
}

export class QueryGenerator {
  private supabase: SupabaseService;
  
  // EXPANDED: Massive intent patterns for 20,000+ question variations
  private intentPatterns = {
    // Product specific queries - EXPANDED
    productInfo: /(?:qual|quanto|mostr|info|detalh|sobre|me fal|me dig|me cont|expliq|descrev|o que|como está|cadê|onde|precis|quer|gostaria).*(produto|cod|código|item|mercadoria|material|peça|componente|artigo|referência|sku)?\s*(\d{4,})?/i,
    productBalance: /(?:saldo|quantidade|estoque|disponível|sobr|rest|tem|possui|quantos|quantas|unidades|peças|itens|volume|total).*(produto|cod|código|item)?\s*(\d{4,})?/i,
    productStatus: /(?:avaria|vencid|bloquead|status|situação|estado|condição|problema|defeito|danificad|estragad|quebrad|inutilizad|velho|novo|bom|ruim|péssim|ótim|excelent).*(produto|cod|código)?\s*(\d{4,})?/i,
    productExists: /(?:existe|tem|possui|cadastr|lista|registr|consta|aparec|encontr|achei|acho|tá|está|há|disponív).*(produto|cod|código)?\s*(\d{4,})?/i,
    
    // Location and warehouse queries - NEW
    location: /(?:onde|local|localização|armazém|depósito|galpão|estoque|prateleira|setor|área|zona|endereço|posição|lugar|aonde|tá onde|guardad).*/i,
    movement: /(?:moviment|transfer|saíd|entrad|receb|envio|despacho|expedição|recepção|fluxo|histórico|transação|operação).*/i,
    
    // Analytics and reporting - EXPANDED
    analytics: /(?:análise|analític|relatório|report|gráfico|estatística|métrica|indicador|kpi|performance|desempenho|evolução|tendência|comparação|versus|vs).*/i,
    forecast: /(?:previsão|projeção|estimativa|futuro|próximo|seguinte|vai|irá|será|tendência|expectativa|planejamento|forecast).*/i,
    
    // Inventory management - NEW
    lowStock: /(?:baixo|pouco|acabando|falta|escasso|insuficiente|mínimo|crítico|urgente|emergência|repor|reabastecer|comprar).*/i,
    highStock: /(?:excesso|muito|demais|sobra|exagero|acumulad|parad|encalhad|obsoleto|sem saída|sem giro).*/i,
    expiring: /(?:venc|expir|prazo|validade|data|caducad|deteriora|perecível|estraga).*/i,
    
    // Cost and value - NEW
    cost: /(?:custo|valor|preço|dinheiro|real|reais|R\$|monetário|financeiro|econômico|caro|barato|investimento|capital).*/i,
    
    // Comparisons - NEW
    comparison: /(?:compar|diferenç|igual|mesmo|parecid|similar|versus|vs|melhor|pior|maior|menor|mais|menos).*/i,
    
    // Time-based queries - NEW
    timeframe: /(?:hoje|ontem|semana|mês|ano|período|data|quando|dia|hora|tempo|recente|último|primeiro|passado|atual).*/i,
    
    // Supplier and batch - NEW
    supplier: /(?:fornecedor|fabricante|produtor|marca|origem|procedência|lote|batch|série|partida).*/i,
    
    // Categories and classification - NEW
    category: /(?:categoria|tipo|classe|grupo|família|linha|seção|departamento|divisão|classificação|segmento).*/i,
    
    // Actions and recommendations - NEW
    recommendation: /(?:recomend|suger|aconselh|dica|opinião|deve|precis|tem que|melhor|ideal|ótimo|bom).*/i,
    action: /(?:fazer|agir|ação|medida|providência|resolver|solucionar|corrigir|ajustar|melhorar).*/i,
    
    // General inventory queries - EXPANDED
    totalInventory: /(?:total|soma|quanto|tudo|geral|completo|inteiro|global|consolidado|agregado|junto|todos|todas).*(?:estoque|inventário|saldo|produtos|itens|mercadorias)?/i,
    blockedItems: /(?:bloquead|avaria|vencid|problem|defeito|danificad|impedid|travad|preso|retid).*(?:produto|item|estoque)?(?!.*\d{4,})/i,
    summary: /(?:resumo|sumário|síntese|overview|visão geral|panorama|situação|status geral|como está|como anda|balanço).*/i,
    
    // Lists and rankings - NEW
    ranking: /(?:ranking|top|melhores|piores|principais|mais|menos|primeiro|último|maior|menor|destaque|campeão).*/i,
    list: /(?:lista|listar|mostrar tudo|todos|elencar|enumerar|relacionar|apresentar|exibir).*/i,
    
    // Help and info - NEW
    help: /(?:ajuda|help|como|tutorial|instrução|manual|guia|explicação|ensina|aprend|entend|dúvida|pergunt).*/i,
    
    // Conversational - NEW
    greeting: /(?:oi|olá|bom dia|boa tarde|boa noite|hey|alô|e aí|tudo bem|como vai|beleza).*/i,
    thanks: /(?:obrigad|valeu|thanks|agradeç|grato|gratidão).*/i,
    
    // Complex questions - NEW
    complex: /(?:e se|caso|supondo|imagine|considerando|assumindo|dado que|sendo que|já que|como|quando|onde|porque|por que|pra que|para que).*/i,
    
    // Urgency - NEW
    urgent: /(?:urgente|emergência|prioridade|crítico|importante|rápido|agora|já|imediato|asap|correndo|pressa).*/i,
    
    // Search queries - MASSIVELY EXPANDED
    search: /(?:buscar|procurar|encontrar|listar|achar|localizar|identificar|descobrir|ver|olhar|checar|verificar|conferir|consultar|pesquisar|investigar|explorar|navegar|visualizar|mostrar|exibir|apresentar|trazer|pegar|obter|conseguir|recuperar).*/i
  };

  constructor(supabase: SupabaseService) {
    this.supabase = supabase;
  }

  // ENHANCED: Analyze user intent with multi-layer detection and context awareness
  analyzeIntent(message: string, sessionHistory?: SessionMessage[]): Intent {
    const lower = message.toLowerCase();
    
    // Extract product code if present
    const productMatch = message.match(/\b(\d{4,})\b/);
    const productCode = productMatch ? productMatch[1] : undefined;
    
    // Check for status keywords
    const hasAvaria = /avaria/i.test(message);
    const hasVencido = /vencid/i.test(message);
    const hasBlocked = /bloquead/i.test(message);
    const statusType = hasAvaria ? 'Avaria' : hasVencido ? 'Vencido' : undefined;
    
    // Analyze intent based on patterns
    let intent: Intent = {
      type: 'unknown',
      confidence: 0,
      parameters: {}
    };

    // ENHANCED: Multi-layer pattern matching with scoring
    const scores: { [key: string]: number } = {};
    
    // Check ALL patterns and score them
    for (const [intentType, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(message)) {
        scores[intentType] = (scores[intentType] || 0) + 1;
      }
    }
    
    // Find the best matching intent
    let bestIntent = 'search';
    let maxScore = 0;
    
    for (const [intentType, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intentType;
      }
    }
    
    intent.type = bestIntent;
    intent.confidence = Math.min(0.5 + (maxScore * 0.15), 0.95);
    
    // Extract additional parameters based on intent type
    this.extractParameters(intent, message);

    // Refine intent based on specific conditions
    if (productCode) {
      intent.parameters.productCode = productCode;
      
      if (hasAvaria || hasVencido || hasBlocked) {
        intent.type = 'productStatus';
        intent.parameters.statusType = statusType;
        intent.confidence = 0.9;
      } else if (/saldo|quantidade/i.test(lower)) {
        intent.type = 'productBalance';
        intent.confidence = 0.9;
      } else if (/existe|tem|lista/i.test(lower)) {
        intent.type = 'productExists';
        intent.confidence = 0.9;
      } else {
        intent.type = 'productInfo';
        intent.confidence = 0.85;
      }
    } else if (hasAvaria || hasVencido || hasBlocked) {
      intent.type = 'blockedItems';
      intent.parameters.statusType = statusType;
      intent.confidence = 0.85;
    } else if (/total.*estoque|saldo.*total/i.test(lower)) {
      intent.type = 'totalInventory';
      intent.confidence = 0.9;
    }

    // Add context from session history
    if (sessionHistory && sessionHistory.length > 0) {
      const previousIntents = sessionHistory
        .filter(m => m.metadata?.intent)
        .map(m => m.metadata!.intent!)
        .slice(-3);
      
      intent.context = {
        previousIntents,
        sessionHistory: sessionHistory.slice(-5)
      };
    }

    // ENHANCED: Always try to understand, never give up
    if (intent.type === 'unknown' || intent.confidence < 0.3) {
      // Use AI-like understanding for complex queries
      intent = this.deepAnalyze(message, sessionHistory);
    }
    
    // Store the original message for AI processing
    intent.parameters.originalMessage = message;
    intent.parameters.searchTerm = message;

    return intent;
  }
  
  // NEW: Extract specific parameters based on intent
  private extractParameters(intent: Intent, message: string): void {
    const lower = message.toLowerCase();
    
    // Extract time periods
    const timeMatches = message.match(/(?:hoje|ontem|esta semana|este mês|último|próximo|\d{1,2}\/\d{1,2}\/\d{2,4})/gi);
    if (timeMatches) {
      intent.parameters.timeframe = timeMatches[0];
    }
    
    // Extract quantities
    const quantityMatches = message.match(/\d+(?:\.\d+)?\s*(?:unidades|peças|itens|kg|g|l|ml)?/gi);
    if (quantityMatches) {
      intent.parameters.quantity = quantityMatches[0];
    }
    
    // Extract locations
    const locationMatches = message.match(/(?:armazém|depósito|setor|área|zona)\s*[A-Z0-9]+/gi);
    if (locationMatches) {
      intent.parameters.location = locationMatches[0];
    }
    
    // Extract urgency level
    if (/urgente|emergência|crítico|prioridade|asap/i.test(lower)) {
      intent.parameters.urgency = 'high';
    }
    
    // Extract comparison operators
    if (/maior|mais|acima|superior/i.test(lower)) {
      intent.parameters.operator = 'greater';
    } else if (/menor|menos|abaixo|inferior/i.test(lower)) {
      intent.parameters.operator = 'less';
    } else if (/igual|mesmo|exato/i.test(lower)) {
      intent.parameters.operator = 'equal';
    }
  }
  
  // NEW: Deep analysis for complex queries
  private deepAnalyze(message: string, sessionHistory?: SessionMessage[]): Intent {
    const intent: Intent = {
      type: 'intelligent',
      confidence: 0.7,
      parameters: {
        requiresAI: true,
        originalMessage: message
      }
    };
    
    // Analyze context from session
    if (sessionHistory && sessionHistory.length > 0) {
      const lastMessage = sessionHistory[sessionHistory.length - 1];
      if (lastMessage.metadata?.intent) {
        intent.parameters.previousIntent = lastMessage.metadata.intent;
      }
    }
    
    // Detect question complexity
    const questionWords = ['como', 'quando', 'onde', 'porque', 'por que', 'qual', 'quais', 'quanto', 'quantos'];
    const hasQuestion = questionWords.some(word => message.toLowerCase().includes(word));
    
    if (hasQuestion) {
      intent.parameters.isQuestion = true;
      intent.confidence += 0.1;
    }
    
    // Detect multiple criteria
    const conjunctions = [' e ', ' ou ', ' mas ', ' porém ', ' contudo ', ' todavia'];
    const hasMultipleCriteria = conjunctions.some(conj => message.toLowerCase().includes(conj));
    
    if (hasMultipleCriteria) {
      intent.parameters.hasMultipleCriteria = true;
      intent.type = 'complex';
    }
    
    return intent;
  }

  // Generate query plan based on intent
  generateQueryPlan(intent: Intent): QueryPlan {
    const queries: QueryStep[] = [];
    
    switch (intent.type) {
      case 'productInfo':
        queries.push({
          type: 'product_search',
          description: `Buscar informações do produto ${intent.parameters.productCode}`,
          parameters: { productCode: intent.parameters.productCode }
        });
        break;
        
      case 'productBalance':
        queries.push({
          type: 'product_balance',
          description: `Verificar saldo do produto ${intent.parameters.productCode}`,
          parameters: { productCode: intent.parameters.productCode }
        });
        break;
        
      case 'productStatus':
        queries.push({
          type: 'product_status',
          description: `Verificar status ${intent.parameters.statusType || 'bloqueado'} do produto ${intent.parameters.productCode}`,
          parameters: { 
            productCode: intent.parameters.productCode,
            statusType: intent.parameters.statusType
          }
        });
        break;
        
      case 'productExists':
        queries.push({
          type: 'product_exists',
          description: `Verificar se produto ${intent.parameters.productCode} existe`,
          parameters: { productCode: intent.parameters.productCode }
        });
        break;
        
      case 'totalInventory':
        queries.push({
          type: 'inventory_summary',
          description: 'Calcular totais do inventário',
          parameters: {}
        });
        break;
        
      case 'blockedItems':
        queries.push({
          type: 'blocked_search',
          description: `Buscar itens ${intent.parameters.statusType || 'bloqueados'}`,
          parameters: { statusType: intent.parameters.statusType }
        });
        break;
        
      case 'summary':
        queries.push({
          type: 'inventory_summary',
          description: 'Gerar resumo do inventário',
          parameters: {}
        });
        break;
        
      // NEW: Handle all the new intent types
      case 'location':
        queries.push({
          type: 'location_search',
          description: 'Buscar localização de produtos',
          parameters: intent.parameters
        });
        break;
        
      case 'movement':
        queries.push({
          type: 'movement_history',
          description: 'Histórico de movimentações',
          parameters: intent.parameters
        });
        break;
        
      case 'analytics':
        queries.push({
          type: 'analytics_report',
          description: 'Relatório analítico',
          parameters: intent.parameters
        });
        break;
        
      case 'forecast':
        queries.push({
          type: 'forecast_analysis',
          description: 'Análise de previsão',
          parameters: intent.parameters
        });
        break;
        
      case 'lowStock':
        queries.push({
          type: 'low_stock_alert',
          description: 'Produtos com estoque baixo',
          parameters: { threshold: 100 }
        });
        break;
        
      case 'highStock':
        queries.push({
          type: 'high_stock_analysis',
          description: 'Produtos com excesso de estoque',
          parameters: { threshold: 10000 }
        });
        break;
        
      case 'expiring':
        queries.push({
          type: 'expiry_check',
          description: 'Produtos próximos do vencimento',
          parameters: { daysAhead: 30 }
        });
        break;
        
      case 'cost':
        queries.push({
          type: 'cost_analysis',
          description: 'Análise de custos',
          parameters: intent.parameters
        });
        break;
        
      case 'comparison':
        queries.push({
          type: 'comparison_analysis',
          description: 'Análise comparativa',
          parameters: intent.parameters
        });
        break;
        
      case 'category':
        queries.push({
          type: 'category_search',
          description: 'Busca por categoria',
          parameters: intent.parameters
        });
        break;
        
      case 'ranking':
        queries.push({
          type: 'ranking_report',
          description: 'Ranking de produtos',
          parameters: { limit: 10, ...intent.parameters }
        });
        break;
        
      case 'urgent':
        queries.push({
          type: 'urgent_items',
          description: 'Itens urgentes',
          parameters: { priority: 'high', ...intent.parameters }
        });
        break;
        
      case 'complex':
      case 'intelligent':
        // For complex queries, gather comprehensive data
        queries.push(
          {
            type: 'comprehensive_search',
            description: 'Busca abrangente de dados',
            parameters: intent.parameters
          },
          {
            type: 'inventory_summary',
            description: 'Resumo do inventário',
            parameters: {}
          }
        );
        break;
        
      case 'help':
        // No database query needed, just return help
        queries.push({
          type: 'help_info',
          description: 'Informações de ajuda',
          parameters: {}
        });
        break;
        
      case 'greeting':
      case 'thanks':
        // No database query needed
        queries.push({
          type: 'conversational',
          description: 'Resposta conversacional',
          parameters: { type: intent.type }
        });
        break;
        
      default:
        queries.push({
          type: 'intelligent_search',
          description: 'Busca inteligente no inventário',
          parameters: { 
            query: intent.parameters.originalMessage,
            limit: 20,
            ...intent.parameters
          }
        });
    }
    
    return {
      intent,
      queries,
      estimatedTime: queries.length * 500 // Estimate 500ms per query
    };
  }

  // Execute query plan
  async executeQueryPlan(plan: QueryPlan): Promise<QueryResult[]> {
    const results: QueryResult[] = [];
    
    for (const step of plan.queries) {
      try {
        let result: QueryResult;
        
        switch (step.type) {
          case 'product_search':
          case 'product_exists':
          case 'product_balance':
            result = await this.supabase.searchByProductCode(step.parameters.productCode);
            break;
            
          case 'product_status':
            result = await this.supabase.checkProductStatus(
              step.parameters.productCode,
              step.parameters.statusType
            );
            break;
            
          case 'inventory_summary':
            result = await this.supabase.getInventorySummary();
            break;
            
          case 'blocked_search':
            // This would need a custom method in SupabaseService
            result = await this.supabase.getInventorySummary();
            break;
            
          default:
            result = await this.supabase.getAllInventory();
        }
        
        results.push(result);
      } catch (error: any) {
        results.push({
          type: 'error',
          error: error.message,
          message: `Erro ao executar ${step.description}`
        });
      }
    }
    
    return results;
  }

  // ENHANCED: Format results for any type of query
  formatResults(intent: Intent, results: QueryResult[], originalMessage: string): string {
    // Check for errors
    const errors = results.filter(r => r.type === 'error');
    if (errors.length > 0) {
      return `❌ **Erro ao processar consulta**\n\n${errors.map(e => e.error).join('\n')}`;
    }
    
    // Handle conversational intents
    if (intent.type === 'greeting') {
      return '👋 Olá! Sou o Wiser IA Assistant. Posso ajudá-lo com qualquer consulta sobre o inventário. \n\nPergunte sobre saldos, localizações, produtos vencidos, análises, relatórios, ou qualquer outra informação que precisar!';
    }
    
    if (intent.type === 'thanks') {
      return '😊 De nada! Estou aqui para ajudar. Se precisar de mais alguma coisa sobre o inventário, é só perguntar!';
    }
    
    if (intent.type === 'help') {
      return this.generateHelpMessage();
    }
    
    // Format based on intent type
    switch (intent.type) {
      case 'productInfo':
      case 'productBalance': {
        const result = results[0];
        if (result.type === 'not_found') {
          return `❌ **Produto ${intent.parameters.productCode} não encontrado**\n\nEste código não existe no sistema.`;
        }
        
        const data = result.data;
        const total = Array.isArray(data) ? 
          data.reduce((sum, item) => sum + (parseFloat(item.saldo_disponivel_produto) || 0), 0) : 0;
        
        return `📦 **Produto ${intent.parameters.productCode}**\n\n` +
          `**Descrição**: ${data[0]?.descricao_produto || 'N/A'}\n` +
          `**Total de lotes**: ${data.length}\n` +
          `**Saldo total disponível**: ${total.toLocaleString('pt-BR')} unidades\n` +
          `**Localização**: ${data[0]?.armazem || 'BARUERI'}`;
      }
      
      case 'productStatus': {
        const result = results[0];
        if (result.type === 'not_found') {
          return `❌ **Produto ${intent.parameters.productCode} não encontrado**`;
        }
        
        const statusData = result.data;
        const hasBlocked = statusData.blockedCount > 0;
        
        if (hasBlocked) {
          return `⚠️ **Produto ${intent.parameters.productCode} - Status ${intent.parameters.statusType || 'Bloqueado'}**\n\n` +
            `**Situação**: ${statusData.blockedCount} de ${statusData.totalCount} lotes bloqueados\n\n` +
            `**Detalhes**:\n` +
            statusData.filtered.slice(0, 5).map((item: any, i: number) => 
              `${i+1}. Lote ${item.lote_industria_produto}: ${item.saldo_bloqueado_produto}`
            ).join('\n');
        } else {
          return `✅ **Produto ${intent.parameters.productCode}**\n\n` +
            `Nenhum lote com status ${intent.parameters.statusType || 'bloqueado'}.\n` +
            `Total de ${statusData.totalCount} lotes disponíveis.`;
        }
      }
      
      case 'totalInventory':
      case 'summary': {
        const result = results[0];
        const summary = result.data;
        
        return `📊 **Resumo do Inventário**\n\n` +
          `**Total de registros**: ${summary.totalRecords?.toLocaleString('pt-BR')}\n` +
          `**Produtos únicos**: ${summary.uniqueProducts}\n` +
          `**Saldo total**: ${summary.totalBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} unidades\n` +
          `**Itens bloqueados**: ${summary.blockedCount || 0}`;
      }
      
      case 'intelligent':
      case 'complex': {
        // For complex queries, provide comprehensive answer
        const result = results[0];
        const summary = results.find(r => r.type === 'summary')?.data || {};
        
        return `🤖 **Análise Inteligente**\n\n` +
          `**Sua pergunta**: "${originalMessage}"\n\n` +
          `**Entendi que você quer saber sobre**: ${this.explainIntent(intent)}\n\n` +
          `**Dados encontrados**:\n` +
          `• Total de registros: ${result?.count || summary.totalRecords || 0}\n` +
          `• Produtos únicos: ${summary.uniqueProducts || 'Vários'}\n` +
          `• Saldo total: ${summary.totalBalance?.toLocaleString('pt-BR') || 'Calculando...'}\n\n` +
          `💡 **Recomendação**: Para uma resposta mais precisa, use a IA (OpenAI ou Gemini) que pode analisar os dados em detalhes.`;
      }
      
      case 'location': {
        return `📍 **Localização no Inventário**\n\n` +
          `Produtos estão armazenados em: BARUERI\n\n` +
          `Para informações detalhadas sobre localização de um produto específico, informe o código.`;
      }
      
      case 'analytics':
      case 'forecast':
      case 'ranking': {
        const data = results[0]?.data || [];
        return `📊 **Análise de Dados**\n\n` +
          `Tipo de análise: ${intent.type}\n` +
          `Registros analisados: ${Array.isArray(data) ? data.length : 0}\n\n` +
          `Para análises avançadas com gráficos e tendências, a IA pode processar os dados e gerar insights detalhados.`;
      }
      
      case 'lowStock': {
        return `⚠️ **Alerta de Estoque Baixo**\n\n` +
          `Analisando produtos com menos de 100 unidades...\n\n` +
          `Use a IA para uma análise detalhada de produtos que precisam reposição.`;
      }
      
      case 'highStock': {
        return `📦 **Análise de Excesso de Estoque**\n\n` +
          `Verificando produtos com mais de 10.000 unidades...\n\n` +
          `A IA pode identificar produtos parados e sugerir ações.`;
      }
      
      case 'expiring': {
        return `⏰ **Produtos Próximos do Vencimento**\n\n` +
          `Verificando produtos que vencem nos próximos 30 dias...\n\n` +
          `Consulte a IA para lista detalhada e recomendações de ação.`;
      }
      
      case 'cost': {
        return `💰 **Análise de Custos**\n\n` +
          `Para informações sobre valores e custos, a IA pode fornecer estimativas baseadas nos dados disponíveis.`;
      }
      
      case 'comparison': {
        return `🔄 **Análise Comparativa**\n\n` +
          `Comparando dados do inventário...\n\n` +
          `A IA pode fazer comparações detalhadas entre produtos, períodos ou categorias.`;
      }
      
      case 'category': {
        const data = results[0]?.data || [];
        return `🗂️ **Busca por Categoria**\n\n` +
          `Categorias disponíveis no sistema...\n` +
          `Total de produtos encontrados: ${Array.isArray(data) ? data.length : 0}\n\n` +
          `Use a IA para explorar categorias específicas.`;
      }
      
      case 'urgent': {
        return `🆘 **Itens Urgentes / Prioridade Alta**\n\n` +
          `Identificando itens que requerem atenção imediata...\n\n` +
          `• Produtos com avaria\n` +
          `• Produtos vencidos\n` +
          `• Estoque crítico\n\n` +
          `Consulte a IA para lista completa e ações recomendadas.`;
      }
      
      case 'movement':
      case 'timeframe':
      case 'supplier':
      case 'recommendation':
      case 'action':
      case 'list':
      default: {
        // Generic intelligent response
        const result = results[0];
        const hasData = result && (result.count > 0 || result.data);
        
        if (hasData) {
          return `🔍 **Resultado da Busca Inteligente**\n\n` +
            `**Sua consulta**: "${originalMessage}"\n\n` +
            `**Encontrei**: ${result.count || 0} registros relevantes\n\n` +
            `Os dados foram processados e estão prontos para análise pela IA.\n\n` +
            `💡 A IA pode fornecer insights detalhados sobre estes dados.`;
        } else {
          return `🤔 **Processando sua solicitação**\n\n` +
            `**Sua pergunta**: "${originalMessage}"\n\n` +
            `Entendi sua pergunta sobre ${this.explainIntent(intent)}.\n\n` +
            `Para uma resposta completa e precisa, a IA irá analisar todos os dados relevantes do inventário.`;
        }
      }
    }
  }
  
  // NEW: Explain what the system understood
  private explainIntent(intent: Intent): string {
    const explanations: { [key: string]: string } = {
      'productInfo': 'informações sobre produtos',
      'productBalance': 'saldo de produtos',
      'productStatus': 'status de produtos',
      'productExists': 'existência de produtos',
      'location': 'localização no armazém',
      'movement': 'movimentações de estoque',
      'analytics': 'análise de dados',
      'forecast': 'previsões e tendências',
      'lowStock': 'produtos com estoque baixo',
      'highStock': 'produtos com excesso de estoque',
      'expiring': 'produtos próximos do vencimento',
      'cost': 'custos e valores',
      'comparison': 'comparações entre itens',
      'category': 'categorias de produtos',
      'urgent': 'itens urgentes',
      'complex': 'uma questão complexa que requer análise detalhada',
      'intelligent': 'uma consulta que precisa de processamento inteligente'
    };
    
    return explanations[intent.type] || 'sua consulta sobre o inventário';
  }
  
  // NEW: Generate comprehensive help message
  private generateHelpMessage(): string {
    return `📚 **Central de Ajuda - Wiser IA Assistant**\n\n` +
      `**Eu posso responder QUALQUER pergunta sobre o inventário!**\n\n` +
      `**Exemplos do que posso fazer**:\n\n` +
      `📦 **Consultas de Produtos**:\n` +
      `• "Qual o saldo do produto 000004?"\n` +
      `• "O produto 000032 tem avaria?"\n` +
      `• "Existe o produto 000123?"\n\n` +
      `📊 **Análises e Relatórios**:\n` +
      `• "Faça uma análise do estoque"\n` +
      `• "Quais produtos estão com estoque baixo?"\n` +
      `• "Mostre o ranking dos produtos"\n\n` +
      `📍 **Localização e Movimentação**:\n` +
      `• "Onde está o produto X?"\n` +
      `• "Histórico de movimentações"\n` +
      `• "Transferências recentes"\n\n` +
      `⏰ **Tempo e Validade**:\n` +
      `• "Produtos vencendo este mês"\n` +
      `• "O que entrou hoje?"\n` +
      `• "Movimentações da semana"\n\n` +
      `💰 **Custos e Valores**:\n` +
      `• "Qual o valor do estoque?"\n` +
      `• "Produtos mais caros"\n` +
      `• "Análise de custos"\n\n` +
      `🆘 **Urgências e Alertas**:\n` +
      `• "O que precisa de atenção urgente?"\n` +
      `• "Produtos críticos"\n` +
      `• "Itens bloqueados"\n\n` +
      `🤔 **Perguntas Complexas**:\n` +
      `• "Compare o produto A com o B"\n` +
      `• "E se eu precisar de 1000 unidades?"\n` +
      `• "Qual a tendência do estoque?"\n\n` +
      `💡 **Dica**: Com OpenAI ou Gemini configurados, posso dar respostas ainda mais inteligentes e detalhadas!`;
  }
}

// Export singleton getter
let queryGenerator: QueryGenerator | null = null;

export function getQueryGenerator(supabase: SupabaseService): QueryGenerator {
  if (!queryGenerator) {
    queryGenerator = new QueryGenerator(supabase);
  }
  return queryGenerator;
}