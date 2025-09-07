// Enhanced Gemini Integration with Function Calling and Best Practices
import { GoogleGenerativeAI } from '@google/generative-ai';

// Function schemas for Gemini Function Calling
export const inventoryFunctions = [
  {
    name: "get_product_info",
    description: "Busca informações detalhadas de um produto específico",
    parameters: {
      type: "object",
      properties: {
        product_code: {
          type: "string",
          description: "Código do produto (exemplo: 000032)"
        }
      },
      required: ["product_code"]
    }
  },
  {
    name: "check_product_status",
    description: "Verifica se um produto tem status de avaria, vencido ou bloqueado",
    parameters: {
      type: "object",
      properties: {
        product_code: {
          type: "string",
          description: "Código do produto"
        },
        status_type: {
          type: "string",
          enum: ["Avaria", "Vencido", "Bloqueado", "Qualquer"],
          description: "Tipo de status a verificar"
        }
      },
      required: ["product_code"]
    }
  },
  {
    name: "get_inventory_summary",
    description: "Obtém resumo geral do inventário com totais e estatísticas",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "search_products",
    description: "Busca produtos por descrição ou características",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termo de busca"
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados",
          default: 10
        }
      },
      required: ["query"]
    }
  },
  {
    name: "calculate_total_balance",
    description: "Calcula o saldo total de um ou mais produtos",
    parameters: {
      type: "object",
      properties: {
        product_codes: {
          type: "array",
          items: { type: "string" },
          description: "Lista de códigos de produtos"
        }
      }
    }
  }
];

// Response schema for structured output
export const responseSchema = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "Resposta formatada para o usuário"
    },
    data: {
      type: "object",
      properties: {
        product_code: { type: "string" },
        description: { type: "string" },
        total_balance: { type: "number" },
        lots_count: { type: "number" },
        status: { type: "string" },
        location: { type: "string" },
        has_issues: { type: "boolean" }
      }
    },
    confidence: {
      type: "number",
      description: "Nível de confiança na resposta (0-1)"
    },
    suggested_actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] }
        }
      }
    },
    requires_confirmation: {
      type: "boolean",
      description: "Se a ação requer confirmação do usuário"
    }
  },
  required: ["answer", "confidence"]
};

// Optimized system instruction
export const SYSTEM_INSTRUCTION = `
Você é o Wiser IA, um assistente especializado em gestão de inventário com acesso a um banco de dados de produtos.

SUAS CAPACIDADES:
• Consultar informações de produtos por código
• Verificar status de avaria, vencido ou bloqueado
• Calcular saldos e totais de inventário
• Fornecer resumos e estatísticas
• Detectar problemas e sugerir ações

REGRAS IMPORTANTES:
1. SEMPRE use as funções disponíveis para obter dados reais - nunca invente informações
2. Seja PRECISO com números e quantidades - arredonde apenas quando apropriado
3. DESTAQUE informações críticas como avarias ou produtos vencidos com ⚠️
4. Para ações que modificam o inventário, SEMPRE solicite confirmação
5. Se um produto não for encontrado, sugira verificar o código ou produtos similares
6. Mantenha respostas CONCISAS mas COMPLETAS

FORMATO DE RESPOSTA:
• Use **negrito** para destacar informações importantes
• Use bullets (•) para listas
• Adicione emojis relevantes: ✅ sucesso, ⚠️ alerta, ❌ erro, 📦 produto, 📊 estatística
• Termine com sugestões de próximas ações quando relevante

TRATAMENTO DE ERROS:
• Produto não encontrado → "Produto X não encontrado. Verifique o código ou tente buscar por descrição."
• Múltiplos resultados → "Encontrei N produtos. Qual você procura: [lista]"
• Sem permissão → "Esta ação requer autorização de supervisor."
• Dados incompletos → "Preciso de mais informações: [o que falta]"

IMPORTANTE: Você tem acesso a dados de DEMONSTRAÇÃO para teste. Em produção, conecte ao banco real.
`;

// Enhanced Gemini Service
export class EnhancedGeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
    
    if (!this.apiKey || this.apiKey === 'your_google_api_key_here') {
      console.warn('⚠️ Google API key not configured - some features disabled');
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.initializeModel();
  }

  private initializeModel() {
    try {
      // Use Gemini 1.5 Flash for speed and cost efficiency
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{
          functionDeclarations: inventoryFunctions
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent responses
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: "text/plain" // Will use JSON for specific calls
        }
      });
      
      console.log('✅ Enhanced Gemini model initialized with function calling');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini model:', error);
    }
  }

  // Process message with function calling
  async processWithFunctions(message: string, functions: any[]): Promise<any> {
    if (!this.model) {
      return {
        answer: "API do Google não configurada. Usando modo de demonstração.",
        confidence: 0.5
      };
    }

    try {
      // Create chat session for function calling
      const chat = this.model.startChat({
        history: [],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      });

      // Send message and let model decide which functions to call
      const result = await chat.sendMessage(message);
      
      // Check if model wants to call functions
      const functionCalls = result.response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        // Execute the function calls
        const functionResponses = await this.executeFunctions(functionCalls, functions);
        
        // Send function results back to model for final response
        const finalResult = await chat.sendMessage([{
          functionResponse: {
            name: functionCalls[0].name,
            response: functionResponses[0]
          }
        }]);
        
        return {
          answer: finalResult.response.text(),
          functionsCalled: functionCalls.map(fc => fc.name),
          confidence: 0.95
        };
      }
      
      // No function calls needed
      return {
        answer: result.response.text(),
        confidence: 0.9
      };
      
    } catch (error: any) {
      console.error('Error with function calling:', error);
      return {
        answer: `Erro ao processar: ${error.message}`,
        confidence: 0
      };
    }
  }

  // Execute function calls
  private async executeFunctions(functionCalls: any[], availableFunctions: any[]): Promise<any[]> {
    const results = [];
    
    for (const call of functionCalls) {
      const func = availableFunctions.find(f => f.name === call.name);
      if (func) {
        try {
          const result = await func.handler(call.args);
          results.push(result);
        } catch (error) {
          results.push({ error: `Failed to execute ${call.name}` });
        }
      }
    }
    
    return results;
  }

  // Generate structured JSON response
  async generateStructuredResponse(prompt: string): Promise<any> {
    if (!this.model) {
      return {
        answer: "API não configurada",
        confidence: 0
      };
    }

    try {
      const jsonModel = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.3
        }
      });

      const result = await jsonModel.generateContent(prompt);
      const response = result.response.text();
      
      return JSON.parse(response);
    } catch (error: any) {
      console.error('Error generating structured response:', error);
      return {
        answer: "Erro ao gerar resposta estruturada",
        confidence: 0,
        error: error.message
      };
    }
  }

  // Analyze image (multimodal)
  async analyzeProductImage(imageBase64: string, prompt?: string): Promise<string> {
    if (!this.model) {
      return "API não configurada para análise de imagem";
    }

    try {
      const imageModel = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-vision" 
      });
      
      const result = await imageModel.generateContent([
        prompt || "Analise esta imagem de produto e extraia: código, descrição, quantidade visível e condição (normal/avaria)",
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64
          }
        }
      ]);
      
      return result.response.text();
    } catch (error: any) {
      return `Erro na análise de imagem: ${error.message}`;
    }
  }

  // Batch processing for multiple queries
  async processBatch(queries: string[]): Promise<any[]> {
    if (!this.model) {
      return queries.map(() => ({ answer: "API não configurada", confidence: 0 }));
    }

    // Process in parallel for better performance
    const promises = queries.map(query => 
      this.generateStructuredResponse(query).catch(err => ({
        answer: `Erro: ${err.message}`,
        confidence: 0
      }))
    );

    return Promise.all(promises);
  }
}

// Export singleton
let enhancedService: EnhancedGeminiService | null = null;

export function getEnhancedGeminiService(apiKey?: string): EnhancedGeminiService {
  if (!enhancedService) {
    enhancedService = new EnhancedGeminiService(apiKey);
  }
  return enhancedService;
}