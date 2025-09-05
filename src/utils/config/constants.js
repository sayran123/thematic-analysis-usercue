/**
 * TODO: Configuration constants
 * 
 * This module contains all configuration constants for the thematic analysis pipeline.
 * Centralizes configuration values for easy maintenance and adjustment.
 */

/**
 * Analysis configuration constants
 */
export const ANALYSIS_CONFIG = {
  // Theme generation settings
  THEMES: {
    MIN_COUNT: 3,
    MAX_COUNT: 5,
    DEFAULT_COUNT: 4
  },
  
  // Quote extraction settings
  QUOTES: {
    MAX_PER_THEME: 3,
    MAX_PER_PARTICIPANT_PER_THEME: 1,
    MIN_LENGTH: 10,
    MAX_LENGTH: 200
  },
  
  // Classification settings
  CLASSIFICATION: {
    MIN_CONFIDENCE: 0.5,
    BATCH_SIZE: 50,
    RETRY_ATTEMPTS: 3
  },
  
  // Validation settings
  VALIDATION: {
    QUOTE_RETRY_ATTEMPTS: 3,
    THEME_QUALITY_THRESHOLD: 0.7,
    HALLUCINATION_CHECK: true
  }
};

/**
 * Processing configuration
 */
export const PROCESSING_CONFIG = {
  // Parallel processing
  CONCURRENCY: {
    MAX_QUESTIONS: 6,
    ENABLE_PARALLEL: true,
    TIMEOUT_MS: 300000 // 5 minutes per question
  },
  
  // File processing
  FILES: {
    MAX_FILE_SIZE_MB: 50,
    SUPPORTED_FORMATS: ['xlsx', 'xls'],
    ENCODING: 'utf8'
  },
  
  // Response processing
  RESPONSES: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 5000,
    CONVERSATION_MARKERS: ['assistant:', 'user:'],
    PRESERVE_FORMATTING: true
  }
};

/**
 * LLM configuration constants
 */
export const LLM_CONFIG = {
  // Model settings
  MODEL: {
    DEFAULT: 'gpt-4',
    TEMPERATURE: 0.3,
    MAX_TOKENS: 4000,
    TOP_P: 1.0
  },
  
  // API settings
  API: {
    TIMEOUT_MS: 60000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    RATE_LIMIT_DELAY_MS: 100
  },
  
  // Prompt settings
  PROMPTS: {
    SYSTEM_ROLE: 'assistant',
    INCLUDE_EXAMPLES: true,
    STRICT_JSON: true
  }
};

/**
 * Output configuration
 */
export const OUTPUT_CONFIG = {
  // File paths
  PATHS: {
    MAIN_RESULTS: 'outputs/thematic_analysis_results.json',
    EXECUTIVE_SUMMARY: 'outputs/executive_summary.md',
    CLASSIFICATION_PREFIX: 'outputs/',
    CLASSIFICATION_SUFFIX: '_classifications.xlsx',
    BACKUP_DIR: 'outputs/backups'
  },
  
  // Formatting
  FORMAT: {
    JSON_INDENT: 2,
    MARKDOWN_LINE_LENGTH: 80,
    EXCEL_AUTO_WIDTH: true,
    INCLUDE_TIMESTAMPS: true
  },
  
  // Content settings
  CONTENT: {
    INCLUDE_METADATA: true,
    INCLUDE_STATISTICS: true,
    INCLUDE_VALIDATION_INFO: true,
    GENERATE_BACKUPS: true
  }
};

/**
 * Validation configuration
 */
export const VALIDATION_CONFIG = {
  // Quote validation
  QUOTES: {
    EXACT_MATCH_REQUIRED: true,
    NORMALIZE_WHITESPACE: true,
    IGNORE_CASE: false,
    IGNORE_PUNCTUATION: true,
    ALLOW_PARTIAL_QUOTES: false
  },
  
  // Theme validation
  THEMES: {
    MIN_PARTICIPANTS: 3,
    MAX_GENERIC_SCORE: 0.5,
    REQUIRE_DESCRIPTIONS: true,
    MIN_DESCRIPTION_LENGTH: 20
  },
  
  // Classification validation
  CLASSIFICATIONS: {
    REQUIRE_ALL_RESPONSES: true,
    CHECK_THEME_DISTRIBUTION: true,
    MIN_THEME_COVERAGE: 0.05, // 5% minimum per theme
    MAX_SINGLE_THEME_DOMINANCE: 0.80 // 80% maximum for one theme
  }
};

/**
 * Error configuration
 */
export const ERROR_CONFIG = {
  // Error handling
  HANDLING: {
    FAIL_FAST: false,
    LOG_ERRORS: true,
    INCLUDE_STACK_TRACES: true,
    CONTINUE_ON_PARTIAL_FAILURE: true
  },
  
  // Error types
  TYPES: {
    VALIDATION_ERROR: 'ValidationError',
    LLM_ERROR: 'LLMError',
    FILE_ERROR: 'FileError',
    PROCESSING_ERROR: 'ProcessingError'
  }
};

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  // Log levels
  LEVEL: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  
  // Default level
  DEFAULT_LEVEL: 2, // INFO
  
  // Output settings
  OUTPUT: {
    CONSOLE: true,
    FILE: false,
    INCLUDE_TIMESTAMPS: true,
    INCLUDE_LEVELS: true
  }
};

/**
 * File system configuration
 */
export const FS_CONFIG = {
  // Directory creation
  DIRECTORIES: {
    CREATE_IF_MISSING: true,
    PERMISSIONS: 0o755
  },
  
  // File operations
  FILES: {
    OVERWRITE_EXISTING: true,
    CREATE_BACKUPS: true,
    ATOMIC_WRITES: true
  }
};

/**
 * Development configuration
 */
export const DEV_CONFIG = {
  // Debug settings
  DEBUG: {
    ENABLED: false,
    SAVE_INTERMEDIATE_RESULTS: false,
    LOG_LLM_CALLS: false,
    TIMING_ENABLED: true
  },
  
  // Testing
  TESTING: {
    MOCK_LLM_CALLS: false,
    USE_SAMPLE_DATA: false,
    FAST_MODE: false
  }
};

/**
 * Get configuration value by path
 * @param {string} path - Dot-notation path to config value (e.g., 'ANALYSIS_CONFIG.THEMES.MAX_COUNT')
 * @returns {any} Configuration value
 */
export function getConfig(path) {
  const parts = path.split('.');
  
  // Map of top-level config objects
  const configObjects = {
    ANALYSIS_CONFIG,
    PROCESSING_CONFIG,
    LLM_CONFIG,
    OUTPUT_CONFIG,
    VALIDATION_CONFIG,
    ERROR_CONFIG,
    LOGGING_CONFIG,
    FS_CONFIG,
    DEV_CONFIG
  };
  
  // Start with the appropriate top-level config
  let current = configObjects[parts[0]];
  
  if (!current) {
    return undefined;
  }
  
  // Navigate through the remaining path parts
  for (let i = 1; i < parts.length; i++) {
    if (current && typeof current === 'object' && parts[i] in current) {
      current = current[parts[i]];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Validate configuration values
 * @returns {Object} Validation result with errors and warnings
 */
export function validateConfig() {
  const errors = [];
  const warnings = [];
  
  // Analysis configuration validation
  if (ANALYSIS_CONFIG.THEMES.MIN_COUNT > ANALYSIS_CONFIG.THEMES.MAX_COUNT) {
    errors.push('THEMES.MIN_COUNT cannot be greater than THEMES.MAX_COUNT');
  }
  
  if (ANALYSIS_CONFIG.THEMES.MIN_COUNT < 1) {
    errors.push('THEMES.MIN_COUNT must be at least 1');
  }
  
  if (ANALYSIS_CONFIG.QUOTES.MAX_PER_THEME < 1) {
    errors.push('QUOTES.MAX_PER_THEME must be at least 1');
  }
  
  if (ANALYSIS_CONFIG.QUOTES.MIN_LENGTH < 1) {
    errors.push('QUOTES.MIN_LENGTH must be at least 1');
  }
  
  // Processing configuration validation
  if (PROCESSING_CONFIG.CONCURRENCY.MAX_QUESTIONS < 1) {
    errors.push('CONCURRENCY.MAX_QUESTIONS must be at least 1');
  }
  
  if (PROCESSING_CONFIG.CONCURRENCY.TIMEOUT_MS < 1000) {
    warnings.push('CONCURRENCY.TIMEOUT_MS is very low (< 1 second)');
  }
  
  if (PROCESSING_CONFIG.FILES.MAX_FILE_SIZE_MB < 1) {
    warnings.push('MAX_FILE_SIZE_MB is very small (< 1MB)');
  }
  
  // LLM configuration validation
  if (LLM_CONFIG.MODEL.TEMPERATURE < 0 || LLM_CONFIG.MODEL.TEMPERATURE > 2) {
    warnings.push('MODEL.TEMPERATURE should be between 0 and 2');
  }
  
  if (LLM_CONFIG.MODEL.MAX_TOKENS < 100) {
    warnings.push('MODEL.MAX_TOKENS is very low (< 100)');
  }
  
  if (LLM_CONFIG.API.TIMEOUT_MS < 5000) {
    warnings.push('API.TIMEOUT_MS is very low (< 5 seconds)');
  }
  
  // Validation configuration checks
  if (VALIDATION_CONFIG.THEMES.MIN_PARTICIPANTS < 1) {
    errors.push('THEMES.MIN_PARTICIPANTS must be at least 1');
  }
  
  if (VALIDATION_CONFIG.CLASSIFICATIONS.MIN_THEME_COVERAGE < 0 || VALIDATION_CONFIG.CLASSIFICATIONS.MIN_THEME_COVERAGE > 1) {
    errors.push('CLASSIFICATIONS.MIN_THEME_COVERAGE must be between 0 and 1');
  }
  
  if (VALIDATION_CONFIG.CLASSIFICATIONS.MAX_SINGLE_THEME_DOMINANCE < 0 || VALIDATION_CONFIG.CLASSIFICATIONS.MAX_SINGLE_THEME_DOMINANCE > 1) {
    errors.push('CLASSIFICATIONS.MAX_SINGLE_THEME_DOMINANCE must be between 0 and 1');
  }
  
  // Logging configuration validation
  if (!Object.values(LOGGING_CONFIG.LEVEL).includes(LOGGING_CONFIG.DEFAULT_LEVEL)) {
    errors.push('DEFAULT_LEVEL must be one of the defined log levels');
  }
  
  // Environment variable checks (if available)
  if (typeof process !== 'undefined' && process.env) {
    if (!process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY environment variable is required');
    }
    
    if (process.env.LLM_TEMPERATURE) {
      const temp = parseFloat(process.env.LLM_TEMPERATURE);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        warnings.push('LLM_TEMPERATURE environment variable should be between 0 and 2');
      }
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    summary: `Validation ${errors.length === 0 ? 'PASSED' : 'FAILED'}: ${errors.length} errors, ${warnings.length} warnings`
  };
}
