// OpenAI Service - Integração Segura com OpenAI
import OpenAI from 'openai';

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private model: string = 'gpt-4-turbo-preview'; // ou gpt-3.5-turbo para economizar
  private isConfigured: boolean = false;

  constructor(config?: OpenAIConfig) {
    const apiKey = config?.apiKey || 
                   process.env.OPENAI_API_KEY || 
                   '';

    if (apiKey && apiKey !== '' && !apiKey.includes('xxx')) {
      try {
        this.client = new OpenAI({
          apiKey: apiKey,
        });
        this.model = config?.model || this.model;
        this.isConfigured = true;
        console.log('✅ OpenAI configurado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao configurar OpenAI:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ OpenAI API Key não configurada');
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
      return 'OpenAI não está configurado. Use o Query Generator local.';
    }

    try {
      // Prepara o contexto do sistema
      const systemPrompt = `
Você é o Wiser IA Assistant, especializado em gestão de inventário.

CAPACIDADES:
- Analisar dados de produtos e estoque
- Identificar problemas (avarias, vencimentos, bloqueios)
- Calcular estatísticas e tendências
- Fornecer insights acionáveis

REGRAS:
1. Seja preciso com números e quantidades
2. Destaque informações críticas com emojis apropriados
3. Forneça respostas concisas mas completas
4. Sugira próximas ações quando relevante
5. Use português brasileiro
6. SEMPRE use os dados fornecidos do banco para responder
7. Se não houver dados, informe claramente que não há informações disponíveis

FORMATO:
- Use **negrito** para destacar
- Use emojis: ✅ sucesso, ⚠️ alerta, ❌ erro, 📦 produto, 📊 estatística
- Termine com sugestões quando apropriado
`;

      // Prepara mensagens
      const messages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Adiciona histórico se disponível
      if (sessionHistory && sessionHistory.length > 0) {
        sessionHistory.slice(-5).forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
      }

      // Formata dados de inventário - 100% VISÃO COMPLETA
      if (inventoryData) {
        let inventoryContext = '🌐 VOCÊ TEM ACESSO A 100% DOS DADOS DO INVENTÁRIO:\n\n';
        
        // Adiciona resumo completo se disponível
        if (inventoryData.summary || inventoryData.stats) {
          const stats = inventoryData.summary || inventoryData.stats;
          inventoryContext += `📊 ESTATÍSTICAS COMPLETAS (100% DOS DADOS):\n`;
          inventoryContext += `- Total de registros no banco: ${inventoryData.totalItems || stats.totalRecords || stats.totalRegistros || 0}\n`;
          inventoryContext += `- Produtos únicos: ${stats.uniqueProducts || stats.produtosUnicos || 0}\n`;
          inventoryContext += `- Saldo total geral: ${stats.totalBalance || stats.totalSaldo || stats.totalValue || 0} unidades\n`;
          inventoryContext += `- Produtos bloqueados: ${stats.blockedProducts || stats.produtosBloqueados || stats.blockedItems || 0}\n`;
          inventoryContext += `- Produtos com avaria: ${stats.damageProducts || stats.produtosAvaria || 0}\n`;
          inventoryContext += `- Produtos vencidos: ${stats.expiredProducts || stats.produtosVencidos || 0}\n`;
          inventoryContext += `- Armazéns ativos: ${stats.warehouses ? stats.warehouses.length : (stats.armazens ? stats.armazens.length : 0)}\n`;
          inventoryContext += `- Locais diferentes: ${stats.locations || stats.locais || 0}\n\n`;
          inventoryContext += `⚠️ IMPORTANTE: Estes são os dados COMPLETOS, não uma amostra.\n\n`;
        }
        
        // Adiciona amostra dos produtos (limitar para não exceder limite do OpenAI)
        if (inventoryData.queryResults && inventoryData.queryResults.length > 0) {
          const totalProdutos = inventoryData.queryResults.length;
          inventoryContext += `📦 AMOSTRA DOS PRODUTOS (mostrando 30 de ${totalProdutos} registros):\n`;
          inventoryContext += `════════════════════════════════════════════\n`;
          
          // Agrupar por produto para visão mais clara
          const produtosAgrupados = {};
          inventoryData.queryResults.forEach((item: any) => {
            const codigo = item.codigo_produto || item.codigo;
            if (!produtosAgrupados[codigo]) {
              produtosAgrupados[codigo] = {
                descricao: item.descricao_produto || item.descricao,
                locais: [],
                saldoTotal: 0,
                armazens: new Set()
              };
            }
            produtosAgrupados[codigo].locais.push({
              local: item.local_produto,
              saldo: parseFloat(item.saldo_disponivel_produto) || 0,
              status: item.saldo_bloqueado_produto
            });
            produtosAgrupados[codigo].saldoTotal += parseFloat(item.saldo_disponivel_produto) || 0;
            if (item.armazem) produtosAgrupados[codigo].armazens.add(item.armazem);
          });
          
          // Mostrar produtos agrupados
          let count = 0;
          for (const [codigo, info] of Object.entries(produtosAgrupados)) {
            if (count >= 30) break;
            inventoryContext += `\n📦 ${codigo}: ${info.descricao}\n`;
            inventoryContext += `   Saldo total: ${info.saldoTotal} unidades em ${info.locais.length} locais\n`;
            inventoryContext += `   Armazéns: ${Array.from(info.armazens).join(', ')}\n`;
            count++;
          }
          
          const totalProdutosUnicos = Object.keys(produtosAgrupados).length;
          if (totalProdutosUnicos > 30) {
            inventoryContext += `\n... e mais ${totalProdutosUnicos - 30} produtos únicos\n`;
          }
          
          inventoryContext += `\n✅ VOCÊ TEM ACESSO A 100% DOS ${totalProdutos} REGISTROS.\n`;
        } else if (inventoryData.fullDataLoaded) {
          inventoryContext += '🌐 BANCO DE DADOS COMPLETAMENTE CARREGADO.\n';
          inventoryContext += 'Todos os dados estão disponíveis para análise.\n';
        } else {
          inventoryContext += '⚠️ NENHUM PRODUTO ENCONTRADO para esta consulta específica.\n';
        }
        
        // Adiciona informações sobre a intenção detectada
        if (inventoryData.intent) {
          inventoryContext += `\n🎯 ANÁLISE DA CONSULTA:\n`;
          inventoryContext += `- Tipo de consulta: ${inventoryData.intent.type}\n`;
          inventoryContext += `- Confiança na análise: ${Math.round((inventoryData.intent.confidence || 0) * 100)}%\n`;
          if (inventoryData.intent.entities?.productCode) {
            inventoryContext += `- Produto pesquisado: ${inventoryData.intent.entities.productCode}\n`;
          }
        }
        
        inventoryContext += `\n🎯 INSTRUÇÕES IMPORTANTES:\n`;
        inventoryContext += `1. Você tem acesso a 100% dos dados do inventário\n`;
        inventoryContext += `2. Use as estatísticas COMPLETAS fornecidas\n`;
        inventoryContext += `3. Seja PRECISO com números - não arredonde\n`;
        inventoryContext += `4. Se perguntarem sobre o total, use os dados COMPLETOS\n`;
        inventoryContext += `5. Não invente - use apenas os dados fornecidos\n`;
        
        messages.push({
          role: 'system',
          content: inventoryContext
        });
      }

      // Adiciona mensagem do usuário
      messages.push({ role: 'user', content: message });

      // Faz a chamada para OpenAI
      const completion = await this.client!.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.3, // Mais determinístico para dados
        max_tokens: 800, // Aumentado para respostas mais completas
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return completion.choices[0]?.message?.content || 'Sem resposta';

    } catch (error: any) {
      console.error('❌ Erro OpenAI:', error);
      
      if (error.status === 429) {
        return '⚠️ Limite de requisições excedido. Tente novamente em alguns segundos.';
      } else if (error.status === 401) {
        return '❌ API Key inválida. Verifique suas credenciais.';
      } else {
        return `❌ Erro ao processar: ${error.message}`;
      }
    }
  }

  // Análise de tendências
  async analyzeTrends(data: any[]): Promise<string> {
    if (!this.isReady()) {
      return 'OpenAI não configurado';
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
      return 'OpenAI não configurado';
    }

    const prompts: any = {
      summary: 'Crie um resumo executivo destes dados de inventário',
      detailed: 'Crie um relatório detalhado com análises e recomendações',
      critical: 'Identifique apenas itens críticos que precisam atenção imediata'
    };

    const prompt = `${prompts[type] || prompts.summary}\n\nDados: ${JSON.stringify(data).slice(0, 3000)}`;
    
    return this.processInventoryQuery(prompt);
  }

  // Comparação com GPT-4
  async compareWithGPT4(query: string, localResponse: string): Promise<any> {
    if (!this.isReady()) {
      return { enhanced: false, response: localResponse };
    }

    try {
      const prompt = `
Query do usuário: ${query}

Resposta do sistema local:
${localResponse}

Melhore esta resposta, tornando-a mais útil e acionável.
Mantenha a precisão dos dados mas adicione insights.
`;

      const enhanced = await this.processInventoryQuery(prompt);
      
      return {
        enhanced: true,
        original: localResponse,
        improved: enhanced
      };
    } catch (error) {
      return { enhanced: false, response: localResponse };
    }
  }

  // Função para chat streaming (opcional)
  async *streamChat(message: string): AsyncGenerator<string> {
    if (!this.isReady()) {
      yield 'OpenAI não configurado';
      return;
    }

    try {
      const stream = await this.client!.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'Você é um assistente de inventário.' },
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.3
      });

      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    } catch (error) {
      yield `Erro: ${error}`;
    }
  }

  // Estatísticas de uso
  async getUsageStats(): Promise<any> {
    // OpenAI não fornece diretamente, mas você pode rastrear localmente
    return {
      model: this.model,
      configured: this.isConfigured,
      available: this.isReady()
    };
  }
}

// Singleton
let openAIService: OpenAIService | null = null;

export function getOpenAIService(config?: OpenAIConfig): OpenAIService {
  if (!openAIService) {
    openAIService = new OpenAIService(config);
  }
  return openAIService;
}