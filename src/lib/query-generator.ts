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
  
  // Intent patterns for better detection
  private intentPatterns = {
    // Product specific queries
    productInfo: /(?:qual|quanto|mostr|info|detalh|sobre).*(produto|cod|código|item)\s*(\d{4,})/i,
    productBalance: /(?:saldo|quantidade|estoque|disponível).*(produto|cod|código|item)?\s*(\d{4,})/i,
    productStatus: /(?:avaria|vencid|bloquead|status|situação).*(produto|cod|código)?\s*(\d{4,})?/i,
    productExists: /(?:existe|tem|possui|cadastr|lista).*(produto|cod|código)?\s*(\d{4,})/i,
    
    // General inventory queries
    totalInventory: /(?:total|soma|quanto|tudo|geral).*(?:estoque|inventário|saldo)/i,
    blockedItems: /(?:bloquead|avaria|vencid).*(?:produto|item|estoque)?(?!.*\d{4,})/i,
    summary: /(?:resumo|sumário|estatística|visão geral)/i,
    
    // Search queries
    search: /(?:buscar|procurar|encontrar|listar).*/i
  };

  constructor(supabase: SupabaseService) {
    this.supabase = supabase;
  }

  // Analyze user intent from message and context
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

    // Check each pattern
    for (const [intentType, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(message)) {
        intent.type = intentType;
        intent.confidence = 0.8;
        break;
      }
    }

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

    // Default to general search if still unknown
    if (intent.type === 'unknown' && intent.confidence < 0.5) {
      intent.type = 'search';
      intent.confidence = 0.6;
      intent.parameters.searchTerm = message.slice(0, 50);
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
        
      default:
        queries.push({
          type: 'general_search',
          description: 'Busca geral no inventário',
          parameters: { limit: 10 }
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

  // Format results for response
  formatResults(intent: Intent, results: QueryResult[], originalMessage: string): string {
    // Check for errors
    const errors = results.filter(r => r.type === 'error');
    if (errors.length > 0) {
      return `❌ **Erro ao processar consulta**\n\n${errors.map(e => e.error).join('\n')}`;
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
      
      default:
        return `📋 **Resultado da consulta**\n\n` +
          `Encontrei ${results[0]?.count || 0} registros.\n` +
          `Use perguntas mais específicas para melhores resultados.`;
    }
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