/**
 * User-Facing Thematic Analysis Generator
 * 
 * Creates clean, stakeholder-ready JSON output that directly maps to thematic analysis requirements.
 * This is the primary output format for consuming analysis results.
 */

import { logOperation } from '../../utils/config/llm-config.js';
import { ensureDirectoryExists } from '../../utils/helpers/file-utils.js';
import fs from 'fs/promises';

/**
 * Generate user-friendly thematic analysis JSON
 * @param {Array} analysisResults - Results from parallel orchestrator
 * @param {Object} options - Generation options
 * @returns {Object} - {error?: string, filePath?: string, analysisData?: Object}
 */
export async function generateThematicAnalysis(analysisResults, options = {}) {
  logOperation('analysis-generation-started', { 
    totalQuestions: analysisResults?.length || 0,
    outputDirectory: options.outputDirectory || 'outputs'
  });
  
  try {
    // Validate input
    if (!Array.isArray(analysisResults)) {
      return { error: 'Analysis results must be an array' };
    }

    // Filter successful analyses only
    const successfulAnalyses = analysisResults.filter(result => 
      result && result.themes && result.summary && !result.error
    );

    if (successfulAnalyses.length === 0) {
      return { error: 'No successful analyses found to generate thematic analysis' };
    }

    // Create the user-friendly analysis structure
    const analysisData = {
      title: options.projectTitle || "Thematic Analysis Results",
      completedDate: new Date().toISOString().split('T')[0],
      totalQuestions: analysisResults.length,
      successfulQuestions: successfulAnalyses.length,
      analyses: []
    };

    // Process each successful question analysis
    for (const result of successfulAnalyses) {
      const questionAnalysis = await formatQuestionAnalysis(result);
      if (questionAnalysis) {
        analysisData.analyses.push(questionAnalysis);
      }
    }

    // Add metadata
    analysisData.metadata = generateMetadata(analysisResults, successfulAnalyses);

    // Generate output file
    const outputPath = options.outputDirectory || 'outputs';
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0]; // Date part: 2025-09-05
    const timeStr = now.toTimeString().slice(0, 5).replace(':', ''); // Time part: 1430 (for 2:30 PM)
    const fileName = `${timestamp}_${timeStr}_thematic_analysis.json`;
    const filePath = `${outputPath}/${fileName}`;

    // Ensure directory exists
    const dirResult = await ensureDirectoryExists(outputPath);
    if (dirResult.error) {
      return { error: `Failed to create output directory: ${dirResult.error}` };
    }

    // Write the clean analysis file
    await fs.writeFile(filePath, JSON.stringify(analysisData, null, 2), 'utf8');

    logOperation('analysis-generation-completed', { 
      fileName,
      filePath,
      successfulQuestions: successfulAnalyses.length,
      totalQuestions: analysisResults.length
    });
    
    return {
      filePath,
      analysisData,
      fileName
    };

  } catch (error) {
    logOperation('analysis-generation-failed', { 
      error: error.message,
      totalQuestions: analysisResults?.length || 0
    });
    return { error: `Thematic analysis generation failed: ${error.message}` };
  }
}

/**
 * Format a single question analysis into user-friendly structure
 * @param {Object} result - Single question analysis result
 * @returns {Object} - Formatted question analysis
 */
async function formatQuestionAnalysis(result) {
  try {
    // Extract basic information
    const questionAnalysis = {
      question: result.derivedQuestion || "Question not available",
      participantCount: result.participantCount || 0,
      headline: result.headline || "Analysis completed",
      summary: result.summary || "Analysis summary not available"
    };

    // Format themes with participant counts and percentages
    questionAnalysis.themes = [];
    
    if (result.themes && Array.isArray(result.themes)) {
      for (const theme of result.themes) {
        const formattedTheme = await formatThemeData(theme, result.classifications, result.participantCount);
        questionAnalysis.themes.push(formattedTheme);
      }
    }

    return questionAnalysis;

  } catch (error) {
    console.warn(`Failed to format question analysis: ${error.message}`);
    return null;
  }
}

/**
 * Format theme data with participant counts and best quotes
 * @param {Object} theme - Theme object
 * @param {Object} classifications - Participant classifications
 * @param {number} totalParticipants - Total participants for percentage calculation
 * @returns {Object} - Formatted theme
 */
async function formatThemeData(theme, classifications = {}, totalParticipants = 0) {
  // Count participants classified to this theme
  const participantCount = Object.values(classifications).filter(
    classification => classification === theme.title
  ).length;

  // Calculate percentage
  const percentage = totalParticipants > 0 
    ? `${((participantCount / totalParticipants) * 100).toFixed(1)}%`
    : "0.0%";

  // Format the theme
  const formattedTheme = {
    title: theme.title || "Untitled Theme",
    description: theme.description || "No description available",
    participantCount,
    percentage,
    quotes: []
  };

  // Select best quotes (up to 3) with fallback logic
  if (theme.supportingQuotes && Array.isArray(theme.supportingQuotes) && theme.supportingQuotes.length > 0) {
    formattedTheme.quotes = selectBestQuotes(theme.supportingQuotes, 3);
  } else {
    // Debug log for themes without quotes
    if (process.env.NODE_ENV !== 'production') {
      console.log(`⚠️  Theme "${theme.title}" has no supportingQuotes (${theme.supportingQuotes?.length || 0} quotes)`);
    }
  }

  return formattedTheme;
}

/**
 * Select the best representative quotes for a theme
 * @param {Array} quotes - Array of quote objects
 * @param {number} maxQuotes - Maximum number of quotes to return
 * @returns {Array} - Selected quotes in clean format
 */
function selectBestQuotes(quotes, maxQuotes = 3) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return [];
  }

  // Filter verified quotes first, fallback to all quotes
  const verifiedQuotes = quotes.filter(q => q.verified !== false);
  const quotesToUse = verifiedQuotes.length > 0 ? verifiedQuotes : quotes;

  // Apply lenient filtering - only require quote text exists and is not empty
  const validQuotes = quotesToUse.filter(q => {
    return q.quote && typeof q.quote === 'string' && q.quote.trim().length > 0;
  });

  // Sort by quote length (prefer substantial quotes) but be more lenient with minimum length
  const sortedQuotes = validQuotes
    .sort((a, b) => {
      // Prefer longer, more substantive quotes but include short ones too
      const lengthScore = (text) => {
        const len = text.length;
        if (len < 5) return 0;     // Very short (exclude these)
        if (len < 30) return 1;    // Short but acceptable  
        if (len < 100) return 2;   // Medium length
        return 3;                  // Long quotes
      };
      return lengthScore(b.quote) - lengthScore(a.quote);
    })
    .slice(0, maxQuotes);

  // Format for user consumption
  return sortedQuotes.map(q => ({
    text: q.quote.trim(),
    participantId: q.participantId || "Unknown"
  }));
}

/**
 * Generate metadata for the analysis
 * @param {Array} allResults - All analysis results
 * @param {Array} successfulResults - Successful analysis results
 * @returns {Object} - Metadata object
 */
function generateMetadata(allResults, successfulResults) {
  const totalParticipants = successfulResults.reduce(
    (sum, result) => sum + (result.participantCount || 0), 0
  );

  const totalThemes = successfulResults.reduce(
    (sum, result) => sum + (result.themes ? result.themes.length : 0), 0
  );

  const completionRate = allResults.length > 0 
    ? `${((successfulResults.length / allResults.length) * 100).toFixed(1)}%`
    : "0.0%";

  return {
    generatedBy: "Thematic Analysis Pipeline v1.0",
    generatedAt: new Date().toISOString(),
    dataQuality: getDataQualityLabel(successfulResults.length / allResults.length),
    completionRate,
    totalParticipants,
    totalThemes,
    averageThemesPerQuestion: successfulResults.length > 0 
      ? (totalThemes / successfulResults.length).toFixed(1)
      : "0.0"
  };
}

/**
 * Get human-readable data quality label
 * @param {number} completionRatio - Ratio of successful to total analyses
 * @returns {string} - Quality label
 */
function getDataQualityLabel(completionRatio) {
  if (completionRatio >= 0.9) return "Excellent";
  if (completionRatio >= 0.8) return "Good";
  if (completionRatio >= 0.7) return "Acceptable";
  if (completionRatio >= 0.5) return "Fair";
  return "Limited";
}
