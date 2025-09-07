// Enhanced Chat Interface with Function Calling Support
class WiserChatEnhanced {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.messageCount = 0;
        this.functionCallCount = 0;
        this.isProcessing = false;
        this.useEnhancedMode = true; // Use Function Calling by default
        
        this.init();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    init() {
        this.setupEventListeners();
        this.testConnection();
        this.updateStatus('Conectando ao sistema...', 'info');
        
        console.log('🚀 Wiser Chat Enhanced initialized');
        console.log('📝 Session ID:', this.sessionId);
        console.log('🔧 Function Calling: Enabled');
    }
    
    setupEventListeners() {
        const input = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
    }
    
    async testConnection() {
        try {
            const response = await axios.get('/api/test-connection');
            
            if (response.data.connected) {
                this.updateStatus('✅ Sistema conectado (Modo Demonstração)', 'success');
                console.log('📊 Database Summary:', response.data.summary);
            } else {
                this.updateStatus('⚠️ Usando dados de demonstração', 'warning');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.updateStatus('❌ Erro de conexão', 'error');
        }
    }
    
    async sendMessage() {
        if (this.isProcessing) return;
        
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.isProcessing = true;
        this.disableSendButton();
        
        // Add user message to UI
        this.addMessage(message, 'user');
        
        // Clear input
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        console.log('📤 Sending message:', message);
        
        try {
            const startTime = Date.now();
            
            // Choose endpoint based on mode
            const endpoint = this.useEnhancedMode ? '/api/chat-enhanced' : '/api/chat-smart';
            
            const response = await axios.post(endpoint, {
                message,
                sessionId: this.sessionId,
                useVision: false // Can be enabled for image analysis
            });
            
            const responseTime = Date.now() - startTime;
            console.log(`✅ Response received in ${responseTime}ms`);
            
            // Log function calls if present
            if (response.data.functionCalls && response.data.functionCalls.length > 0) {
                this.functionCallCount += response.data.functionCalls.length;
                console.log('🔧 Function Calls:', response.data.functionCalls);
                
                // Display function calls in UI (optional)
                response.data.functionCalls.forEach(fc => {
                    console.log(`  - ${fc.name}(${JSON.stringify(fc.args)})`);
                });
            }
            
            // Add AI response with metadata
            this.addMessage(response.data.response, 'assistant', {
                responseTime,
                functionCalls: response.data.functionCalls,
                metadata: response.data.metadata
            });
            
            // Update status based on response
            if (response.data.estoqueLoaded) {
                const totalMsg = response.data.totalProdutos ? 
                    ` (${response.data.totalProdutos} produtos)` : '';
                this.updateStatus(`✅ Inventário carregado${totalMsg}`, 'success');
            }
            
            // Update session stats if available
            if (response.data.sessionStats) {
                console.log('📊 Session Stats:', response.data.sessionStats);
            }
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            
            let errorMessage = '❌ Erro ao processar mensagem. ';
            
            if (error.response) {
                errorMessage += error.response.data.error || 'Erro desconhecido.';
            } else if (error.request) {
                errorMessage += 'Servidor não respondeu.';
            } else {
                errorMessage += error.message;
            }
            
            this.addMessage(errorMessage, 'assistant');
            this.updateStatus('❌ Erro no processamento', 'error');
            
        } finally {
            this.hideTypingIndicator();
            this.enableSendButton();
            this.isProcessing = false;
            
            // Focus back on input
            input.focus();
        }
    }
    
    addMessage(content, sender, metadata = null) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start space-x-3 animate-fade-in';
        
        const isUser = sender === 'user';
        const iconClass = isUser ? 'fa-user' : 'fa-robot';
        const bgColor = isUser ? 'bg-gray-600' : 'bg-blue-600';
        const messageBg = isUser ? 'bg-gray-100' : 'bg-blue-50';
        
        // Build metadata display
        let metadataHtml = '';
        if (metadata) {
            if (metadata.functionCalls && metadata.functionCalls.length > 0) {
                metadataHtml += '<div class="mt-2 space-y-1">';
                metadata.functionCalls.forEach(fc => {
                    metadataHtml += `
                        <div class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded inline-block mr-2">
                            <i class="fas fa-cog mr-1"></i>${fc.name}
                        </div>
                    `;
                });
                metadataHtml += '</div>';
            }
            
            if (metadata.responseTime) {
                metadataHtml += `
                    <div class="mt-2 text-xs text-gray-500">
                        <i class="fas fa-clock mr-1"></i>
                        Resposta em ${metadata.responseTime}ms
                    </div>
                `;
            }
        }
        
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
                <i class="fas ${iconClass} text-white text-sm"></i>
            </div>
            <div class="flex-1">
                <div class="${messageBg} rounded-lg p-4 max-w-2xl">
                    <div class="text-gray-700 whitespace-pre-wrap">${this.formatMessage(content)}</div>
                    ${metadataHtml}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // Smooth scroll to bottom
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
        
        this.messageCount++;
    }
    
    formatMessage(content) {
        // Format the message content for better display
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>')
            .replace(/\n/g, '<br>');
    }
    
    showTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }
    
    disableSendButton() {
        const button = document.getElementById('send-button');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Processando...</span>';
        }
    }
    
    enableSendButton() {
        const button = document.getElementById('send-button');
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Enviar</span>';
        }
    }
    
    updateStatus(message, type = 'info') {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
            
            // Update color based on type
            const statusBar = document.getElementById('status-bar');
            if (statusBar) {
                statusBar.className = 'mt-4 text-center text-sm ';
                
                switch(type) {
                    case 'success':
                        statusBar.className += 'text-green-600';
                        break;
                    case 'error':
                        statusBar.className += 'text-red-600';
                        break;
                    case 'warning':
                        statusBar.className += 'text-yellow-600';
                        break;
                    default:
                        statusBar.className += 'text-gray-500';
                }
            }
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    async clearSession() {
        if (!confirm('Deseja limpar todo o histórico da conversa?')) return;
        
        try {
            await axios.delete(`/api/session/${this.sessionId}`);
            
            // Clear messages UI
            const messagesContainer = document.getElementById('messages');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
                
                // Add welcome message again
                this.addMessage(
                    'Sessão limpa! Como posso ajudar você com o inventário?',
                    'assistant'
                );
            }
            
            // Reset counters
            this.messageCount = 0;
            this.functionCallCount = 0;
            
            // Generate new session ID
            this.sessionId = this.generateSessionId();
            
            console.log('✅ Session cleared. New session:', this.sessionId);
            this.updateStatus('Sessão limpa', 'success');
            
        } catch (error) {
            console.error('Error clearing session:', error);
            this.updateStatus('Erro ao limpar sessão', 'error');
        }
    }
    
    async exportSession() {
        try {
            const response = await axios.get(`/api/session/${this.sessionId}/export`);
            
            // Create download link
            const blob = new Blob([JSON.stringify(response.data, null, 2)], {
                type: 'application/json'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wiser_session_${this.sessionId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('✅ Session exported successfully');
            this.updateStatus('Sessão exportada', 'success');
            
        } catch (error) {
            console.error('Error exporting session:', error);
            this.updateStatus('Erro ao exportar sessão', 'error');
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wiserChat = new WiserChatEnhanced();
    });
} else {
    window.wiserChat = new WiserChatEnhanced();
}

// Add some CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
    
    code {
        font-family: 'Courier New', Courier, monospace;
    }
`;
document.head.appendChild(style);