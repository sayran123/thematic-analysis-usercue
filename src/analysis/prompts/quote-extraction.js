/**
 * TODO: Quote extraction prompts
 * 
 * This module contains prompt templates for extracting supporting quotes from responses.
 * Includes specific instructions to prevent hallucination and ensure verbatim accuracy.
 */

/**
 * Load quote extraction prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {string} Formatted prompt template
 */
export function loadPrompt(promptType, options = {}) {
  // TODO: Implement prompt loading logic for quote extraction
  
  if (promptType === 'quote-extraction') {
    return getQuoteExtractionPrompt(options);
  }
  
  throw new Error(`Unknown prompt type: ${promptType}`);
}

/**
 * Get the main quote extraction prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Quote extraction prompt template
 */
function getQuoteExtractionPrompt(options = {}) {
  // TODO: Return comprehensive quote extraction prompt
  // This prompt is CRITICAL for preventing hallucination
  // Must emphasize verbatim accuracy and proper attribution
  
  return `
    QUOTE EXTRACTION TASK - CRITICAL ACCURACY REQUIRED:
    
    Extract VERBATIM quotes that support each theme. This is critical - quotes must be word-for-word from user responses only.
    
    STRICT RULES:
    1. Extract quotes ONLY from 'user:' portions of conversations
    2. Quotes must be EXACT, word-for-word matches (no paraphrasing)
    3. Maximum 3 quotes per theme
    4. Maximum 1 quote per participant per theme
    5. Quotes must be substantial (typically >10 words)
    6. Return exact participant ID for each quote
    7. If no good quotes exist for a theme, return empty array for that theme
    
    HALLUCINATION PREVENTION:
    - Copy quotes exactly as written by users
    - Do not combine words from different parts of a response
    - Do not create quotes that "capture the essence" - only exact text
    - If a concept is mentioned but not quotable, don't force a quote
    
    INPUT DATA:
    - Themes: {themes}
    - Classifications: {classifications}
    - Full Responses: {responses}
    
    OUTPUT FORMAT (JSON):
    {
      "quotes": {
        "theme-id-1": [
          {
            "quote": "exact user text here",
            "participantId": "4434"
          }
        ],
        "theme-id-2": []
      }
    }
    
    Remember: Better to have fewer accurate quotes than any inaccurate ones.
  `;
}

/**
 * Format quote extraction prompt with actual data
 * @param {string} template - Prompt template string
 * @param {Object} data - Data to insert into template
 * @returns {string} Formatted prompt ready for LLM
 */
export function formatPrompt(template, data) {
  // TODO: Implement prompt formatting for quote extraction
  // - Format themes with clear structure
  // - Include classification context for each participant
  // - Present responses in searchable format
  // - Include previous errors if retrying
  
  let formattedPrompt = template;
  
  // Format themes for display
  if (data.themes) {
    const themesDisplay = data.themes.map(theme => 
      `${theme.id}: "${theme.title}" - ${theme.description}`
    ).join('\n');
    data.themes = themesDisplay;
  }
  
  // Format classifications to show which participants belong to which themes
  if (data.classifications) {
    const classificationsByTheme = {};
    data.classifications.forEach(classification => {
      if (!classificationsByTheme[classification.themeId]) {
        classificationsByTheme[classification.themeId] = [];
      }
      classificationsByTheme[classification.themeId].push(classification.participantId);
    });
    
    const classificationsDisplay = Object.entries(classificationsByTheme)
      .map(([themeId, participantIds]) => 
        `${themeId}: Participants ${participantIds.join(', ')}`
      ).join('\n');
    data.classifications = classificationsDisplay;
  }
  
  // Format responses with clear participant identification
  if (data.responses) {
    const responsesDisplay = data.responses.map(response => {
      // Extract only user parts for quote extraction
      const userOnlyText = extractUserResponsesOnly(response.cleanResponse);
      return `=== Participant ${response.participantId} ===\nUser responses: ${userOnlyText}`;
    }).join('\n\n');
    data.responses = responsesDisplay;
  }
  
  // Add previous errors context if retrying
  if (data.previousErrors) {
    const errorsContext = `\nPREVIOUS ERRORS TO AVOID:\n${data.previousErrors.map(error => `- ${error}`).join('\n')}\n`;
    formattedPrompt = errorsContext + formattedPrompt;
  }
  
  // Replace placeholder variables
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return formattedPrompt;
}

/**
 * Extract only user responses from conversation format
 * @param {string} conversationText - Full conversation text
 * @returns {string} Combined user responses only
 */
function extractUserResponsesOnly(conversationText) {
  // TODO: Parse conversation format to extract only user parts
  // - Split on 'assistant:' and 'user:' markers
  // - Return only text following 'user:' markers
  // - Join multiple user responses with spaces
  
  const parts = conversationText.split(/\n/);
  const userResponses = [];
  let isUserSection = false;
  
  for (const line of parts) {
    if (line.includes('user:')) {
      isUserSection = true;
      userResponses.push(line.split('user:')[1].trim());
    } else if (line.includes('assistant:')) {
      isUserSection = false;
    } else if (isUserSection && line.trim()) {
      userResponses.push(line.trim());
    }
  }
  
  return userResponses.join(' ');
}

/**
 * Get retry prompt for failed quote extraction
 * @param {Array} previousErrors - Errors from previous attempt
 * @param {Array} themes - Themes that need quotes
 * @returns {string} Retry prompt with error context
 */
export function getRetryPrompt(previousErrors, themes) {
  // TODO: Create retry prompt for quote extraction failures
  // - Emphasize the specific errors that occurred
  // - Provide additional guidance on verbatim accuracy
  // - Show examples of correct vs incorrect quote extraction
  
  throw new Error('Not implemented yet');
}

/**
 * Validate quote extraction prompt output
 * @param {Object} llmOutput - Raw quote output from LLM
 * @param {Array} themes - Available themes
 * @param {Array} responses - Original responses
 * @returns {Object} Validation result with parsed data or errors
 */
export function validatePromptOutput(llmOutput, themes, responses) {
  // TODO: Implement quote output validation
  // - Check quotes structure matches expected format
  // - Validate participant IDs exist in original data
  // - Check quote limits (max 3 per theme, 1 per participant per theme)
  // - Prepare data for hallucination validation
  
  throw new Error('Not implemented yet');
}
