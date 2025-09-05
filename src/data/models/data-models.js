/**
 * TODO: TypeScript interfaces/data structures
 * 
 * This module defines data models and interfaces for the thematic analysis pipeline.
 * Contains TypeScript-style JSDoc definitions for data structures.
 */

/**
 * @typedef {Object} Question
 * @property {number} columnIndex - Excel column index
 * @property {string} questionId - Unique question identifier
 * @property {string} headerText - Original header text from Excel
 */

/**
 * @typedef {Object} ParticipantResponse
 * @property {string} participantId - Unique participant identifier
 * @property {string} questionId - Question this response answers
 * @property {string} response - Raw conversation format response
 * @property {string} cleanResponse - Cleaned response text
 * @property {number} responseLength - Length of the response
 */

/**
 * @typedef {Object} QuestionStats
 * @property {number} totalResponses - Total number of responses
 * @property {number} participantCount - Number of participants who responded
 */

/**
 * @typedef {Object} ExtractedData
 * @property {string} projectBackground - Project background information
 * @property {Question[]} questions - Array of detected questions
 * @property {ParticipantResponse[]} participantResponses - All participant responses
 * @property {Object<string, QuestionStats>} questionStats - Statistics by question ID
 * @property {DataMetadata} metadata - Overall data metadata
 */

/**
 * @typedef {Object} DataMetadata
 * @property {number} totalParticipants - Total unique participants
 * @property {number} totalQuestions - Total number of questions
 * @property {number} totalResponses - Total number of responses
 */

/**
 * @typedef {Object} Theme
 * @property {string} id - Unique theme identifier
 * @property {string} title - Theme title
 * @property {string} description - Theme description
 * @property {number} estimatedParticipants - Estimated number of participants
 * @property {number} participantCount - Actual participant count after classification
 */

/**
 * @typedef {Object} Classification
 * @property {string} participantId - Participant identifier
 * @property {string} questionId - Question identifier
 * @property {string} themeId - Assigned theme identifier
 * @property {string} theme - Theme title
 * @property {number} confidence - Classification confidence (0-1)
 */

/**
 * @typedef {Object} Quote
 * @property {string} quote - Extracted quote text
 * @property {string} participantId - Source participant
 * @property {boolean} verified - Whether quote passed validation
 */

/**
 * @typedef {Object} QuotesByTheme
 * @property {Object<string, Quote[]>} themes - Quotes organized by theme ID
 */

/**
 * @typedef {Object} Summary
 * @property {string} headline - Engaging headline for the analysis
 * @property {string} summary - Summary of the analysis
 * @property {string[]} keyInsights - Key insights from the analysis
 */

/**
 * @typedef {Object} QuestionAnalysisState
 * @property {Question} question - Question being analyzed
 * @property {ParticipantResponse[]} responses - Responses for this question
 * @property {string} projectBackground - Project context
 * @property {QuestionStats} stats - Question statistics
 * @property {Theme[]|null} themes - Generated themes
 * @property {string|null} derivedQuestion - Derived research question
 * @property {Classification[]|null} classifications - Response classifications
 * @property {QuotesByTheme|null} quotes - Extracted quotes
 * @property {Summary|null} summary - Generated summary
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} questionId - Question identifier
 * @property {string} derivedQuestion - Derived research question
 * @property {number} participantCount - Number of participants
 * @property {string} headline - Analysis headline
 * @property {string} summary - Analysis summary
 * @property {Theme[]} themes - Generated themes with quotes
 * @property {Object<string, string>} classifications - Participant classifications
 */

/**
 * @typedef {Object} FinalReport
 * @property {string} projectSummary - Overall project summary
 * @property {string} timestamp - Report generation timestamp
 * @property {ReportMetadata} metadata - Report metadata
 * @property {AnalysisResult[]} questionAnalyses - All question analyses
 */

/**
 * @typedef {Object} ReportMetadata
 * @property {number} totalQuestions - Total questions analyzed
 * @property {number} totalParticipants - Total unique participants
 * @property {string} processingTime - Time taken to process
 */

// Export empty object to make this a proper ES module
export {};
