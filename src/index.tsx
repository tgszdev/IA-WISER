import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import chatRoutes from './routes/chat'
import chatEnhancedRoutes from './routes/chat-enhanced'
import openAIRoutes from './routes/chat-openai'
import inventoryRoutes from './routes/inventory'
import chatSmartRoutes from './routes/chat-smart'
import chatCompleteRoutes from './routes/chat-complete'
import openAIRealtimeRoutes from './routes/openai-realtime'
import openAIEnhancedRoutes from './routes/openai-enhanced'

// Types
type Bindings = {
  KV: KVNamespace;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Mount chat routes
app.route('/', chatRoutes)
app.route('/', chatEnhancedRoutes)
app.route('/', openAIRoutes)
app.route('/', inventoryRoutes)
app.route('/', chatSmartRoutes)
app.route('/', chatCompleteRoutes)
app.route('/', openAIRealtimeRoutes)
app.route('/', openAIEnhancedRoutes)

// Note: Static files are served directly by Cloudflare Pages
// No need for serveStatic in production

// Default route - serve index.html
app.get('/', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wiser IA Assistant</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div id="app" class="container mx-auto px-4 py-8 max-w-4xl">
            <!-- Header -->
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">
                    <i class="fas fa-robot mr-2 text-blue-600"></i>
                    Wiser IA Assistant
                </h1>
                <div class="flex gap-2">
                    <a href="/chat-complete.html" class="p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow hover:shadow-lg transition-all" title="Versão Completa">
                        <i class="fas fa-rocket text-xl"></i>
                    </a>
                    <a href="/console-v2.html" class="p-3 rounded-lg bg-white shadow hover:shadow-lg transition-all" title="Console Debug">
                        <i class="fas fa-terminal text-purple-600 text-xl"></i>
                    </a>
                    <a href="/console.html" class="p-3 rounded-lg bg-white shadow hover:shadow-lg transition-all" title="Console Simples">
                        <i class="fas fa-bug text-orange-600 text-xl"></i>
                    </a>
                </div>
            </div>
            
            <!-- Chat Container -->
            <div class="bg-white rounded-xl shadow-xl overflow-hidden">
                <!-- Messages Container -->
                <div id="messages" class="h-[500px] overflow-y-auto p-6 space-y-4">
                    <!-- Welcome Message -->
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-4 max-w-lg">
                                <p class="text-gray-700">
                                    Olá! Sou o Wiser IA Assistant. Posso ajudá-lo com informações sobre o inventário.
                                    <br><br>
                                    Experimente perguntar:
                                    <br>• "Qual o saldo do produto 000004?"
                                    <br>• "O produto 000032 está com avaria?"
                                    <br>• "Qual o total do estoque?"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Typing Indicator -->
                <div id="typing-indicator" class="hidden px-6 pb-2">
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <i class="fas fa-robot text-white text-sm"></i>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4">
                            <div class="flex space-x-1">
                                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                                <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="border-t border-gray-200 p-4">
                    <div class="flex space-x-3">
                        <input 
                            type="text" 
                            id="message-input"
                            placeholder="Digite sua pergunta sobre o inventário..."
                            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autofocus
                        >
                        <button 
                            id="send-button"
                            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                            <i class="fas fa-paper-plane"></i>
                            <span>Enviar</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Status Bar -->
            <div id="status-bar" class="mt-4 text-center text-sm text-gray-500">
                <span id="status-text">Conectando ao sistema...</span>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/chat-vercel.js"></script>
    </body>
    </html>
  `)
})

export default app