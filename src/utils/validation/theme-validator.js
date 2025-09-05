/**
 * Theme quality validation
 * 
 * This module validates the quality and appropriateness of generated themes.
 * Uses simple, objective validation rules without complex quality scoring.
 */

import { VALIDATION_CONFIG, ANALYSIS_CONFIG } from '../config/constants.js';

/**
 * Theme Validator Service
 * Implements objective, rule-based validation without subjective quality scoring
 */
export class ThemeValidator {
  constructor(options = {}) {
    this.config = {
      minThemes: options.minThemes || ANALYSIS_CONFIG.THEMES.MIN_COUNT,
      maxThemes: options.maxThemes || ANALYSIS_CONFIG.THEMES.MAX_COUNT,
      minParticipants: options.minParticipants || VALIDATION_CONFIG.THEMES.MIN_PARTICIPANTS,
      minDescriptionLength: options.minDescriptionLength || VALIDATION_CONFIG.THEMES.MIN_DESCRIPTION_LENGTH,
      requireDescriptions: options.requireDescriptions !== false
    };

    // Generic theme detection patterns (proven reliable)
    this.genericPatterns = [
      /various\s+(reasons|concerns|factors)/i,
      /mixed\s+(reactions|opinions|feelings)/i,
      /different\s+(views|perspectives|approaches)/i,
      /some\s+users?\s+(want|prefer|think)/i,
      /general\s+(concerns|opinions|thoughts)/i,
      /other\s+(factors|considerations|reasons)/i
    ];
  }

  /**
   * Validate theme quality and coverage using objective, rule-based validation
   * @param {Array} themes - Generated themes to validate
   * @param {Array} classifications - Response classifications (optional)
   * @param {Array} responses - Original responses (optional)
   * @param {string} derivedQuestion - Research question context (optional)
   * @returns {Object} Validation result with errors and warnings (no quality scoring)
   */
  validateThemes(themes, classifications = null, responses = null, derivedQuestion = null) {
    const errors = [];
    const warnings = [];

    try {
      // 1. Basic input validation
      if (!themes || !Array.isArray(themes)) {
        return {
          passed: false,
          errors: ['Themes must be a non-empty array'],
          warnings: []
        };
      }

      if (themes.length === 0) {
        return {
          passed: false,
          errors: ['No themes provided for validation'],
          warnings: []
        };
      }

      // 2. Theme count validation (architectural requirement: 3-5 optimal)
      this.validateThemeCount(themes, warnings);

      // 3. Structure validation for each theme
      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];
        this.validateThemeStructure(theme, i, errors);
        this.validateGenericTheme(theme, errors);
      }

      // 4. Coverage validation (when classifications available)
      if (classifications && Array.isArray(classifications) && classifications.length > 0) {
        this.validateThemeCoverage(themes, classifications, errors, warnings);
      }

      return {
        passed: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        passed: false,
        errors: [`Theme validation system error: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate theme count is within optimal range
   * @param {Array} themes - Themes to validate
   * @param {Array} warnings - Warning array to populate
   */
  validateThemeCount(themes, warnings) {
    if (themes.length < this.config.minThemes) {
      warnings.push(`Only ${themes.length} themes - consider more granularity (optimal: ${this.config.minThemes}-${this.config.maxThemes})`);
    }
    if (themes.length > this.config.maxThemes) {
      warnings.push(`${themes.length} themes - consider consolidating similar themes (optimal: ${this.config.minThemes}-${this.config.maxThemes})`);
    }
  }

  /**
   * Validate basic theme structure
   * @param {Object} theme - Single theme to validate
   * @param {number} index - Theme index for error reporting
   * @param {Array} errors - Error array to populate
   */
  validateThemeStructure(theme, index, errors) {
    if (!theme) {
      errors.push(`Theme at index ${index} is null or undefined`);
      return;
    }

    // Check required fields
    if (!theme.id) {
      errors.push(`Theme at index ${index} missing required field: id`);
    }

    if (!theme.title || typeof theme.title !== 'string' || theme.title.trim() === '') {
      errors.push(`Theme at index ${index} missing or invalid title`);
    }

    if (this.config.requireDescriptions) {
      if (!theme.description || typeof theme.description !== 'string' || theme.description.trim() === '') {
        errors.push(`Theme at index ${index} missing required description`);
      } else if (theme.description.trim().length < this.config.minDescriptionLength) {
        errors.push(`Theme at index ${index} description too short (minimum ${this.config.minDescriptionLength} characters)`);
      }
    }
  }

  /**
   * Validate theme is not generic using regex patterns
   * @param {Object} theme - Theme to validate
   * @param {Array} errors - Error array to populate
   */
  validateGenericTheme(theme, errors) {
    if (!theme.title) return;

    const title = theme.title.toLowerCase();
    
    for (const pattern of this.genericPatterns) {
      if (pattern.test(title)) {
        errors.push(`Generic theme detected: "${theme.title}" - be more specific`);
        break;
      }
    }
  }

  /**
   * Validate theme coverage across participants
   * @param {Array} themes - Generated themes
   * @param {Array} classifications - Response classifications
   * @param {Array} errors - Error array to populate
   * @param {Array} warnings - Warning array to populate
   */
  validateThemeCoverage(themes, classifications, errors, warnings) {
    const themeParticipantCounts = {};
    
    // Initialize counts
    themes.forEach(theme => {
      themeParticipantCounts[theme.id] = 0;
    });
    
    // Count participants per theme
    classifications.forEach(classification => {
      const themeId = classification.themeId || classification.theme;
      if (themeParticipantCounts.hasOwnProperty(themeId)) {
        themeParticipantCounts[themeId]++;
      }
    });
    
    // Check for themes with no participants
    themes.forEach(theme => {
      const participantCount = themeParticipantCounts[theme.id] || 0;
      
      if (participantCount === 0) {
        errors.push(`No participants classified to theme: "${theme.title}"`);
      } else if (participantCount < this.config.minParticipants) {
        warnings.push(`Low participation in "${theme.title}": ${participantCount} participants (min recommended: ${this.config.minParticipants})`);
      }
    });
  }
}

/**
 * Create a theme validator instance
 * @param {Object} options - Configuration options
 * @returns {ThemeValidator} Validator instance
 */
export function createThemeValidator(options = {}) {
  return new ThemeValidator(options);
}