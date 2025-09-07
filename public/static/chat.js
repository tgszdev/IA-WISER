// Chat functionality for Wiser IA Assistant

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
        const response = await axios.get(`/api/chat/history/${sessionId}`);
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
    
    try {
        // Send to API
        const response = await axios.post('/api/chat', {
            message: message,
            sessionId: sessionId,
            history: chatHistory.slice(-10) // Send last 10 messages for context
        });
        
        // Hide typing indicator
        typingIndicator.classList.add('hidden');
        
        if (response.data.error) {
            // Show error message
            statusText.textContent = response.data.error;
            statusText.className = 'text-red-600';
            
            // Add error message to chat
            addMessageToUI(response.data.error, 'assistant');
        } else {
            // Add assistant response to UI
            addMessageToUI(response.data.content, 'assistant');
            statusText.textContent = 'Pronto para conversar';
            statusText.className = 'text-gray-500';
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        typingIndicator.classList.add('hidden');
        
        let errorMessage = 'Erro ao enviar mensagem. ';
        
        if (error.response && error.response.data && error.response.data.error) {
            errorMessage += error.response.data.error;
        } else {
            errorMessage += 'Verifique as configurações.';
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
        const response = await axios.get('/api/config/check');
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
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    checkConfigStatus();
    messageInput.focus();
});