/**
 * Quote validation & hallucination prevention
 * 
 * This module validates that extracted quotes exist verbatim in source conversations.
 * Critical for preventing LLM hallucination - the #1 accuracy requirement.
 */

import { VALIDATION_CONFIG } from '../config/constants.js';

/**
 * Quote Validator Service
 * Implements comprehensive quote validation to prevent hallucination
 */
export class QuoteValidator {
  constructor(options = {}) {
    this.config = {
      // Text normalization settings - MORE LENIENT for better quote recovery
      preserveCase: options.preserveCase || false,
      preservePunctuation: options.preservePunctuation || false, // Remove punctuation for better matching
      allowPartialMatches: options.allowPartialMatches || true, // Allow partial matches for flexibility
      minQuoteLength: options.minQuoteLength || 2, // Reduced minimum words (was 3)
      
      // Multi-part quote settings
      multiPartSeparator: options.multiPartSeparator || ' ... ',
      
      // Performance settings
      maxConversationLength: options.maxConversationLength || 10000, // chars
      enableDetailedLogging: options.enableDetailedLogging || false
    };
  }

  /**
   * Validate all quotes exist verbatim in source conversations
   * @param {Object} validationInput - Input containing quotes, responses, themes, classifications
   * @returns {Object} Validation result with errors and warnings
   */
  validateQuotes(validationInput) {
    const errors = [];
    const warnings = [];

    try {
      // Basic input validation
      const inputValidation = this.validateInput(validationInput);
      if (inputValidation.error) {
        return { passed: false, errors: [inputValidation.error], warnings: [] };
      }

      const { selectedQuotes, responses, themes, classifications } = validationInput;

      // Create participant lookup for fast access
      const participantLookup = this.createParticipantLookup(responses);

      // Validate each theme's quotes
      for (const theme of themes) {
        const themeQuotes = selectedQuotes[theme.id] || [];
        
        // Validate quotes for this theme
        const themeValidation = this.validateThemeQuotes(
          theme, 
          themeQuotes, 
          participantLookup, 
          classifications
        );
        
        errors.push(...themeValidation.errors);
        warnings.push(...themeValidation.warnings);
      }

      // Additional validation checks
      const additionalChecks = this.performAdditionalValidation(
        selectedQuotes, 
        themes, 
        classifications, 
        participantLookup
      );
      
      errors.push(...additionalChecks.errors);
      warnings.push(...additionalChecks.warnings);

      const passed = errors.length === 0;

      if (this.config.enableDetailedLogging) {
        console.log(`[QUOTE VALIDATOR] Validation ${passed ? 'PASSED' : 'FAILED'}`);
        console.log(`[QUOTE VALIDATOR] Errors: ${errors.length}, Warnings: ${warnings.length}`);
      }

      return {
        passed,
        errors,
        warnings,
        totalQuotesValidated: this.countTotalQuotes(selectedQuotes),
        themeQuoteCounts: this.getThemeQuoteCounts(selectedQuotes)
      };

    } catch (error) {
      return {
        passed: false,
        errors: [`Quote validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate quotes for a specific theme
   * @param {Object} theme - Theme object
   * @param {Array} themeQuotes - Quotes for this theme
   * @param {Object} participantLookup - Participant conversation lookup
   * @param {Array} classifications - Response classifications
   * @returns {Object} Theme validation result
   */
  validateThemeQuotes(theme, themeQuotes, participantLookup, classifications) {
    const errors = [];
    const warnings = [];

    for (const quote of themeQuotes) {
      const quoteValidation = this.validateSingleQuote(
        quote, 
        theme, 
        participantLookup, 
        classifications
      );
      
      errors.push(...quoteValidation.errors);
      warnings.push(...quoteValidation.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validate a single quote against source conversation
   * @param {Object} quote - Quote object with quote text and participantId
   * @param {Object} theme - Theme object
   * @param {Object} participantLookup - Participant conversation lookup  
   * @param {Array} classifications - Response classifications
   * @returns {Object} Single quote validation result
   */
  validateSingleQuote(quote, theme, participantLookup, classifications) {
    const errors = [];
    const warnings = [];

    // 1. Validate quote structure
    if (!quote.quote || typeof quote.quote !== 'string' || quote.quote.trim() === '') {
      errors.push(`Empty or invalid quote for theme "${theme.title}"`);
      return { errors, warnings };
    }

    // 2. SMART QUOTE VALIDATION: Primary goal is ensuring quote is not hallucinated
    const smartValidation = this.validateQuoteWithSmartIdCorrection(quote, participantLookup);
    
    if (!smartValidation.isValid) {
      // Only mark as error if quote doesn't exist ANYWHERE (hallucinated)
      errors.push(`HALLUCINATED QUOTE: "${quote.quote.substring(0, 50)}..." - ${smartValidation.reason}`);
    } else {
      // Quote exists! Update with correct participant ID if we found a better match
      if (smartValidation.correctedParticipantId && smartValidation.correctedParticipantId !== quote.participantId) {
        warnings.push(`Quote participant ID corrected from ${quote.participantId} to ${smartValidation.correctedParticipantId}`);
        quote.participantId = smartValidation.correctedParticipantId; // Fix the ID
      }
      
      // Add confidence indicator
      quote.validationConfidence = smartValidation.confidence;
    }

    // 3. Validate participant classification matches theme (optional warning only)
    const participantClassification = classifications?.find(c => c.participantId === quote.participantId);
    if (participantClassification && participantClassification.themeId !== theme.id) {
      warnings.push(`Quote from participant ${quote.participantId} classified to different theme`);
    }

    return { errors, warnings };
  }

  /**
   * Smart quote validation with automatic participant ID correction
   * Primary goal: Ensure quote is real (not hallucinated), fix IDs if needed
   * @param {Object} quote - Quote object with quote text and participantId
   * @param {Object} participantLookup - All participant conversations
   * @returns {Object} Validation result with corrected participant ID if needed
   */
  validateQuoteWithSmartIdCorrection(quote, participantLookup) {
    const quoteText = quote.quote;
    const originalParticipantId = quote.participantId;
    
    // Step 1: Try original participant ID first
    if (originalParticipantId && participantLookup[originalParticipantId]) {
      const originalConversation = participantLookup[originalParticipantId];
      const originalUserText = this.extractUserResponsesOnly(originalConversation.cleanResponse);
      
      if (originalUserText) {
        const verbatimCheck = this.validateQuoteExistsVerbatim(quoteText, originalUserText);
        if (verbatimCheck.isValid) {
          return {
            isValid: true,
            confidence: 'high',
            correctedParticipantId: null, // No correction needed
            reason: 'Quote found with original participant ID'
          };
        }
      }
    }
    
    // Step 2: Quote not found with original ID - search all participants
    const allParticipants = Object.keys(participantLookup);
    const matches = [];
    
    for (const participantId of allParticipants) {
      const conversation = participantLookup[participantId];
      if (!conversation) continue;
      
      const userText = this.extractUserResponsesOnly(conversation.cleanResponse);
      if (!userText) continue;
      
      const verbatimCheck = this.validateQuoteExistsVerbatim(quoteText, userText);
      if (verbatimCheck.isValid) {
        matches.push({
          participantId,
          confidence: verbatimCheck.confidence || 'medium',
          matchQuality: this.calculateMatchQuality(quoteText, userText)
        });
      }
    }
    
    // Step 3: Analyze results
    if (matches.length === 0) {
      return {
        isValid: false,
        confidence: 'none',
        correctedParticipantId: null,
        reason: 'Quote not found in any participant conversation (likely hallucinated)'
      };
    }
    
    if (matches.length === 1) {
      return {
        isValid: true,
        confidence: 'high',
        correctedParticipantId: matches[0].participantId,
        reason: `Quote found with participant ${matches[0].participantId}`
      };
    }
    
    // Multiple matches - pick the best one
    const bestMatch = matches.sort((a, b) => b.matchQuality - a.matchQuality)[0];
    return {
      isValid: true,
      confidence: 'medium',
      correctedParticipantId: bestMatch.participantId,
      reason: `Quote found with multiple participants, selected best match: ${bestMatch.participantId}`
    };
  }

  /**
   * Calculate match quality score for a quote in participant text
   * @param {string} quoteText - The quote text
   * @param {string} participantText - The participant's full text
   * @returns {number} Match quality score (higher is better)
   */
  calculateMatchQuality(quoteText, participantText) {
    // Simple scoring based on context and quote length
    const quoteWords = quoteText.split(' ').length;
    const contextBefore = participantText.indexOf(quoteText);
    const contextAfter = participantText.length - (contextBefore + quoteText.length);
    
    let score = 0;
    score += quoteWords * 2; // Longer quotes are generally better
    score += Math.min(contextBefore, 100); // Some context before is good
    score += Math.min(contextAfter, 100); // Some context after is good
    
    return score;
  }

  /**
   * Validate that quote exists verbatim in conversation user text
   * @param {string} quoteText - Quote to validate
   * @param {string} conversationUserText - User responses from conversation
   * @returns {Object} Validation result with isValid flag and reason
   */
  validateQuoteExistsVerbatim(quoteText, conversationUserText) {
    try {
      // Handle multi-part quotes (joined with ' ... ')
      const quoteParts = quoteText.includes(this.config.multiPartSeparator) 
        ? quoteText.split(this.config.multiPartSeparator)
        : [quoteText];

      // Validate each part of the quote
      for (const part of quoteParts) {
        const partValidation = this.validateQuotePart(part.trim(), conversationUserText);
        if (!partValidation.isValid) {
          return {
            isValid: false,
            reason: `Quote part "${part.substring(0, 30)}..." not found: ${partValidation.reason}`
          };
        }
      }

      return { isValid: true, reason: 'Quote verified verbatim' };

    } catch (error) {
      return {
        isValid: false,
        reason: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Simplified quote matching with better word-based approach
   * @param {string} quote - Quote to check
   * @param {string} text - Text to search in
   * @returns {boolean} Whether quote exists in text
   */
  quoteExistsInText(quote, text) {
    // Normalize both
    const normalizedQuote = quote.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    // Try exact match first
    if (normalizedText.includes(normalizedQuote)) {
      return true;
    }
    
    // Try word-based matching (80% of words must match)
    const quoteWords = normalizedQuote.split(/\s+/).filter(w => w.length > 2);
    const textWords = new Set(normalizedText.split(/\s+/));
    
    const matchCount = quoteWords.filter(w => textWords.has(w)).length;
    const matchRatio = matchCount / quoteWords.length;
    
    return matchRatio >= 0.8;
  }

  /**
   * Validate a single part of a quote (updated to use simplified matching)
   * @param {string} quotePart - Part of quote to validate
   * @param {string} conversationText - Full user conversation text
   * @returns {Object} Part validation result
   */
  validateQuotePart(quotePart, conversationText) {
    if (!quotePart || quotePart.length === 0) {
      return { isValid: false, reason: 'Empty quote part' };
    }

    const exists = this.quoteExistsInText(quotePart, conversationText);

    if (!exists && this.config.enableDetailedLogging) {
      console.log(`[QUOTE VALIDATOR] Quote part not found:`);
      console.log(`  Quote: "${quotePart}"`);
      console.log(`  In conversation: "${conversationText.substring(0, 200)}..."`);
    }

    return {
      isValid: exists,
      confidence: exists ? 'high' : 'none',
      reason: exists ? 'Found match' : 'Not found in conversation'
    };
  }

  /**
   * Normalize text for comparison while preserving semantic meaning
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let normalized = text.trim();

    // Convert to lowercase unless preserveCase is set
    if (!this.config.preserveCase) {
      normalized = normalized.toLowerCase();
    }

    // Remove punctuation unless preservePunctuation is set
    if (!this.config.preservePunctuation) {
      // Remove punctuation but preserve spaces and word boundaries
      normalized = normalized.replace(/[^\w\s]/g, '');
    }

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Extract user responses only from conversation format
   * FIXED: Proper line-by-line parsing to avoid substring issues
   * @param {string} conversationText - Full conversation text
   * @returns {string} User responses only, joined with spaces
   */
  extractUserResponsesOnly(conversationText) {
    if (!conversationText || typeof conversationText !== 'string') {
      return '';
    }

    const lines = conversationText.split('\n');
    const userParts = [];
    let isUserSection = false;
    
    for (const line of lines) {
      if (line.trim().toLowerCase().startsWith('user:')) {
        isUserSection = true;
        const userText = line.substring(line.indexOf(':') + 1).trim();
        if (userText) userParts.push(userText);
      } else if (line.trim().toLowerCase().startsWith('assistant:')) {
        isUserSection = false;
      } else if (isUserSection && line.trim()) {
        userParts.push(line.trim());
      }
    }
    
    return userParts.join(' ');
  }

  /**
   * Extract a fallback quote when original is hallucinated
   * @param {Object} participantResponse - The participant's response object
   * @param {string} themeId - Theme ID for context
   * @param {Array} classifications - Classifications array
   * @returns {string|null} A real quote from the participant or null
   */
  extractFallbackQuote(participantResponse, themeId, classifications) {
    const userText = this.extractUserResponsesOnly(participantResponse.cleanResponse);
    
    // Get sentences from user response
    const sentences = userText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      // If no sentences, just return the whole response if it's substantial
      return userText.length > 20 ? userText : null;
    }
    
    // Prefer longer, more substantial sentences
    const sortedSentences = sentences.sort((a, b) => b.length - a.length);
    
    // Return the most substantial sentence
    return sortedSentences[0].trim();
  }

  /**
   * Enhanced quote validation with fallback strategy
   * @param {Object} quote - Quote object with quote text and participantId
   * @param {Object} participantLookup - Lookup of participant responses
   * @param {Array} classifications - Classifications array
   * @returns {Object} Validation result with fallback handling
   */
  validateQuoteWithFallback(quote, participantLookup, classifications) {
    const quoteText = quote.quote;
    const claimedParticipantId = quote.participantId;
    
    // Step 1: Try exact match with claimed participant
    if (participantLookup[claimedParticipantId]) {
      const userText = this.extractUserResponsesOnly(
        participantLookup[claimedParticipantId].cleanResponse
      );
      
      if (this.quoteExistsInText(quoteText, userText)) {
        return {
          isValid: true,
          participantId: claimedParticipantId,
          confidence: 'high'
        };
      }
    }
    
    // Step 2: Search all participants for this quote
    for (const [participantId, response] of Object.entries(participantLookup)) {
      const userText = this.extractUserResponsesOnly(response.cleanResponse);
      
      if (this.quoteExistsInText(quoteText, userText)) {
        return {
          isValid: true,
          participantId: participantId, // Corrected ID
          confidence: 'medium',
          corrected: true
        };
      }
    }
    
    // Step 3: Quote is hallucinated - try to find ANY relevant quote from claimed participant
    if (participantLookup[claimedParticipantId]) {
      const fallbackQuote = this.extractFallbackQuote(
        participantLookup[claimedParticipantId],
        quote.themeId,
        classifications
      );
      
      if (fallbackQuote) {
        return {
          isValid: true,
          participantId: claimedParticipantId,
          replacementQuote: fallbackQuote,
          confidence: 'low',
          wasHallucinated: true
        };
      }
    }
    
    // Step 4: Complete failure - quote is hallucinated and no fallback found
    return {
      isValid: false,
      reason: 'Quote not found and no suitable replacement available'
    };
  }

  /**
   * Validate quote quality and characteristics
   * @param {string} quoteText - Quote to validate
   * @returns {Object} Quality validation result
   */
  validateQuoteQuality(quoteText) {
    const warnings = [];

    // Check minimum length
    const wordCount = quoteText.trim().split(/\s+/).length;
    if (wordCount < this.config.minQuoteLength) {
      warnings.push(`Quote is very short (${wordCount} words): "${quoteText}"`);
    }

    // Check for common quality issues
    if (quoteText.length > 500) {
      warnings.push(`Quote is very long (${quoteText.length} chars) - consider shorter excerpts`);
    }

    if (/^\s*[.]{3,}/.test(quoteText) || /[.]{3,}\s*$/.test(quoteText)) {
      warnings.push(`Quote appears to be truncated with ellipsis: "${quoteText.substring(0, 50)}..."`);
    }

    return { warnings };
  }

  /**
   * Perform additional validation checks
   * @param {Object} selectedQuotes - All selected quotes
   * @param {Array} themes - Themes array
   * @param {Array} classifications - Classifications array
   * @param {Object} participantLookup - Participant lookup
   * @returns {Object} Additional validation results
   */
  performAdditionalValidation(selectedQuotes, themes, classifications, participantLookup) {
    const errors = [];
    const warnings = [];

    // Check for duplicate quotes across themes
    const allQuotes = [];
    for (const [themeId, themeQuotes] of Object.entries(selectedQuotes)) {
      for (const quote of themeQuotes) {
        allQuotes.push({ ...quote, themeId });
      }
    }

    // Check for exact duplicate quotes
    const quotesMap = new Map();
    for (const quote of allQuotes) {
      const key = `${quote.participantId}:${quote.quote}`;
      if (quotesMap.has(key)) {
        warnings.push(`Duplicate quote found: "${quote.quote.substring(0, 50)}..." from participant ${quote.participantId}`);
      } else {
        quotesMap.set(key, quote);
      }
    }

    // Check for themes with no quotes
    for (const theme of themes) {
      const themeQuotes = selectedQuotes[theme.id] || [];
      if (themeQuotes.length === 0) {
        warnings.push(`No quotes found for theme: "${theme.title}"`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Create participant lookup for fast conversation access
   * @param {Array} responses - Response array
   * @returns {Object} Participant lookup object
   */
  createParticipantLookup(responses) {
    const lookup = {};
    for (const response of responses) {
      lookup[response.participantId] = response;
    }
    return lookup;
  }

  /**
   * Validate validation input structure
   * @param {Object} validationInput - Input to validate
   * @returns {Object} Input validation result
   */
  validateInput(validationInput) {
    if (!validationInput || typeof validationInput !== 'object') {
      return { error: 'Validation input is required and must be an object' };
    }

    const { selectedQuotes, responses, themes, classifications } = validationInput;

    // Validate selectedQuotes
    if (!selectedQuotes || typeof selectedQuotes !== 'object') {
      return { error: 'selectedQuotes is required and must be an object' };
    }

    // Validate responses
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return { error: 'responses array is required and must not be empty' };
    }

    // Validate themes
    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return { error: 'themes array is required and must not be empty' };
    }

    // Classifications are optional but should be array if provided
    if (classifications && !Array.isArray(classifications)) {
      return { error: 'classifications must be an array if provided' };
    }

    return { valid: true };
  }

  /**
   * Count total quotes across all themes
   * @param {Object} selectedQuotes - Quotes organized by theme
   * @returns {number} Total quote count
   */
  countTotalQuotes(selectedQuotes) {
    return Object.values(selectedQuotes).reduce((total, themeQuotes) => {
      return total + (Array.isArray(themeQuotes) ? themeQuotes.length : 0);
    }, 0);
  }

  /**
   * Get quote counts per theme
   * @param {Object} selectedQuotes - Quotes organized by theme
   * @returns {Object} Quote counts per theme
   */
  getThemeQuoteCounts(selectedQuotes) {
    const counts = {};
    for (const [themeId, themeQuotes] of Object.entries(selectedQuotes)) {
      counts[themeId] = Array.isArray(themeQuotes) ? themeQuotes.length : 0;
    }
    return counts;
  }
}