/**
 * TODO: Summary generation prompts
 * 
 * This module contains prompt templates for generating engaging headlines and summaries.
 * Receives pre-identified research question from the theme generation stage.
 */

/**
 * Load summarization prompt template
 * @param {string} promptType - Type of prompt to load
 * @param {Object} options - Additional prompt options
 * @returns {string} Formatted prompt template
 */
export function loadPrompt(promptType, options = {}) {
  // TODO: Implement prompt loading logic for summarization
  
  if (promptType === 'summarization') {
    return getSummarizationPrompt(options);
  }
  
  throw new Error(`Unknown prompt type: ${promptType}`);
}

/**
 * Get the main summarization prompt template
 * @param {Object} options - Prompt customization options
 * @returns {string} Summarization prompt template
 */
function getSummarizationPrompt(options = {}) {
  // TODO: Return comprehensive summarization prompt
  // This prompt should instruct the LLM to:
  // - Generate an engaging headline that captures key findings
  // - Write a comprehensive summary synthesizing thematic findings
  // - Extract key quantitative insights with percentages
  // - Connect findings back to the research question
  // - Use accessible, engaging language
  
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
    
    OUTPUT FORMAT (JSON):
    {
      "headline": "Privacy Protection and No-Logs Policies Drive VPN Selection",
      "summary": "When asked about VPN selection criteria, 106 participants revealed...",
      "keyInsights": [
        "38% of participants prioritize privacy and no-logs policies above all other features",
        "Security features ranked as the second most important consideration",
        "Price sensitivity was mentioned by only 15% of participants"
      ]
    }
  `;
}

/**
 * Format summarization prompt with actual data
 * @param {string} template - Prompt template string
 * @param {Object} data - Data to insert into template
 * @returns {string} Formatted prompt ready for LLM
 */
export function formatPrompt(template, data) {
  // TODO: Implement prompt formatting for summarization
  // - Format themes with participation statistics
  // - Calculate and present classification percentages
  // - Format statistics in readable way
  // - Include context about data quality and coverage
  
  let formattedPrompt = template;
  
  // Format themes with statistics
  if (data.themes && data.classifications) {
    const themeStats = calculateThemeStatistics(data.themes, data.classifications);
    const themesDisplay = data.themes.map(theme => {
      const stats = themeStats[theme.id] || { count: 0, percentage: 0 };
      return `"${theme.title}": ${stats.count} participants (${stats.percentage}%) - ${theme.description}`;
    }).join('\n');
    data.themes = themesDisplay;
  }
  
  // Format statistics
  if (data.stats) {
    const statsDisplay = `Total Participants: ${data.stats.participantCount || data.stats.totalResponses}, Total Responses: ${data.stats.totalResponses}`;
    data.stats = statsDisplay;
  }
  
  // Format classifications as percentages
  if (data.classifications) {
    const totalClassifications = data.classifications.length;
    const classificationCounts = {};
    
    data.classifications.forEach(classification => {
      classificationCounts[classification.theme] = (classificationCounts[classification.theme] || 0) + 1;
    });
    
    const classificationsDisplay = Object.entries(classificationCounts)
      .map(([theme, count]) => {
        const percentage = ((count / totalClassifications) * 100).toFixed(1);
        return `${theme}: ${count} participants (${percentage}%)`;
      })
      .join('\n');
    
    data.classifications = classificationsDisplay;
  }
  
  // Replace placeholder variables
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), String(value));
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
  // TODO: Calculate participation statistics for each theme
  const themeStats = {};
  const totalClassifications = classifications.length;
  
  themes.forEach(theme => {
    const themeClassifications = classifications.filter(c => c.themeId === theme.id);
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
  // TODO: Create prompt for overall project summary
  // - Synthesize findings across all questions
  // - Identify cross-cutting themes
  // - Highlight most significant insights
  // - Provide strategic recommendations
  
  throw new Error('Not implemented yet');
}

/**
 * Validate summarization prompt output
 * @param {Object} llmOutput - Raw summary output from LLM
 * @returns {Object} Validation result with parsed data or errors
 */
export function validatePromptOutput(llmOutput) {
  // TODO: Implement summary output validation
  // - Check required fields exist (headline, summary, keyInsights)
  // - Validate headline length and quality
  // - Check summary length and content quality
  // - Validate key insights are actionable and specific
  
  throw new Error('Not implemented yet');
}
