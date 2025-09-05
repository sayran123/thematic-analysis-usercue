/**
 * Data validation utilities for extracted Excel data
 * 
 * This module provides validation functions for extracted data.
 * Validates participant responses, checks data integrity, and ensures proper formatting.
 */

import { 
  validateExtractedData as validateData, 
  isValidParticipantId as validateParticipantId 
} from '../../utils/helpers/validation.js';

/**
 * Validate a single participant response
 * @param {Object} response - Response object to validate
 * @returns {{error?: string}} Empty object if valid, error object if invalid
 */
export function isValidResponse(response) {
  // Check if response exists
  if (!response) {
    return { error: 'Response is required' };
  }
  
  // Check required fields
  const requiredFields = ['participantId', 'questionId', 'response'];
  for (const field of requiredFields) {
    if (!response[field]) {
      return { error: `Response missing required field: ${field}` };
    }
  }
  
  // Validate participant ID format
  const participantCheck = validateParticipantId(response.participantId);
  if (participantCheck.error) {
    return participantCheck;
  }
  
  // Check response content
  if (typeof response.response !== 'string' || response.response.trim().length === 0) {
    return { error: 'Response content cannot be empty' };
  }
  
  // Basic length check (minimum 1 character, maximum reasonable limit)
  if (response.response.length > 50000) {
    return { error: 'Response content is too long' };
  }
  
  return {};
}

/**
 * Validate extracted data structure (reuses existing validation)
 * @param {Object} extractedData - Data object from excel-extractor
 * @returns {{error?: string, warnings?: string[]}} Validation result
 */
export function validateExtractedData(extractedData) {
  return validateData(extractedData);
}

/**
 * Validate participant ID format (reuses existing validation)
 * @param {string} participantId - Participant ID to validate
 * @returns {{error?: string}} Empty object if valid, error object if invalid
 */
export function isValidParticipantId(participantId) {
  return validateParticipantId(participantId);
}

/**
 * Check for duplicate responses
 * @param {Array} responses - Array of participant responses
 * @returns {Array} Array of duplicate response objects
 */
export function findDuplicateResponses(responses) {
  const duplicates = [];
  const seen = new Set();
  
  for (const response of responses) {
    const key = `${response.participantId}-${response.questionId}`;
    if (seen.has(key)) {
      duplicates.push(response);
    } else {
      seen.add(key);
    }
  }
  
  return duplicates;
}
