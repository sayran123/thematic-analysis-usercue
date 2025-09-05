/**
 * TODO: Clean and structure responses
 * 
 * This module processes extracted responses to clean and structure them for analysis.
 * Preserves raw conversation format while validating and grouping responses.
 */

import { isValidResponse } from '../extractors/validator.js';

/**
 * Parse and clean responses from extracted data
 * @param {Object} extractedData - Data from excel-extractor
 * @returns {{data?: Object, error?: string}} Cleaned and structured response data or error
 */
export function parseAndCleanResponses(extractedData) {
  try {
    if (!extractedData || !extractedData.participantResponses) {
      return { error: 'Invalid extracted data: missing participantResponses' };
    }

    const cleanedResponses = [];
    const rejectedResponses = [];

    // Clean each response while preserving conversation format
    for (const response of extractedData.participantResponses) {
      const cleanResult = cleanSingleResponse(response);
      
      if (cleanResult.error) {
        rejectedResponses.push({
          response,
          reason: cleanResult.error
        });
      } else {
        cleanedResponses.push(cleanResult.data);
      }
    }

    // Group responses by question for parallel processing
    const responsesByQuestion = groupResponsesByQuestion(cleanedResponses);

    // Calculate response statistics
    const responseStatistics = calculateResponseStatistics(cleanedResponses);

    const result = {
      projectBackground: extractedData.projectBackground,
      questions: extractedData.questions,
      responsesByQuestion,
      questionStats: extractedData.questionStats,
      responseStatistics,
      metadata: {
        ...extractedData.metadata,
        cleanedResponses: cleanedResponses.length,
        rejectedResponses: rejectedResponses.length
      }
    };

    return { 
      data: result,
      warnings: rejectedResponses.length > 0 ? [`Rejected ${rejectedResponses.length} invalid responses`] : undefined
    };

  } catch (error) {
    return { error: `Response parsing failed: ${error.message}` };
  }
}

/**
 * Clean a single response while preserving conversation format
 * @param {Object} response - Raw response object
 * @returns {{data?: Object, error?: string}} Cleaned response object or error
 */
export function cleanSingleResponse(response) {
  // Validate response using existing validator
  const validationResult = isValidResponse(response);
  if (validationResult.error) {
    return { error: validationResult.error };
  }

  // Clean the response while preserving conversation format
  const cleanResponse = response.response.trim();
  
  // Basic conversation format check (should contain assistant: or user: markers)
  const hasConversationFormat = cleanResponse.includes('assistant:') || cleanResponse.includes('user:');
  
  const cleanedResponse = {
    participantId: response.participantId.trim(),
    questionId: response.questionId.trim(),
    cleanResponse: cleanResponse, // Raw conversation preserved
    responseLength: cleanResponse.length,
    hasConversationFormat: hasConversationFormat
  };

  return { data: cleanedResponse };
}

/**
 * Group responses by question ID for parallel processing
 * @param {Array} responses - Array of cleaned responses
 * @returns {Object} Responses grouped by questionId
 */
export function groupResponsesByQuestion(responses) {
  const responsesByQuestion = {};
  
  for (const response of responses) {
    const questionId = response.questionId;
    
    if (!responsesByQuestion[questionId]) {
      responsesByQuestion[questionId] = [];
    }
    
    responsesByQuestion[questionId].push(response);
  }
  
  return responsesByQuestion;
}

/**
 * Extract conversation statistics
 * @param {Array} responses - Array of responses
 * @returns {Object} Statistics about the responses
 */
export function calculateResponseStatistics(responses) {
  if (!responses || responses.length === 0) {
    return {
      totalResponses: 0,
      averageResponseLength: 0,
      responseDistribution: {},
      conversationFormatCount: 0,
      conversationFormatPercentage: 0
    };
  }

  // Calculate basic statistics
  const totalResponses = responses.length;
  const totalLength = responses.reduce((sum, r) => sum + r.responseLength, 0);
  const averageResponseLength = Math.round(totalLength / totalResponses);

  // Response distribution by question
  const responseDistribution = {};
  for (const response of responses) {
    const questionId = response.questionId;
    responseDistribution[questionId] = (responseDistribution[questionId] || 0) + 1;
  }

  // Conversation format statistics
  const conversationFormatCount = responses.filter(r => r.hasConversationFormat).length;
  const conversationFormatPercentage = Math.round((conversationFormatCount / totalResponses) * 100);

  // Response length distribution
  const lengths = responses.map(r => r.responseLength).sort((a, b) => a - b);
  const minLength = lengths[0];
  const maxLength = lengths[lengths.length - 1];
  const medianLength = lengths[Math.floor(lengths.length / 2)];

  return {
    totalResponses,
    averageResponseLength,
    minLength,
    maxLength,
    medianLength,
    responseDistribution,
    conversationFormatCount,
    conversationFormatPercentage
  };
}
