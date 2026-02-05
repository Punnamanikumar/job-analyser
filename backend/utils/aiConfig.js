/**
 * AI Provider Configuration Module
 * Centralizes all AI provider detection, configuration, and routing logic
 */

/**
 * Get the current AI provider based on environment configuration
 * Priority: USE_LOCAL_ANALYSE=true forces 'ollama', otherwise uses AI_PROVIDER
 * @returns {'ollama' | 'openrouter' | 'openai'}
 */
function getProvider() {
    // Local analysis takes priority
    if (process.env.USE_LOCAL_ANALYSE === 'true') {
        return 'ollama';
    }

    // Check explicit provider setting
    const provider = (process.env.AI_PROVIDER || '').toLowerCase();

    if (['ollama', 'openrouter', 'openai'].includes(provider)) {
        return provider;
    }

    // Auto-detect based on available API keys
    if (process.env.OPENROUTER_API_KEY) {
        return 'openrouter';
    }

    if (process.env.OPENAI_API_KEY) {
        return 'openai';
    }

    // Default to openrouter (will fallback to dictionary if no key)
    return 'openrouter';
}

/**
 * Check if using local analysis (Ollama)
 * @returns {boolean}
 */
function isLocalAnalysis() {
    return getProvider() === 'ollama';
}

/**
 * Get the API key for the current provider
 * @returns {string | undefined}
 */
function getApiKey() {
    const provider = getProvider();

    switch (provider) {
        case 'ollama':
            return undefined; // Local doesn't need API key
        case 'openrouter':
            return process.env.OPENROUTER_API_KEY;
        case 'openai':
            return process.env.OPENAI_API_KEY;
        default:
            return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    }
}

/**
 * Get the model for the current provider
 * @returns {string}
 */
function getModel() {
    const provider = getProvider();

    switch (provider) {
        case 'ollama':
            return process.env.OLLAMA_MODEL || 'llama3';
        case 'openrouter':
            return process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-4o-mini';
        case 'openai':
            return process.env.OPENAI_MODEL || 'gpt-4o-mini';
        default:
            return 'openai/gpt-4o-mini';
    }
}

/**
 * Get the base URL for the current provider
 * @returns {string}
 */
function getBaseUrl() {
    const provider = getProvider();

    switch (provider) {
        case 'ollama':
            return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        case 'openrouter':
            return 'https://openrouter.ai/api/v1';
        case 'openai':
            return 'https://api.openai.com/v1';
        default:
            return 'https://openrouter.ai/api/v1';
    }
}

/**
 * Get the referer URL for API requests (used by OpenRouter)
 * @returns {string}
 */
function getRefererUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}

/**
 * Get configuration object for current provider
 * @returns {Object}
 */
function getConfig() {
    const provider = getProvider();

    return {
        provider,
        isLocal: isLocalAnalysis(),
        apiKey: getApiKey(),
        model: getModel(),
        baseUrl: getBaseUrl(),
        refererUrl: getRefererUrl()
    };
}

/**
 * Log current AI configuration (for startup)
 */
function logConfiguration() {
    const config = getConfig();

    console.log('');
    console.log('🤖 AI Configuration:');
    console.log(`   Provider: ${config.provider.toUpperCase()}`);
    console.log(`   Model: ${config.model}`);

    if (config.isLocal) {
        console.log(`   Base URL: ${config.baseUrl}`);
    } else {
        console.log(`   API Key: ${config.apiKey ? '✅ Configured' : '❌ Missing'}`);
    }

    if (!config.apiKey && !config.isLocal) {
        console.log('   ⚠️  No API key found - will fallback to dictionary-based analysis');
    }

    console.log('');
}

module.exports = {
    getProvider,
    isLocalAnalysis,
    getApiKey,
    getModel,
    getBaseUrl,
    getRefererUrl,
    getConfig,
    logConfiguration
};
