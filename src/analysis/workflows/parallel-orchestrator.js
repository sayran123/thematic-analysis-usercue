/**
 * LangGraph: Parallel question processing
 * 
 * This module orchestrates parallel analysis of multiple questions.
 * Creates and manages concurrent question analysis workflows.
 */

import { QuestionAnalysisWorkflow } from './question-analyzer.js';
import { logOperation } from '../../utils/config/llm-config.js';

/**
 * Parallel Orchestrator class for managing concurrent question analysis
 */
export class ParallelOrchestrator {
  constructor() {
    this.maxConcurrentQuestions = 6; // Based on architecture: 6 questions in parallel
    logOperation('parallel-orchestrator-initialized', { 
      maxConcurrentQuestions: this.maxConcurrentQuestions 
    });
  }

  /**
   * Run parallel thematic analysis for all questions
   * @param {Object} cleanedData - Cleaned and parsed data from response parser
   * @returns {Promise<Array|{error: string}>} Array of analysis results for all questions or error
   */
  async parallelThematicAnalysis(cleanedData) {
    try {
      // Validate input data
      const validationResult = this.validateInput(cleanedData);
      if (validationResult.error) {
        return { error: `Input validation failed: ${validationResult.error}` };
      }

      const { questions, responsesByQuestion, projectBackground, questionStats } = cleanedData;
      
      logOperation('parallel-analysis-start', { 
        totalQuestions: questions.length,
        maxConcurrent: this.maxConcurrentQuestions
      });

      // Create parallel analysis promises for each question
      const analysisPromises = questions.map((question, index) => 
        this.runQuestionAnalysisWorkflow({
          question,
          responses: responsesByQuestion[question.questionId] || [],
          projectBackground,
          stats: questionStats[question.questionId],
          questionIndex: index + 1
        })
      );
      
      // Execute all questions concurrently (6 questions in parallel)
      const results = await Promise.all(analysisPromises);
      
      // Handle partial failures
      const failureHandling = this.handlePartialFailures(results);
      
      logOperation('parallel-analysis-complete', { 
        totalQuestions: questions.length,
        successfulQuestions: failureHandling.successCount,
        failedQuestions: failureHandling.failureCount,
        completionRate: `${((failureHandling.successCount / questions.length) * 100).toFixed(1)}%`
      });

      // Return successful results (filter out errors)
      return failureHandling.successfulResults;
      
    } catch (error) {
      const errorMsg = `Parallel analysis failed: ${error.message}`;
      logOperation('parallel-analysis-error', { error: errorMsg });
      return { error: errorMsg };
    }
  }

  /**
   * Run analysis workflow for a single question
   * @param {Object} questionData - Data for a single question analysis
   * @returns {Promise<Object>} Analysis result for the question or error object
   */
  async runQuestionAnalysisWorkflow(questionData) {
    const { question, responses, projectBackground, stats, questionIndex } = questionData;
    
    const questionStart = Date.now();
    logOperation('question-analysis-start', { 
      questionId: question.questionId,
      questionIndex,
      responseCount: responses.length 
    });
    
    try {
      // Validate question-specific data
      if (!responses || responses.length === 0) {
        const warningMsg = `Question ${question.questionId} has no responses - skipping`;
        logOperation('question-analysis-skipped', { 
          questionId: question.questionId,
          reason: 'no_responses' 
        });
        return { 
          error: warningMsg,
          questionId: question.questionId,
          skipped: true 
        };
      }

      // Initialize workflow (each question gets its own instance for state isolation)
      const workflow = new QuestionAnalysisWorkflow();
      
      // Create initial state
      const initialState = {
        question,
        responses,
        projectBackground,
        stats,
        themes: null,
        derivedQuestion: null,
        themeValidation: null,
        classifications: null,
        quotes: null,
        summary: null
      };
      
      // Run the complete workflow
      const finalState = await workflow.runAnalysis(initialState);
      
      // Handle workflow errors
      if (finalState.error) {
        logOperation('question-analysis-failed', { 
          questionId: question.questionId,
          error: finalState.error,
          duration: Date.now() - questionStart
        });
        return { 
          error: `Question ${question.questionId} analysis failed: ${finalState.error}`,
          questionId: question.questionId 
        };
      }
      
      // Transform to analysis result format
      const analysisResult = this.transformToAnalysisResult(finalState);
      
      logOperation('question-analysis-success', { 
        questionId: question.questionId,
        questionIndex,
        duration: Date.now() - questionStart,
        themeCount: analysisResult.themes?.length || 0,
        participantCount: analysisResult.participantCount
      });
      
      return analysisResult;
      
    } catch (error) {
      const errorMsg = `Question ${question.questionId} analysis failed: ${error.message}`;
      logOperation('question-analysis-error', { 
        questionId: question.questionId,
        error: errorMsg,
        duration: Date.now() - questionStart
      });
      return { 
        error: errorMsg,
        questionId: question.questionId 
      };
    }
  }

  /**
   * Transform workflow state to analysis result format
   * @param {Object} finalState - Final workflow state
   * @returns {Object} Formatted analysis result
   */
  transformToAnalysisResult(finalState) {
    const {
      question,
      derivedQuestion,
      themes,
      themeValidation,
      classifications,
      quotes,
      summary,
      stats,
      responses
    } = finalState;
    
    // Create themes with supporting quotes
    const themesWithQuotes = themes ? themes.map(theme => {
      // Find supporting quotes for this theme
      const supportingQuotes = [];
      if (quotes && quotes[theme.id]) {
        supportingQuotes.push(...quotes[theme.id]);
      }
      
      return {
        ...theme,
        supportingQuotes
      };
    }) : [];
    
    // Transform classifications to participant mapping
    let participantClassifications = {};
    if (classifications && Array.isArray(classifications)) {
      classifications.forEach(classification => {
        if (classification.participantId && classification.theme) {
          participantClassifications[classification.participantId] = classification.theme;
        }
      });
    } else if (classifications && typeof classifications === 'object') {
      // Handle case where classifications is already an object
      participantClassifications = classifications;
    }
    
    // Calculate participant count from responses or classifications
    const participantCount = responses ? responses.length : Object.keys(participantClassifications).length;
    
    // Create analysis result matching expected format
    const analysisResult = {
      questionId: question?.questionId,
      derivedQuestion: derivedQuestion,
      participantCount: participantCount,
      headline: summary?.headline || `Analysis of ${question?.questionId}`,
      summary: summary?.summary || 'Analysis completed successfully',
      themes: themesWithQuotes,
      classifications: participantClassifications,
      // Include additional metadata for debugging/validation
      metadata: {
        themeValidation: themeValidation,
        quoteExtractionStats: finalState.quoteExtractionStats,
        summaryGenerationTime: finalState.summaryGenerationTime,
        hasErrors: !!finalState.error
      }
    };
    
    return analysisResult;
  }

  /**
   * Handle partial failures in parallel processing
   * @param {Array} results - Results array with potential errors
   * @returns {Object} Success and failure summary
   */
  handlePartialFailures(results) {
    const successfulResults = [];
    const failedResults = [];
    const skippedResults = [];
    
    results.forEach((result, index) => {
      if (result.error) {
        if (result.skipped) {
          skippedResults.push({
            questionIndex: index + 1,
            questionId: result.questionId,
            reason: 'no_responses'
          });
        } else {
          failedResults.push({
            questionIndex: index + 1,
            questionId: result.questionId,
            error: result.error
          });
        }
      } else {
        successfulResults.push(result);
      }
    });
    
    // Log failure details
    if (failedResults.length > 0) {
      logOperation('parallel-processing-failures', {
        failedCount: failedResults.length,
        failedQuestions: failedResults.map(f => f.questionId),
        failures: failedResults
      });
      
      failedResults.forEach(failure => {
        console.warn(`⚠️ Question ${failure.questionId} failed: ${failure.error}`);
      });
    }
    
    if (skippedResults.length > 0) {
      logOperation('parallel-processing-skipped', {
        skippedCount: skippedResults.length,
        skippedQuestions: skippedResults.map(s => s.questionId),
        skips: skippedResults
      });
      
      skippedResults.forEach(skipped => {
        console.warn(`⚠️ Question ${skipped.questionId} skipped: no responses`);
      });
    }
    
    // Log success summary
    if (successfulResults.length > 0) {
      console.log(`✅ Successfully analyzed ${successfulResults.length} questions`);
      successfulResults.forEach(result => {
        console.log(`  → ${result.questionId}: ${result.themes?.length || 0} themes, ${result.participantCount} participants`);
      });
    }
    
    return {
      successfulResults,
      failedResults,
      skippedResults,
      successCount: successfulResults.length,
      failureCount: failedResults.length,
      skipCount: skippedResults.length,
      totalProcessed: results.length
    };
  }

  /**
   * Validate parallel processing input
   * @param {Object} cleanedData - Input data to validate
   * @returns {Object} Validation result with success/error
   */
  validateInput(cleanedData) {
    try {
      // Check required fields exist
      if (!cleanedData) {
        return { error: 'cleanedData is required' };
      }
      
      const { questions, responsesByQuestion, projectBackground, questionStats } = cleanedData;
      
      // Validate questions array
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return { error: 'questions array is required and must not be empty' };
      }
      
      // Validate each question has required fields
      for (const question of questions) {
        if (!question.questionId) {
          return { error: `Question missing questionId: ${JSON.stringify(question)}` };
        }
      }
      
      // Validate responsesByQuestion structure
      if (!responsesByQuestion || typeof responsesByQuestion !== 'object') {
        return { error: 'responsesByQuestion must be an object' };
      }
      
      // Check projectBackground exists
      if (!projectBackground || typeof projectBackground !== 'string') {
        return { error: 'projectBackground is required and must be a string' };
      }
      
      // Validate questionStats structure
      if (!questionStats || typeof questionStats !== 'object') {
        return { error: 'questionStats must be an object' };
      }
      
      // Validate that each question has corresponding data
      for (const question of questions) {
        if (!responsesByQuestion[question.questionId]) {
          console.warn(`Warning: No responses found for question ${question.questionId}`);
        }
        
        if (!questionStats[question.questionId]) {
          return { error: `Missing stats for question ${question.questionId}` };
        }
      }
      
      logOperation('input-validation-success', {
        questionCount: questions.length,
        hasProjectBackground: !!projectBackground,
        questionsWithResponses: questions.filter(q => 
          responsesByQuestion[q.questionId] && responsesByQuestion[q.questionId].length > 0
        ).length
      });
      
      return { success: true };
      
    } catch (error) {
      return { error: `Input validation failed: ${error.message}` };
    }
  }

  /**
   * Monitor and report progress of parallel analysis
   * @param {Array} analysisPromises - Array of analysis promises
   * @returns {Promise<Array>} Results with progress reporting
   */
  async monitorProgress(analysisPromises) {
    const startTime = Date.now();
    let completedCount = 0;
    const totalCount = analysisPromises.length;
    
    logOperation('progress-monitoring-start', {
      totalQuestions: totalCount,
      startTime: new Date().toISOString()
    });
    
    // Wrap each promise with progress tracking
    const monitoredPromises = analysisPromises.map((promise, index) => 
      promise.then(result => {
        completedCount++;
        const progressPercentage = ((completedCount / totalCount) * 100).toFixed(1);
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`📊 Progress: ${completedCount}/${totalCount} questions completed (${progressPercentage}%) - ${elapsedTime}s elapsed`);
        
        logOperation('question-progress', {
          questionIndex: index + 1,
          completedCount,
          totalCount,
          progressPercentage: progressPercentage,
          elapsedSeconds: parseFloat(elapsedTime),
          questionId: result.questionId || `question_${index + 1}`
        });
        
        return result;
      }).catch(error => {
        completedCount++;
        console.error(`❌ Question ${index + 1} failed: ${error.message}`);
        
        logOperation('question-progress-error', {
          questionIndex: index + 1,
          error: error.message,
          completedCount,
          totalCount
        });
        
        // Return error result instead of throwing
        return { 
          error: error.message, 
          questionId: `question_${index + 1}` 
        };
      })
    );
    
    try {
      const results = await Promise.all(monitoredPromises);
      
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      logOperation('progress-monitoring-complete', {
        totalQuestions: totalCount,
        totalTimeSeconds: parseFloat(totalTime),
        averageTimePerQuestion: (parseFloat(totalTime) / totalCount).toFixed(1)
      });
      
      console.log(`🎯 All ${totalCount} questions processed in ${totalTime}s (avg: ${(parseFloat(totalTime) / totalCount).toFixed(1)}s per question)`);
      
      return results;
      
    } catch (error) {
      // This shouldn't happen since we catch errors above, but just in case
      logOperation('progress-monitoring-error', {
        error: error.message,
        elapsedTime: (Date.now() - startTime) / 1000
      });
      throw error;
    }
  }
}
