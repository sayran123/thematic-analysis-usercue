/**
 * LangChain/LangSmith setup
 * 
 * This module configures LangChain and LangSmith integration for the thematic analysis pipeline.
 * Handles LLM initialization, API configuration, and monitoring setup.
 */

import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LLM_CONFIG, LOGGING_CONFIG } from './constants.js';

// Load environment variables from .env file
dotenv.config();

/**
 * Initialize LLM instance with configuration
 * @param {Object} options - LLM configuration options
 * @returns {Object} Configured LLM instance
 */
export async function initializeLLM(options = {}) {
  // Simple configuration for MVP with GPT-4.1-nano
  const config = {
    modelName: options.modelName || 'gpt-4o-mini', // GPT-4.1-nano equivalent
    temperature: parseFloat(options.temperature || '0.3'),
    maxTokens: parseInt(options.maxTokens || '2000'),
    openAIApiKey: options.apiKey || process.env.OPENAI_API_KEY,
  };
  
  // Basic validation
  if (!config.openAIApiKey) {
    return { error: 'OpenAI API key is required. Set OPENAI_API_KEY environment variable.' };
  }
  
  try {
    console.log('Initializing LLM with config:', {
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
    
    const llm = new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      openAIApiKey: config.openAIApiKey,
    });
    
    return { llm, config };
    
  } catch (error) {
    return { error: `Failed to initialize LLM: ${error.message}` };
  }
}

/**
 * Simple logging for MVP (LangSmith optional)
 * @param {string} operation - Operation name
 * @param {Object} data - Data to log
 */
export function logOperation(operation, data = {}) {
  console.log(`[${operation}]`, {
    timestamp: new Date().toISOString(),
    ...data
  });
}

/**
 * Create message array for LLM invocation
 * @param {string} systemPrompt - System prompt/instructions
 * @param {string} userPrompt - User prompt/query
 * @returns {Array} Array of LangChain message objects
 */
export function createMessages(systemPrompt, userPrompt) {
  const messages = [];
  
  // Add system message
  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }
  
  // Add user message
  if (userPrompt) {
    messages.push(new HumanMessage(userPrompt));
  }
  
  return messages;
}

/**
 * Simple LLM invocation for MVP
 * @param {Object} llm - LLM instance
 * @param {Array} messages - Messages to send
 * @returns {Promise<Object>} { content, error }
 */
export async function invokeLLM(llm, messages) {
  try {
    console.log(`[LLM] Invoking with ${messages.length} messages`);
    
    const startTime = Date.now();
    const response = await llm.invoke(messages);
    const duration = Date.now() - startTime;
    
    console.log(`[LLM] Success in ${duration}ms`);
    
    if (response && response.content) {
      return { content: response.content };
    } else {
      return { error: 'Invalid response format from LLM - missing content' };
    }
    
  } catch (error) {
    console.error(`[LLM] Failed:`, error.message);
    return { error: `LLM invocation failed: ${error.message}` };
  }
}

/**
 * Parse JSON response from LLM with error handling
 * @param {string} response - Raw LLM response
 * @returns {Object} { data, error }
 */
export function parseLLMResponse(response) {
  if (!response || typeof response !== 'string') {
    return { error: 'Response must be a non-empty string' };
  }
  
  try {
    let cleanResponse = response.trim();
    
    // Handle JSON blocks
    const jsonMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/i) || 
                     cleanResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                     cleanResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    
    if (jsonMatch) {
      cleanResponse = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(cleanResponse);
    return { data: parsed };
    
  } catch (error) {
    const preview = response.substring(0, 200) + (response.length > 200 ? '...' : '');
    return { error: `Failed to parse JSON: ${error.message}\nResponse: ${preview}` };
  }
}

// MVP Complete - Clean and simple LLM configuration for GPT-4.1-nano
