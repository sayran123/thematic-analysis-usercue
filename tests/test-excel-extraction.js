/**
 * Excel Extraction Tests for Milestone 1.3
 * Tests the complete extraction pipeline with real data from inputs/ folder
 */

import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { isValidResponse, findDuplicateResponses } from '../src/data/extractors/validator.js';
import path from 'path';

/**
 * Simple test runner - follows pattern from previous tests
 */
function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`✅ ${testName}`);
    return true;
  } catch (error) {
    console.error(`❌ ${testName}: ${error.message}`);
    return false;
  }
}

/**
 * Assert function for test validation
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Test Excel extraction with real data
 */
async function testRealDataExtraction() {
  const excelPath = 'inputs/data.xlsx';
  const backgroundPath = 'inputs/project_background.txt';
  
  // Test file extraction
  const result = await extractDataFromExcel(excelPath, backgroundPath);
  
  // Check for errors
  assert(!result.error, `Extraction failed: ${result.error}`);
  assert(result.data, 'No data returned from extraction');
  
  const data = result.data;
  
  // Validate data structure
  assert(data.projectBackground, 'Missing project background');
  assert(data.questions && Array.isArray(data.questions), 'Questions should be an array');
  assert(data.participantResponses && Array.isArray(data.participantResponses), 'Participant responses should be an array');
  assert(data.questionStats && typeof data.questionStats === 'object', 'Question stats should be an object');
  assert(data.metadata && typeof data.metadata === 'object', 'Metadata should be an object');
  
  // Check that we found questions
  assert(data.questions.length > 0, 'Should detect at least one question');
  
  // Check that we found responses
  assert(data.participantResponses.length > 0, 'Should extract at least one response');
  
  // Validate metadata consistency
  assert(data.metadata.totalQuestions === data.questions.length, 'Question count mismatch in metadata');
  assert(data.metadata.totalResponses === data.participantResponses.length, 'Response count mismatch in metadata');
  assert(data.metadata.totalParticipants > 0, 'Should have at least one participant');
  
  // Log some basic stats for manual inspection
  console.log(`   📊 Extracted ${data.questions.length} questions`);
  console.log(`   📊 Found ${data.participantResponses.length} responses`);
  console.log(`   📊 From ${data.metadata.totalParticipants} participants`);
  
  // Check question structure
  const firstQuestion = data.questions[0];
  assert(firstQuestion.columnIndex !== undefined, 'Question should have columnIndex');
  assert(firstQuestion.questionId, 'Question should have questionId');
  assert(firstQuestion.headerText, 'Question should have headerText');
  
  // Check response structure
  const firstResponse = data.participantResponses[0];
  assert(firstResponse.participantId, 'Response should have participantId');
  assert(firstResponse.questionId, 'Response should have questionId');
  assert(firstResponse.response, 'Response should have response content');
  
  // Validate that questionIds match between questions and responses
  const questionIds = new Set(data.questions.map(q => q.questionId));
  const responseQuestionIds = new Set(data.participantResponses.map(r => r.questionId));
  
  for (const responseQId of responseQuestionIds) {
    assert(questionIds.has(responseQId), `Response question ID ${responseQId} not found in questions`);
  }
  
  return data; // Return for further analysis
}

/**
 * Test response validation
 */
async function testResponseValidation() {
  // Test with real data
  const result = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  assert(!result.error, `Failed to extract data for validation test: ${result.error}`);
  
  const responses = result.data.participantResponses;
  
  // Test first response validation
  if (responses.length > 0) {
    const validationResult = isValidResponse(responses[0]);
    assert(!validationResult.error, `First response should be valid: ${validationResult.error}`);
  }
  
  // Test invalid response
  const invalidResponse = { participantId: '', questionId: 'test', response: '' };
  const invalidResult = isValidResponse(invalidResponse);
  assert(invalidResult.error, 'Invalid response should return error');
  
  // Test duplicate detection
  const duplicates = findDuplicateResponses(responses);
  console.log(`   📊 Found ${duplicates.length} duplicate responses`);
}

/**
 * Test question detection logic
 */
async function testQuestionDetection() {
  const result = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  assert(!result.error, `Failed to extract data: ${result.error}`);
  
  const data = result.data;
  
  // Log detected questions for manual verification
  console.log('   📋 Detected questions:');
  for (const question of data.questions) {
    console.log(`     - Column ${question.columnIndex}: "${question.questionId}"`);
  }
  
  // Verify question stats
  for (const question of data.questions) {
    const stats = data.questionStats[question.questionId];
    assert(stats, `Missing stats for question: ${question.questionId}`);
    assert(stats.totalResponses >= 0, 'Total responses should be non-negative');
    assert(stats.participantCount >= 0, 'Participant count should be non-negative');
    
    // Count actual responses for this question
    const actualCount = data.participantResponses.filter(r => r.questionId === question.questionId).length;
    assert(stats.totalResponses === actualCount, `Response count mismatch for ${question.questionId}`);
  }
}

/**
 * Test data quality and format
 */
async function testDataQuality() {
  const result = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  assert(!result.error, `Failed to extract data: ${result.error}`);
  
  const data = result.data;
  
  // Check project background content
  assert(data.projectBackground.length > 10, 'Project background should have substantial content');
  assert(data.projectBackground.includes('privacy'), 'Project background should mention privacy (based on the context)');
  
  // Sample a few responses to check format
  const sampleSize = Math.min(5, data.participantResponses.length);
  for (let i = 0; i < sampleSize; i++) {
    const response = data.participantResponses[i];
    
    // Check participant ID format
    assert(response.participantId.length > 0, 'Participant ID should not be empty');
    
    // Check response content
    assert(response.response.length > 0, 'Response content should not be empty');
    
    // Log sample for manual inspection
    if (i === 0) {
      console.log(`   📝 Sample response: "${response.response.substring(0, 100)}..."`);
      console.log(`   👤 Sample participant: "${response.participantId}"`);
      console.log(`   ❓ Sample question: "${response.questionId}"`);
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🧪 Running Excel Extraction Tests with Real Data...\n');
  
  const tests = [
    ['Real Data Extraction', testRealDataExtraction],
    ['Response Validation', testResponseValidation],
    ['Question Detection', testQuestionDetection],
    ['Data Quality Check', testDataQuality]
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [name, testFn] of tests) {
    if (await runTest(name, testFn)) {
      passed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All Excel extraction tests passed! Milestone 1.3 is ready for response parsing.');
    console.log('🎉 Successfully extracted and validated real data from inputs/ folder!');
  } else {
    console.log('❌ Some tests failed. Please fix issues before proceeding.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };
