/**
 * TODO: Data validation helpers
 * 
 * This module provides general validation helper functions used throughout the pipeline.
 * Includes common validation patterns and utilities.
 */

/**
 * Validate that a value is not null or undefined
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {{error?: string}} Empty object if valid, error object if invalid
 */
export function isRequired(value, fieldName = 'field') {
  if (value === null || value === undefined) {
    return { error: `${fieldName} is required` };
  }
  return {};
}

/**
 * Validate that a value is a non-empty string
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {Object} options - Validation options (minLength, maxLength, etc.)
 * @returns {{error?: string}} Empty object if valid, error object if invalid
 */
export function isNonEmptyString(value, fieldName = 'field', options = {}) {
  const requiredCheck = isRequired(value, fieldName);
  if (requiredCheck.error) return requiredCheck;
  
  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string` };
  }
  
  if (value.trim().length === 0) {
    return { error: `${fieldName} cannot be empty` };
  }
  
  if (options.minLength && value.length < options.minLength) {
    return { error: `${fieldName} must be at least ${options.minLength} characters` };
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    return { error: `${fieldName} must be no more than ${options.maxLength} characters` };
  }
  
  return {};
}

/**
 * Validate that a value is a non-empty array
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {Object} options - Validation options (minLength, maxLength, etc.)
 * @returns {{error?: string}} Empty object if valid, error object if invalid
 */
export function isNonEmptyArray(value, fieldName = 'field', options = {}) {
  const requiredCheck = isRequired(value, fieldName);
  if (requiredCheck.error) return requiredCheck;
  
  if (!Array.isArray(value)) {
    return { error: `${fieldName} must be an array` };
  }
  
  if (value.length === 0) {
    return { error: `${fieldName} cannot be empty` };
  }
  
  if (options.minLength && value.length < options.minLength) {
    return { error: `${fieldName} must have at least ${options.minLength} items` };
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    return { error: `${fieldName} must have no more than ${options.maxLength} items` };
  }
  
  return {};
}

/**
 * Validate that a value is a valid number within range
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {Object} options - Validation options (min, max, integer, etc.)
 * @returns {{error?: string}} Empty object if valid, error object if invalid
 */
export function isValidNumber(value, fieldName = 'field', options = {}) {
  const requiredCheck = isRequired(value, fieldName);
  if (requiredCheck.error) return requiredCheck;
  
  if (typeof value !== 'number' || isNaN(value)) {
    return { error: `${fieldName} must be a valid number` };
  }
  
  if (options.integer && !Number.isInteger(value)) {
    return { error: `${fieldName} must be an integer` };
  }
  
  if (options.min !== undefined && value < options.min) {
    return { error: `${fieldName} must be at least ${options.min}` };
  }
  
  if (options.max !== undefined && value > options.max) {
    return { error: `${fieldName} must be no more than ${options.max}` };
  }
  
  if (options.positive && value <= 0) {
    return { error: `${fieldName} must be positive` };
  }
  
  return {};
}

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} True if email is valid
 */
export function isValidEmail(email, fieldName = 'email') {
  const stringCheck = isNonEmptyString(email, fieldName);
  if (stringCheck.error) return stringCheck;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: `${fieldName} must be a valid email address` };
  }
  
  return {};
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {Object} options - Validation options (protocols, etc.)
 * @returns {boolean} True if URL is valid
 */
export function isValidURL(url, fieldName = 'URL', options = {}) {
  // TODO: Implement URL validation
  isNonEmptyString(url, fieldName);
  
  try {
    const urlObj = new URL(url);
    
    if (options.protocols && !options.protocols.includes(urlObj.protocol.slice(0, -1))) {
      throw new Error(`${fieldName} must use one of these protocols: ${options.protocols.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`${fieldName} must be a valid URL`);
  }
}

/**
 * Validate JSON string
 * @param {string} jsonString - JSON string to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {Object} Parsed JSON object
 */
export function isValidJSON(jsonString, fieldName = 'JSON') {
  // TODO: Implement JSON validation
  isNonEmptyString(jsonString, fieldName);
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`${fieldName} must be valid JSON: ${error.message}`);
  }
}

/**
 * Validate object has required properties
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredProps - Array of required property names
 * @param {string} objectName - Name of object for error messages
 * @returns {boolean} True if all required properties exist
 */
export function hasRequiredProperties(obj, requiredProps, objectName = 'object') {
  // TODO: Implement object property validation
  isRequired(obj, objectName);
  
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(`${objectName} must be an object`);
  }
  
  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      throw new Error(`${objectName} is missing required property: ${prop}`);
    }
  }
  
  return true;
}

/**
 * Validate that value matches one of allowed values
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} True if value is allowed
 */
export function isAllowedValue(value, allowedValues, fieldName = 'field') {
  // TODO: Implement enum validation
  isRequired(value, fieldName);
  
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  
  return true;
}

/**
 * Validate participant ID format
 * @param {string} participantId - Participant ID to validate
 * @returns {boolean} True if participant ID is valid
 */
export function isValidParticipantId(participantId) {
  const stringCheck = isNonEmptyString(participantId, 'participantId');
  if (stringCheck.error) return stringCheck;
  
  // Basic validation - adjust based on actual requirements
  if (participantId.length < 1 || participantId.length > 50) {
    return { error: 'participantId must be between 1 and 50 characters' };
  }
  
  // Allow alphanumeric characters and common separators
  const validFormat = /^[a-zA-Z0-9\-_]+$/;
  if (!validFormat.test(participantId)) {
    return { error: 'participantId must contain only alphanumeric characters, hyphens, and underscores' };
  }
  
  return {};
}

/**
 * Validate question ID format
 * @param {string} questionId - Question ID to validate
 * @returns {boolean} True if question ID is valid
 */
export function isValidQuestionId(questionId) {
  const stringCheck = isNonEmptyString(questionId, 'questionId');
  if (stringCheck.error) return stringCheck;
  
  // Basic validation - adjust based on actual requirements
  if (questionId.length < 1 || questionId.length > 100) {
    return { error: 'questionId must be between 1 and 100 characters' };
  }
  
  return {};
}

/**
 * Validate confidence score
 * @param {number} confidence - Confidence score to validate
 * @returns {boolean} True if confidence score is valid
 */
export function isValidConfidenceScore(confidence) {
  // TODO: Implement confidence score validation
  isValidNumber(confidence, 'confidence', { min: 0, max: 1 });
  return true;
}

/**
 * Create validation error with context
 * @param {string} message - Error message
 * @param {Object} context - Additional context for debugging
 * @returns {Error} Validation error
 */
export function createValidationError(message, context = {}) {
  // TODO: Implement custom validation error
  const error = new Error(message);
  error.name = 'ValidationError';
  error.context = context;
  return error;
}

/**
 * Validate multiple fields and collect all errors
 * @param {Array} validations - Array of validation functions to run
 * @returns {Object} Validation result with all errors
 */
export function validateMultiple(validations) {
  // TODO: Implement batch validation
  const errors = [];
  const warnings = [];
  
  for (const validation of validations) {
    try {
      if (typeof validation === 'function') {
        validation();
      } else if (validation.fn && typeof validation.fn === 'function') {
        validation.fn();
      }
    } catch (error) {
      if (validation.warning) {
        warnings.push(error.message);
      } else {
        errors.push(error.message);
      }
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize string input
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input.trim();
  
  if (options.removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  if (options.removeScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
}

/**
 * Validate extracted Excel data structure for thematic analysis
 * @param {Object} data - Extracted data from Excel processing
 * @returns {{error?: string, warnings?: string[]}} Validation result
 */
export function validateExtractedData(data) {
  const warnings = [];
  
  // Check if data exists
  const requiredCheck = isRequired(data, 'extractedData');
  if (requiredCheck.error) return requiredCheck;
  
  // Validate required top-level properties
  const requiredProps = ['projectBackground', 'questions', 'participantResponses', 'questionStats', 'metadata'];
  for (const prop of requiredProps) {
    if (!(prop in data)) {
      return { error: `Missing required property: ${prop}` };
    }
  }
  
  // Validate projectBackground
  const bgCheck = isNonEmptyString(data.projectBackground, 'projectBackground');
  if (bgCheck.error) return bgCheck;
  
  // Validate questions array
  const questionsCheck = isNonEmptyArray(data.questions, 'questions');
  if (questionsCheck.error) return questionsCheck;
  
  // Validate each question has required fields
  for (let i = 0; i < data.questions.length; i++) {
    const question = data.questions[i];
    const questionProps = ['columnIndex', 'questionId', 'headerText'];
    for (const prop of questionProps) {
      if (!(prop in question)) {
        return { error: `Question ${i} missing required property: ${prop}` };
      }
    }
  }
  
  // Validate participantResponses array
  const responsesCheck = isNonEmptyArray(data.participantResponses, 'participantResponses');
  if (responsesCheck.error) return responsesCheck;
  
  // Validate response format (basic check)
  if (data.participantResponses.length > 0) {
    const firstResponse = data.participantResponses[0];
    const responseProps = ['participantId', 'questionId', 'response'];
    for (const prop of responseProps) {
      if (!(prop in firstResponse)) {
        return { error: `Participant response missing required property: ${prop}` };
      }
    }
  }
  
  // Validate metadata
  if (!data.metadata || typeof data.metadata !== 'object') {
    return { error: 'metadata must be an object' };
  }
  
  const metadataProps = ['totalParticipants', 'totalQuestions', 'totalResponses'];
  for (const prop of metadataProps) {
    if (!(prop in data.metadata)) {
      return { error: `metadata missing required property: ${prop}` };
    }
    const numCheck = isValidNumber(data.metadata[prop], `metadata.${prop}`, { integer: true, min: 0 });
    if (numCheck.error) return numCheck;
  }
  
  // Check for data consistency
  if (data.questions.length !== data.metadata.totalQuestions) {
    warnings.push(`Question count mismatch: found ${data.questions.length}, metadata says ${data.metadata.totalQuestions}`);
  }
  
  if (data.participantResponses.length !== data.metadata.totalResponses) {
    warnings.push(`Response count mismatch: found ${data.participantResponses.length}, metadata says ${data.metadata.totalResponses}`);
  }
  
  return warnings.length > 0 ? { warnings } : {};
}
