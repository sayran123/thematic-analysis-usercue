/**
 * LangGraph: Single question stateful workflow
 * 
 * This module implements the LangGraph state machine for analyzing a single question.
 * Manages state progression through: Raw Data → Themes+Question → Classifications → Quotes+Validation → Summary
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { logOperation } from '../../utils/config/llm-config.js';

/**
 * Question Analysis State structure
 * @typedef {Object} QuestionAnalysisState
 * @property {Object} question - Question object with questionId and headerText
 * @property {Array} responses - Array of participant responses
 * @property {string} projectBackground - Project context
 * @property {Object} stats - Question statistics
 * @property {Array|null} themes - Generated themes
 * @property {string|null} derivedQuestion - Derived research question
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
        classifications: Annotation(),
        quotes: Annotation(),
        summary: Annotation()
      });

      // Create state graph with proper annotation
      this.graph = new StateGraph(StateAnnotation);

      // Add nodes for each workflow stage
      this.graph.addNode("generateThemes", this.generateThemes.bind(this));
      this.graph.addNode("classifyResponses", this.classifyResponses.bind(this));
      this.graph.addNode("extractQuotes", this.extractQuotes.bind(this));
      this.graph.addNode("generateSummary", this.generateSummary.bind(this));

      // Define the workflow edges (state transitions)
      this.graph.addEdge(START, "generateThemes");
      this.graph.addEdge("generateThemes", "classifyResponses");
      this.graph.addEdge("classifyResponses", "extractQuotes");
      this.graph.addEdge("extractQuotes", "generateSummary");
      this.graph.addEdge("generateSummary", END);

      // Compile the graph
      this.compiledGraph = this.graph.compile();
      
      logOperation('workflow-initialized', { 
        nodes: ['generateThemes', 'classifyResponses', 'extractQuotes', 'generateSummary'],
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
    logOperation('node-generateThemes', { questionId: state.question.questionId });
    
    // MVP placeholder: Create mock themes for testing
    const themes = [
      {
        id: 'theme1',
        title: 'Mock Theme 1',
        description: 'Placeholder theme for testing workflow',
        estimatedParticipants: 20
      },
      {
        id: 'theme2', 
        title: 'Mock Theme 2',
        description: 'Another placeholder theme for testing',
        estimatedParticipants: 15
      }
    ];

    const derivedQuestion = `What are the main factors in ${state.question.questionId}?`;

    return {
      ...state,
      themes,
      derivedQuestion
    };
  }

  /**
   * Classify responses to themes (Node 2)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with classifications
   */
  async classifyResponses(state) {
    logOperation('node-classifyResponses', { 
      themeCount: state.themes?.length,
      responseCount: state.responses?.length 
    });
    
    // MVP placeholder: Create mock classifications
    const classifications = state.responses.map((response, index) => ({
      participantId: response.participantId,
      questionId: response.questionId,
      themeId: index % 2 === 0 ? 'theme1' : 'theme2',
      theme: index % 2 === 0 ? 'Mock Theme 1' : 'Mock Theme 2',
      confidence: 0.8
    }));

    return {
      ...state,
      classifications
    };
  }

  /**
   * Extract supporting quotes with validation (Node 3)
   * @param {QuestionAnalysisState} state - Current state
   * @returns {Promise<QuestionAnalysisState>} Updated state with validated quotes
   */
  async extractQuotes(state) {
    logOperation('node-extractQuotes', { 
      themeCount: state.themes?.length,
      classificationCount: state.classifications?.length 
    });
    
    // MVP placeholder: Create mock quotes
    const quotes = {
      theme1: [
        { quote: 'Mock quote 1', participantId: 'p1', verified: true }
      ],
      theme2: [
        { quote: 'Mock quote 2', participantId: 'p2', verified: true }
      ]
    };

    return {
      ...state,
      quotes
    };
  }

  /**
   * Generate summary and headline (Node 4)
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

}

// Helper function to create workflow instance
export function createQuestionAnalysisWorkflow() {
  return new QuestionAnalysisWorkflow();
}
