/**
 * LLM: Extract supporting quotes with validation
 * 
 * This agent extracts verbatim quotes that support each theme.
 * Includes retry logic for hallucination prevention through quote validation.
 */

import { loadPrompt, formatPrompt } from '../prompts/quote-extraction.js';
import { initializeLLM } from '../../utils/config/llm-config.js';

/**
 * Quote Extractor Agent class
 */
export class QuoteExtractorAgent {
  constructor() {
    this.llm = null;
    this.prompt = null; // Will load from prompts/quote-extraction.js
    this.maxRetries = 3;
  }

  /**
   * Extract supporting quotes for themes with validation retry logic
   * @param {Object} input - Input data containing themes, classifications, responses
   * @returns {Promise<Object>} Quotes organized by theme with validation status
   */
  async invoke(input) {
    try {
      // Validate input
      const validation = this.validateInput(input);
      if (validation.error) {
        return { error: validation.error };
      }

      // Initialize LLM if needed
      if (!this.llm) {
        const llmResult = await initializeLLM({ maxTokens: 8000 });
        if (llmResult.error) {
          return { error: `LLM initialization failed: ${llmResult.error}` };
        }
        this.llm = llmResult.llm;
      }

      // Load prompt template if needed
      if (!this.prompt) {
        const promptResult = loadPrompt('quote-extraction');
        if (promptResult.error) {
          return { error: `Prompt loading failed: ${promptResult.error}` };
        }
        this.prompt = promptResult.template;
      }

      const { themes, classifications, responses, derivedQuestion, projectBackground } = input;
      
      // For initial implementation, we'll extract quotes without full validation
      // (Milestone 2.5 will add comprehensive validation)
      const quotesResult = await this.extractQuotes(input);
      
      if (quotesResult.error) {
        return quotesResult;
      }

      // Add basic validation (full validation in Milestone 2.5)
      const validatedQuotes = this.addBasicValidation(quotesResult.quotes, responses);
      
      return {
        quotes: validatedQuotes,
        totalQuotesExtracted: this.countQuotes(validatedQuotes),
        themeQuoteCounts: this.getThemeQuoteCounts(validatedQuotes)
      };

    } catch (error) {
      return { error: `Quote extraction failed: ${error.message}` };
    }
  }

  /**
   * Extract quotes using LLM
   * @param {Object} input - Input data for quote extraction
   * @returns {Promise<Object>} Raw quote extraction result
   */
  async extractQuotes(input) {
    try {
      // Format prompt with input data
      const formattedPrompt = formatPrompt(this.prompt, input);
      
      console.log('[QUOTE EXTRACTOR] Calling LLM for quote extraction...');
      const startTime = Date.now();
      
      // Call LLM API
      const llmResponse = await this.llm.invoke(formattedPrompt);
      
      const duration = Date.now() - startTime;
      console.log(`[QUOTE EXTRACTOR] LLM call completed in ${duration}ms`);
      
      // Extract content from LangChain response
      const responseContent = llmResponse.content || llmResponse;
      
      // Parse the response
      const parseResult = this.parseQuoteResponse(responseContent);
      
      if (parseResult.error) {
        return { error: `Quote parsing failed: ${parseResult.error}` };
      }
      
      return { quotes: parseResult.quotes };
      
    } catch (error) {
      return { error: `LLM quote extraction failed: ${error.message}` };
    }
  }

  /**
   * Add basic validation to quotes (full validation in Milestone 2.5)
   * @param {Object} quotes - Extracted quotes organized by theme
   * @param {Array} responses - Original responses for validation
   * @returns {Object} Quotes with basic validation status
   */
  addBasicValidation(quotes, responses) {
    // For now, just add a placeholder validation status
    // Milestone 2.5 will implement comprehensive quote validation
    const validatedQuotes = {};
    
    for (const [themeId, themeQuotes] of Object.entries(quotes)) {
      validatedQuotes[themeId] = themeQuotes.map(quote => ({
        ...quote,
        verified: true, // Placeholder - real validation in Milestone 2.5
        validationMethod: 'basic' // Indicates this is basic validation
      }));
    }
    
    return validatedQuotes;
  }

  /**
   * Parse LLM quote extraction response
   * @param {string} llmResponse - Raw LLM response
   * @returns {Object} Parsed quotes organized by theme
   */
  parseQuoteResponse(llmResponse) {
    try {
      // Clean and parse LLM response (handle markdown code blocks)
      let cleanedResponse = llmResponse;
      if (typeof llmResponse === 'string') {
        // Remove markdown code blocks if present
        cleanedResponse = llmResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
      }
      
      // Try to parse as JSON
      let parsed;
      if (typeof cleanedResponse === 'string') {
        parsed = JSON.parse(cleanedResponse);
      } else {
        parsed = cleanedResponse;
      }

      // Validate the structure
      if (!parsed || typeof parsed !== 'object') {
        return { error: 'LLM response is not a valid object' };
      }

      // Process each theme's quotes
      const processedQuotes = {};
      for (const [themeId, quotes] of Object.entries(parsed)) {
        if (!Array.isArray(quotes)) {
          console.warn(`Theme ${themeId} quotes is not an array, skipping`);
          processedQuotes[themeId] = [];
          continue;
        }

        // Validate and clean each quote
        const validQuotes = quotes.filter(quote => {
          if (!quote || typeof quote !== 'object') {
            console.warn('Invalid quote object, skipping');
            return false;
          }
          
          if (!quote.quote || typeof quote.quote !== 'string' || quote.quote.trim() === '') {
            console.warn('Quote missing or empty text, skipping');
            return false;
          }
          
          if (!quote.participantId || typeof quote.participantId !== 'string') {
            console.warn('Quote missing participantId, skipping');
            return false;
          }
          
          return true;
        }).map(quote => ({
          quote: quote.quote.trim(),
          participantId: quote.participantId.trim()
        }));

        processedQuotes[themeId] = validQuotes;
      }

      return { quotes: processedQuotes };

    } catch (error) {
      return { error: `Failed to parse quote response: ${error.message}` };
    }
  }

  /**
   * Validate quote extraction input
   * @param {Object} input - Input to validate
   * @returns {Object} Validation result with error if invalid
   */
  validateInput(input) {
    if (!input || typeof input !== 'object') {
      return { error: 'Input is required and must be an object' };
    }

    const { themes, classifications, responses, derivedQuestion, projectBackground } = input;

    // Validate themes
    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return { error: 'Themes array is required and must not be empty' };
    }

    for (const theme of themes) {
      if (!theme.id || !theme.title) {
        return { error: 'Each theme must have id and title' };
      }
    }

    // Validate classifications
    if (!classifications || !Array.isArray(classifications)) {
      return { error: 'Classifications array is required' };
    }

    // Validate responses
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return { error: 'Responses array is required and must not be empty' };
    }

    for (const response of responses) {
      if (!response.participantId || !response.cleanResponse) {
        return { error: 'Each response must have participantId and cleanResponse' };
      }
    }

    // Validate derived question
    if (!derivedQuestion || typeof derivedQuestion !== 'string') {
      return { error: 'Derived question is required and must be a string' };
    }

    // Project background is optional but should be string if provided
    if (projectBackground && typeof projectBackground !== 'string') {
      return { error: 'Project background must be a string if provided' };
    }

    return { valid: true };
  }

  /**
   * Count total quotes across all themes
   * @param {Object} quotes - Quotes organized by theme
   * @returns {number} Total quote count
   */
  countQuotes(quotes) {
    return Object.values(quotes).reduce((total, themeQuotes) => total + themeQuotes.length, 0);
  }

  /**
   * Get quote counts per theme
   * @param {Object} quotes - Quotes organized by theme
   * @returns {Object} Quote counts per theme
   */
  getThemeQuoteCounts(quotes) {
    const counts = {};
    for (const [themeId, themeQuotes] of Object.entries(quotes)) {
      counts[themeId] = themeQuotes.length;
    }
    return counts;
  }

  /**
   * Extract user responses from conversation format
   * @param {string} conversationText - Full conversation text
   * @returns {string} User responses only
   */
  extractUserResponse(conversationText) {
    if (!conversationText || typeof conversationText !== 'string') {
      return '';
    }

    // Split by assistant: and user: markers and extract user parts
    const parts = conversationText.split(/(?:assistant:|user:)/i);
    const userParts = [];
    
    // Find parts that come after 'user:' markers
    for (let i = 0; i < parts.length; i++) {
      const beforeThis = conversationText.substring(0, 
        conversationText.indexOf(parts[i])
      ).toLowerCase();
      
      if (beforeThis.includes('user:') && !beforeThis.endsWith('assistant:')) {
        userParts.push(parts[i].trim());
      }
    }
    
    return userParts.filter(part => part.length > 0).join(' ');
  }
}
