/**
 * Quote extraction prompts
 * 
 * This module contains prompt templates for extracting verbatim quotes from participant responses.
 * Receives themes and classifications from previous pipeline stages.
 */

/**
 * Load quote extraction prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {Object} Prompt template with system and user parts
 */
export function loadPrompt(promptType, options = {}) {
  if (promptType === 'quote-extraction') {
    return { template: getQuoteExtractionPrompt(options) };
  }
  
  if (promptType === 'quote-extraction-retry') {
    return { template: getQuoteExtractionRetryPrompt(options) };
  }
  
  return { error: `Unknown prompt type: ${promptType}` };
}

/**
 * Format quote extraction prompt with input data
 * @param {string} promptTemplate - The prompt template
 * @param {Object} input - Input data for quote extraction
 * @returns {string} Formatted prompt ready for LLM
 */
export function formatPrompt(promptTemplate, input) {
  const { themes, classifications, responses, derivedQuestion, projectBackground, previousErrors } = input;
  
  // Extract user responses for context
  const userResponseSamples = responses.slice(0, 5).map(r => {
    const userText = extractUserTextFromConversation(r.cleanResponse);
    return `Participant ${r.participantId}: "${userText.substring(0, 150)}..."`;
  }).join('\n');

  // Format themes for prompt
  const themesText = themes.map(theme => 
    `Theme: "${theme.title}"\nDescription: ${theme.description}\nID: ${theme.id}`
  ).join('\n\n');

  // Count responses per theme for context
  const themeDistribution = themes.map(theme => {
    const count = classifications.filter(c => c.themeId === theme.id).length;
    return `${theme.title}: ${count} responses`;
  }).join(', ');

  let formattedPrompt = promptTemplate
    .replace('{derivedQuestion}', derivedQuestion)
    .replace('{themes}', themesText)
    .replace('{totalResponses}', responses.length)
    .replace('{themeDistribution}', themeDistribution)
    .replace('{projectBackground}', projectBackground)
    .replace('{userResponseSamples}', userResponseSamples);

  // Add previous errors for retry prompts
  if (previousErrors && previousErrors.length > 0) {
    const errorsText = previousErrors.join('\n- ');
    formattedPrompt = formattedPrompt.replace('{previousErrors}', errorsText);
  }

  return formattedPrompt;
}

/**
 * Get the main quote extraction prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Quote extraction prompt template
 */
function getQuoteExtractionPrompt(options = {}) {
  return `
    VERBATIM QUOTE EXTRACTION TASK:
    
    Extract exact quotes from participant responses that support each theme.
    This is critical for thematic analysis accuracy - quotes must be word-for-word from user responses.
    
    CRITICAL RULES:
    - Extract quotes ONLY from 'user:' portions of conversations (ignore 'assistant:' parts)
    - Quotes must be VERBATIM - exact word-for-word matches from the source text
    - Maximum 3 quotes per theme
    - Maximum 1 quote per participant per theme
    - Quotes should be substantial (typically >10 words, but prioritize quality over length)
    - Return exact participant ID for each quote
    - If no good quotes exist for a theme, return empty array for that theme
    
    QUOTE QUALITY STANDARDS:
    - Quotes should directly support or illustrate the theme
    - Choose the most representative and clear quotes
    - Avoid partial sentences unless they are complete thoughts
    - Prefer quotes that demonstrate the theme concept clearly
    - Ensure quotes make sense when read in isolation
    
    CONTEXT:
    - Research Question: {derivedQuestion}
    - Available Themes: {themes}
    - Total Responses: {totalResponses}
    - Theme Distribution: {themeDistribution}
    - Project Background: {projectBackground}
    
    SAMPLE USER RESPONSES:
    {userResponseSamples}
    
    OUTPUT FORMAT:
    Respond with a JSON object where each theme ID maps to an array of quote objects:
    
    {
      "theme_1_id": [
        {
          "quote": "exact verbatim text from user response",
          "participantId": "participant_id_here"
        }
      ],
      "theme_2_id": [
        {
          "quote": "another exact verbatim quote",
          "participantId": "different_participant_id"
        }
      ]
    }
    
    IMPORTANT: 
    - Only include quotes that exist exactly in the user responses
    - Double-check that each quote is word-for-word accurate
    - Include the full participant ID exactly as provided
    - If no suitable quotes exist for a theme, use an empty array: []
  `;
}

/**
 * Get the retry quote extraction prompt template (includes validation errors)
 * @param {Object} options - Prompt customization options
 * @returns {string} Retry quote extraction prompt template
 */
function getQuoteExtractionRetryPrompt(options = {}) {
  return `
    QUOTE EXTRACTION RETRY TASK:
    
    The previous quote extraction attempt failed validation. Please extract quotes again,
    addressing the specific validation errors listed below.
    
    VALIDATION ERRORS FROM PREVIOUS ATTEMPT:
    {previousErrors}
    
    CRITICAL RULES (REINFORCED):
    - Extract quotes ONLY from 'user:' portions of conversations (ignore 'assistant:' parts)
    - Quotes must be VERBATIM - exact word-for-word matches from the source text
    - Do NOT paraphrase, summarize, or modify quotes in any way
    - Do NOT combine text from different parts of the conversation
    - Maximum 3 quotes per theme
    - Maximum 1 quote per participant per theme
    - Quotes should be substantial (typically >10 words, but prioritize accuracy over length)
    - Return exact participant ID for each quote
    
    ACCURACY VERIFICATION:
    - Before including any quote, verify it exists exactly in the user response
    - Check that the participant ID matches the source of the quote
    - Ensure no text is added, removed, or modified from the original
    - If uncertain about a quote's accuracy, exclude it rather than risk inaccuracy
    
    CONTEXT:
    - Research Question: {derivedQuestion}
    - Available Themes: {themes}
    - Total Responses: {totalResponses}
    - Theme Distribution: {themeDistribution}
    - Project Background: {projectBackground}
    
    SAMPLE USER RESPONSES:
    {userResponseSamples}
    
    OUTPUT FORMAT:
    Respond with a JSON object where each theme ID maps to an array of quote objects:
    
    {
      "theme_1_id": [
        {
          "quote": "exact verbatim text from user response",
          "participantId": "participant_id_here"
        }
      ],
      "theme_2_id": [
        {
          "quote": "another exact verbatim quote",
          "participantId": "different_participant_id"
        }
      ]
    }
    
    FINAL CHECK:
    Before submitting, verify each quote:
    1. Exists exactly in a user response (not assistant part)
    2. Has correct participant ID
    3. Is not paraphrased or modified
    4. Supports the theme it's assigned to
  `;
}

/**
 * Extract user text from conversation format
 * @param {string} conversationText - Full conversation text
 * @returns {string} User responses only
 */
function extractUserTextFromConversation(conversationText) {
  if (!conversationText || typeof conversationText !== 'string') {
    return '';
  }

  // Split by assistant: and user: markers
  const parts = conversationText.split(/(?:assistant:|user:)/i);
  
  // Find parts that come after 'user:' markers
  const userParts = [];
  for (let i = 0; i < parts.length; i++) {
    // Check if this part comes after a 'user:' marker
    const beforeThis = conversationText.substring(0, 
      conversationText.indexOf(parts[i])
    ).toLowerCase();
    
    if (beforeThis.includes('user:') && !beforeThis.endsWith('assistant:')) {
      userParts.push(parts[i].trim());
    }
  }
  
  return userParts.filter(part => part.length > 0).join(' ');
}