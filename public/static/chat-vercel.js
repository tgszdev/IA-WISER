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

// Chat history
let chatHistory = [];
const sessionId = getSessionId();

// Load chat history on page load
async function loadChatHistory() {
    try {
        const response = await axios.get(`/api/history/${sessionId}`);
        chatHistory = response.data;
        
        // Clear welcome message if there's history
        if (chatHistory.length > 0) {
            messagesContainer.innerHTML = '';
            chatHistory.forEach(msg => {
                addMessageToUI(msg.content, msg.role);
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
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
            
            // Update chat history
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

// Check configuration status on load
async function checkConfigStatus() {
    try {
        const response = await axios.get('/api/config');
        const data = response.data;
        
        if (!data.hasApiKey) {
            statusText.textContent = '⚠️ API do Google não configurada. Acesse as Configurações.';
            statusText.className = 'text-orange-600';
        } else if (!data.hasSystemPrompt) {
            statusText.textContent = 'ℹ️ Prompt de comportamento não definido. Usando padrão.';
            statusText.className = 'text-blue-600';
        } else {
            statusText.textContent = 'Pronto para conversar';
            statusText.className = 'text-gray-500';
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
});