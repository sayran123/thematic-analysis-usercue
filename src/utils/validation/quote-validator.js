/**
 * TODO: CRITICAL: Quote hallucination prevention
 * 
 * This is the most critical module in the pipeline for ensuring accuracy.
 * Validates that all quotes exist verbatim in source conversations to prevent LLM hallucination.
 */

// TODO: Add necessary imports
// import { VALIDATION_CONFIG } from '../config/constants.js';

/**
 * Quote Validator Service - Critical for accuracy
 */
export class QuoteValidator {
  constructor(options = {}) {
    this.config = {
      exactMatchRequired: options.exactMatchRequired !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      ignoreCase: options.ignoreCase === true,
      ignorePunctuation: options.ignorePunctuation !== false,
      allowPartialQuotes: options.allowPartialQuotes === true,
      ...options
    };
  }

  /**
   * CRITICAL: Validate all quotes exist verbatim in source conversations
   * This prevents hallucination - the #1 accuracy issue
   * @param {Object} validationInput - Input containing quotes, themes, responses, classifications
   * @returns {Object} Validation result with detailed errors
   */
  validateQuotes(validationInput) {
    // TODO: Implement comprehensive quote validation
    // - Validate each quote against source conversations
    // - Check participant attribution is correct
    // - Verify quotes are from user responses only
    // - Handle multi-part quotes properly
    // - Return detailed error information for retry logic
    
    const { selectedQuotes, responses, themes, classifications } = validationInput;
    const errors = [];
    const warnings = [];
    const validatedQuotes = new Map();

    try {
      // Validate input structure
      this.validateInputStructure(validationInput);

      // Process each theme's quotes
      for (const theme of themes) {
        const themeQuotes = selectedQuotes.get ? selectedQuotes.get(theme.id) : selectedQuotes[theme.id];
        
        if (!themeQuotes || themeQuotes.length === 0) {
          warnings.push(`No quotes provided for theme: ${theme.title}`);
          continue;
        }

        const validatedThemeQuotes = [];

        for (const quote of themeQuotes) {
          try {
            const validationResult = this.validateSingleQuote(quote, responses, theme);
            
            if (validationResult.isValid) {
              validatedThemeQuotes.push({
                ...quote,
                verified: true,
                validationInfo: validationResult.info
              });
            } else {
              errors.push(validationResult.error);
              validatedThemeQuotes.push({
                ...quote,
                verified: false,
                validationError: validationResult.error
              });
            }
          } catch (error) {
            errors.push(`Quote validation failed for participant ${quote.participantId}: ${error.message}`);
          }
        }

        validatedQuotes.set(theme.id, validatedThemeQuotes);
      }

      return {
        passed: errors.length === 0,
        errors,
        warnings,
        validatedQuotes
      };

    } catch (error) {
      return {
        passed: false,
        errors: [`Quote validation system error: ${error.message}`],
        warnings,
        validatedQuotes: new Map()
      };
    }
  }

  /**
   * Validate a single quote against source conversation
   * @param {Object} quote - Quote object with text and participantId
   * @param {Array} responses - All participant responses
   * @param {Object} theme - Theme context
   * @returns {Object} Validation result for single quote
   */
  validateSingleQuote(quote, responses, theme) {
    // TODO: Implement single quote validation
    try {
      // Find source conversation
      const conversation = responses.find(r => r.participantId === quote.participantId);
      
      if (!conversation) {
        return {
          isValid: false,
          error: `No conversation found for participant ${quote.participantId}`
        };
      }

      // Extract user responses only
      const userText = this.extractUserResponsesOnly(conversation.cleanResponse || conversation.response);
      
      if (!userText || userText.trim().length === 0) {
        return {
          isValid: false,
          error: `No user responses found in conversation for participant ${quote.participantId}`
        };
      }

      // Verify quote exists verbatim
      const existsVerbatim = this.validateQuoteExistsVerbatim(quote.quote, userText);
      
      if (!existsVerbatim.isValid) {
        return {
          isValid: false,
          error: `HALLUCINATED QUOTE: "${quote.quote.substring(0, 50)}..." not found in participant ${quote.participantId} responses. ${existsVerbatim.details}`
        };
      }

      return {
        isValid: true,
        info: {
          foundAt: existsVerbatim.position,
          matchType: existsVerbatim.matchType,
          userTextLength: userText.length
        }
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Quote validation error: ${error.message}`
      };
    }
  }

  /**
   * Core validation: Exact text matching with normalization
   * @param {string} quoteText - Quote to validate
   * @param {string} conversationUserText - User text from conversation
   * @returns {Object} Validation result with position and match details
   */
  validateQuoteExistsVerbatim(quoteText, conversationUserText) {
    // TODO: Implement core verbatim validation
    try {
      // Handle multi-part quotes (joined with ' ... ')
      const quoteParts = quoteText.includes(' ... ') ? quoteText.split(' ... ') : [quoteText];
      
      const validationResults = quoteParts.map(part => this.validateQuotePart(part, conversationUserText));
      
      // All parts must be valid
      const allValid = validationResults.every(result => result.isValid);
      
      if (!allValid) {
        const invalidParts = validationResults
          .filter(result => !result.isValid)
          .map(result => `"${result.part}"`);
        
        return {
          isValid: false,
          details: `Quote parts not found: ${invalidParts.join(', ')}`
        };
      }

      return {
        isValid: true,
        position: validationResults[0].position,
        matchType: validationResults[0].matchType,
        parts: validationResults.length
      };

    } catch (error) {
      return {
        isValid: false,
        details: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate a single quote part
   * @param {string} quotePart - Part of quote to validate
   * @param {string} conversationText - Full conversation text
   * @returns {Object} Validation result for quote part
   */
  validateQuotePart(quotePart, conversationText) {
    // TODO: Implement quote part validation with different matching strategies
    const part = quotePart.trim();
    
    if (part.length === 0) {
      return { isValid: false, part, details: 'Empty quote part' };
    }

    // Strategy 1: Exact match
    if (conversationText.includes(part)) {
      return {
        isValid: true,
        part,
        position: conversationText.indexOf(part),
        matchType: 'exact'
      };
    }

    // Strategy 2: Normalized match (if enabled)
    if (this.config.normalizeWhitespace || this.config.ignorePunctuation || this.config.ignoreCase) {
      const normalizedQuote = this.normalizeText(part);
      const normalizedConversation = this.normalizeText(conversationText);
      
      if (normalizedConversation.includes(normalizedQuote)) {
        return {
          isValid: true,
          part,
          position: this.findNormalizedPosition(part, conversationText),
          matchType: 'normalized'
        };
      }
    }

    // Log detailed failure information
    console.error(`Quote verification failed for: "${part}"`);
    console.error(`In conversation text (first 200 chars): "${conversationText.substring(0, 200)}..."`);
    
    return {
      isValid: false,
      part,
      details: `Text not found in conversation`
    };
  }

  /**
   * Extract only user responses from conversation format
   * @param {string} conversationText - Full conversation text
   * @returns {string} Combined user responses only
   */
  extractUserResponsesOnly(conversationText) {
    // TODO: Implement user response extraction
    try {
      // Parse "assistant: ... user: ... assistant: ... user: ..." format
      const parts = conversationText.split(/(?:assistant:|user:)/i);
      const userResponses = [];
      
      // Find text that follows 'user:' markers
      let isUserTurn = false;
      const markers = conversationText.match(/(?:assistant:|user:)/gi) || [];
      
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i].toLowerCase();
        if (marker === 'user:') {
          isUserTurn = true;
        } else if (marker === 'assistant:') {
          isUserTurn = false;
        }
        
        if (isUserTurn && i + 1 < parts.length) {
          const userText = parts[i + 1].trim();
          if (userText.length > 0) {
            userResponses.push(userText);
          }
        }
      }
      
      return userResponses.join(' ').trim();
      
    } catch (error) {
      console.error('Failed to extract user responses:', error);
      return conversationText; // Fallback to full text
    }
  }

  /**
   * Normalize text for comparison
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    // TODO: Implement text normalization
    let normalized = text;
    
    if (this.config.normalizeWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }
    
    if (this.config.ignoreCase) {
      normalized = normalized.toLowerCase();
    }
    
    if (this.config.ignorePunctuation) {
      normalized = normalized.replace(/[^\w\s]/g, '');
    }
    
    return normalized;
  }

  /**
   * Find position of normalized text in original
   * @param {string} quotePart - Original quote part
   * @param {string} conversationText - Original conversation
   * @returns {number} Approximate position
   */
  findNormalizedPosition(quotePart, conversationText) {
    // TODO: Implement approximate position finding
    // This is complex - for now return -1 to indicate normalized match
    return -1;
  }

  /**
   * Validate input structure for quote validation
   * @param {Object} validationInput - Input to validate
   * @throws {Error} If input structure is invalid
   */
  validateInputStructure(validationInput) {
    // TODO: Implement input structure validation
    const { selectedQuotes, responses, themes, classifications } = validationInput;
    
    if (!selectedQuotes) {
      throw new Error('selectedQuotes is required');
    }
    
    if (!Array.isArray(responses)) {
      throw new Error('responses must be an array');
    }
    
    if (!Array.isArray(themes)) {
      throw new Error('themes must be an array');
    }
    
    // Additional validation can be added here
  }

  /**
   * Generate detailed validation report
   * @param {Object} validationResult - Result from validateQuotes
   * @returns {string} Human-readable validation report
   */
  generateValidationReport(validationResult) {
    // TODO: Implement validation report generation
    const { passed, errors, warnings, validatedQuotes } = validationResult;
    
    let report = `\n=== Quote Validation Report ===\n`;
    report += `Status: ${passed ? 'PASSED' : 'FAILED'}\n`;
    report += `Errors: ${errors.length}\n`;
    report += `Warnings: ${warnings.length}\n\n`;
    
    if (errors.length > 0) {
      report += `Errors:\n`;
      errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }
    
    if (warnings.length > 0) {
      report += `Warnings:\n`;
      warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }
    
    report += `=== End Report ===\n`;
    return report;
  }
}
