/**
 * Main results JSON output
 * 
 * This module generates the primary thematic analysis results in JSON format.
 * Aggregates all question analyses into a comprehensive final report with robust
 * multi-question integration and enhanced error handling for partial failures.
 */

import fs from 'fs/promises';
import path from 'path';
import { ensureDirectoryExists } from '../../utils/helpers/file-utils.js';
import { analyzeMultiQuestionErrors } from '../../utils/validation/error-analyzer.js';
import { logOperation } from '../../utils/config/llm-config.js';

/**
 * Generate main results JSON file with enhanced multi-question support
 * @param {Array} analyses - Array of completed question analyses (may include errors)
 * @param {Object} options - Generation options (output path, metadata, etc.)
 * @returns {Promise<Object|{error: string}>} Generated report object or error
 */
export async function generateMainResults(analyses, options = {}) {
  try {
    const outputPath = options.outputPath || 'outputs/thematic_analysis_results.json';
    
    logOperation('json-generation-started', { 
      totalQuestions: analyses.length,
      outputPath 
    });

    // Validate input analyses
    const validationResult = validateAnalysesForOutput(analyses);
    if (!validationResult.passed) {
      return { error: `Analysis validation failed: ${validationResult.errors.join('; ')}` };
    }

    // Separate successful and failed analyses
    const { successfulAnalyses, failedAnalyses, partialFailures } = categorizeAnalyses(analyses);
    
    // Perform error analysis for comprehensive reporting
    const errorAnalysis = analyzeMultiQuestionErrors(analyses, {
      generationContext: 'json_output',
      outputPath
    });

    // Create comprehensive final report
    const finalReport = {
      projectSummary: generateProjectOverview(successfulAnalyses, {
        hasFailures: failedAnalyses.length > 0,
        hasPartialFailures: partialFailures.length > 0,
        totalOriginalQuestions: analyses.length
      }),
      timestamp: new Date().toISOString(),
      metadata: generateComprehensiveMetadata(analyses, options),
      qualityAssurance: generateQualityMetrics(successfulAnalyses, failedAnalyses, partialFailures),
      questionAnalyses: successfulAnalyses,
      partialResults: partialFailures.length > 0 ? partialFailures : undefined,
      errors: failedAnalyses.length > 0 ? {
        summary: `${failedAnalyses.length} questions failed completely`,
        failedQuestions: failedAnalyses,
        errorAnalysis: errorAnalysis.error ? null : errorAnalysis
      } : undefined
    };

    // Ensure output directory exists
    const dirResult = await ensureDirectoryExists(path.dirname(outputPath));
    if (dirResult.error) {
      return { error: `Failed to create output directory: ${dirResult.error}` };
    }

    // Create backup if file exists
    const backupResult = await createBackupIfExists(outputPath);
    if (backupResult.error) {
      logOperation('json-backup-warning', { warning: backupResult.error });
    }

    // Write final report to disk
    await fs.writeFile(outputPath, JSON.stringify(finalReport, null, 2), 'utf8');
    
    logOperation('json-generation-completed', { 
      outputPath,
      successfulQuestions: successfulAnalyses.length,
      failedQuestions: failedAnalyses.length,
      partialFailures: partialFailures.length,
      dataCompleteness: finalReport.qualityAssurance.dataCompleteness
    });

    return finalReport;
    
  } catch (error) {
    const errorMsg = `Failed to generate main results: ${error.message}`;
    logOperation('json-generation-error', { error: errorMsg });
    return { error: errorMsg };
  }
}

/**
 * Categorize analyses into successful, failed, and partial failure groups
 * @param {Array} analyses - All question analyses
 * @returns {Object} Categorized analyses
 */
function categorizeAnalyses(analyses) {
  const successfulAnalyses = [];
  const failedAnalyses = [];
  const partialFailures = [];

  analyses.forEach(analysis => {
    if (analysis.error) {
      failedAnalyses.push({
        questionId: analysis.questionId || 'unknown',
        error: analysis.error,
        type: 'complete_failure'
      });
    } else if (analysis.partialFailures && analysis.partialFailures.length > 0) {
      // Include analysis but mark as partial failure
      partialFailures.push({
        ...analysis,
        failureContext: {
          type: 'partial_failure',
          failedComponents: analysis.partialFailures,
          completionStatus: 'partial'
        }
      });
    } else {
      successfulAnalyses.push(analysis);
    }
  });

  return { successfulAnalyses, failedAnalyses, partialFailures };
}

/**
 * Generate project overview summary with failure awareness
 * @param {Array} analyses - Successful question analyses
 * @param {Object} context - Context about failures and overall status
 * @returns {Object} Project overview object
 */
function generateProjectOverview(analyses, context = {}) {
  const totalQuestions = context.totalOriginalQuestions || analyses.length;
  const successfulQuestions = analyses.length;
  
  // Generate key findings from successful analyses
  const keyFindings = [];
  const allThemes = [];
  let totalParticipants = 0;
  let totalQuotes = 0;

  analyses.forEach(analysis => {
    if (analysis.themes) {
      allThemes.push(...analysis.themes);
    }
    if (analysis.participantCount) {
      totalParticipants = Math.max(totalParticipants, analysis.participantCount);
    }
    if (analysis.themes) {
      analysis.themes.forEach(theme => {
        if (theme.supportingQuotes) {
          totalQuotes += theme.supportingQuotes.length;
        }
      });
    }

    // Extract key finding from each question
    if (analysis.summary && analysis.summary.headline) {
      keyFindings.push({
        questionId: analysis.questionId,
        headline: analysis.summary.headline,
        derivedQuestion: analysis.derivedQuestion,
        themeCount: analysis.themes ? analysis.themes.length : 0
      });
    }
  });

  // Identify cross-cutting themes (simple keyword analysis)
  const crossCuttingThemes = identifyCrossCuttingThemes(allThemes);

  // Generate completion status message
  let completionMessage = `Analysis completed for ${successfulQuestions} of ${totalQuestions} questions`;
  if (context.hasFailures) {
    completionMessage += ` (${totalQuestions - successfulQuestions} questions failed)`;
  }
  if (context.hasPartialFailures) {
    completionMessage += ' with some partial failures';
  }

  return {
    overview: completionMessage,
    totalQuestions: successfulQuestions,
    totalOriginalQuestions: totalQuestions,
    keyFindings,
    participationSummary: {
      estimatedUniqueParticipants: totalParticipants,
      totalThemes: allThemes.length,
      totalQuotes,
      averageThemesPerQuestion: successfulQuestions > 0 ? 
        (allThemes.length / successfulQuestions).toFixed(1) : 0
    },
    crossCuttingThemes,
    dataQuality: {
      hasFailures: context.hasFailures || false,
      hasPartialFailures: context.hasPartialFailures || false,
      completionRate: ((successfulQuestions / totalQuestions) * 100).toFixed(1) + '%'
    }
  };
}

/**
 * Identify cross-cutting themes across multiple questions
 * @param {Array} allThemes - All themes from all questions
 * @returns {Array} Cross-cutting theme patterns
 */
function identifyCrossCuttingThemes(allThemes) {
  const themeKeywords = new Map();
  const crossCuttingThemes = [];

  // Extract keywords from theme titles and descriptions
  allThemes.forEach(theme => {
    const words = (theme.title + ' ' + (theme.description || ''))
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3); // Filter out short words

    words.forEach(word => {
      if (!themeKeywords.has(word)) {
        themeKeywords.set(word, []);
      }
      themeKeywords.get(word).push(theme);
    });
  });

  // Find keywords that appear across multiple themes
  themeKeywords.forEach((themes, keyword) => {
    if (themes.length >= 2) {
      crossCuttingThemes.push({
        keyword,
        frequency: themes.length,
        relatedThemes: themes.map(t => t.title).slice(0, 5) // Limit to first 5
      });
    }
  });

  // Sort by frequency and return top 10
  return crossCuttingThemes
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

/**
 * Calculate unique participants across all questions
 * @param {Array} analyses - All question analyses
 * @returns {number} Total unique participants
 */
function calculateUniqueParticipants(analyses) {
  const allParticipantIds = new Set();
  
  analyses.forEach(analysis => {
    if (analysis.classifications) {
      // Handle both object format {participantId: theme} and array format
      if (typeof analysis.classifications === 'object' && !Array.isArray(analysis.classifications)) {
        Object.keys(analysis.classifications).forEach(participantId => {
          allParticipantIds.add(participantId);
        });
      } else if (Array.isArray(analysis.classifications)) {
        analysis.classifications.forEach(classification => {
          if (classification.participantId) {
            allParticipantIds.add(classification.participantId);
          }
        });
      }
    }
  });
  
  return allParticipantIds.size;
}

/**
 * Calculate processing duration
 * @param {Date} startTime - Processing start time
 * @returns {string} Human-readable duration
 */
function calculateProcessingDuration(startTime) {
  if (!startTime) return 'Unknown';
  
  const endTime = new Date();
  const durationMs = endTime - startTime;
  const durationSeconds = Math.round(durationMs / 1000);
  
  if (durationSeconds < 60) {
    return `${durationSeconds} seconds`;
  } else if (durationSeconds < 3600) {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Generate comprehensive metadata with failure awareness
 * @param {Array} analyses - All analyses (including failed ones)
 * @param {Object} options - Additional metadata options
 * @returns {Object} Comprehensive metadata object
 */
function generateComprehensiveMetadata(analyses, options = {}) {
  const { successfulAnalyses, failedAnalyses, partialFailures } = categorizeAnalyses(analyses);
  
  return {
    totalQuestions: analyses.length,
    successfulQuestions: successfulAnalyses.length,
    failedQuestions: failedAnalyses.length,
    partialFailures: partialFailures.length,
    totalParticipants: calculateUniqueParticipants(successfulAnalyses.concat(partialFailures)),
    processingTime: calculateProcessingDuration(options.startTime),
    version: '1.0.0',
    generationTimestamp: new Date().toISOString(),
    dataSource: {
      inputFile: options.inputExcelPath || 'inputs/data.xlsx',
      backgroundFile: options.backgroundPath || 'inputs/project_background.txt'
    },
    pipeline: {
      mode: 'parallel',
      maxConcurrentQuestions: 6,
      errorHandling: 'enhanced_v4_2',
      validationEnabled: true
    }
  };
}

/**
 * Generate quality metrics for the analysis
 * @param {Array} successfulAnalyses - Successful analyses
 * @param {Array} failedAnalyses - Failed analyses  
 * @param {Array} partialFailures - Partial failure analyses
 * @returns {Object} Quality metrics object
 */
function generateQualityMetrics(successfulAnalyses, failedAnalyses, partialFailures) {
  const totalQuestions = successfulAnalyses.length + failedAnalyses.length + partialFailures.length;
  const totalQuotes = [...successfulAnalyses, ...partialFailures].reduce((total, analysis) => {
    if (!analysis.themes) return total;
    return total + analysis.themes.reduce((themeTotal, theme) => {
      return themeTotal + (theme.supportingQuotes ? theme.supportingQuotes.length : 0);
    }, 0);
  }, 0);

  const verifiedQuotes = [...successfulAnalyses, ...partialFailures].reduce((total, analysis) => {
    if (!analysis.themes) return total;
    return total + analysis.themes.reduce((themeTotal, theme) => {
      if (!theme.supportingQuotes) return themeTotal;
      return themeTotal + theme.supportingQuotes.filter(q => q.verified).length;
    }, 0);
  }, 0);

  const completionRate = totalQuestions > 0 ? 
    ((successfulAnalyses.length + partialFailures.length * 0.7) / totalQuestions * 100).toFixed(1) : 0;

  return {
    dataCompleteness: `${completionRate}%`,
    quoteVerificationRate: totalQuotes > 0 ? `${((verifiedQuotes / totalQuotes) * 100).toFixed(1)}%` : 'N/A',
    analysisReliability: completionRate >= 90 ? 'high' : completionRate >= 70 ? 'medium' : 'low',
    totalValidations: totalQuotes,
    successfulValidations: verifiedQuotes,
    averageThemesPerQuestion: successfulAnalyses.length > 0 ? 
      (successfulAnalyses.reduce((sum, a) => sum + (a.themes?.length || 0), 0) / successfulAnalyses.length).toFixed(1) : '0',
    qualityIndicators: {
      hasCompleteFailures: failedAnalyses.length > 0,
      hasPartialFailures: partialFailures.length > 0,
      allQuestionsSuccessful: failedAnalyses.length === 0 && partialFailures.length === 0,
      minimumViableAnalysis: completionRate >= 50
    }
  };
}

/**
 * Validate analysis results before generation
 * @param {Array} analyses - Analysis results to validate
 * @returns {Object} Validation result with errors and warnings
 */
export function validateAnalysesForOutput(analyses) {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(analyses) || analyses.length === 0) {
    errors.push('No analyses provided for output generation');
    return { passed: false, errors, warnings };
  }
  
  analyses.forEach((analysis, index) => {
    const analysisId = analysis.questionId || `analysis_${index}`;
    
    // Basic structure validation
    if (!analysis.questionId && !analysis.error) {
      warnings.push(`${analysisId}: Missing questionId`);
    }
    
    // For non-error analyses, validate core components
    if (!analysis.error) {
      if (!analysis.themes || !Array.isArray(analysis.themes)) {
        warnings.push(`${analysisId}: Missing or invalid themes array`);
      } else if (analysis.themes.length === 0) {
        warnings.push(`${analysisId}: No themes generated`);
      }
      
      if (!analysis.summary) {
        warnings.push(`${analysisId}: Missing summary`);
      }
      
      if (!analysis.derivedQuestion) {
        warnings.push(`${analysisId}: Missing derived question`);
      }
      
      // Validate theme structure
      if (analysis.themes) {
        analysis.themes.forEach((theme, themeIndex) => {
          if (!theme.title) {
            warnings.push(`${analysisId}: Theme ${themeIndex} missing title`);
          }
          if (!theme.description) {
            warnings.push(`${analysisId}: Theme ${themeIndex} missing description`);
          }
        });
      }
    }
    
    // Validate error analyses have proper structure
    if (analysis.error && typeof analysis.error !== 'string') {
      errors.push(`${analysisId}: Error field must be a string`);
    }
  });
  
  // Check for duplicate question IDs
  const questionIds = analyses
    .filter(a => a.questionId)
    .map(a => a.questionId);
  const uniqueQuestionIds = new Set(questionIds);
  
  if (questionIds.length !== uniqueQuestionIds.size) {
    errors.push('Duplicate question IDs detected in analyses');
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create backup if file exists
 * @param {string} outputPath - Original output file path
 * @returns {Promise<Object>} Backup result
 */
async function createBackupIfExists(outputPath) {
  try {
    // Check if file exists
    await fs.access(outputPath);
    
    // File exists, create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = outputPath.replace('.json', `_backup_${timestamp}.json`);
    
    await fs.copyFile(outputPath, backupPath);
    
    logOperation('json-backup-created', { 
      originalPath: outputPath, 
      backupPath 
    });
    
    return { success: true, backupPath };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, no backup needed
      return { success: true, message: 'No existing file to backup' };
    }
    
    return { error: `Backup creation failed: ${error.message}` };
  }
}

/**
 * Generate metadata for the report (legacy function for compatibility)
 * @param {Array} analyses - All analyses
 * @param {Object} options - Additional metadata options
 * @returns {Object} Metadata object
 */
export function generateMetadata(analyses, options = {}) {
  return generateComprehensiveMetadata(analyses, options);
}

/**
 * Create backup of results (legacy function for compatibility)
 * @param {Object} finalReport - Generated report
 * @param {string} backupPath - Backup file path
 * @returns {Promise<void>}
 */
export async function createBackup(finalReport, backupPath) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedBackupPath = backupPath.replace('.json', `_${timestamp}.json`);
    
    // Ensure backup directory exists
    const dirResult = await ensureDirectoryExists(path.dirname(timestampedBackupPath));
    if (dirResult.error) {
      throw new Error(`Failed to create backup directory: ${dirResult.error}`);
    }
    
    await fs.writeFile(timestampedBackupPath, JSON.stringify(finalReport, null, 2), 'utf8');
    
    logOperation('json-backup-manual', { 
      backupPath: timestampedBackupPath 
    });
    
  } catch (error) {
    throw new Error(`Backup creation failed: ${error.message}`);
  }
}
