/**
 * Response classification prompts
 * 
 * This module contains prompt templates for classifying participant responses to themes.
 * Receives themes and derived question from the theme generation stage.
 */

/**
 * Load classification prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {Object} Prompt template with system and user parts
 */
export function loadPrompt(promptType, options = {}) {
  if (promptType === 'classification') {
    return { template: getClassificationPrompt(options) };
  }
  
  return { error: `Unknown prompt type: ${promptType}` };
}

/**
 * Get the main classification prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Classification prompt template
 */
function getClassificationPrompt(options = {}) {
  return `
    RESPONSE CLASSIFICATION TASK:
    
    You will classify each participant response to the most appropriate theme based on the derived research question.
    This is critical for thematic analysis - each response must be assigned to exactly one theme.
    
    INSTRUCTIONS:
    - Classify each participant response to exactly ONE theme from the available themes
    - Focus ONLY on user responses (ignore 'assistant:' parts in conversations)
    - Use the derived research question context to guide your classifications
    - If a response doesn't fit any theme perfectly, assign to the closest/best match
    - Provide a confidence score (0.0-1.0) for each classification
    - Be consistent in your classification criteria across all responses
    - Consider the overall theme descriptions and estimated participant counts
    
    CONTEXT:
    - Research Question: {derivedQuestion}
    - Available Themes: {themes}
    - Total Responses to Classify: {responseCount}
    - Project Background: {projectBackground}
    
    CLASSIFICATION QUALITY REQUIREMENTS:
    - Every response must be classified (no skipped responses)
    - Theme assignments should reflect realistic distribution 
    - Confidence scores should reflect how well the response fits the theme
    - Reasoning should explain the key words/concepts that drove the classification
    
    CRITICAL OUTPUT FORMAT REQUIREMENTS:
    - Return ONLY valid JSON array
    - NO markdown code blocks or backticks
    - NO additional text before or after the JSON
    - Each object must have EXACTLY these fields: participantId, questionId, themeId, theme, confidence, reasoning
    - Confidence must be a number between 0.0 and 1.0
    - All string values must be properly escaped
    - Array must contain exactly {responseCount} objects
    
    EXACT OUTPUT FORMAT (JSON array with ALL responses classified):
    [
      {
        "participantId": "4434",
        "questionId": "{questionId}",
        "themeId": "privacy-policies",
        "theme": "Privacy and No-Logs Policies",
        "confidence": 0.85,
        "reasoning": "Response specifically mentions avoiding US/EU data protection policies"
      },
      {
        "participantId": "4435",
        "questionId": "{questionId}",
        "themeId": "security-features",
        "theme": "Security Features and Encryption",
        "confidence": 0.90,
        "reasoning": "User mentions encryption and security as primary concerns"
      }
    ]
    
    CRITICAL: You MUST classify ALL {responseCount} responses provided. Return exactly {responseCount} classification objects in valid JSON format.
    
    VERIFICATION: Before submitting, count your classifications to ensure you have exactly {responseCount} objects.
    
    DO NOT skip any responses. DO NOT truncate the list. Every response provided must receive a classification.
    
    RESPONSES TO CLASSIFY:
    {responses}
  `;
}

/**
 * Format classification prompt with actual data
 * @param {string} template - Prompt template string
 * @param {Object} data - Data to insert into template
 * @returns {Object} Formatted prompts with system and user messages
 */
export function formatPrompt(template, data) {
  let formattedPrompt = template;
  
  // Format themes for clear display
  if (data.themes) {
    const themesDisplay = data.themes.map((theme, index) => 
      `${index + 1}. Theme ID: ${theme.id}
   Title: ${theme.title}
   Description: ${theme.description}
   Estimated Participants: ${theme.estimatedParticipants || 'TBD'}`
    ).join('\n\n');
    data.themes = themesDisplay;
  }
  
  // Format responses with clear participant identification
  if (data.responses) {
    const responsesDisplay = data.responses.map((response, index) => 
      `[${index + 1}] Participant ID: ${response.participantId}
Conversation: ${response.cleanResponse}`
    ).join('\n\n---\n\n');
    data.responses = responsesDisplay;
  }
  
  // Replace placeholder variables
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    let replacement;
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      replacement = JSON.stringify(value, null, 2);
    } else {
      replacement = String(value);
    }
    
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
  }
  
  // Split into system and user prompts
  const systemPrompt = `You are an expert qualitative researcher specializing in thematic analysis and response classification. You classify participant responses to themes with high accuracy and consistency.`;
  
  const userPrompt = formattedPrompt;
  
  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * Get retry prompt for failed classifications
 * @param {Array} previousErrors - Errors from previous attempt
 * @param {Array} failedResponses - Responses that failed classification
 * @returns {string} Retry prompt with error context
 */
export function getRetryPrompt(previousErrors, failedResponses) {
  const errorContext = previousErrors.map(error => `- ${error}`).join('\n');
  
  return `
    RETRY ATTEMPT - Previous classification attempt failed with these issues:
    ${errorContext}
    
    Please address these specific issues in your response and ensure:
    - All ${failedResponses.length} responses are classified to exactly one theme
    - Theme assignments use only the provided theme IDs
    - Confidence scores are between 0.0 and 1.0
    - Participant IDs exactly match the input data
    - JSON format is valid and complete
    - Each classification includes proper reasoning
    
    Focus on accuracy and consistency across all classifications.
  `;
}

/**
 * Validate classification prompt output
 * @param {Array} llmOutput - Raw classification output from LLM
 * @param {Array} originalResponses - Original responses that were classified
 * @param {Array} themes - Available themes
 * @returns {Object} Validation result with parsed data or errors
 */
export function validatePromptOutput(llmOutput, originalResponses, themes) {
  const errors = [];
  const warnings = [];
  
  try {
    // Parse JSON if string
    let classifications;
    if (typeof llmOutput === 'string') {
      classifications = JSON.parse(llmOutput);
    } else {
      classifications = llmOutput;
    }
    
    if (!Array.isArray(classifications)) {
      return { error: 'Classification output must be an array' };
    }
    
    // Check all responses are classified
    if (classifications.length !== originalResponses.length) {
      errors.push(`Expected ${originalResponses.length} classifications, got ${classifications.length}`);
    }
    
    // Validate theme IDs
    const validThemeIds = new Set(themes.map(t => t.id));
    const originalParticipantIds = new Set(originalResponses.map(r => r.participantId));
    
    classifications.forEach((classification, index) => {
      // Check required fields
      if (!classification.participantId) {
        errors.push(`Classification ${index + 1} missing participantId`);
      }
      if (!classification.themeId) {
        errors.push(`Classification ${index + 1} missing themeId`);
      }
      if (!classification.theme) {
        errors.push(`Classification ${index + 1} missing theme name`);
      }
      if (classification.confidence === undefined || classification.confidence === null) {
        errors.push(`Classification ${index + 1} missing confidence score`);
      }
      
      // Validate field values
      if (classification.themeId && !validThemeIds.has(classification.themeId)) {
        errors.push(`Invalid theme ID: ${classification.themeId} in classification ${index + 1}`);
      }
      
      if (!originalParticipantIds.has(classification.participantId)) {
        errors.push(`Unknown participant ID: ${classification.participantId} in classification ${index + 1}`);
      }
      
      if (classification.confidence !== undefined && 
          (classification.confidence < 0 || classification.confidence > 1)) {
        errors.push(`Invalid confidence score: ${classification.confidence} in classification ${index + 1} (must be 0.0-1.0)`);
      }
    });
    
    // Check for duplicate participant IDs
    const participantCounts = {};
    classifications.forEach(c => {
      participantCounts[c.participantId] = (participantCounts[c.participantId] || 0) + 1;
    });
    
    Object.entries(participantCounts).forEach(([participantId, count]) => {
      if (count > 1) {
        warnings.push(`Participant ${participantId} classified ${count} times (should be exactly 1)`);
      }
    });
    
    return {
      passed: errors.length === 0,
      errors,
      warnings,
      classifications: errors.length === 0 ? classifications : null
    };
    
  } catch (error) {
    return { error: `Failed to parse classification output: ${error.message}` };
  }
}
