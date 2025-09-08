// Google Gemini Service - Integração com Google AI
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GeminiService {
  private client: GoogleGenerativeAI | null = null;
  private model: string = 'gemini-pro';
  private isConfigured: boolean = false;

  constructor(config?: GeminiConfig) {
    const apiKey = config?.apiKey || 
                   process.env.GOOGLE_API_KEY || 
                   '';

    if (apiKey && apiKey !== '' && !apiKey.includes('xxx')) {
      try {
        this.client = new GoogleGenerativeAI(apiKey);
        this.model = config?.model || this.model;
        this.isConfigured = true;
        console.log('✅ Gemini configurado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao configurar Gemini:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ Gemini API Key não configurada');
    }
  }

  // Verifica se está configurado
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  // Processa mensagem com contexto de inventário
  async processInventoryQuery(
    message: string,
    inventoryData?: any,
    sessionHistory?: any[]
  ): Promise<string> {
    if (!this.isReady()) {
      return 'Gemini não está configurado.';
    }

    try {
      const model = this.client!.getGenerativeModel({ model: this.model });
      
      // Prepara o contexto
      let context = `Você é o Wiser IA Assistant, especializado em gestão de inventário.

CONTEXTO DO SISTEMA:
Você tem acesso a 100% dos dados do inventário em tempo real.

`;

      // Adiciona dados do inventário
      if (inventoryData) {
        if (inventoryData.stats) {
          context += `📊 ESTATÍSTICAS COMPLETAS (100% DOS DADOS):
- Total de registros: ${inventoryData.stats.totalRecords || 0}
- Produtos únicos: ${inventoryData.stats.uniqueProducts || 0}
- Saldo total: ${inventoryData.stats.totalBalance || 0} unidades
- Produtos bloqueados: ${inventoryData.stats.blockedProducts || 0}
- Com avaria: ${inventoryData.stats.damageProducts || 0}
- Vencidos: ${inventoryData.stats.expiredProducts || 0}
- Armazéns: ${inventoryData.stats.warehouses?.join(', ') || 'N/A'}
- Locais: ${inventoryData.stats.locations || 0}

`;
        }
        
        if (inventoryData.queryResults && inventoryData.queryResults.length > 0) {
          context += `DADOS ESPECÍFICOS DA CONSULTA:
${JSON.stringify(inventoryData.queryResults.slice(0, 20), null, 2).slice(0, 2000)}

`;
        }
      }

      // Adiciona histórico se disponível
      if (sessionHistory && sessionHistory.length > 0) {
        context += `HISTÓRICO DA CONVERSA:
`;
        sessionHistory.slice(-3).forEach(msg => {
          context += `${msg.role}: ${msg.content}\n`;
        });
        context += '\n';
      }

      // Adiciona a mensagem do usuário
      const fullPrompt = `${context}

PERGUNTA DO USUÁRIO: ${message}

INSTRUÇÕES:
1. Use os dados fornecidos para responder com precisão
2. Seja específico com números e quantidades
3. Destaque informações importantes com **negrito**
4. Use emojis apropriados (📦 📊 ✅ ⚠️ ❌)
5. Responda em português brasileiro
6. Se não tiver os dados, informe claramente

RESPOSTA:`;

      // Gera a resposta
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      
      return response.text() || 'Sem resposta do Gemini';
      
    } catch (error: any) {
      console.error('❌ Erro Gemini:', error);
      
      if (error.status === 429) {
        return '⚠️ Limite de requisições do Gemini excedido. Tente novamente em alguns segundos.';
      } else if (error.status === 401) {
        return '❌ API Key do Gemini inválida. Verifique suas credenciais.';
      } else {
        return `❌ Erro ao processar com Gemini: ${error.message}`;
      }
    }
  }

  // Análise de tendências
  async analyzeTrends(data: any[]): Promise<string> {
    if (!this.isReady()) {
      return 'Gemini não configurado';
    }

    const prompt = `
Analise os seguintes dados de inventário e identifique:
1. Tendências principais
2. Produtos críticos
3. Recomendações de ação

Dados: ${JSON.stringify(data).slice(0, 3000)}
`;

    return this.processInventoryQuery(prompt);
  }

  // Geração de relatório
  async generateReport(data: any, type: string = 'summary'): Promise<string> {
    if (!this.isReady()) {
      return 'Gemini não configurado';
    }

    const prompts: any = {
      summary: 'Crie um resumo executivo destes dados de inventário',
      detailed: 'Crie um relatório detalhado com análises e recomendações',
      critical: 'Identifique apenas itens críticos que precisam atenção imediata'
    };

    const prompt = `${prompts[type] || prompts.summary}\n\nDados: ${JSON.stringify(data).slice(0, 3000)}`;
    
    return this.processInventoryQuery(prompt);
  }
}