// Configuration functionality for Wiser IA Assistant - Vercel Version

// Elements
const configForm = document.getElementById('config-form');
const adminPasswordInput = document.getElementById('admin-password');
const apiKeyInput = document.getElementById('api-key');
const dbUrlInput = document.getElementById('db-url');
const systemPromptInput = document.getElementById('system-prompt');
const testDbButton = document.getElementById('test-db-button');
const dbTestResult = document.getElementById('db-test-result');
const checkConfigButton = document.getElementById('check-config-button');
const statusMessage = document.getElementById('status-message');

// Show status message
function showStatus(message, type = 'info') {
    statusMessage.classList.remove('hidden');
    const messageDiv = statusMessage.querySelector('div');
    const messageText = statusMessage.querySelector('p');
    
    messageText.textContent = message;
    
    // Reset classes
    messageDiv.className = 'p-4 rounded-lg';
    
    // Apply type-specific classes
    switch(type) {
        case 'success':
            messageDiv.classList.add('bg-green-100', 'border', 'border-green-300');
            messageText.classList.add('text-green-800');
            break;
        case 'error':
            messageDiv.classList.add('bg-red-100', 'border', 'border-red-300');
            messageText.classList.add('text-red-800');
            break;
        case 'warning':
            messageDiv.classList.add('bg-yellow-100', 'border', 'border-yellow-300');
            messageText.classList.add('text-yellow-800');
            break;
        default:
            messageDiv.classList.add('bg-blue-100', 'border', 'border-blue-300');
            messageText.classList.add('text-blue-800');
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

// Test database connection
async function testDatabaseConnection() {
    const dbUrl = dbUrlInput.value.trim();
    
    if (!dbUrl) {
        dbTestResult.textContent = '❌ Por favor, insira uma URL de conexão';
        dbTestResult.className = 'ml-3 text-sm text-red-600';
        return;
    }
    
    dbTestResult.textContent = '⏳ Testando conexão...';
    dbTestResult.className = 'ml-3 text-sm text-blue-600';
    
    try {
        const response = await axios.post('/api/test-db', { dbUrl });
        
        if (response.data.success) {
            dbTestResult.textContent = '✅ ' + response.data.message;
            dbTestResult.className = 'ml-3 text-sm text-green-600';
        } else {
            dbTestResult.textContent = '❌ ' + response.data.message;
            dbTestResult.className = 'ml-3 text-sm text-red-600';
        }
    } catch (error) {
        let errorMessage = '❌ Erro de conexão';
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage = '❌ ' + error.response.data.message;
        }
        dbTestResult.textContent = errorMessage;
        dbTestResult.className = 'ml-3 text-sm text-red-600';
    }
}

// Save configuration
async function saveConfiguration(e) {
    e.preventDefault();
    
    const adminPassword = adminPasswordInput.value.trim();
    
    if (!adminPassword) {
        showStatus('Por favor, insira a senha de administrador', 'error');
        return;
    }
    
    // Prepare config object
    const config = {
        adminPassword: adminPassword
    };
    
    // Only include values that are not empty
    const apiKey = apiKeyInput.value.trim();
    const dbUrl = dbUrlInput.value.trim();
    const systemPrompt = systemPromptInput.value.trim();
    
    if (apiKey) config.apiKey = apiKey;
    if (dbUrl) config.dbUrl = dbUrl;
    if (systemPrompt) config.systemPrompt = systemPrompt;
    
    // Disable form during save
    const formElements = configForm.querySelectorAll('input, textarea, button');
    formElements.forEach(el => el.disabled = true);
    
    try {
        const response = await axios.post('/api/config', config);
        
        if (response.data.success) {
            showStatus('✅ Configurações salvas com sucesso!', 'success');
            
            // Clear sensitive fields after successful save
            apiKeyInput.value = '';
            dbUrlInput.value = '';
            adminPasswordInput.value = '';
        }
    } catch (error) {
        let errorMessage = 'Erro ao salvar configurações';
        
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Senha de administrador incorreta';
            } else if (error.response.data && error.response.data.error) {
                errorMessage = error.response.data.error;
            }
        }
        
        showStatus(errorMessage, 'error');
    } finally {
        // Re-enable form
        formElements.forEach(el => el.disabled = false);
    }
}

// Check configuration status
async function checkConfigurationStatus() {
    try {
        const response = await axios.get('/api/config');
        const data = response.data;
        
        let statusMessages = [];
        
        if (data.hasApiKey) {
            statusMessages.push('✅ API do Google configurada');
        } else {
            statusMessages.push('❌ API do Google não configurada');
        }
        
        if (data.hasDbUrl) {
            statusMessages.push('✅ Banco de dados configurado');
        } else {
            statusMessages.push('⚠️ Banco de dados não configurado (opcional)');
        }
        
        if (data.hasSystemPrompt) {
            statusMessages.push('✅ Prompt de comportamento configurado');
            if (data.systemPromptPreview) {
                statusMessages.push(`📝 Preview: "${data.systemPromptPreview}"`);
            }
        } else {
            statusMessages.push('ℹ️ Usando prompt padrão');
        }
        
        showStatus(statusMessages.join('\n'), 'info');
        
    } catch (error) {
        showStatus('Erro ao verificar status das configurações', 'error');
    }
}

// Load existing configuration on page load
async function loadExistingConfig() {
    try {
        const response = await axios.get('/api/config');
        const data = response.data;
        
        // Show preview of system prompt if it exists
        if (data.hasSystemPrompt && data.systemPromptPreview) {
            systemPromptInput.placeholder = `Configuração atual: ${data.systemPromptPreview}`;
        }
        
        // Update UI based on configuration status
        if (!data.hasApiKey) {
            apiKeyInput.classList.add('border-orange-400');
        }
        
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Event listeners
configForm.addEventListener('submit', saveConfiguration);
testDbButton.addEventListener('click', testDatabaseConnection);
checkConfigButton.addEventListener('click', checkConfigurationStatus);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadExistingConfig();
});