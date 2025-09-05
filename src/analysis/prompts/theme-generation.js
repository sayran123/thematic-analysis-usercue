/**
 * TODO: Theme generation + question ID prompt templates
 * 
 * This module contains prompt templates for theme generation and question identification.
 * The ThemeGeneratorAgent has dual responsibility to derive questions and generate themes.
 */

/**
 * Load theme generation prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {string} Formatted prompt template
 */
export function loadPrompt(promptType, options = {}) {
  // TODO: Implement prompt loading logic
  // - Return appropriate prompt template based on promptType
  // - Apply any customization options
  
  if (promptType === 'theme-generation') {
    return getThemeGenerationPrompt(options);
  }
  
  throw new Error(`Unknown prompt type: ${promptType}`);
}

/**
 * Get the main theme generation prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Theme generation prompt template
 */
function getThemeGenerationPrompt(options = {}) {
  // TODO: Return comprehensive theme generation prompt
  // This prompt template should instruct the LLM to:
  // 1. First derive the actual research question from conversation patterns
  // 2. Then generate 3-5 themes that answer that question
  // 3. Focus only on user responses, ignore assistant questions
  // 4. Analyze conversation patterns to understand what question participants were answering
  
  return `
    DUAL RESPONSIBILITY TASK:
    
    1. QUESTION IDENTIFICATION: 
    First, derive the actual research question being answered from conversation patterns.
    The questionId provided is just a column header - look at actual response patterns to understand 
    what question participants were answering.
    
    2. THEME GENERATION:
    Then generate 3-5 themes that answer that derived question.
    
    INSTRUCTIONS:
    - Focus ONLY on user responses, ignore assistant questions/prompts
    - Raw responses contain 'assistant:' and 'user:' - analyze only user parts
    - Look for patterns in what users are actually discussing
    - Generate themes that directly answer the derived research question
    - Each theme should be specific and actionable, not generic
    - Estimate participant count for each theme based on response patterns
    
    INPUT FORMAT:
    - questionId: {questionId}
    - responses: {responses}
    - projectBackground: {projectBackground}
    
    OUTPUT FORMAT (JSON):
    {
      "derivedQuestion": "What features do you consider when choosing a VPN?",
      "themes": [
        {
          "id": "privacy-policies",
          "title": "Privacy and No-Logs Policies",
          "description": "Users prioritize VPN providers that maintain strict no-logs policies and are located outside surveillance alliance jurisdictions",
          "estimatedParticipants": 38
        }
      ]
    }
  `;
}

/**
 * Format prompt template with actual data
 * @param {string} template - Prompt template string
 * @param {Object} data - Data to insert into template
 * @returns {string} Formatted prompt ready for LLM
 */
export function formatPrompt(template, data) {
  // TODO: Implement prompt formatting
  // - Replace placeholders in template with actual data
  // - Handle special formatting for arrays and objects
  // - Ensure proper escaping and formatting
  
  let formattedPrompt = template;
  
  // Replace placeholder variables
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    let replacement;
    
    if (Array.isArray(value)) {
      replacement = value.map(item => 
        typeof item === 'string' ? item : JSON.stringify(item, null, 2)
      ).join('\n\n');
    } else if (typeof value === 'object') {
      replacement = JSON.stringify(value, null, 2);
    } else {
      replacement = String(value);
    }
    
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), replacement);
  }
  
  return formattedPrompt;
}

/**
 * Get retry prompt for failed theme generation
 * @param {Array} previousErrors - Errors from previous attempt
 * @returns {string} Retry prompt with error context
 */
export function getRetryPrompt(previousErrors) {
  // TODO: Create retry prompt that includes context about previous failures
  // - Include what went wrong in previous attempt
  // - Provide guidance on how to avoid the same errors
  // - Emphasize quality requirements
  
  const errorContext = previousErrors.map(error => `- ${error}`).join('\n');
  
  return `
    RETRY ATTEMPT - Previous attempt failed with these issues:
    ${errorContext}
    
    Please address these specific issues in your response and ensure:
    - Themes are specific and actionable, not generic
    - Each theme directly answers the derived research question
    - Estimated participant counts are realistic based on response patterns
    - Theme descriptions are clear and distinct from each other
  `;
}

/**
 * Validate theme generation prompt output
 * @param {Object} llmOutput - Raw output from LLM
 * @returns {Object} Validation result with parsed data or errors
 */
export function validatePromptOutput(llmOutput) {
  // TODO: Implement output validation
  // - Check that output contains required fields
  // - Validate derivedQuestion is a proper question
  // - Validate themes array structure
  // - Check theme quality (not too generic, proper descriptions)
  
  throw new Error('Not implemented yet');
}
