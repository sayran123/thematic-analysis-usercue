/**
 * TODO: LangChain/LangSmith setup
 * 
 * This module configures LangChain and LangSmith integration for the thematic analysis pipeline.
 * Handles LLM initialization, API configuration, and monitoring setup.
 */

// TODO: Add necessary imports when dependencies are installed
// import { ChatOpenAI } from '@langchain/openai';
// import { LangSmith } from 'langsmith';
// import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LLM_CONFIG, LOGGING_CONFIG } from './constants.js';

/**
 * Initialize LLM instance with configuration
 * @param {Object} options - LLM configuration options
 * @returns {Object} Configured LLM instance
 */
export async function initializeLLM(options = {}) {
  // Get configuration from constants or environment variables
  const config = {
    modelName: options.modelName || process.env.LLM_MODEL || LLM_CONFIG.MODEL.DEFAULT,
    temperature: parseFloat(options.temperature || process.env.LLM_TEMPERATURE || LLM_CONFIG.MODEL.TEMPERATURE),
    maxTokens: parseInt(options.maxTokens || process.env.LLM_MAX_TOKENS || LLM_CONFIG.MODEL.MAX_TOKENS),
    topP: parseFloat(options.topP || LLM_CONFIG.MODEL.TOP_P),
    timeout: parseInt(options.timeout || process.env.LLM_TIMEOUT_MS || LLM_CONFIG.API.TIMEOUT_MS),
    maxRetries: parseInt(options.maxRetries || process.env.MAX_RETRIES || LLM_CONFIG.API.RETRY_ATTEMPTS),
    openAIApiKey: options.apiKey || process.env.OPENAI_API_KEY,
  };
  
  // Validate configuration
  if (!config.openAIApiKey) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }
  
  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error('Temperature must be between 0 and 2');
  }
  
  if (config.maxTokens < 1) {
    throw new Error('maxTokens must be at least 1');
  }
  
  try {
    console.log('Initializing LLM with config:', {
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      maxRetries: config.maxRetries
    });
    
    // TODO: Uncomment when LangChain dependencies are installed
    // const llm = new ChatOpenAI({
    //   modelName: config.modelName,
    //   temperature: config.temperature,
    //   maxTokens: config.maxTokens,
    //   topP: config.topP,
    //   timeout: config.timeout,
    //   maxRetries: config.maxRetries,
    //   openAIApiKey: config.openAIApiKey,
    // });
    
    // Placeholder implementation until dependencies are installed
    const llm = {
      config,
      invoke: async (messages) => {
        // This will be replaced with actual LangChain implementation
        console.log('LLM invocation with messages:', messages.length);
        return {
          content: 'This is a placeholder response. Install LangChain dependencies to enable actual LLM functionality.'
        };
      }
    };
    
    return llm;
    
  } catch (error) {
    throw new Error(`Failed to initialize LLM: ${error.message}`);
  }
}

/**
 * Initialize LangSmith tracking and monitoring
 * @param {Object} options - LangSmith configuration options
 * @returns {Object} LangSmith client instance
 */
export async function initializeLangSmith(options = {}) {
  const config = {
    apiKey: options.apiKey || process.env.LANGSMITH_API_KEY,
    projectName: options.projectName || process.env.LANGSMITH_PROJECT || 'thematic-analysis-pipeline',
    tracingEnabled: options.tracingEnabled !== false && process.env.LANGSMITH_TRACING !== 'false',
    feedbackEnabled: options.feedbackEnabled === true,
  };
  
  if (!config.apiKey) {
    console.warn('LangSmith API key not provided - monitoring disabled');
    return null;
  }
  
  try {
    console.log('Initializing LangSmith monitoring...', {
      projectName: config.projectName,
      tracingEnabled: config.tracingEnabled
    });
    
    // TODO: Uncomment when LangSmith dependencies are installed
    // const langSmithClient = new LangSmith({
    //   apiKey: config.apiKey,
    //   projectName: config.projectName
    // });
    
    // Placeholder implementation until dependencies are installed
    const langSmithClient = {
      config,
      trace: async (operation, metadata = {}) => {
        if (config.tracingEnabled) {
          console.log(`[LangSmith] Tracing operation: ${operation}`, {
            timestamp: new Date().toISOString(),
            project: config.projectName,
            ...metadata
          });
        }
      },
      log: async (event, data = {}) => {
        if (config.tracingEnabled) {
          console.log(`[LangSmith] Event: ${event}`, {
            timestamp: new Date().toISOString(),
            project: config.projectName,
            ...data
          });
        }
      }
    };
    
    return langSmithClient;
    
  } catch (error) {
    console.warn(`Failed to initialize LangSmith: ${error.message}`);
    return null;
  }
}

/**
 * Create message array for LLM invocation
 * @param {string} systemPrompt - System prompt/instructions
 * @param {string} userPrompt - User prompt/query
 * @param {Array} history - Optional conversation history
 * @returns {Array} Array of message objects
 */
export function createMessages(systemPrompt, userPrompt, history = []) {
  // TODO: Implement message creation
  // - Create system message with instructions
  // - Add conversation history if provided
  // - Add user message
  // - Format according to LangChain requirements
  
  const messages = [];
  
  // Add system message
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  // Add conversation history
  history.forEach(message => {
    messages.push({
      role: message.role || 'user',
      content: message.content
    });
  });
  
  // Add user message
  if (userPrompt) {
    messages.push({
      role: 'user',
      content: userPrompt
    });
  }
  
  return messages;
}

/**
 * Invoke LLM with retry logic and error handling
 * @param {Object} llm - LLM instance
 * @param {Array} messages - Messages to send
 * @param {Object} options - Invocation options
 * @returns {Promise<string>} LLM response
 */
export async function invokeLLMWithRetry(llm, messages, options = {}) {
  const maxRetries = options.maxRetries || LLM_CONFIG.API.RETRY_ATTEMPTS;
  const retryDelay = options.retryDelay || LLM_CONFIG.API.RETRY_DELAY_MS;
  const useCase = options.useCase || 'general';
  
  // Apply use case specific configuration
  const useCaseConfig = createUseCaseConfig(useCase, options);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (LOGGING_CONFIG.DEFAULT_LEVEL >= LOGGING_CONFIG.LEVEL.INFO) {
        console.log(`[LLM] Attempt ${attempt}/${maxRetries} - Use case: ${useCase}`, {
          messageCount: messages.length,
          config: useCaseConfig
        });
      }
      
      const startTime = Date.now();
      const response = await llm.invoke(messages);
      const duration = Date.now() - startTime;
      
      // Log usage statistics
      logLLMUsage(useCase, {
        attempt,
        duration,
        messageCount: messages.length,
        success: true
      });
      
      // Validate response
      if (response && response.content) {
        if (LOGGING_CONFIG.DEFAULT_LEVEL >= LOGGING_CONFIG.LEVEL.DEBUG) {
          console.log(`[LLM] Success on attempt ${attempt}:`, {
            responseLength: response.content.length,
            duration
          });
        }
        return response.content;
      } else {
        throw new Error('Invalid response format from LLM - missing content');
      }
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorType = classifyError(error);
      
      console.error(`[LLM] Attempt ${attempt} failed:`, {
        error: error.message,
        type: errorType,
        useCase,
        isLastAttempt
      });
      
      // Log failed usage
      logLLMUsage(useCase, {
        attempt,
        messageCount: messages.length,
        success: false,
        errorType
      });
      
      if (isLastAttempt) {
        throw new Error(`LLM invocation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate exponential backoff delay
      const backoffDelay = retryDelay * Math.pow(2, attempt - 1);
      const jitteredDelay = backoffDelay + Math.random() * 1000; // Add jitter
      
      console.log(`[LLM] Retrying in ${Math.round(jitteredDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
}

/**
 * Parse JSON response from LLM with error handling
 * @param {string} response - Raw LLM response
 * @param {Object} options - Parsing options
 * @returns {Object} Parsed JSON object
 */
export function parseLLMResponse(response, options = {}) {
  if (!response || typeof response !== 'string') {
    throw new Error('Response must be a non-empty string');
  }
  
  try {
    let cleanResponse = response.trim();
    
    // Handle multiple possible JSON block formats
    const jsonBlockPatterns = [
      /```json\s*([\s\S]*?)\s*```/i,  // ```json ... ```
      /```\s*([\s\S]*?)\s*```/,       // ``` ... ```
      /`([\s\S]*?)`/,                 // ` ... `
    ];
    
    for (const pattern of jsonBlockPatterns) {
      const match = cleanResponse.match(pattern);
      if (match) {
        cleanResponse = match[1].trim();
        break;
      }
    }
    
    // Try to extract JSON from text that might have extra content
    if (!cleanResponse.startsWith('{') && !cleanResponse.startsWith('[')) {
      // Look for JSON-like content
      const jsonMatch = cleanResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[1];
      }
    }
    
    // Parse JSON
    const parsed = JSON.parse(cleanResponse);
    
    // Basic validation
    if (options.requiredFields && Array.isArray(options.requiredFields)) {
      for (const field of options.requiredFields) {
        if (!(field in parsed)) {
          throw new Error(`Required field '${field}' missing from parsed response`);
        }
      }
    }
    
    // Schema validation placeholder
    if (options.schema) {
      // TODO: Add JSON schema validation when needed
      console.log('JSON schema validation not implemented yet');
    }
    
    return parsed;
    
  } catch (error) {
    const preview = response.substring(0, 200) + (response.length > 200 ? '...' : '');
    throw new Error(`Failed to parse LLM response as JSON: ${error.message}\nResponse preview: ${preview}`);
  }
}

/**
 * Create LLM configuration for specific use case
 * @param {string} useCase - Use case identifier (theme-generation, classification, etc.)
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Use case specific configuration
 */
export function createUseCaseConfig(useCase, overrides = {}) {
  // TODO: Implement use case specific configurations
  // - Define different settings for different pipeline stages
  // - Optimize parameters for specific tasks
  // - Include prompt-specific settings
  
  const baseConfig = {
    temperature: LLM_CONFIG.MODEL.TEMPERATURE,
    maxTokens: LLM_CONFIG.MODEL.MAX_TOKENS,
    topP: LLM_CONFIG.MODEL.TOP_P
  };
  
  const useCaseConfigs = {
    'theme-generation': {
      ...baseConfig,
      temperature: 0.4, // Slightly higher creativity for theme generation
      maxTokens: 3000
    },
    'classification': {
      ...baseConfig,
      temperature: 0.2, // Lower temperature for consistent classification
      maxTokens: 2000
    },
    'quote-extraction': {
      ...baseConfig,
      temperature: 0.1, // Very low temperature for exact quote extraction
      maxTokens: 2000
    },
    'summarization': {
      ...baseConfig,
      temperature: 0.3, // Moderate creativity for engaging summaries
      maxTokens: 2500
    }
  };
  
  const config = useCaseConfigs[useCase] || baseConfig;
  return { ...config, ...overrides };
}

/**
 * Log LLM usage statistics
 * @param {string} operation - Operation name
 * @param {Object} stats - Usage statistics
 */
export function logLLMUsage(operation, stats) {
  // TODO: Implement usage logging
  // - Track token usage
  // - Monitor response times
  // - Log error rates
  // - Calculate costs if needed
  
  if (LOGGING_CONFIG.DEFAULT_LEVEL >= LOGGING_CONFIG.LEVEL.INFO) {
    console.log(`LLM Usage - ${operation}:`, {
      timestamp: new Date().toISOString(),
      operation,
      ...stats
    });
  }
}

/**
 * Validate LLM configuration
 * @param {Object} config - LLM configuration to validate
 * @returns {Object} Validation result
 */
export function validateLLMConfig(config) {
  const errors = [];
  const warnings = [];
  
  // Required field validation
  if (!config.modelName) {
    errors.push('Model name is required');
  }
  
  if (!config.openAIApiKey) {
    errors.push('OpenAI API key is required');
  }
  
  // Parameter range validation
  if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
    errors.push('Temperature must be a number between 0 and 2');
  }
  
  if (typeof config.maxTokens !== 'number' || config.maxTokens < 1) {
    errors.push('Max tokens must be a number greater than 0');
  }
  
  if (config.maxTokens < 100) {
    warnings.push('Max tokens seems very low (< 100)');
  }
  
  if (typeof config.timeout !== 'number' || config.timeout < 1000) {
    warnings.push('Timeout should be at least 1000ms');
  }
  
  if (typeof config.maxRetries !== 'number' || config.maxRetries < 1) {
    warnings.push('Max retries should be at least 1');
  }
  
  // Model name validation
  const supportedModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'];
  if (!supportedModels.includes(config.modelName)) {
    warnings.push(`Model '${config.modelName}' may not be supported. Supported models: ${supportedModels.join(', ')}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    summary: `LLM Config validation ${errors.length === 0 ? 'PASSED' : 'FAILED'}: ${errors.length} errors, ${warnings.length} warnings`
  };
}

/**
 * Classify error type for better retry logic
 * @param {Error} error - Error to classify
 * @returns {string} Error type
 */
function classifyError(error) {
  const message = error.message.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('429')) {
    return 'rate_limit';
  }
  
  if (message.includes('timeout') || message.includes('connection')) {
    return 'network';
  }
  
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'auth';
  }
  
  if (message.includes('invalid') || message.includes('400')) {
    return 'validation';
  }
  
  if (message.includes('server') || message.includes('500') || message.includes('502') || message.includes('503')) {
    return 'server';
  }
  
  return 'unknown';
}
