/**
 * LLM: Generate headlines and summaries
 * 
 * This agent generates engaging headlines and summaries for completed analyses.
 * Receives pre-identified research question from the theme generation stage.
 */

import { loadPrompt, formatPrompt } from '../prompts/summarization.js';
import { initializeLLM } from '../../utils/config/llm-config.js';

/**
 * Summarizer Agent class
 */
export class SummarizerAgent {
  constructor() {
    this.llm = null;
    this.prompt = null; // Will load from prompts/summarization.js
  }

  /**
   * Generate headline and summary for the analysis
   * @param {Object} input - Input data containing derivedQuestion, themes, classifications, stats, projectBackground
   * @returns {Promise<Object>} Summary with headline and key insights
   */
  async invoke(input) {
    try {
      // Validate input
      const validation = this.validateInput(input);
      if (validation.error) {
        return { error: validation.error };
      }

      // Initialize LLM if needed
      if (!this.llm) {
        const llmResult = await initializeLLM({ maxTokens: 4000 });
        if (llmResult.error) {
          return { error: `LLM initialization failed: ${llmResult.error}` };
        }
        this.llm = llmResult.llm;
      }

      // Load prompt template if needed
      if (!this.prompt) {
        const promptResult = loadPrompt('summarization');
        if (promptResult.error) {
          return { error: `Prompt loading failed: ${promptResult.error}` };
        }
        this.prompt = promptResult.prompt;
      }

      // Format prompt with input data
      const formattedPrompt = formatPrompt(this.prompt, input);

      // Call LLM to generate summary
      const llmResponse = await this.llm.invoke(formattedPrompt);
      if (!llmResponse) {
        return { error: 'LLM returned empty response' };
      }

      // Extract content from LangChain response
      const responseContent = llmResponse.content || llmResponse;
      
      // Parse the LLM response
      const parsedResult = this.parseSummaryResponse(responseContent);
      if (parsedResult.error) {
        return { error: `Response parsing failed: ${parsedResult.error}` };
      }

      return {
        summary: parsedResult.summary
      };

    } catch (error) {
      return { error: `Summary generation failed: ${error.message}` };
    }
  }

  /**
   * Validate summarization input
   * @param {Object} input - Input to validate
   * @returns {Object} Validation result with error if invalid
   */
  validateInput(input) {
    if (!input) {
      return { error: 'Input is required' };
    }

    const { derivedQuestion, themes, classifications, stats, projectBackground } = input;

    if (!derivedQuestion || typeof derivedQuestion !== 'string') {
      return { error: 'derivedQuestion is required and must be a string' };
    }

    if (!Array.isArray(themes) || themes.length === 0) {
      return { error: 'themes must be a non-empty array' };
    }

    if (!Array.isArray(classifications) || classifications.length === 0) {
      return { error: 'classifications must be a non-empty array' };
    }

    if (!stats || typeof stats !== 'object') {
      return { error: 'stats must be an object' };
    }

    if (!projectBackground || typeof projectBackground !== 'string') {
      return { error: 'projectBackground is required and must be a string' };
    }

    // Validate theme structure
    for (const theme of themes) {
      if (!theme.id || !theme.title || !theme.description) {
        return { error: 'Each theme must have id, title, and description' };
      }
    }

    // Validate classification structure
    for (const classification of classifications) {
      if (!classification.participantId || !classification.theme) {
        return { error: 'Each classification must have participantId and theme' };
      }
    }

    return { valid: true };
  }

  /**
   * Parse LLM summarization response
   * @param {string} llmResponse - Raw LLM response
   * @returns {Object} Parsed summary object or error
   */
  parseSummaryResponse(llmResponse) {
    try {
      // Try to find JSON in the response
      let jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Look for JSON markers
        const jsonStart = llmResponse.indexOf('{');
        const jsonEnd = llmResponse.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonMatch = [llmResponse.substring(jsonStart, jsonEnd + 1)];
        }
      }

      if (!jsonMatch) {
        return { error: 'No JSON found in LLM response' };
      }

      let summaryData;
      try {
        summaryData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        return { error: `JSON parsing failed: ${parseError.message}` };
      }

      // Validate required fields
      if (!summaryData.headline || typeof summaryData.headline !== 'string') {
        return { error: 'Response must include a valid headline string' };
      }

      if (!summaryData.summary || typeof summaryData.summary !== 'string') {
        return { error: 'Response must include a valid summary string' };
      }

      if (!Array.isArray(summaryData.keyInsights) || summaryData.keyInsights.length === 0) {
        return { error: 'Response must include a non-empty keyInsights array' };
      }

      // Validate keyInsights are strings
      for (const insight of summaryData.keyInsights) {
        if (typeof insight !== 'string') {
          return { error: 'All keyInsights must be strings' };
        }
      }

      return {
        summary: {
          headline: summaryData.headline.trim(),
          summary: summaryData.summary.trim(),
          keyInsights: summaryData.keyInsights.map(insight => insight.trim())
        }
      };

    } catch (error) {
      return { error: `Response parsing failed: ${error.message}` };
    }
  }
}
