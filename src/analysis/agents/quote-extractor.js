/**
 * LLM: Extract supporting quotes with validation
 * 
 * This agent extracts verbatim quotes that support each theme.
 * Includes retry logic for hallucination prevention through quote validation.
 */

import { loadPrompt, formatPrompt } from '../prompts/quote-extraction.js';
import { initializeLLM } from '../../utils/config/llm-config.js';
import { QuoteValidator } from '../../utils/validation/quote-validator.js';

/**
 * Quote Extractor Agent class
 */
export class QuoteExtractorAgent {
  constructor() {
    this.llm = null;
    this.prompt = null; // Will load from prompts/quote-extraction.js
    this.quoteValidator = null; // Will initialize QuoteValidator
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

      // Initialize quote validator if needed
      if (!this.quoteValidator) {
        this.quoteValidator = new QuoteValidator({
          enableDetailedLogging: true // Enable detailed logging for debugging
        });
      }

      const { themes, classifications, responses, derivedQuestion, projectBackground } = input;
      
      // Attempt quote extraction with validation retry logic
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        console.log(`[QUOTE EXTRACTOR] Attempt ${attempt}/${this.maxRetries}`);
        
        // Extract quotes using LLM
        const quotesResult = await this.extractQuotes(input);
        
        if (quotesResult.error) {
          console.warn(`[QUOTE EXTRACTOR] Extraction failed on attempt ${attempt}: ${quotesResult.error}`);
          if (attempt === this.maxRetries) {
            return quotesResult;
          }
          continue;
        }

        // Validate extracted quotes for hallucination
        console.log('[QUOTE EXTRACTOR] Validating extracted quotes...');
        const validationResult = await this.validateQuotes(quotesResult.quotes, input);
        
        if (validationResult.passed) {
          console.log(`[QUOTE EXTRACTOR] Validation passed on attempt ${attempt}`);
          
          // Add validation metadata to quotes
          const validatedQuotes = this.addValidationMetadata(quotesResult.quotes, validationResult);
          
          return {
            quotes: validatedQuotes,
            totalQuotesExtracted: this.countQuotes(validatedQuotes),
            themeQuoteCounts: this.getThemeQuoteCounts(validatedQuotes),
            validationResult: {
              passed: true,
              attempts: attempt,
              totalQuotesValidated: validationResult.totalQuotesValidated,
              errors: validationResult.errors,
              warnings: validationResult.warnings
            }
          };
        } else {
          console.warn(`[QUOTE EXTRACTOR] Validation failed on attempt ${attempt}:`, validationResult.errors.slice(0, 3));
          
          if (attempt === this.maxRetries) {
            // Return quotes with validation warnings on final attempt
            console.warn('[QUOTE EXTRACTOR] Max retries reached, returning quotes with validation warnings');
            const quotesWithWarnings = this.addValidationMetadata(quotesResult.quotes, validationResult);
            
            return {
              quotes: quotesWithWarnings,
              totalQuotesExtracted: this.countQuotes(quotesWithWarnings),
              themeQuoteCounts: this.getThemeQuoteCounts(quotesWithWarnings),
              validationResult: {
                passed: false,
                attempts: attempt,
                totalQuotesValidated: validationResult.totalQuotesValidated,
                errors: validationResult.errors,
                warnings: validationResult.warnings
              }
            };
          } else {
            // Add validation errors to input for retry prompt
            input.previousErrors = validationResult.errors.slice(0, 5); // Limit to 5 most important errors
          }
        }
      }

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
      // Determine which prompt to use based on whether this is a retry
      const promptType = input.previousErrors && input.previousErrors.length > 0 
        ? 'quote-extraction-retry' 
        : 'quote-extraction';
      
      // Load appropriate prompt if this is a retry
      if (promptType === 'quote-extraction-retry') {
        const retryPromptResult = loadPrompt('quote-extraction-retry');
        if (retryPromptResult.error) {
          console.warn('[QUOTE EXTRACTOR] Failed to load retry prompt, using standard prompt');
        } else {
          this.prompt = retryPromptResult.template;
        }
      }
      
      // Format prompt with input data
      const formattedPrompt = formatPrompt(this.prompt, input);
      
      console.log(`[QUOTE EXTRACTOR] Calling LLM for quote extraction (${promptType})...`);
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
   * Validate extracted quotes using QuoteValidator
   * @param {Object} quotes - Extracted quotes organized by theme
   * @param {Object} input - Original input data with themes, classifications, responses
   * @returns {Promise<Object>} Validation result
   */
  async validateQuotes(quotes, input) {
    try {
      const validationInput = {
        selectedQuotes: quotes,
        responses: input.responses,
        themes: input.themes,
        classifications: input.classifications
      };
      
      const validationResult = this.quoteValidator.validateQuotes(validationInput);
      return validationResult;
      
    } catch (error) {
      console.error('[QUOTE EXTRACTOR] Quote validation error:', error);
      return {
        passed: false,
        errors: [`Quote validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Add validation metadata to quotes
   * @param {Object} quotes - Extracted quotes organized by theme
   * @param {Object} validationResult - Validation result from QuoteValidator
   * @returns {Object} Quotes with validation metadata
   */
  addValidationMetadata(quotes, validationResult) {
    const validatedQuotes = {};
    
    for (const [themeId, themeQuotes] of Object.entries(quotes)) {
      validatedQuotes[themeId] = themeQuotes.map(quote => ({
        ...quote,
        verified: validationResult.passed, // True if all validation passed
        validationMethod: 'comprehensive', // Indicates comprehensive validation used
        validationStatus: validationResult.passed ? 'verified' : 'warning'
      }));
    }
    
    return validatedQuotes;
  }

  /**
   * Extract and validate quotes with fallback strategy
   * NEW METHOD: Uses the enhanced validation approach from feedback
   * @param {Object} input - Input containing themes, classifications, responses
   * @returns {Promise<Object>} Validated quotes with fallback handling
   */
  async extractAndValidateQuotes(input) {
    try {
      const { themes, classifications, responses } = input;
      
      // First extract quotes using the standard approach
      const extractionResult = await this.extractQuotes(input);
      if (extractionResult.error) {
        return extractionResult;
      }
      
      // Create participant lookup for validation
      const participantLookup = this.createParticipantLookup(responses);
      const finalQuotes = {};
      
      for (const theme of themes) {
        const extractedQuotes = extractionResult.quotes[theme.id] || [];
        const validatedQuotes = [];
        
        for (const quote of extractedQuotes) {
          const validation = this.quoteValidator.validateQuoteWithFallback(
            { ...quote, themeId: theme.id },
            participantLookup,
            classifications
          );
          
          if (validation.isValid) {
            const finalQuote = {
              quote: validation.replacementQuote || quote.quote,
              participantId: validation.participantId,
              confidence: validation.confidence,
              wasHallucinated: validation.wasHallucinated || false,
              wasCorrected: validation.corrected || false
            };
            
            validatedQuotes.push(finalQuote);
          }
        }
        
        // Ensure we have at least one quote per theme
        if (validatedQuotes.length === 0) {
          const fallbackQuote = this.getFallbackQuoteForTheme(theme, classifications, responses);
          if (fallbackQuote) {
            validatedQuotes.push(fallbackQuote);
          }
        }
        
        finalQuotes[theme.id] = validatedQuotes.slice(0, 3); // Max 3 quotes per theme
      }
      
      return {
        quotes: finalQuotes,
        totalQuotesExtracted: this.countQuotes(finalQuotes),
        themeQuoteCounts: this.getThemeQuoteCounts(finalQuotes),
        validationResult: {
          passed: true,
          method: 'fallback_validation'
        }
      };
      
    } catch (error) {
      return { error: `Enhanced quote extraction failed: ${error.message}` };
    }
  }

  /**
   * Get a fallback quote for a theme when no valid quotes found
   * @param {Object} theme - Theme object
   * @param {Array} classifications - Classifications array
   * @param {Array} responses - Response array
   * @returns {Object|null} Fallback quote or null
   */
  getFallbackQuoteForTheme(theme, classifications, responses) {
    // Find participants classified to this theme
    const themeParticipants = classifications.filter(c => c.assignedTheme === theme.id);
    
    if (themeParticipants.length === 0) {
      return null;
    }
    
    // Get the first participant's response
    const firstParticipant = themeParticipants[0];
    const participantResponse = responses.find(r => r.participantId === firstParticipant.participantId);
    
    if (!participantResponse) {
      return null;
    }
    
    // Extract a fallback quote
    const fallbackText = this.quoteValidator.extractFallbackQuote(
      participantResponse,
      theme.id,
      classifications
    );
    
    if (!fallbackText) {
      return null;
    }
    
    return {
      quote: fallbackText,
      participantId: firstParticipant.participantId,
      confidence: 'low',
      wasHallucinated: false,
      wasCorrected: false,
      isFallback: true
    };
  }

  /**
   * Create participant lookup for fast access
   * @param {Array} responses - Array of response objects
   * @returns {Object} Lookup object keyed by participantId
   */
  createParticipantLookup(responses) {
    const lookup = {};
    for (const response of responses) {
      lookup[response.participantId] = response;
    }
    return lookup;
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
