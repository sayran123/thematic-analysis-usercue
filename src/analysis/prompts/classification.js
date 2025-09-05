/**
 * TODO: Response classification prompts
 * 
 * This module contains prompt templates for classifying participant responses to themes.
 * Receives themes and derived question from the theme generation stage.
 */

/**
 * Load classification prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {string} Formatted prompt template
 */
export function loadPrompt(promptType, options = {}) {
  // TODO: Implement prompt loading logic for classification
  
  if (promptType === 'classification') {
    return getClassificationPrompt(options);
  }
  
  throw new Error(`Unknown prompt type: ${promptType}`);
}

/**
 * Get the main classification prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Classification prompt template
 */
function getClassificationPrompt(options = {}) {
  // TODO: Return comprehensive classification prompt
  // This prompt should instruct the LLM to:
  // - Classify each participant response to the most appropriate theme
  // - Consider the derived research question context
  // - Focus only on user responses in conversations
  // - Assign confidence scores to classifications
  // - Handle edge cases where responses don't fit any theme well
  
  return `
    RESPONSE CLASSIFICATION TASK:
    
    You will classify participant responses to the most appropriate theme based on the derived research question.
    
    CONTEXT:
    - Research Question: {derivedQuestion}
    - Available Themes: {themes}
    - Project Background: {projectBackground}
    
    INSTRUCTIONS:
    - Classify each participant response to exactly ONE theme
    - Focus ONLY on user responses (ignore 'assistant:' parts in conversations)
    - Consider the research question context when making classifications
    - If a response doesn't fit any theme well, assign to the closest match
    - Provide a confidence score (0.0-1.0) for each classification
    - Be consistent in your classification criteria
    
    RESPONSE FORMAT (JSON array):
    [
      {
        "participantId": "4434",
        "themeId": "privacy-policies",
        "theme": "Privacy and No-Logs Policies",
        "confidence": 0.85,
        "reasoning": "Response specifically mentions avoiding US/EU data protection policies"
      }
    ]
    
    RESPONSES TO CLASSIFY:
    {responses}
  `;
}

/**
 * Format classification prompt with actual data
 * @param {string} template - Prompt template string
 * @param {Object} data - Data to insert into template
 * @returns {string} Formatted prompt ready for LLM
 */
export function formatPrompt(template, data) {
  // TODO: Implement prompt formatting for classification
  // - Format themes list for easy reading
  // - Format responses with participant IDs
  // - Ensure proper JSON structure examples
  
  let formattedPrompt = template;
  
  // Format themes for display
  if (data.themes) {
    const themesDisplay = data.themes.map(theme => 
      `${theme.id}: ${theme.title} - ${theme.description}`
    ).join('\n');
    data.themes = themesDisplay;
  }
  
  // Format responses for classification
  if (data.responses) {
    const responsesDisplay = data.responses.map(response => 
      `Participant ${response.participantId}:\n${response.cleanResponse}`
    ).join('\n\n---\n\n');
    data.responses = responsesDisplay;
  }
  
  // Replace placeholder variables
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return formattedPrompt;
}

/**
 * Get batch classification prompt for multiple responses
 * @param {Array} responses - Array of responses to classify
 * @param {Array} themes - Available themes
 * @param {string} derivedQuestion - Research question context
 * @returns {string} Batch classification prompt
 */
export function getBatchClassificationPrompt(responses, themes, derivedQuestion) {
  // TODO: Create efficient batch classification prompt
  // - Handle multiple responses in single LLM call
  // - Maintain consistency across classifications
  // - Include examples for better accuracy
  
  throw new Error('Not implemented yet');
}

/**
 * Get retry prompt for failed classifications
 * @param {Array} previousErrors - Errors from previous attempt
 * @param {Array} failedResponses - Responses that failed classification
 * @returns {string} Retry prompt with error context
 */
export function getRetryPrompt(previousErrors, failedResponses) {
  // TODO: Create retry prompt for classification failures
  // - Include context about what went wrong
  // - Provide clearer theme definitions
  // - Give examples of correct classifications
  
  throw new Error('Not implemented yet');
}

/**
 * Validate classification prompt output
 * @param {Array} llmOutput - Raw classification output from LLM
 * @param {Array} originalResponses - Original responses that were classified
 * @param {Array} themes - Available themes
 * @returns {Object} Validation result with parsed data or errors
 */
export function validatePromptOutput(llmOutput, originalResponses, themes) {
  // TODO: Implement classification output validation
  // - Check that all responses are classified
  // - Validate theme assignments exist
  // - Check confidence scores are valid (0-1)
  // - Ensure participant IDs match original data
  
  throw new Error('Not implemented yet');
}
