/**
 * Summary generation prompts
 * 
 * This module contains prompt templates for generating engaging headlines and summaries.
 * Receives pre-identified research question from the theme generation stage.
 */

/**
 * Load summarization prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {Object} Prompt template with system and user parts
 */
export function loadPrompt(promptType, options = {}) {
  if (promptType === 'summarization') {
    return { prompt: getSummarizationPrompt(options) };
  }
  
  return { error: `Unknown prompt type: ${promptType}` };
}

/**
 * Get the main summarization prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Summarization prompt template
 */
function getSummarizationPrompt(options = {}) {
  return `
    ANALYSIS SUMMARIZATION TASK:
    
    Generate an engaging headline and comprehensive summary for the completed thematic analysis.
    The research question has already been identified. Focus on synthesizing the findings.
    
    CONTEXT:
    - Research Question: {derivedQuestion}
    - Project Background: {projectBackground}
    - Participant Statistics: {stats}
    - Generated Themes: {themes}
    - Response Classifications: {classifications}
    
    INSTRUCTIONS:
    1. Create an engaging headline that captures the most significant finding
    2. Write a comprehensive summary that synthesizes all thematic findings
    3. Include key quantitative insights with specific percentages
    4. Connect findings back to the original research question
    5. Use accessible, engaging language suitable for stakeholders
    6. Highlight the most surprising or actionable insights
    
    HEADLINE REQUIREMENTS:
    - Concise but descriptive (8-12 words ideal)
    - Captures the dominant theme or key insight
    - Engaging and professional tone
    
    SUMMARY REQUIREMENTS:
    - 150-300 words
    - Start with the research question context
    - Present themes in order of participant engagement
    - Include specific percentages and statistics
    - End with actionable insights or implications
    
    KEY INSIGHTS REQUIREMENTS:
    - 3-5 specific, actionable insights
    - Include percentages and quantitative data
    - Focus on the most significant findings
    - Phrase as clear, concise statements
    
    OUTPUT FORMAT (JSON):
    {
      "headline": "Privacy Protection and No-Logs Policies Drive VPN Selection",
      "summary": "When asked about VPN selection criteria, 106 participants revealed that privacy considerations significantly outweigh other factors in VPN decision-making. The analysis uncovered five distinct themes, with privacy and no-logs policies emerging as the dominant concern among 38% of participants. Security features ranked second, mentioned by 28% of respondents, while performance and speed considerations were cited by 24% of participants. Interestingly, price sensitivity appeared in only 15% of responses, suggesting that users prioritize functionality and security over cost savings. These findings indicate that VPN providers should focus marketing efforts on privacy guarantees and security certifications rather than competitive pricing strategies.",
      "keyInsights": [
        "38% of participants prioritize privacy and no-logs policies above all other features",
        "Security features ranked as the second most important consideration at 28%",
        "Price sensitivity was mentioned by only 15% of participants, indicating quality over cost preferences",
        "Performance concerns affect nearly a quarter (24%) of VPN selection decisions",
        "Privacy-focused messaging may be more effective than price-based marketing strategies"
      ]
    }
    
    CRITICAL: Return ONLY the JSON object. Do not include any explanatory text before or after the JSON.
  `;
}

/**
 * Format summarization prompt with actual data
 * @param {string} template - Prompt template string
 * @param {Object} data - Data to insert into template
 * @returns {string} Formatted prompt ready for LLM
 */
export function formatPrompt(template, data) {
  let formattedPrompt = template;
  
  // Format themes with participation statistics
  if (data.themes && data.classifications) {
    const themeStats = calculateThemeStatistics(data.themes, data.classifications);
    const themesDisplay = data.themes.map(theme => {
      const stats = themeStats[theme.id] || { count: 0, percentage: 0 };
      return `"${theme.title}": ${stats.count} participants (${stats.percentage}%) - ${theme.description}`;
    }).join('\n');
    
    // Create a copy to avoid modifying original data
    const formattedData = { ...data };
    formattedData.themes = themesDisplay;
    
    // Replace themes placeholder
    formattedPrompt = formattedPrompt.replace('{themes}', formattedData.themes);
  }
  
  // Format statistics for display
  if (data.stats) {
    const statsDisplay = `Total Participants: ${data.stats.participantCount || data.stats.totalResponses}, Total Responses: ${data.stats.totalResponses}`;
    formattedPrompt = formattedPrompt.replace('{stats}', statsDisplay);
  }
  
  // Format classifications as theme distribution percentages
  if (data.classifications) {
    const totalClassifications = data.classifications.length;
    const classificationCounts = {};
    
    data.classifications.forEach(classification => {
      const theme = classification.theme || classification.assignedTheme || 'Unknown';
      classificationCounts[theme] = (classificationCounts[theme] || 0) + 1;
    });
    
    const classificationsDisplay = Object.entries(classificationCounts)
      .sort(([, a], [, b]) => b - a) // Sort by count, highest first
      .map(([theme, count]) => {
        const percentage = ((count / totalClassifications) * 100).toFixed(1);
        return `${theme}: ${count} participants (${percentage}%)`;
      })
      .join('\n');
    
    formattedPrompt = formattedPrompt.replace('{classifications}', classificationsDisplay);
  }
  
  // Replace remaining placeholder variables
  const placeholders = ['derivedQuestion', 'projectBackground'];
  for (const key of placeholders) {
    if (data[key]) {
      const placeholder = `{${key}}`;
      formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), String(data[key]));
    }
  }
  
  return formattedPrompt;
}

/**
 * Calculate statistics for each theme
 * @param {Array} themes - Array of themes
 * @param {Array} classifications - Array of classifications
 * @returns {Object} Statistics by theme ID
 */
function calculateThemeStatistics(themes, classifications) {
  const themeStats = {};
  const totalClassifications = classifications.length;
  
  themes.forEach(theme => {
    // Match classifications by theme title (since that's what's typically used)
    const themeClassifications = classifications.filter(c => 
      c.theme === theme.title || 
      c.assignedTheme === theme.title ||
      c.themeId === theme.id
    );
    const count = themeClassifications.length;
    const percentage = totalClassifications > 0 ? ((count / totalClassifications) * 100).toFixed(1) : 0;
    
    themeStats[theme.id] = { count, percentage: parseFloat(percentage) };
  });
  
  return themeStats;
}

/**
 * Get executive summary prompt for cross-question analysis
 * @param {Array} questionAnalyses - All completed question analyses
 * @param {string} projectBackground - Project context
 * @returns {string} Executive summary prompt
 */
export function getExecutiveSummaryPrompt(questionAnalyses, projectBackground) {
  // TODO: Phase 3 - Create prompt for overall project summary
  // This will be implemented in the parallelization phase
  throw new Error('Executive summary not implemented yet - Phase 3 feature');
}

/**
 * Validate summarization prompt output
 * @param {Object} llmOutput - Raw summary output from LLM
 * @returns {Object} Validation result with parsed data or errors
 */
export function validatePromptOutput(llmOutput) {
  // TODO: Phase 3 - Implement summary output validation
  // This validation will be added for production robustness
  throw new Error('Prompt output validation not implemented yet - Phase 3 feature');
}
