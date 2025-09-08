// Configuration
const API_ENDPOINT = '/api/openai-enhanced';
const STATUS_ENDPOINT = '/api/openai-enhanced/status';
const TIMEOUT_MS = 30000; // 30 segundos

// State
let isTyping = false;
let messageCount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    setTimeout(checkStatus, 1000);
});

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message || isTyping) return;
    
    // Add user message
    addMessage(message, 'user');
    input.value = '';
    
    // Send to API
    await sendMessage(message);
}

// Quick query
function quickQuery(text) {
    const input = document.getElementById('message-input');
    if (input) {
        input.value = text;
        const form = document.getElementById('chat-form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
}

// Send message to API with robust error handling
async function sendMessage(message) {
    isTyping = true;
    showTypingIndicator();
    
    const startTime = Date.now();
    
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, TIMEOUT_MS);
        
        console.log('Enviando mensagem:', message);
        
        // Make request
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ message }),
            signal: controller.signal
        }).catch(error => {
            if (error.name === 'AbortError') {
                throw new Error('Tempo limite excedido (30s)');
            }
            throw error;
        });
        
        clearTimeout(timeoutId);
        
        console.log('Resposta recebida:', response.status, response.statusText);
        
        // Check response status
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('Content-Type inesperado:', contentType);
        }
        
        // Parse response
        let data;
        const responseText = await response.text();
        
        if (!responseText) {
            throw new Error('Resposta vazia do servidor');
        }
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Erro ao fazer parse do JSON:', parseError);
            console.error('Texto recebido:', responseText.substring(0, 500));
            throw new Error('Formato de resposta inválido');
        }
        
        const responseTime = Date.now() - startTime;
        
        hideTypingIndicator();
        
        // Process response
        if (data.success) {
            // Format metadata
            const metadata = data.metadata || {};
            const metaText = formatMetadata(metadata, responseTime);
            
            // Add assistant message
            addMessage(data.response + metaText, 'assistant');
            
            // Update stats
            updateStats(metadata);
        } else {
            // Show error from server
            const errorMsg = data.error || data.message || 'Erro desconhecido';
            addMessage(`❌ Erro do servidor: ${errorMsg}`, 'error');
        }
        
    } catch (error) {
        hideTypingIndicator();
        console.error('Erro completo:', error);
        
        // Determine error message
        let errorMessage = '❌ ';
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage += 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('Tempo limite')) {
            errorMessage += 'A requisição demorou muito. Tente uma consulta mais simples.';
        } else if (error.message.includes('JSON')) {
            errorMessage += 'Resposta inválida do servidor. Tente novamente.';
        } else {
            errorMessage += error.message;
        }
        
        addMessage(errorMessage, 'error');
        
    } finally {
        isTyping = false;
    }
}

// Format metadata for display
function formatMetadata(metadata, responseTime) {
    const parts = [];
    
    parts.push('\n\n──────────────────────────────');
    parts.push('\n📊 **Análise Completa**');
    
    if (metadata.intent || metadata.queryType) {
        parts.push(`\n• Tipo: ${metadata.intent || metadata.queryType || 'consulta'}`);
    }
    
    if (metadata.recordsFound !== undefined) {
        parts.push(`\n• Registros: ${metadata.recordsFound.toLocaleString('pt-BR')}`);
    }
    
    parts.push(`\n• Tempo: ${responseTime}ms`);
    parts.push('\n• Fonte: Tempo Real');
    
    return parts.join('');
}

// Add message to chat
function addMessage(content, type = 'user') {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3 animate-fade-in';
    
    messageCount++;
    
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="flex-1 flex justify-end">
                <div class="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl p-4 max-w-lg shadow-lg">
                    <p class="font-medium">${escapeHtml(content)}</p>
                </div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-lg">
                <i class="fas fa-user text-gray-600"></i>
            </div>
        `;
    } else if (type === 'assistant') {
        messageDiv.innerHTML = `
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                <i class="fas fa-robot text-white text-lg"></i>
            </div>
            <div class="flex-1">
                <div class="bg-white rounded-xl p-5 shadow-lg border border-gray-100 max-w-3xl">
                    <div class="message-content text-gray-800">${formatResponse(content)}</div>
                </div>
            </div>
        `;
    } else if (type === 'error') {
        messageDiv.innerHTML = `
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <i class="fas fa-exclamation-triangle text-white"></i>
            </div>
            <div class="flex-1">
                <div class="bg-red-50 rounded-xl p-4 shadow-lg border border-red-200">
                    <p class="text-red-700 font-medium">${escapeHtml(content)}</p>
                </div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    setTimeout(() => {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

// Format response with markdown-like syntax
function formatResponse(text) {
    if (!text) return '';
    
    return text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-600">$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Headers
        .replace(/^#{3}\s+(.*)$/gm, '<h3 class="text-lg font-bold mt-2 mb-1 text-gray-700">$1</h3>')
        .replace(/^#{2}\s+(.*)$/gm, '<h2 class="text-xl font-bold mt-3 mb-2 text-gray-800">$1</h2>')
        .replace(/^#\s+(.*)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-gray-900">$1</h1>')
        // Lists
        .replace(/^[•·]\s+(.*)$/gm, '<li class="ml-4">• $1</li>')
        .replace(/^(\d+)\.\s+(.*)$/gm, '<li class="ml-4">$1. $2</li>')
        // Horizontal rules
        .replace(/^─{10,}$/gm, '<hr class="my-3 border-gray-300">')
        .replace(/^═{10,}$/gm, '<hr class="my-3 border-gray-400 border-t-2">')
        // Line breaks
        .replace(/\n/g, '<br>');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        
        // Scroll to show indicator
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

// Update statistics
function updateStats(metadata) {
    // Update query count
    const queryCountEl = document.getElementById('query-count');
    if (queryCountEl) {
        queryCountEl.textContent = messageCount;
    }
    
    // Update other stats based on metadata
    if (metadata.recordsFound !== undefined) {
        const recordsEl = document.getElementById('records-found');
        if (recordsEl) {
            recordsEl.textContent = metadata.recordsFound.toLocaleString('pt-BR');
        }
    }
}

// Check system status
async function checkStatus() {
    try {
        const response = await fetch(STATUS_ENDPOINT, {
            signal: AbortSignal.timeout(5000) // 5s timeout for status
        });
        
        if (!response.ok) {
            throw new Error('Status request failed');
        }
        
        const data = await response.json();
        
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (data.status === 'online') {
            if (statusDot) statusDot.className = 'w-3 h-3 bg-green-500 rounded-full pulse';
            if (statusText) statusText.textContent = 'Sistema Online';
            
            console.log('Sistema online:', data.message);
        } else {
            if (statusDot) statusDot.className = 'w-3 h-3 bg-red-500 rounded-full';
            if (statusText) statusText.textContent = 'Sistema Offline';
        }
        
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (statusDot) statusDot.className = 'w-3 h-3 bg-yellow-500 rounded-full';
        if (statusText) statusText.textContent = 'Verificando...';
    }
}

// Clear chat messages
function clearChat() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    // Keep only the welcome message (first child)
    const firstMessage = messagesContainer.firstElementChild;
    messagesContainer.innerHTML = '';
    
    if (firstMessage) {
        messagesContainer.appendChild(firstMessage);
    }
    
    // Reset message count
    messageCount = 0;
    
    // Focus input
    const input = document.getElementById('message-input');
    if (input) {
        input.focus();
    }
}

// Export functions for global use
window.quickQuery = quickQuery;
window.clearChat = clearChat;
window.checkStatus = checkStatus;