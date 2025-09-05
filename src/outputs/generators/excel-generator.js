/**
 * Classification inspection files
 * 
 * This module generates Excel files for inspecting classification results.
 * Creates one Excel file per question showing participant responses and their theme assignments.
 */

import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { ensureDirectoryExists } from '../../utils/helpers/file-utils.js';

/**
 * Generate classification Excel files for all questions with enhanced multi-question support
 * @param {Array} analyses - Array of completed question analyses (may include errors)
 * @param {Object} originalData - Original response data for reference
 * @param {Object} options - Generation options
 * @returns {Promise<Array|{error: string}>} Array of generated file paths or error
 */
export async function generateClassificationFiles(analyses, originalData, options = {}) {
  const outputDir = options.outputDir || 'outputs';
  
  try {
    // Enhanced validation for multi-question support
    const validation = validateDataForExcelEnhanced(analyses, originalData);
    if (!validation.passed && validation.errors.length > 0) {
      return { error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    // Log validation warnings if any
    if (validation.warnings.length > 0) {
      console.log('⚠️ Excel Generation Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Ensure output directory exists
    const dirResult = await ensureDirectoryExists(outputDir);
    if (dirResult.error) {
      return { error: `Failed to create output directory: ${dirResult.error}` };
    }

    const generatedFiles = [];
    const skippedQuestions = [];
    const partiallyGeneratedFiles = [];
    
    for (const analysis of analyses) {
      // Handle complete failures
      if (analysis.error) {
        skippedQuestions.push({
          questionId: analysis.questionId || 'unknown',
          reason: 'Complete analysis failure',
          error: analysis.error
        });
        continue;
      }

      // Handle questions without classifications or with partial failures
      if (!analysis.classifications || Object.keys(analysis.classifications).length === 0) {
        skippedQuestions.push({
          questionId: analysis.questionId,
          reason: 'No classifications available',
          note: 'Classification step may have failed'
        });
        continue;
      }
      
      const result = await generateSingleClassificationFileEnhanced(analysis, originalData, outputDir);
      if (result.error) {
        skippedQuestions.push({
          questionId: analysis.questionId,
          reason: 'Excel generation failed',
          error: result.error
        });
        continue;
      }
      
      if (result.hasPartialData) {
        partiallyGeneratedFiles.push(result.filePath);
      }
      
      generatedFiles.push(result.filePath);
    }
    
    // Log comprehensive summary
    console.log(`✅ Generated ${generatedFiles.length} Excel classification files`);
    if (skippedQuestions.length > 0) {
      console.log(`⚠️ Skipped ${skippedQuestions.length} questions:`);
      skippedQuestions.forEach(skip => {
        console.log(`  - ${skip.questionId}: ${skip.reason}`);
      });
    }
    if (partiallyGeneratedFiles.length > 0) {
      console.log(`ℹ️ ${partiallyGeneratedFiles.length} files generated with partial data`);
    }
    
    return generatedFiles;
    
  } catch (error) {
    return { error: `Failed to generate classification files: ${error.message}` };
  }
}

/**
 * Generate classification Excel file for a single question
 * @param {Object} analysis - Single question analysis result
 * @param {Object} originalData - Original response data
 * @param {string} outputDir - Output directory path
 * @returns {Promise<string|{error: string}>} Generated file path or error
 */
async function generateSingleClassificationFile(analysis, originalData, outputDir) {
  const fileName = `${analysis.questionId}_classifications.xlsx`;
  const filePath = path.join(outputDir, fileName);
  
  try {
    const classificationData = {
      questionId: analysis.questionId,
      derivedQuestion: analysis.derivedQuestion || 'Research Question',
      headers: ['ParticipantID', 'Response', 'AssignedTheme', 'Confidence', 'ResponseLength'],
      rows: prepareClassificationRows(analysis, originalData),
      summary: generateClassificationSummary(analysis),
      themes: analysis.themes || []
    };
    
    // Create Excel file
    const result = await writeExcelFile(filePath, classificationData);
    if (result.error) {
      return { error: result.error };
    }
    
    console.log(`📊 Generated classification file: ${fileName}`);
    return filePath;
    
  } catch (error) {
    return { error: `Failed to generate file for ${analysis.questionId}: ${error.message}` };
  }
}

/**
 * Prepare classification data rows for Excel
 * @param {Object} analysis - Question analysis result
 * @param {Object} originalData - Original response data
 * @returns {Array} Array of data rows
 */
function prepareClassificationRows(analysis, originalData) {
  const rows = [];
  
  try {
    if (!analysis.classifications || !originalData.responsesByQuestion) {
      console.warn(`Missing data for ${analysis.questionId}: classifications or responsesByQuestion`);
      return rows;
    }
    
    const questionResponses = originalData.responsesByQuestion[analysis.questionId] || [];
    
    // Handle both object format {participantId: theme} and array format
    const classifications = typeof analysis.classifications === 'object' 
      ? Object.entries(analysis.classifications)
      : analysis.classifications.map(c => [c.participantId, c.theme]);
    
    classifications.forEach(([participantId, themeName]) => {
      const originalResponse = questionResponses.find(r => r.participantId === participantId);
      
      if (originalResponse) {
        // Extract user response only from conversation format
        const userResponse = extractUserResponseFromConversation(originalResponse.cleanResponse);
        
        rows.push([
          participantId,
          userResponse,
          themeName,
          getConfidenceScore(analysis, participantId, themeName),
          userResponse.length
        ]);
      } else {
        // Include classification even if original response not found (for debugging)
        rows.push([
          participantId,
          '[Response not found in original data]',
          themeName,
          'N/A',
          0
        ]);
      }
    });
    
    // Sort by participant ID for consistent ordering
    rows.sort((a, b) => a[0].localeCompare(b[0]));
    
    return rows;
  } catch (error) {
    console.error(`Error preparing classification rows for ${analysis.questionId}:`, error);
    return rows;
  }
}

/**
 * Generate classification summary statistics
 * @param {Object} analysis - Question analysis result
 * @returns {Object} Summary statistics
 */
function generateClassificationSummary(analysis) {
  const summary = {
    totalParticipants: analysis.participantCount || 0,
    totalThemes: analysis.themes ? analysis.themes.length : 0,
    themeDistribution: {},
    participationRate: '100%',
    qualityMetrics: {
      averageResponseLength: 0,
      quotesExtracted: 0,
      quotesVerified: 0
    }
  };
  
  try {
    if (analysis.classifications) {
      // Calculate theme distribution
      const classifications = typeof analysis.classifications === 'object' 
        ? Object.values(analysis.classifications)
        : analysis.classifications.map(c => c.theme);
      
      classifications.forEach(theme => {
        summary.themeDistribution[theme] = (summary.themeDistribution[theme] || 0) + 1;
      });
      
      // Calculate percentages
      const total = classifications.length;
      if (total > 0) {
        Object.keys(summary.themeDistribution).forEach(theme => {
          const count = summary.themeDistribution[theme];
          const percentage = ((count / total) * 100).toFixed(1);
          summary.themeDistribution[theme] = `${count} (${percentage}%)`;
        });
      }
    }
    
    // Add quality metrics from themes
    if (analysis.themes) {
      let totalQuotes = 0;
      let totalVerified = 0;
      
      analysis.themes.forEach(theme => {
        if (theme.supportingQuotes) {
          totalQuotes += theme.supportingQuotes.length;
          totalVerified += theme.supportingQuotes.filter(q => q.verified).length;
        }
      });
      
      summary.qualityMetrics.quotesExtracted = totalQuotes;
      summary.qualityMetrics.quotesVerified = totalVerified;
      summary.qualityMetrics.verificationRate = totalQuotes > 0 
        ? `${totalVerified}/${totalQuotes} (${((totalVerified / totalQuotes) * 100).toFixed(1)}%)`
        : 'N/A';
    }
    
    return summary;
  } catch (error) {
    console.error(`Error generating summary for ${analysis.questionId}:`, error);
    return summary;
  }
}

/**
 * Create Excel workbook with classification data
 * @param {string} filePath - Output file path
 * @param {Object} classificationData - Data to write to Excel
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function writeExcelFile(filePath, classificationData) {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Thematic Analysis Pipeline';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add classification data worksheet
    const dataSheet = workbook.addWorksheet('Classification Data');
    await createClassificationSheet(dataSheet, classificationData);
    
    // Add summary statistics worksheet
    const summarySheet = workbook.addWorksheet('Summary Statistics');
    await createSummarySheet(summarySheet, classificationData);
    
    // Add themes overview worksheet
    const themesSheet = workbook.addWorksheet('Themes Overview');
    await createThemesSheet(themesSheet, classificationData);
    
    // Save workbook to file
    await workbook.xlsx.writeFile(filePath);
    
    return { success: true };
    
  } catch (error) {
    return { error: `Failed to write Excel file: ${error.message}` };
  }
}

/**
 * Create classification data worksheet
 * @param {Object} worksheet - ExcelJS worksheet object
 * @param {Object} classificationData - Classification data
 * @returns {Promise<void>}
 */
async function createClassificationSheet(worksheet, classificationData) {
  // Add title and question info
  worksheet.addRow([`Classification Results: ${classificationData.questionId}`]);
  worksheet.addRow([`Research Question: ${classificationData.derivedQuestion}`]);
  worksheet.addRow(['']);
  
  // Add headers
  const headerRow = worksheet.addRow(classificationData.headers);
  
  // Style header row
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add data rows
  classificationData.rows.forEach(row => {
    const dataRow = worksheet.addRow(row);
    
    // Style data cells
    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Special formatting for theme column (column 3)
      if (colNumber === 3) {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
      
      // Wrap text for response column (column 2)
      if (colNumber === 2) {
        cell.alignment = { wrapText: true, vertical: 'top' };
      }
    });
  });
  
  // Set column widths
  worksheet.getColumn(1).width = 12; // ParticipantID
  worksheet.getColumn(2).width = 60; // Response
  worksheet.getColumn(3).width = 25; // AssignedTheme
  worksheet.getColumn(4).width = 12; // Confidence
  worksheet.getColumn(5).width = 15; // ResponseLength
  
  // Add auto filter
  worksheet.autoFilter = `A4:E${worksheet.rowCount}`;
}

/**
 * Create summary statistics worksheet
 * @param {Object} worksheet - ExcelJS worksheet object
 * @param {Object} classificationData - Classification data
 * @returns {Promise<void>}
 */
async function createSummarySheet(worksheet, classificationData) {
  const summary = classificationData.summary;
  
  // Add title
  worksheet.addRow([`Summary Statistics: ${classificationData.questionId}`]);
  worksheet.addRow(['']);
  
  // Overview section
  worksheet.addRow(['Overview']);
  worksheet.addRow(['Total Participants', summary.totalParticipants]);
  worksheet.addRow(['Total Themes', summary.totalThemes]);
  worksheet.addRow(['Participation Rate', summary.participationRate]);
  worksheet.addRow(['']);
  
  // Theme distribution section
  worksheet.addRow(['Theme Distribution']);
  Object.entries(summary.themeDistribution).forEach(([theme, count]) => {
    worksheet.addRow([theme, count]);
  });
  worksheet.addRow(['']);
  
  // Quality metrics section
  worksheet.addRow(['Quality Metrics']);
  Object.entries(summary.qualityMetrics).forEach(([metric, value]) => {
    const displayMetric = metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    worksheet.addRow([displayMetric, value]);
  });
  
  // Format summary sheet
  formatSummaryWorksheet(worksheet);
}

/**
 * Create themes overview worksheet
 * @param {Object} worksheet - ExcelJS worksheet object
 * @param {Object} classificationData - Classification data
 * @returns {Promise<void>}
 */
async function createThemesSheet(worksheet, classificationData) {
  if (!classificationData.themes || classificationData.themes.length === 0) {
    worksheet.addRow(['No themes data available']);
    return;
  }
  
  // Add title
  worksheet.addRow([`Themes Overview: ${classificationData.questionId}`]);
  worksheet.addRow(['']);
  
  // Add headers
  const headerRow = worksheet.addRow(['Theme', 'Description', 'Participants', 'Supporting Quotes']);
  
  // Style header row
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  
  // Add theme data
  classificationData.themes.forEach(theme => {
    const quotesText = theme.supportingQuotes 
      ? theme.supportingQuotes.map(q => `"${q.quote}" (${q.participantId})`).join('\n')
      : 'No quotes available';
    
    const row = worksheet.addRow([
      theme.title,
      theme.description,
      theme.participantCount || theme.estimatedParticipants || 0,
      quotesText
    ]);
    
    // Format cells
    row.eachCell(cell => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });
  
  // Set column widths
  worksheet.getColumn(1).width = 25; // Theme
  worksheet.getColumn(2).width = 40; // Description  
  worksheet.getColumn(3).width = 12; // Participants
  worksheet.getColumn(4).width = 50; // Supporting Quotes
}

/**
 * Format summary worksheet
 * @param {Object} worksheet - ExcelJS worksheet object
 */
function formatSummaryWorksheet(worksheet) {
  // Style section headers
  worksheet.getRow(3).font = { bold: true, size: 12 };
  worksheet.getRow(8).font = { bold: true, size: 12 };
  
  // Find quality metrics row
  let qualityMetricsRow = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (row.getCell(1).value === 'Quality Metrics') {
      qualityMetricsRow = rowNumber;
    }
  });
  
  if (qualityMetricsRow > 0) {
    worksheet.getRow(qualityMetricsRow).font = { bold: true, size: 12 };
  }
  
  // Set column widths
  worksheet.getColumn(1).width = 25;
  worksheet.getColumn(2).width = 15;
}

/**
 * Extract user response from conversation format
 * @param {string} conversationText - Full conversation text
 * @returns {string} User response only
 */
function extractUserResponseFromConversation(conversationText) {
  try {
    if (!conversationText || typeof conversationText !== 'string') {
      return '[Invalid conversation format]';
    }
    
    // Split by conversation markers and extract user parts
    const parts = conversationText.split(/(?:assistant:|user:)/i);
    const userResponses = [];
    
    // Check each part to see if it follows a 'user:' marker
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i > 0) {
        // Check the previous delimiter to see if this is a user response
        const beforePart = conversationText.substring(0, conversationText.indexOf(part));
        if (beforePart.toLowerCase().includes('user:')) {
          userResponses.push(part.trim());
        }
      }
    }
    
    // Join all user responses
    const userResponse = userResponses.join(' ').trim();
    return userResponse || '[No user response found]';
    
  } catch (error) {
    return `[Error extracting response: ${error.message}]`;
  }
}

/**
 * Get confidence score for classification
 * @param {Object} analysis - Analysis object
 * @param {string} participantId - Participant ID
 * @param {string} themeName - Theme name
 * @returns {string} Confidence score or N/A
 */
function getConfidenceScore(analysis, participantId, themeName) {
  // TODO: If confidence scores are added to classification results in the future,
  // they can be extracted here. For now, return N/A.
  return 'N/A';
}

/**
 * Validate classification data before Excel generation
 * @param {Array} analyses - Analysis results to validate
 * @param {Object} originalData - Original response data
 * @returns {Object} Validation result
 */
export function validateDataForExcel(analyses, originalData) {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(analyses)) {
    errors.push('Analyses must be an array');
    return { passed: false, errors, warnings };
  }
  
  analyses.forEach((analysis, index) => {
    if (!analysis.questionId) {
      errors.push(`Analysis ${index} missing questionId`);
    }
    if (!analysis.classifications) {
      warnings.push(`Analysis ${index} missing classifications - will skip Excel generation for this question`);
    }
    if (!analysis.themes || analysis.themes.length === 0) {
      warnings.push(`Analysis ${index} has no themes - Excel file may be incomplete`);
    }
  });
  
  if (!originalData || !originalData.responsesByQuestion) {
    errors.push('Original response data is required for Excel generation');
  }
  
  // Only fail if there are critical errors, not missing classifications
  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Enhanced validation for multi-question support with partial failures
 * @param {Array} analyses - Analysis results to validate (may include errors)
 * @param {Object} originalData - Original response data
 * @returns {Object} Enhanced validation result
 */
function validateDataForExcelEnhanced(analyses, originalData) {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(analyses)) {
    errors.push('Analyses must be an array');
    return { passed: false, errors, warnings };
  }
  
  if (!originalData || !originalData.responsesByQuestion) {
    errors.push('Original response data is required for Excel generation');
    return { passed: false, errors, warnings };
  }
  
  let validAnalysesCount = 0;
  let errorAnalysesCount = 0;
  let partialFailuresCount = 0;
  
  analyses.forEach((analysis, index) => {
    if (analysis.error) {
      errorAnalysesCount++;
      warnings.push(`Analysis ${index + 1} (${analysis.questionId || 'unknown'}) has complete failure: ${analysis.error}`);
    } else if (!analysis.classifications || Object.keys(analysis.classifications).length === 0) {
      partialFailuresCount++;
      warnings.push(`Analysis ${index + 1} (${analysis.questionId || 'unknown'}) missing classifications - will be skipped`);
    } else {
      validAnalysesCount++;
      
      // Validate structure for analyses that will be processed
      if (!analysis.questionId) {
        warnings.push(`Analysis ${index + 1} missing questionId - will use fallback`);
      }
      if (!analysis.themes || analysis.themes.length === 0) {
        warnings.push(`Analysis ${index + 1} (${analysis.questionId}) missing themes - Excel will show basic classification only`);
      }
    }
  });
  
  // Check if we have at least one valid analysis
  if (validAnalysesCount === 0) {
    if (analyses.length > 0) {
      warnings.push('No valid analyses available for Excel generation - all questions failed or have no classifications');
    } else {
      errors.push('No analyses provided');
    }
  } else {
    warnings.push(`Excel generation will process ${validAnalysesCount} of ${analyses.length} questions`);
    if (errorAnalysesCount > 0) {
      warnings.push(`${errorAnalysesCount} questions failed completely and will be skipped`);
    }
    if (partialFailuresCount > 0) {
      warnings.push(`${partialFailuresCount} questions have no classifications and will be skipped`);
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    statistics: {
      totalAnalyses: analyses.length,
      validAnalyses: validAnalysesCount,
      errorAnalyses: errorAnalysesCount,
      partialFailures: partialFailuresCount
    }
  };
}

/**
 * Enhanced single file generation with partial failure support
 * @param {Object} analysis - Single question analysis result
 * @param {Object} originalData - Original response data
 * @param {string} outputDir - Output directory path
 * @returns {Promise<Object>} Generation result with metadata
 */
async function generateSingleClassificationFileEnhanced(analysis, originalData, outputDir) {
  try {
    // Call the existing generation function
    const result = await generateSingleClassificationFile(analysis, originalData, outputDir);
    
    if (result.error) {
      return { error: result.error };
    }
    
    // Check for partial data indicators
    const hasPartialData = checkForPartialData(analysis);
    
    return {
      filePath: result,
      questionId: analysis.questionId,
      hasPartialData,
      classificationCount: analysis.classifications ? Object.keys(analysis.classifications).length : 0,
      themeCount: analysis.themes ? analysis.themes.length : 0
    };
    
  } catch (error) {
    return { error: `Enhanced generation failed: ${error.message}` };
  }
}

/**
 * Check if analysis has partial data that affects Excel quality
 * @param {Object} analysis - Analysis to check
 * @returns {boolean} True if partial data detected
 */
function checkForPartialData(analysis) {
  // Check for missing or incomplete data
  if (!analysis.themes || analysis.themes.length === 0) {
    return true;
  }
  
  if (!analysis.summary) {
    return true;
  }
  
  if (analysis.partialFailures && analysis.partialFailures.length > 0) {
    return true;
  }
  
  // Check for themes without quotes (might indicate quote extraction failure)
  if (analysis.themes.some(theme => !theme.supportingQuotes || theme.supportingQuotes.length === 0)) {
    return true;
  }
  
  return false;
}
