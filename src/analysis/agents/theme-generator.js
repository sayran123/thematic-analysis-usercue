/**
 * LLM: Generate themes + derive questions
 * 
 * This agent has dual responsibility:
 * 1. Derive the actual research question from conversation patterns
 * 2. Generate 3-5 themes that answer that question
 * 
 * Focuses only on user responses, ignoring assistant questions.
 */

import { loadPrompt, formatPrompt } from '../prompts/theme-generation.js';
import { initializeLLM, createMessages, invokeLLM, parseLLMResponse } from '../../utils/config/llm-config.js';

/**
 * Theme Generator Agent class
 */
export class ThemeGeneratorAgent {
  constructor() {
    this.llm = null; // Initialize lazily
    this.prompt = null; // Will load from prompts/theme-generation.js
  }

  /**
   * Generate themes and derive research question from responses
   * @param {Object} input - Input data containing questionId, responses, projectBackground
   * @returns {Promise<Object>} Result with derivedQuestion and themes or error
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
        const llmResult = await initializeLLM();
        if (llmResult.error) {
          return { error: `LLM initialization failed: ${llmResult.error}` };
        }
        this.llm = llmResult.llm;
      }

      // Load prompt template if needed
      if (!this.prompt) {
        const promptResult = loadPrompt('theme-generation');
        if (promptResult.error) {
          return { error: `Prompt loading failed: ${promptResult.error}` };
        }
        this.prompt = promptResult.template;
      }

      const { questionId, responses, projectBackground } = input;
      
      // Extract user responses only from conversation format
      const userResponses = responses.map(r => this.extractUserResponse(r.cleanResponse)).filter(Boolean);
      
      if (userResponses.length === 0) {
        return { error: 'No valid user responses found in conversations' };
      }

      // Format the prompt with input data
      const formattedPrompt = formatPrompt(this.prompt, {
        questionId,
        responses: userResponses,
        projectBackground,
        responseCount: userResponses.length
      });

      // Create messages for LLM
      const messages = createMessages(formattedPrompt.systemPrompt, formattedPrompt.userPrompt);

      // Call LLM API
      const llmResult = await invokeLLM(this.llm, messages);
      if (llmResult.error) {
        return { error: `LLM API call failed: ${llmResult.error}` };
      }
      
      // Parse and validate the response
      const parsedResult = this.parseLLMResponse(llmResult.content);
      if (parsedResult.error) {
        return parsedResult;
      }

      return parsedResult;

    } catch (error) {
      return { error: `Theme generation failed: ${error.message}` };
    }
  }

  /**
   * Validate theme generation input
   * @param {Object} input - Input to validate
   * @returns {Object} Validation result with error if invalid
   */
  validateInput(input) {
    if (!input) {
      return { error: 'Input is required' };
    }

    if (!input.questionId || typeof input.questionId !== 'string') {
      return { error: 'Valid questionId is required' };
    }

    if (!input.responses || !Array.isArray(input.responses)) {
      return { error: 'Responses array is required' };
    }

    if (input.responses.length === 0) {
      return { error: 'At least one response is required' };
    }

    if (!input.projectBackground || typeof input.projectBackground !== 'string') {
      return { error: 'Project background is required' };
    }

    return { valid: true };
  }

  /**
   * Extract user response from conversation format
   * @param {string} conversationText - Full conversation text
   * @returns {string} User response only
   */
  extractUserResponse(conversationText) {
    if (!conversationText) return '';
    
    // Split by user: markers and extract user parts
    const parts = conversationText.split(/user:\s*/);
    const userParts = parts.slice(1); // Skip first part (before first user:)
    
    // Join user responses and clean up
    return userParts.map(part => {
      // Remove any subsequent assistant: parts
      return part.split(/assistant:\s*/)[0].trim();
    }).filter(Boolean).join(' ');
  }

  /**
   * Parse LLM response into structured format
   * @param {string} llmResponse - Raw LLM response
   * @returns {Object} Parsed theme generation result
   */
  parseLLMResponse(llmResponse) {
    try {
      // Clean and parse LLM response (handle markdown code blocks)
      let cleanedResponse = llmResponse;
      if (typeof llmResponse === 'string') {
        // Remove markdown code blocks if present
        cleanedResponse = llmResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
      }
      
      // Try to parse as JSON
      let parsed;
      if (typeof cleanedResponse === 'string') {
        parsed = JSON.parse(cleanedResponse);
      } else {
        parsed = cleanedResponse;
      }

      // Validate required fields
      if (!parsed.derivedQuestion || typeof parsed.derivedQuestion !== 'string') {
        return { error: 'LLM response missing derivedQuestion' };
      }

      if (!parsed.themes || !Array.isArray(parsed.themes)) {
        return { error: 'LLM response missing themes array' };
      }

      if (parsed.themes.length === 0) {
        return { error: 'LLM response contains no themes' };
      }

      // Validate and enhance each theme
      const processedThemes = parsed.themes.map((theme, index) => {
        // Generate ID if not provided
        if (!theme.id) {
          theme.id = `theme_${index + 1}_${Date.now()}`;
        }

        // Validate required theme fields
        if (!theme.title || typeof theme.title !== 'string') {
          throw new Error(`Theme ${index + 1} missing title`);
        }

        if (!theme.description || typeof theme.description !== 'string') {
          throw new Error(`Theme ${index + 1} missing description`);
        }

        return {
          id: theme.id,
          title: theme.title.trim(),
          description: theme.description.trim(),
          estimatedParticipants: theme.estimatedParticipants || 0
        };
      });

      return {
        derivedQuestion: parsed.derivedQuestion.trim(),
        themes: processedThemes
      };

    } catch (error) {
      return { error: `Failed to parse LLM response: ${error.message}` };
    }
  }
}
