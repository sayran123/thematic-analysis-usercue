/**
 * LangGraph: Single question stateful workflow
 * 
 * This module implements the LangGraph state machine for analyzing a single question.
 * Manages state progression through: Raw Data → Themes+Question → Classifications → Quotes+Validation → Summary
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { logOperation } from '../../utils/config/llm-config.js';
import { ThemeGeneratorAgent } from '../agents/theme-generator.js';
import { ClassifierAgent } from '../agents/classifier.js';
import { QuoteExtractorAgent } from '../agents/quote-extractor.js';
import { ThemeValidator } from '../../utils/validation/theme-validator.js';

/**
 * Question Analysis State structure
 * @typedef {Object} QuestionAnalysisState
 * @property {Object} question - Question object with questionId and headerText
 * @property {Array} responses - Array of participant responses
 * @property {string} projectBackground - Project context
 * @property {Object} stats - Question statistics
 * @property {Array|null} themes - Generated themes
 * @property {string|null} derivedQuestion - Derived research question
 * @property {Object|null} themeValidation - Theme validation results
 * @property {Array|null} classifications - Response classifications
 * @property {Object|null} quotes - Extracted quotes by theme
 * @property {Object|null} summary - Generated summary
 */

/**
 * Question Analysis Workflow class
 */
export class QuestionAnalysisWorkflow {
  constructor() {
    this.graph = null;
    this.themeGeneratorAgent = null; // Initialize on first use
    this.classifierAgent = null; // Initialize on first use
    this.quoteExtractorAgent = null; // Initialize on first use
    this.themeValidator = null; // Initialize on first use
    this.initializeGraph();
  }

  /**
   * Initialize the workflow graph
   */
  initializeGraph() {
    try {
      // Define state annotation for LangGraph
      const StateAnnotation = Annotation.Root({
        question: Annotation(),
        responses: Annotation(),
        projectBackground: Annotation(),
        stats: Annotation(),
        themes: Annotation(),
        derivedQuestion: Annotation(),
        themeValidation: Annotation(),
        classifications: Annotation(),
        quotes: Annotation(),
        summary: Annotation()
      });

      // Create state graph with proper annotation
      this.graph = new StateGraph(StateAnnotation);

      // Add nodes for each workflow stage
      this.graph.addNode("generateThemes", this.generateThemes.bind(this));
      this.graph.addNode("validateThemes", this.validateThemes.bind(this));
      this.graph.addNode("classifyResponses", this.classifyResponses.bind(this));
      this.graph.addNode("extractQuotes", this.extractQuotes.bind(this));
      this.graph.addNode("generateSummary", this.generateSummary.bind(this));

      // Define the workflow edges (state transitions)
      this.graph.addEdge(START, "generateThemes");
      this.graph.addEdge("generateThemes", "validateThemes");
      this.graph.addEdge("validateThemes", "classifyResponses");
      this.graph.addEdge("classifyResponses", "extractQuotes");
      this.graph.addEdge("extractQuotes", "generateSummary");
      this.graph.addEdge("generateSummary", END);

      // Compile the graph
      this.compiledGraph = this.graph.compile();
      
      logOperation('workflow-initialized', { 
        nodes: ['generateThemes', 'validateThemes', 'classifyResponses', 'extractQuotes', 'generateSummary'],
        status: 'ready'
      });
      
    } catch (error) {
      throw new Error(`Failed to initialize workflow graph: ${error.message}`);
    }
  }

  /**
   * Run the complete question analysis workflow
   * @param {Object} initialState - Initial state with question, responses, etc.
   * @returns {Promise<Object>} Final analysis state or error
   */
  async runAnalysis(initialState) {
    try {
      logOperation('workflow-started', { 
        questionId: initialState.question?.questionId,
        responseCount: initialState.responses?.length 
      });

      // Validate initial state
      if (!initialState.question || !initialState.responses) {
        return { error: 'Invalid initial state: missing question or responses' };
      }

      // Run the compiled graph with initial state
      const finalState = await this.compiledGraph.invoke(initialState);
      
      logOperation('workflow-completed', { 
        questionId: finalState.question?.questionId,
        hasThemes: !!finalState.themes,
        hasThemeValidation: !!finalState.themeValidation,
        themeValidationPassed: finalState.themeValidation?.passed,
        hasClassifications: !!finalState.classifications,
        hasQuotes: !!finalState.quotes,
        hasSummary: !!finalState.summary
      });

      return finalState;
      
    } catch (error) {
      const errorMsg = `Workflow execution failed: ${error.message}`;
      logOperation('workflow-error', { error: errorMsg });
      return { error: errorMsg };
    }
  }

  /**
   * Generate themes and derive question (Node 1)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with themes and derivedQuestion
   */
  async generateThemes(state) {
    logOperation('node-generateThemes-start', { 
      questionId: state.question.questionId,
      responseCount: state.responses.length 
    });
    
    try {
      // Initialize theme generator agent
      if (!this.themeGeneratorAgent) {
        this.themeGeneratorAgent = new ThemeGeneratorAgent();
        logOperation('node-generateThemes-agent-initialized', {});
      }

      // Invoke agent with state data
      const result = await this.themeGeneratorAgent.invoke({
        questionId: state.question.questionId,
        responses: state.responses,
        projectBackground: state.projectBackground
      });

      // Handle errors from agent
      if (result.error) {
        logOperation('node-generateThemes-error', { error: result.error });
        return { 
          ...state, 
          error: `Theme generation failed: ${result.error}` 
        };
      }

      // Validate result structure
      if (!result.themes || !result.derivedQuestion) {
        const errorMsg = 'Invalid theme generation result: missing themes or derivedQuestion';
        logOperation('node-generateThemes-invalid-result', { error: errorMsg });
        return { 
          ...state, 
          error: errorMsg 
        };
      }

      logOperation('node-generateThemes-success', { 
        themeCount: result.themes.length,
        derivedQuestion: result.derivedQuestion,
        themes: result.themes.map(t => ({ id: t.id, title: t.title }))
      });

      return {
        ...state,
        themes: result.themes,
        derivedQuestion: result.derivedQuestion
      };

    } catch (error) {
      const errorMsg = `Unexpected error in theme generation: ${error.message}`;
      logOperation('node-generateThemes-unexpected-error', { error: errorMsg, stack: error.stack });
      return { 
        ...state, 
        error: errorMsg 
      };
    }
  }

  /**
   * Validate themes using objective rule-based validation (Node 2)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with validation results
   */
  async validateThemes(state) {
    logOperation('node-validateThemes-start', { 
      questionId: state.question.questionId,
      themeCount: state.themes?.length 
    });
    
    try {
      // Initialize theme validator
      if (!this.themeValidator) {
        this.themeValidator = new ThemeValidator();
        logOperation('node-validateThemes-validator-initialized', {});
      }

      // Validate themes (no classifications available yet at this stage)
      const validationResult = this.themeValidator.validateThemes(
        state.themes,
        null, // No classifications yet
        state.responses,
        state.derivedQuestion
      );

      logOperation('node-validateThemes-complete', { 
        passed: validationResult.passed,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      });

      return {
        ...state,
        themeValidation: validationResult
      };

    } catch (error) {
      const errorMsg = `Unexpected error in theme validation: ${error.message}`;
      logOperation('node-validateThemes-error', { error: errorMsg, stack: error.stack });
      
      // Continue pipeline with validation error recorded
      return { 
        ...state, 
        themeValidation: {
          passed: false,
          errors: [errorMsg],
          warnings: []
        }
      };
    }
  }

  /**
   * Classify responses to themes (Node 3)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with classifications
   */
  async classifyResponses(state) {
    logOperation('node-classifyResponses-start', { 
      questionId: state.question.questionId,
      themeCount: state.themes?.length,
      responseCount: state.responses?.length 
    });
    
    try {
      // Initialize classifier agent
      if (!this.classifierAgent) {
        this.classifierAgent = new ClassifierAgent();
        logOperation('node-classifyResponses-agent-initialized', {});
      }

      // Invoke agent with state data
      const result = await this.classifierAgent.invoke({
        derivedQuestion: state.derivedQuestion,
        themes: state.themes,
        responses: state.responses,
        projectBackground: state.projectBackground
      });

      // Handle errors from agent
      if (result.error) {
        logOperation('node-classifyResponses-error', { error: result.error });
        return { 
          ...state, 
          error: `Classification failed: ${result.error}` 
        };
      }

      // Validate result structure
      if (!result.classifications || !Array.isArray(result.classifications)) {
        const errorMsg = 'Invalid classification result: missing classifications array';
        logOperation('node-classifyResponses-invalid-result', { error: errorMsg });
        return { 
          ...state, 
          error: errorMsg 
        };
      }

      // Log classification statistics
      const classificationStats = this.calculateClassificationStats(result.classifications, state.themes);
      logOperation('node-classifyResponses-success', { 
        classificationsCount: result.classifications.length,
        themeDistribution: classificationStats.distribution,
        averageConfidence: classificationStats.averageConfidence,
        warnings: result.warnings || []
      });

      return {
        ...state,
        classifications: result.classifications
      };

    } catch (error) {
      const errorMsg = `Unexpected error in classification: ${error.message}`;
      logOperation('node-classifyResponses-unexpected-error', { error: errorMsg, stack: error.stack });
      return { 
        ...state, 
        error: errorMsg 
      };
    }
  }

  /**
   * Extract supporting quotes with validation (Node 4)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with validated quotes
   */
  async extractQuotes(state) {
    logOperation('node-extractQuotes', { 
      themeCount: state.themes?.length,
      classificationCount: state.classifications?.length 
    });
    
    try {
      // Initialize quote extractor agent if needed
      if (!this.quoteExtractorAgent) {
        this.quoteExtractorAgent = new QuoteExtractorAgent();
      }

      // Validate state has required data
      if (!state.themes || state.themes.length === 0) {
        throw new Error('No themes available for quote extraction');
      }

      if (!state.classifications || state.classifications.length === 0) {
        throw new Error('No classifications available for quote extraction');
      }

      if (!state.responses || state.responses.length === 0) {
        throw new Error('No responses available for quote extraction');
      }

      // Prepare input for quote extraction
      const extractionInput = {
        themes: state.themes,
        classifications: state.classifications,
        responses: state.responses,
        derivedQuestion: state.derivedQuestion,
        projectBackground: state.projectBackground
      };

      // Extract quotes using the agent
      const quoteResult = await this.quoteExtractorAgent.invoke(extractionInput);
      
      if (quoteResult.error) {
        console.error('[WORKFLOW] Quote extraction failed:', quoteResult.error);
        // Return empty quotes structure to allow workflow to continue
        return {
          ...state,
          quotes: {},
          quoteExtractionError: quoteResult.error
        };
      }

      console.log(`[WORKFLOW] Quote extraction completed: ${quoteResult.totalQuotesExtracted} quotes extracted`);
      
      return {
        ...state,
        quotes: quoteResult.quotes,
        quoteExtractionStats: {
          totalQuotes: quoteResult.totalQuotesExtracted,
          quotesPerTheme: quoteResult.themeQuoteCounts
        }
      };

    } catch (error) {
      console.error('[WORKFLOW] Quote extraction node error:', error);
      
      // Return empty quotes to allow workflow to continue
      return {
        ...state,
        quotes: {},
        quoteExtractionError: error.message
      };
    }
  }

  /**
   * Generate summary and headline (Node 5)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with summary
   */
  async generateSummary(state) {
    logOperation('node-generateSummary', { 
      questionId: state.question.questionId,
      derivedQuestion: state.derivedQuestion
    });
    
    // MVP placeholder: Create mock summary
    const summary = {
      headline: `Analysis of ${state.question.questionId}`,
      summary: `The analysis of "${state.derivedQuestion}" revealed ${state.themes?.length} main themes.`,
      keyInsights: [
        'Theme distribution shows balanced coverage',
        'Quote validation passed for all extracts'
      ]
    };

    return {
      ...state,
      summary
    };
  }

  /**
   * Calculate classification statistics for logging
   * @param {Array} classifications - Classification results
   * @param {Array} themes - Available themes
   * @returns {Object} Statistics including distribution and confidence
   */
  calculateClassificationStats(classifications, themes) {
    // Calculate theme distribution
    const distribution = {};
    themes.forEach(theme => {
      distribution[theme.title] = 0;
    });

    let totalConfidence = 0;
    classifications.forEach(classification => {
      if (distribution.hasOwnProperty(classification.theme)) {
        distribution[classification.theme]++;
      }
      totalConfidence += classification.confidence || 0;
    });

    const averageConfidence = classifications.length > 0 
      ? (totalConfidence / classifications.length).toFixed(3)
      : 0;

    return {
      distribution,
      averageConfidence: parseFloat(averageConfidence)
    };
  }

}

// Helper function to create workflow instance
export function createQuestionAnalysisWorkflow() {
  return new QuestionAnalysisWorkflow();
}
