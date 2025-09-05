/**
 * TODO: Dynamic Excel parsing
 * 
 * This module extracts interview data from Excel files with dynamic column detection.
 * Parses participant responses and identifies questions from column headers.
 * Performs cell-by-cell content checking to calculate accurate response statistics.
 */

import ExcelJS from 'exceljs';
import { readTextFile } from '../../utils/helpers/file-utils.js';
import { validateExtractedData } from '../../utils/helpers/validation.js';

/**
 * Extract data from Excel file with dynamic column detection
 * @param {string} excelFilePath - Path to the Excel file
 * @param {string} backgroundFilePath - Path to project background text file
 * @returns {Promise<{data?: Object, error?: string}>} Extracted data structure or error
 */
export async function extractDataFromExcel(excelFilePath, backgroundFilePath) {
  try {
    // Read project background from file
    const backgroundResult = await readTextFile(backgroundFilePath);
    if (backgroundResult.error) {
      return { error: `Failed to read background file: ${backgroundResult.error}` };
    }
    const projectBackground = backgroundResult.content.trim();
    
    // Parse Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    
    // Get first worksheet
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return { error: 'No worksheet found in Excel file' };
    }
    
    // Convert worksheet to array of arrays
    const rawData = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell((cell, colNumber) => {
        // Handle different cell value types
        let cellValue = '';
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object') {
            // Handle different object types
            if (cell.value.text) {
              // Rich text object
              cellValue = cell.value.text;
            } else if (cell.value.richText) {
              // Rich text array
              cellValue = cell.value.richText.map(rt => rt.text).join('');
            } else if (cell.value.formula) {
              // Formula object
              cellValue = cell.value.result || '';
            } else {
              // Try to extract meaningful content or use raw text
              cellValue = cell.text || JSON.stringify(cell.value);
            }
          } else {
            cellValue = String(cell.value);
          }
        }
        rowData[colNumber - 1] = cellValue.trim();
      });
      rawData.push(rowData);
    });
    
    if (rawData.length === 0) {
      return { error: 'Excel file is empty' };
    }
    
    // Extract headers from first row
    const headers = rawData[0];
    
    // Detect questions from column headers (columns 1+ after participant ID)
    const questions = detectQuestions(headers);
    
    // Extract participant responses from data rows
    const participantResponses = extractParticipantResponses(rawData.slice(1), questions);
    
    // Calculate statistics per question
    const questionStats = calculateQuestionStats(participantResponses, questions);
    
    // Calculate metadata
    const uniqueParticipants = new Set(participantResponses.map(r => r.participantId));
    const metadata = {
      totalParticipants: uniqueParticipants.size,
      totalQuestions: questions.length,
      totalResponses: participantResponses.length
    };
    
    const extractedData = {
      projectBackground,
      questions,
      participantResponses,
      questionStats,
      metadata
    };
    
    // Validate the extracted data
    const validationResult = validateExtractedData(extractedData);
    if (validationResult.error) {
      return { error: `Data validation failed: ${validationResult.error}` };
    }
    
    return { data: extractedData, warnings: validationResult.warnings };
    
  } catch (error) {
    return { error: `Excel extraction failed: ${error.message}` };
  }
}

/**
 * Detect questions from Excel column headers
 * @param {Array} headers - Array of column headers
 * @returns {Array<Object>} Question objects with columnIndex, questionId, headerText
 */
export function detectQuestions(headers) {
  const questions = [];
  
  // Extract questions from columns 1+ (everything after participant ID column)
  for (let columnIndex = 1; columnIndex < headers.length; columnIndex++) {
    const headerText = headers[columnIndex];
    
    // Check if header exists and is not empty
    if (headerText && headerText.trim() !== '') {
      questions.push({
        columnIndex: columnIndex,
        questionId: headerText.trim(),
        headerText: headerText.trim()
      });
    }
  }
  
  return questions;
}

/**
 * Extract participant responses from Excel rows
 * @param {Array} dataRows - Excel data rows
 * @param {Array} questions - Detected questions
 * @returns {Array<Object>} Participant responses
 */
export function extractParticipantResponses(dataRows, questions) {
  const participantResponses = [];
  
  for (const row of dataRows) {
    const participantId = row[0]; // Column A always contains participant ID
    
    // Check if participant ID exists and is not empty
    if (participantId && participantId.trim() !== '') {
      for (const question of questions) {
        const cellValue = row[question.columnIndex];
        
        // Check if cell has any content
        if (cellValue && cellValue.trim() !== '') {
          participantResponses.push({
            participantId: participantId.trim(),
            questionId: question.questionId,
            response: cellValue.trim() // Raw conversation format preserved
          });
        }
      }
    }
  }
  
  return participantResponses;
}

/**
 * Calculate response statistics per question
 * @param {Array} participantResponses - Array of participant responses
 * @param {Array} questions - Array of questions
 * @returns {Object} Statistics object
 */
export function calculateQuestionStats(participantResponses, questions) {
  const questionStats = {};
  
  for (const question of questions) {
    const responseCount = participantResponses.filter(r => r.questionId === question.questionId).length;
    questionStats[question.questionId] = {
      totalResponses: responseCount,
      participantCount: responseCount // Each response = 1 participant for this question
    };
  }
  
  return questionStats;
}
