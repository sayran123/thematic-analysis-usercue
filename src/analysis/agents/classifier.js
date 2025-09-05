/**
 * LLM: Classify responses to themes
 * 
 * This agent classifies participant responses to generated themes.
 * Receives themes and derived question from the theme generation stage.
 */

import { loadPrompt, formatPrompt } from '../prompts/classification.js';
import { initializeLLM, createMessages, invokeLLM, parseLLMResponse } from '../../utils/config/llm-config.js';

/**
 * Classification Agent class
 */
export class ClassifierAgent {
  constructor() {
    this.llm = null; // Initialize lazily
    this.prompt = null; // Will load from prompts/classification.js
  }

  /**
   * Classify participant responses to themes
   * @param {Object} input - Input data containing derivedQuestion, themes, responses, projectBackground
   * @returns {Promise<Object>} Result with classifications array or error
   */
  async invoke(input) {
    try {
      // Validate input
      const validation = this.validateInput(input);
      if (validation.error) {
        return { error: validation.error };
      }

      // Initialize LLM if needed (with higher token limit for classification)
      if (!this.llm) {
        const llmResult = await initializeLLM({ maxTokens: 12000 }); // Even higher limit for 106 classifications
        if (llmResult.error) {
          return { error: `LLM initialization failed: ${llmResult.error}` };
        }
        this.llm = llmResult.llm;
      }

      // Load prompt template if needed
      if (!this.prompt) {
        const promptResult = loadPrompt('classification');
        if (promptResult.error) {
          return { error: `Prompt loading failed: ${promptResult.error}` };
        }
        this.prompt = promptResult.template;
      }

      const { derivedQuestion, themes, responses, projectBackground } = input;
      
      // Extract user responses only from conversation format
      const userResponses = responses.map(r => ({
        participantId: r.participantId,
        questionId: r.questionId,
        cleanResponse: r.cleanResponse,
        userOnly: this.extractUserResponse(r.cleanResponse)
      })).filter(r => r.userOnly);
      
      if (userResponses.length === 0) {
        return { error: 'No valid user responses found in conversations' };
      }

      // For reliability, always use smaller batches for large datasets (>25)
      if (userResponses.length > 25) {
        console.log(`[CLASSIFIER] Using batch processing for ${userResponses.length} responses`);
        return await this.processInBatches(themes, userResponses, derivedQuestion, projectBackground);
      }

      // Try single batch processing for smaller datasets
      const batchResult = await this.processBatch(
        themes, 
        userResponses, 
        derivedQuestion, 
        projectBackground
      );

      if (batchResult.error && (batchResult.error.includes('token') || batchResult.error.includes('JSON') || batchResult.error.includes('Unterminated'))) {
        // Fallback to smaller batches if token limit exceeded or JSON parsing fails
        console.log('[CLASSIFIER] Single batch failed, falling back to smaller batches');
        return await this.processInBatches(themes, userResponses, derivedQuestion, projectBackground);
      }

      return batchResult;

    } catch (error) {
      return { error: `Classification failed: ${error.message}` };
    }
  }

  /**
   * Process all responses in a single batch
   * @param {Array} themes - Available themes
   * @param {Array} responses - User responses to classify
   * @param {string} derivedQuestion - Research question context
   * @param {string} projectBackground - Project context
   * @returns {Promise<Object>} Classification result or error
   */
  async processBatch(themes, responses, derivedQuestion, projectBackground) {
    try {
      // Format the prompt with all data
      const formattedPrompt = formatPrompt(this.prompt, {
        themes: themes,
        responses: responses,
        derivedQuestion: derivedQuestion,
        projectBackground: projectBackground,
        responseCount: responses.length,
        questionId: responses[0]?.questionId || 'unknown'
      });

      // Create messages for LLM
      const messages = createMessages(formattedPrompt.systemPrompt, formattedPrompt.userPrompt);

      // Call LLM API
      const llmResult = await invokeLLM(this.llm, messages);
      if (llmResult.error) {
        return { error: `LLM API call failed: ${llmResult.error}` };
      }
      
      // Parse and validate the response
      const parsedResult = await this.parseLLMResponse(llmResult.content, responses, themes);
      if (parsedResult.error) {
        return parsedResult;
      }

      return { classifications: parsedResult.classifications };

    } catch (error) {
      return { error: `Batch processing failed: ${error.message}` };
    }
  }

  /**
   * Process responses in smaller batches if single batch fails
   * @param {Array} themes - Available themes
   * @param {Array} responses - User responses to classify
   * @param {string} derivedQuestion - Research question context
   * @param {string} projectBackground - Project context
   * @returns {Promise<Object>} Combined classification result or error
   */
  async processInBatches(themes, responses, derivedQuestion, projectBackground, batchSize = 25) {
    try {
      const allClassifications = [];
      const totalBatches = Math.ceil(responses.length / batchSize);
      
      console.log(`[CLASSIFIER] Processing ${responses.length} responses in ${totalBatches} batches of ${batchSize}`);
      
      for (let i = 0; i < responses.length; i += batchSize) {
        const batch = responses.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        console.log(`[CLASSIFIER] Processing batch ${batchNum}/${totalBatches} (${batch.length} responses)`);
        
        let batchResult = await this.processBatch(
          themes, 
          batch, 
          derivedQuestion, 
          projectBackground
        );
        
        // Enhanced retry logic with exponential backoff
        const maxRetries = 3;
        let retryCount = 0;
        
        while (batchResult.classifications && 
               batchResult.classifications.length !== batch.length && 
               retryCount < maxRetries) {
          
          retryCount++;
          const backoffDelay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          
          console.log(`[CLASSIFIER] Batch ${batchNum} incomplete (${batchResult.classifications.length}/${batch.length}), retry ${retryCount}/${maxRetries} after ${backoffDelay/1000}s...`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          
          batchResult = await this.processBatch(
            themes, 
            batch, 
            derivedQuestion, 
            projectBackground
          );
          
          if (batchResult.classifications && batchResult.classifications.length === batch.length) {
            console.log(`[CLASSIFIER] Batch ${batchNum} completed successfully on retry ${retryCount}`);
            break;
          }
        }
        
        if (batchResult.error) {
          return { error: `Batch ${batchNum} failed: ${batchResult.error}` };
        }
        
        // Validate batch results - accept partial success (90%+) or complete success
        if (!batchResult.classifications || batchResult.classifications.length === 0) {
          return { error: `Batch ${batchNum} returned no classifications` };
        }
        
        const completionRate = batchResult.classifications.length / batch.length;
        if (completionRate < 0.9) {
          return { error: `Batch ${batchNum} completion rate too low: ${(completionRate * 100).toFixed(1)}% (${batchResult.classifications.length}/${batch.length})` };
        }
        
        if (completionRate < 1.0) {
          console.warn(`[CLASSIFIER] Batch ${batchNum} partial success: ${batchResult.classifications.length}/${batch.length} classifications (${(completionRate * 100).toFixed(1)}%)`);
        } else {
          console.log(`[CLASSIFIER] Batch ${batchNum} complete success: ${batchResult.classifications.length}/${batch.length} classifications`);
        }
        
        allClassifications.push(...batchResult.classifications);
      }

      // Calculate quality metrics
      const expectedTotal = responses.length;
      const actualTotal = allClassifications.length;
      const overallSuccessRate = (actualTotal / expectedTotal) * 100;
      
      console.log(`[CLASSIFIER] All batches complete: ${actualTotal}/${expectedTotal} classifications (${overallSuccessRate.toFixed(1)}% success rate)`);
      
      return { 
        classifications: allClassifications,
        qualityMetrics: {
          expectedClassifications: expectedTotal,
          actualClassifications: actualTotal,
          successRate: overallSuccessRate.toFixed(1) + '%',
          totalBatches: totalBatches,
          partialSuccesses: this.getPartialSuccessCount(responses, allClassifications)
        }
      };

    } catch (error) {
      return { error: `Batch processing failed: ${error.message}` };
    }
  }

  /**
   * Validate classification input
   * @param {Object} input - Input to validate
   * @returns {Object} Validation result with error if invalid
   */
  validateInput(input) {
    if (!input) {
      return { error: 'Input is required' };
    }

    if (!input.derivedQuestion || typeof input.derivedQuestion !== 'string') {
      return { error: 'Valid derivedQuestion is required' };
    }

    if (!input.themes || !Array.isArray(input.themes)) {
      return { error: 'Themes array is required' };
    }

    if (input.themes.length === 0) {
      return { error: 'At least one theme is required' };
    }

    if (!input.responses || !Array.isArray(input.responses)) {
      return { error: 'Responses array is required' };
    }

    if (input.responses.length === 0) {
      return { error: 'At least one response is required' };
    }

    if (!input.projectBackground || typeof input.projectBackground !== 'string') {
      return { error: 'Project background is required' };
    }

    // Validate theme structure
    for (const theme of input.themes) {
      if (!theme.id || !theme.title || !theme.description) {
        return { error: 'Each theme must have id, title, and description' };
      }
    }

    return { valid: true };
  }

  /**
   * Extract user response from conversation format
   * @param {string} conversationText - Full conversation text
   * @returns {string} User response only
   */
  extractUserResponse(conversationText) {
    if (!conversationText) return '';
    
    // Split by user: markers and extract user parts
    const parts = conversationText.split(/user:\s*/);
    const userParts = parts.slice(1); // Skip first part (before first user:)
    
    // Join user responses and clean up
    return userParts.map(part => {
      // Remove any subsequent assistant: parts
      return part.split(/assistant:\s*/)[0].trim();
    }).filter(Boolean).join(' ');
  }

  /**
   * Parse LLM response into structured format
   * @param {string} llmResponse - Raw LLM response
   * @param {Array} originalResponses - Original responses that were classified
   * @param {Array} themes - Available themes
   * @returns {Promise<Object>} Parsed classification result
   */
  async parseLLMResponse(llmResponse, originalResponses, themes) {
    try {
      // Clean and parse LLM response (handle markdown code blocks and escape sequences)
      let cleanedResponse = llmResponse;
      if (typeof llmResponse === 'string') {
        // Remove markdown code blocks if present
        cleanedResponse = llmResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        // Log response length for monitoring
        console.log(`[CLASSIFIER] LLM Response length: ${cleanedResponse.length}`);
      }
      
      // Try to parse as JSON
      let parsed;
      if (typeof cleanedResponse === 'string') {
        parsed = JSON.parse(cleanedResponse);
      } else {
        parsed = cleanedResponse;
      }

      // Validate using prompt validation function
      const classificationPrompts = await import('../prompts/classification.js');
      const validationResult = classificationPrompts.validatePromptOutput(parsed, originalResponses, themes);
      
      if (validationResult.error) {
        return { error: validationResult.error };
      }

      if (!validationResult.passed) {
        return { 
          error: `Classification validation failed: ${validationResult.errors.join(', ')}`,
          warnings: validationResult.warnings
        };
      }

      return {
        classifications: validationResult.classifications,
        warnings: validationResult.warnings
      };

    } catch (error) {
      return { error: `Failed to parse LLM response: ${error.message}` };
    }
  }

  /**
   * Count how many batches had partial success (less than 100% but more than 90%)
   * @param {Array} originalResponses - Original responses
   * @param {Array} classifications - Actual classifications
   * @returns {number} Number of partial successes
   */
  getPartialSuccessCount(originalResponses, classifications) {
    // This is a simplified metric - in a real implementation,
    // we'd track this during batch processing
    const successRate = classifications.length / originalResponses.length;
    return successRate < 1.0 && successRate >= 0.9 ? 1 : 0;
  }
}
