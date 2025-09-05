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
      // Text normalization settings
      preserveCase: options.preserveCase || false,
      preservePunctuation: options.preservePunctuation || false,
      allowPartialMatches: options.allowPartialMatches || false,
      minQuoteLength: options.minQuoteLength || 3, // Minimum words for validation
      
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

    if (!quote.participantId || typeof quote.participantId !== 'string') {
      errors.push(`Missing participantId for quote: "${quote.quote.substring(0, 50)}..."`);
      return { errors, warnings };
    }

    // 2. Find source conversation
    const conversation = participantLookup[quote.participantId];
    if (!conversation) {
      errors.push(`No conversation found for participant ${quote.participantId}`);
      return { errors, warnings };
    }

    // 3. Extract user responses only from conversation
    const userText = this.extractUserResponsesOnly(conversation.cleanResponse);
    if (!userText || userText.trim() === '') {
      errors.push(`No user responses found in conversation for participant ${quote.participantId}`);
      return { errors, warnings };
    }

    // 4. Verify quote exists verbatim in user responses
    const verbatimCheck = this.validateQuoteExistsVerbatim(quote.quote, userText);
    if (!verbatimCheck.isValid) {
      errors.push(`HALLUCINATED QUOTE: "${quote.quote.substring(0, 50)}..." for participant ${quote.participantId} - ${verbatimCheck.reason}`);
    }

    // 5. Validate participant classification matches theme (optional warning)
    const participantClassification = classifications?.find(c => c.participantId === quote.participantId);
    if (participantClassification && participantClassification.themeId !== theme.id) {
      warnings.push(`Quote from participant ${quote.participantId} for theme "${theme.title}" but participant classified to "${participantClassification.theme}"`);
    }

    // 6. Check quote length and quality
    const qualityCheck = this.validateQuoteQuality(quote.quote);
    warnings.push(...qualityCheck.warnings);

    return { errors, warnings };
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
   * Validate a single part of a quote
   * @param {string} quotePart - Part of quote to validate
   * @param {string} conversationText - Full user conversation text
   * @returns {Object} Part validation result
   */
  validateQuotePart(quotePart, conversationText) {
    if (!quotePart || quotePart.length === 0) {
      return { isValid: false, reason: 'Empty quote part' };
    }

    // Normalize both texts for comparison while preserving meaning
    const normalizedQuote = this.normalizeText(quotePart);
    const normalizedConversation = this.normalizeText(conversationText);

    // Check if normalized quote exists in normalized conversation
    const exists = normalizedConversation.includes(normalizedQuote);

    if (!exists && this.config.enableDetailedLogging) {
      console.log(`[QUOTE VALIDATOR] Quote part not found:`);
      console.log(`  Quote: "${quotePart}"`);
      console.log(`  Normalized: "${normalizedQuote}"`);
      console.log(`  In conversation: "${conversationText.substring(0, 200)}..."`);
    }

    return {
      isValid: exists,
      reason: exists ? 'Found verbatim' : 'Not found in conversation'
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
   * @param {string} conversationText - Full conversation text
   * @returns {string} User responses only, joined with spaces
   */
  extractUserResponsesOnly(conversationText) {
    if (!conversationText || typeof conversationText !== 'string') {
      return '';
    }

    // Reuse the proven parsing logic from quote extractor
    const parts = conversationText.split(/(?:assistant:|user:)/i);
    const userParts = [];
    
    // Find parts that come after 'user:' markers
    for (let i = 0; i < parts.length; i++) {
      // Check if this part comes after a 'user:' marker
      const beforeThis = conversationText.substring(0, 
        conversationText.indexOf(parts[i])
      ).toLowerCase();
      
      if (beforeThis.includes('user:') && !beforeThis.endsWith('assistant:')) {
        const userPart = parts[i].trim();
        if (userPart.length > 0) {
          userParts.push(userPart);
        }
      }
    }
    
    return userParts.join(' ');
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