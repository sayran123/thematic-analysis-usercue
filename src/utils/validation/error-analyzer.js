/**
 * Multi-Question Error Analytics & Reporting
 * 
 * This module provides comprehensive error analysis across multiple questions
 * in the parallel thematic analysis pipeline. It detects error patterns,
 * categorizes failures, and generates actionable reports for debugging.
 */

import { logOperation } from '../config/llm-config.js';

/**
 * Error categories for classification
 */
export const ERROR_CATEGORIES = {
  LLM_FAILURE: 'llm_failure',
  VALIDATION_FAILURE: 'validation_failure',
  DATA_QUALITY: 'data_quality',
  TIMEOUT: 'timeout',
  QUOTA_EXCEEDED: 'quota_exceeded',
  NETWORK_ERROR: 'network_error',
  PARSING_ERROR: 'parsing_error',
  WORKFLOW_ERROR: 'workflow_error',
  UNKNOWN: 'unknown'
};

/**
 * Failure severity levels
 */
export const FAILURE_SEVERITY = {
  CRITICAL: 'critical',     // Complete question failure
  HIGH: 'high',            // Major component failure (e.g., all classifications failed)
  MEDIUM: 'medium',        // Partial component failure (e.g., some classification batches failed)
  LOW: 'low'               // Minor issues with fallbacks working
};

/**
 * Error Analyzer class for multi-question error analytics
 */
export class ErrorAnalyzer {
  constructor() {
    this.errorPatterns = new Map();
    this.crossQuestionCorrelations = new Map();
  }

  /**
   * Analyze errors across multiple question results
   * @param {Array} results - Array of question analysis results (may include errors)
   * @param {Object} metadata - Additional context about the analysis run
   * @returns {Object} Comprehensive error analysis report
   */
  analyzeMultiQuestionErrors(results, metadata = {}) {
    try {
      const analysis = {
        summary: this.generateErrorSummary(results),
        categorizedErrors: this.categorizeErrors(results),
        errorPatterns: this.detectErrorPatterns(results),
        crossQuestionCorrelations: this.analyzeCrossQuestionErrors(results),
        qualityImpact: this.assessQualityImpact(results),
        recommendations: this.generateRecommendations(results),
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          totalQuestions: results.length,
          ...metadata
        }
      };

      logOperation('error-analysis-completed', {
        totalQuestions: results.length,
        errorCount: analysis.summary.totalErrors,
        criticalErrors: analysis.summary.criticalErrors,
        patternCount: analysis.errorPatterns.length
      });

      return analysis;

    } catch (error) {
      const errorMsg = `Error analysis failed: ${error.message}`;
      logOperation('error-analysis-failed', { error: errorMsg });
      return { error: errorMsg };
    }
  }

  /**
   * Generate high-level error summary
   * @param {Array} results - Question analysis results
   * @returns {Object} Error summary statistics
   */
  generateErrorSummary(results) {
    const summary = {
      totalQuestions: results.length,
      successfulQuestions: 0,
      failedQuestions: 0,
      partialFailures: 0,
      totalErrors: 0,
      criticalErrors: 0,
      highSeverityErrors: 0,
      completionRate: 0
    };

    results.forEach(result => {
      if (result.error) {
        summary.failedQuestions++;
        summary.totalErrors++;
        summary.criticalErrors++;
      } else if (result.partialFailures && result.partialFailures.length > 0) {
        summary.partialFailures++;
        summary.totalErrors += result.partialFailures.length;
        summary.highSeverityErrors += result.partialFailures.filter(f => 
          f.severity === FAILURE_SEVERITY.HIGH || f.severity === FAILURE_SEVERITY.CRITICAL
        ).length;
      } else {
        summary.successfulQuestions++;
      }
    });

    summary.completionRate = summary.totalQuestions > 0 ? 
      ((summary.successfulQuestions + summary.partialFailures) / summary.totalQuestions * 100).toFixed(1) : 0;

    return summary;
  }

  /**
   * Categorize errors by type and source
   * @param {Array} results - Question analysis results
   * @returns {Object} Categorized error analysis
   */
  categorizeErrors(results) {
    const categories = {};
    
    // Initialize categories
    Object.values(ERROR_CATEGORIES).forEach(category => {
      categories[category] = {
        count: 0,
        questions: [],
        details: []
      };
    });

    results.forEach((result, index) => {
      const questionId = result.questionId || `question_${index + 1}`;

      if (result.error) {
        const category = this.classifyError(result.error);
        categories[category].count++;
        categories[category].questions.push(questionId);
        categories[category].details.push({
          questionId,
          error: result.error,
          severity: FAILURE_SEVERITY.CRITICAL
        });
      }

      // Analyze partial failures
      if (result.partialFailures) {
        result.partialFailures.forEach(failure => {
          const category = this.classifyError(failure.error || failure.reason);
          categories[category].count++;
          categories[category].questions.push(questionId);
          categories[category].details.push({
            questionId,
            component: failure.component,
            error: failure.error || failure.reason,
            severity: failure.severity || FAILURE_SEVERITY.MEDIUM
          });
        });
      }

      // Analyze component-specific errors
      if (result.themes && result.themeValidation && !result.themeValidation.passed) {
        categories[ERROR_CATEGORIES.VALIDATION_FAILURE].count++;
        categories[ERROR_CATEGORIES.VALIDATION_FAILURE].questions.push(questionId);
        categories[ERROR_CATEGORIES.VALIDATION_FAILURE].details.push({
          questionId,
          component: 'theme_validation',
          error: result.themeValidation.errors?.join('; '),
          severity: FAILURE_SEVERITY.MEDIUM
        });
      }
    });

    return categories;
  }

  /**
   * Classify individual error into category
   * @param {string} errorMessage - Error message to classify
   * @returns {string} Error category
   */
  classifyError(errorMessage) {
    if (!errorMessage || typeof errorMessage !== 'string') {
      return ERROR_CATEGORIES.UNKNOWN;
    }

    const message = errorMessage.toLowerCase();

    // LLM-specific errors
    if (message.includes('rate limit') || message.includes('quota exceeded')) {
      return ERROR_CATEGORIES.QUOTA_EXCEEDED;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ERROR_CATEGORIES.TIMEOUT;
    }
    if (message.includes('network') || message.includes('connection')) {
      return ERROR_CATEGORIES.NETWORK_ERROR;
    }
    if (message.includes('llm') || message.includes('openai') || message.includes('api')) {
      return ERROR_CATEGORIES.LLM_FAILURE;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('hallucinated') || message.includes('quote')) {
      return ERROR_CATEGORIES.VALIDATION_FAILURE;
    }

    // Parsing errors
    if (message.includes('json') || message.includes('parse') || message.includes('format')) {
      return ERROR_CATEGORIES.PARSING_ERROR;
    }

    // Workflow errors
    if (message.includes('workflow') || message.includes('state') || message.includes('node')) {
      return ERROR_CATEGORIES.WORKFLOW_ERROR;
    }

    // Data quality errors
    if (message.includes('data') || message.includes('response') || message.includes('participant')) {
      return ERROR_CATEGORIES.DATA_QUALITY;
    }

    return ERROR_CATEGORIES.UNKNOWN;
  }

  /**
   * Detect patterns across multiple errors
   * @param {Array} results - Question analysis results
   * @returns {Array} Detected error patterns
   */
  detectErrorPatterns(results) {
    const patterns = [];
    const errorMessages = [];

    // Collect all error messages
    results.forEach((result, index) => {
      const questionId = result.questionId || `question_${index + 1}`;
      
      if (result.error) {
        errorMessages.push({ questionId, error: result.error, type: 'critical' });
      }
      
      if (result.partialFailures) {
        result.partialFailures.forEach(failure => {
          errorMessages.push({ 
            questionId, 
            error: failure.error || failure.reason, 
            type: 'partial',
            component: failure.component 
          });
        });
      }
    });

    // Pattern 1: Widespread LLM issues
    const llmErrors = errorMessages.filter(e => 
      this.classifyError(e.error) === ERROR_CATEGORIES.LLM_FAILURE ||
      this.classifyError(e.error) === ERROR_CATEGORIES.QUOTA_EXCEEDED ||
      this.classifyError(e.error) === ERROR_CATEGORIES.TIMEOUT
    );

    if (llmErrors.length >= Math.ceil(results.length * 0.5)) {
      patterns.push({
        pattern: 'widespread_llm_issues',
        severity: FAILURE_SEVERITY.CRITICAL,
        affectedQuestions: llmErrors.length,
        description: 'Multiple questions experiencing LLM-related failures',
        recommendation: 'Check LLM service status, API quotas, and network connectivity'
      });
    }

    // Pattern 2: Classification batch failures
    const classificationErrors = errorMessages.filter(e => 
      e.component === 'classification' || e.error?.includes('classification')
    );

    if (classificationErrors.length >= 2) {
      patterns.push({
        pattern: 'classification_batch_issues',
        severity: FAILURE_SEVERITY.HIGH,
        affectedQuestions: classificationErrors.length,
        description: 'Multiple questions experiencing classification failures',
        recommendation: 'Review classification prompts and response completeness'
      });
    }

    // Pattern 3: Quote validation failures
    const quoteErrors = errorMessages.filter(e => 
      e.component === 'quote_extraction' || e.error?.includes('quote') || e.error?.includes('hallucin')
    );

    if (quoteErrors.length >= 2) {
      patterns.push({
        pattern: 'quote_validation_issues',
        severity: FAILURE_SEVERITY.MEDIUM,
        affectedQuestions: quoteErrors.length,
        description: 'Multiple questions experiencing quote validation failures',
        recommendation: 'Review quote extraction prompts and conversation format parsing'
      });
    }

    // Pattern 4: Data quality issues
    const dataErrors = errorMessages.filter(e => 
      this.classifyError(e.error) === ERROR_CATEGORIES.DATA_QUALITY
    );

    if (dataErrors.length >= Math.ceil(results.length * 0.3)) {
      patterns.push({
        pattern: 'data_quality_issues',
        severity: FAILURE_SEVERITY.HIGH,
        affectedQuestions: dataErrors.length,
        description: 'Multiple questions experiencing data quality issues',
        recommendation: 'Review input data format and conversation structure'
      });
    }

    return patterns;
  }

  /**
   * Analyze error correlations across questions
   * @param {Array} results - Question analysis results
   * @returns {Object} Cross-question correlation analysis
   */
  analyzeCrossQuestionErrors(results) {
    const correlations = {
      timeBasedPatterns: this.analyzeTimeBasedPatterns(results),
      componentFailureSequences: this.analyzeComponentFailures(results),
      similarityBasedFailures: this.analyzeSimilarityBasedFailures(results)
    };

    return correlations;
  }

  /**
   * Analyze time-based error patterns
   * @param {Array} results - Question analysis results
   * @returns {Array} Time-based patterns
   */
  analyzeTimeBasedPatterns(results) {
    // For now, return basic pattern detection
    // In future could analyze timestamps for temporal correlations
    return [
      {
        pattern: 'sequential_failures',
        description: 'Errors may be related to resource exhaustion or cascading failures',
        confidence: 'medium'
      }
    ];
  }

  /**
   * Analyze component failure sequences
   * @param {Array} results - Question analysis results
   * @returns {Object} Component failure analysis
   */
  analyzeComponentFailures(results) {
    const componentFailures = {};
    
    results.forEach(result => {
      if (result.partialFailures) {
        result.partialFailures.forEach(failure => {
          const component = failure.component || 'unknown';
          if (!componentFailures[component]) {
            componentFailures[component] = [];
          }
          componentFailures[component].push(failure);
        });
      }
    });

    return {
      byComponent: componentFailures,
      mostProblematic: Object.keys(componentFailures).sort((a, b) => 
        componentFailures[b].length - componentFailures[a].length
      )[0] || null
    };
  }

  /**
   * Analyze similarity-based failure patterns
   * @param {Array} results - Question analysis results
   * @returns {Array} Similarity-based patterns
   */
  analyzeSimilarityBasedFailures(results) {
    // Basic implementation - could be enhanced with NLP similarity analysis
    const failedQuestions = results.filter(r => r.error || (r.partialFailures && r.partialFailures.length > 0));
    
    if (failedQuestions.length >= 2) {
      return [
        {
          pattern: 'similar_question_failures',
          description: 'Multiple questions with similar characteristics experiencing failures',
          affectedCount: failedQuestions.length,
          confidence: 'low'
        }
      ];
    }

    return [];
  }

  /**
   * Assess quality impact of errors
   * @param {Array} results - Question analysis results
   * @returns {Object} Quality impact assessment
   */
  assessQualityImpact(results) {
    const impact = {
      overallQuality: 'high',
      dataCompleteness: 0,
      analysisReliability: 'high',
      outputUsability: 'high',
      criticalIssues: [],
      recommendations: []
    };

    const totalQuestions = results.length;
    const successfulQuestions = results.filter(r => !r.error && (!r.partialFailures || r.partialFailures.length === 0)).length;
    const partiallySuccessfulQuestions = results.filter(r => !r.error && r.partialFailures && r.partialFailures.length > 0).length;

    impact.dataCompleteness = ((successfulQuestions + partiallySuccessfulQuestions * 0.7) / totalQuestions * 100).toFixed(1);

    // Assess overall quality based on completion rate
    if (impact.dataCompleteness >= 90) {
      impact.overallQuality = 'high';
      impact.analysisReliability = 'high';
      impact.outputUsability = 'high';
    } else if (impact.dataCompleteness >= 70) {
      impact.overallQuality = 'medium';
      impact.analysisReliability = 'medium';
      impact.outputUsability = 'high';
    } else if (impact.dataCompleteness >= 50) {
      impact.overallQuality = 'medium';
      impact.analysisReliability = 'low';
      impact.outputUsability = 'medium';
      impact.criticalIssues.push('Low data completeness may affect analysis reliability');
    } else {
      impact.overallQuality = 'low';
      impact.analysisReliability = 'low';
      impact.outputUsability = 'low';
      impact.criticalIssues.push('Very low data completeness significantly impacts analysis quality');
    }

    return impact;
  }

  /**
   * Generate actionable recommendations based on error analysis
   * @param {Array} results - Question analysis results
   * @returns {Array} Actionable recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    const errorSummary = this.generateErrorSummary(results);
    const categorizedErrors = this.categorizeErrors(results);

    // Recommendations based on error patterns
    if (categorizedErrors[ERROR_CATEGORIES.LLM_FAILURE].count > 0) {
      recommendations.push({
        priority: 'high',
        category: 'infrastructure',
        title: 'LLM Service Issues Detected',
        description: 'Multiple LLM-related failures detected. Check API status and quotas.',
        actionItems: [
          'Verify OpenAI API key and quota status',
          'Check network connectivity and firewall settings',
          'Consider implementing exponential backoff for retries',
          'Monitor LLM service status pages'
        ]
      });
    }

    if (categorizedErrors[ERROR_CATEGORIES.VALIDATION_FAILURE].count > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'quality_assurance',
        title: 'Validation Failures Detected',
        description: 'Quote or theme validation failures may indicate prompt engineering issues.',
        actionItems: [
          'Review quote extraction prompts for clarity',
          'Validate conversation format parsing logic',
          'Consider adjusting validation thresholds',
          'Test with additional conversation format variations'
        ]
      });
    }

    if (errorSummary.completionRate < 80) {
      recommendations.push({
        priority: 'critical',
        category: 'pipeline_reliability',
        title: 'Low Completion Rate',
        description: `Only ${errorSummary.completionRate}% of questions completed successfully.`,
        actionItems: [
          'Investigate root cause of widespread failures',
          'Consider implementing more robust retry mechanisms',
          'Review input data quality and format',
          'Implement graceful degradation for critical failures'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate error report for logging and debugging
   * @param {Object} analysis - Complete error analysis
   * @returns {string} Formatted error report
   */
  generateErrorReport(analysis) {
    let report = '\n🔍 Multi-Question Error Analysis Report\n';
    report += '=' .repeat(50) + '\n\n';

    // Summary
    report += `📊 Summary:\n`;
    report += `  • Total Questions: ${analysis.summary.totalQuestions}\n`;
    report += `  • Successful: ${analysis.summary.successfulQuestions}\n`;
    report += `  • Partial Failures: ${analysis.summary.partialFailures}\n`;
    report += `  • Complete Failures: ${analysis.summary.failedQuestions}\n`;
    report += `  • Completion Rate: ${analysis.summary.completionRate}%\n\n`;

    // Quality Impact
    report += `🎯 Quality Impact:\n`;
    report += `  • Overall Quality: ${analysis.qualityImpact.overallQuality.toUpperCase()}\n`;
    report += `  • Data Completeness: ${analysis.qualityImpact.dataCompleteness}%\n`;
    report += `  • Analysis Reliability: ${analysis.qualityImpact.analysisReliability.toUpperCase()}\n\n`;

    // Error Patterns
    if (analysis.errorPatterns.length > 0) {
      report += `🔍 Detected Patterns:\n`;
      analysis.errorPatterns.forEach(pattern => {
        report += `  • ${pattern.description} (${pattern.severity})\n`;
        report += `    Recommendation: ${pattern.recommendation}\n`;
      });
      report += '\n';
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += `💡 Recommendations:\n`;
      analysis.recommendations.forEach((rec, index) => {
        report += `  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n`;
        report += `     ${rec.description}\n`;
      });
    }

    return report;
  }
}

/**
 * Standalone function for quick error analysis
 * @param {Array} results - Question analysis results
 * @param {Object} options - Analysis options
 * @returns {Object} Error analysis results
 */
export function analyzeMultiQuestionErrors(results, options = {}) {
  const analyzer = new ErrorAnalyzer();
  return analyzer.analyzeMultiQuestionErrors(results, options);
}

/**
 * Generate and log error report
 * @param {Array} results - Question analysis results
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis with logged report
 */
export function analyzeAndReportErrors(results, options = {}) {
  const analyzer = new ErrorAnalyzer();
  const analysis = analyzer.analyzeMultiQuestionErrors(results, options);
  
  if (analysis.error) {
    return analysis;
  }

  const report = analyzer.generateErrorReport(analysis);
  console.log(report);
  
  logOperation('error-report-generated', {
    totalErrors: analysis.summary.totalErrors,
    completionRate: analysis.summary.completionRate,
    qualityLevel: analysis.qualityImpact.overallQuality,
    patternCount: analysis.errorPatterns.length,
    recommendationCount: analysis.recommendations.length
  });

  return { ...analysis, report };
}
