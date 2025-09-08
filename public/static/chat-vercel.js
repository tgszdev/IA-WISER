// Chat functionality for Wiser IA Assistant - Vercel Version

// Generate or get session ID
function getSessionId() {
    let sessionId = localStorage.getItem('wiser_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('wiser_session_id', sessionId);
    }
    return sessionId;
}

// Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const statusText = document.getElementById('status-text');
const aiIndicator = document.getElementById('ai-indicator');
const aiBadge = document.getElementById('ai-badge');
const aiName = document.getElementById('ai-name');

// Chat history - GARANTIR que é sempre um array
let chatHistory = [];
const sessionId = getSessionId();

// Garantir que chatHistory é sempre um array
if (!Array.isArray(chatHistory)) {
    chatHistory = [];
}

// Load chat history on page load
async function loadChatHistory() {
    try {
        const response = await axios.get(`/api/history/${sessionId}`);
        // GARANTIR que chatHistory é um array
        if (Array.isArray(response.data)) {
            chatHistory = response.data;
        } else {
            chatHistory = [];
        }
        
        // Clear welcome message if there's history
        if (chatHistory.length > 0) {
            messagesContainer.innerHTML = '';
            chatHistory.forEach(msg => {
                addMessageToUI(msg.content, msg.role);
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        // Garantir que chatHistory é um array mesmo em caso de erro
        chatHistory = [];
    }
}

// Add message to UI
function addMessageToUI(message, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3';
    
    const isUser = role === 'user';
    
    messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full ${isUser ? 'bg-green-600' : 'bg-blue-600'} flex items-center justify-center ${isUser ? 'order-2' : ''}">
            <i class="fas ${isUser ? 'fa-user' : 'fa-robot'} text-white text-sm"></i>
        </div>
        <div class="flex-1 ${isUser ? 'order-1' : ''}">
            <div class="${isUser ? 'bg-green-100 ml-auto' : 'bg-gray-100'} rounded-lg p-4 max-w-lg ${isUser ? 'text-right' : ''}">
                <p class="${isUser ? 'text-green-900' : 'text-gray-700'} whitespace-pre-wrap">
                    ${escapeHtml(message)}
                </p>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    
    // Clear input
    messageInput.value = '';
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Show typing indicator
    typingIndicator.classList.remove('hidden');
    statusText.textContent = 'IA está pensando...';
    statusText.className = 'text-gray-500';
    
    try {
        // Send to API with timeout - Usar nova API smart
        const response = await axios.post('/api/chat-smart', {
            message: message,
            sessionId: sessionId,
            history: chatHistory.slice(-10) // Send last 10 messages for context
        }, {
            timeout: 30000 // 30 second timeout
        });
        
        // Hide typing indicator
        typingIndicator.classList.add('hidden');
        
        // Check for both 'content' and 'response' fields for compatibility
        const responseText = response.data.content || response.data.response;
        
        if (response.data && responseText) {
            // Add assistant response to UI
            addMessageToUI(responseText, 'assistant');
            
            // Update AI indicator
            updateAIIndicator(response.data.aiModel || 'local', response.data.aiStatus);
            
            // Update chat history - VERIFICAR se é array antes
            if (!Array.isArray(chatHistory)) {
                console.warn('chatHistory não era um array, reinicializando...');
                chatHistory = [];
            }
            
            try {
                chatHistory.push({
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });
                chatHistory.push({
                    role: 'assistant',
                    content: responseText,
                    timestamp: response.data.timestamp || new Date().toISOString()
                });
            } catch (pushError) {
                console.error('Erro ao adicionar ao histórico:', pushError);
                // Reinicializar como array se houver erro
                chatHistory = [
                    { role: 'user', content: message, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: responseText, timestamp: new Date().toISOString() }
                ];
            }
            
            // Check if stock was loaded
            if (response.data.estoqueLoaded) {
                statusText.textContent = `Pronto para conversar (${response.data.totalProdutos || 0} produtos no estoque)`;
                statusText.className = 'text-green-600';
            } else {
                statusText.textContent = 'Pronto para conversar';
                statusText.className = 'text-gray-500';
            }
            
            // Log debug info
            console.log('Response data:', {
                estoqueLoaded: response.data.estoqueLoaded,
                totalProdutos: response.data.totalProdutos,
                dbStatus: response.data.dbStatus
            });
            
        } else if (response.data && response.data.error) {
            // Show error message
            const errorMessage = typeof response.data.error === 'string' ? 
                response.data.error : 
                'Erro ao processar mensagem';
            
            statusText.textContent = errorMessage;
            statusText.className = 'text-red-600';
            
            // Add error message to chat
            addMessageToUI(errorMessage, 'assistant');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        typingIndicator.classList.add('hidden');
        
        let errorMessage = 'Erro ao enviar mensagem. ';
        
        // Check for timeout error
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorMessage = '⏱️ A resposta demorou muito. Possíveis causas:\n\n';
            errorMessage += '1. GOOGLE_API_KEY não está configurada no Vercel\n';
            errorMessage += '2. A API do Google está lenta\n';
            errorMessage += '3. Problema de conexão\n\n';
            errorMessage += 'Acesse /debug.html para testar as conexões.';
        }
        // Extract error message properly
        else if (error.response && error.response.data) {
            if (typeof error.response.data === 'string') {
                errorMessage += error.response.data;
            } else if (error.response.data.error) {
                errorMessage += typeof error.response.data.error === 'string' 
                    ? error.response.data.error 
                    : JSON.stringify(error.response.data.error);
            } else if (error.response.data.message) {
                errorMessage += typeof error.response.data.message === 'string'
                    ? error.response.data.message
                    : JSON.stringify(error.response.data.message);
            } else {
                errorMessage += JSON.stringify(error.response.data);
            }
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += JSON.stringify(error);
        }
        
        statusText.textContent = errorMessage;
        statusText.className = 'text-red-600';
        
        // Add error to chat
        addMessageToUI(errorMessage, 'assistant');
    } finally {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Update AI indicator
function updateAIIndicator(model, aiStatus) {
    aiIndicator.classList.remove('hidden');
    
    // Set badge color and name based on model
    if (model === 'gpt-4' || model === 'gpt-3.5-turbo') {
        aiBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800';
        aiName.textContent = '🧠 OpenAI GPT-4';
    } else if (model === 'gemini-1.5-flash') {
        aiBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800';
        aiName.textContent = '✨ Google Gemini';
    } else {
        aiBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
        aiName.textContent = '🔧 Local Query';
    }
    
    // Show AI status in console
    if (aiStatus) {
        console.log('AI Status:', aiStatus);
    }
}

// Check AI status
async function checkAIStatus() {
    try {
        const response = await axios.get('/api/ai-status');
        const data = response.data;
        
        console.log('🤖 AI Service Status:', data);
        
        // Update indicator based on primary AI
        updateAIIndicator(data.primaryAI === 'openai' ? 'gpt-4' : 
                         data.primaryAI === 'gemini' ? 'gemini-1.5-flash' : 
                         'local', data.services);
        
        // Update status text based on configuration
        if (data.services.openai.status === 'ready') {
            statusText.textContent = '✅ OpenAI GPT-4 configurado e pronto';
            statusText.className = 'text-green-600';
        } else if (data.services.gemini.status === 'ready') {
            statusText.textContent = '✨ Google Gemini configurado (OpenAI não configurado)';
            statusText.className = 'text-purple-600';
        } else {
            statusText.textContent = '⚠️ Nenhuma IA configurada. Configure OpenAI para melhor desempenho.';
            statusText.className = 'text-orange-600';
        }
        
        return data;
    } catch (error) {
        console.error('Error checking AI status:', error);
        return null;
    }
}

// Check configuration status on load
async function checkConfigStatus() {
    try {
        // First check AI status
        const aiStatus = await checkAIStatus();
        
        // Then check general config
        const response = await axios.get('/api/config');
        const data = response.data;
        
        // Only override status if there's a critical config issue
        if (!data.hasDbUrl) {
            statusText.textContent = '⚠️ Banco de dados não configurado.';
            statusText.className = 'text-orange-600';
        }
    } catch (error) {
        console.error('Error checking config:', error);
        statusText.textContent = 'Verificando configurações...';
        statusText.className = 'text-gray-500';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    checkConfigStatus();
    messageInput.focus();
    
    // Check AI status every 30 seconds
    setInterval(checkAIStatus, 30000);
});