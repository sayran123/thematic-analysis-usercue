/**
 * Phase 1 Integration Tests for Milestone 1.4
 * Tests the complete data processing pipeline: Excel → Extraction → Parsing → Ready for LLM
 */

import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';

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
 * Test complete Phase 1 pipeline with real data
 */
async function testCompletePhase1Pipeline() {
  // Step 1: Extract data from Excel
  const extractionResult = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  
  assert(!extractionResult.error, `Excel extraction failed: ${extractionResult.error}`);
  assert(extractionResult.data, 'No data returned from extraction');
  
  const extractedData = extractionResult.data;
  
  // Step 2: Parse and clean responses
  const parsingResult = parseAndCleanResponses(extractedData);
  
  assert(!parsingResult.error, `Response parsing failed: ${parsingResult.error}`);
  assert(parsingResult.data, 'No data returned from parsing');
  
  const parsedData = parsingResult.data;
  
  // Validate complete pipeline structure
  assert(parsedData.projectBackground, 'Missing project background');
  assert(parsedData.questions && Array.isArray(parsedData.questions), 'Questions should be an array');
  assert(parsedData.responsesByQuestion && typeof parsedData.responsesByQuestion === 'object', 'ResponsesByQuestion should be an object');
  assert(parsedData.questionStats && typeof parsedData.questionStats === 'object', 'Question stats should be an object');
  assert(parsedData.responseStatistics && typeof parsedData.responseStatistics === 'object', 'Response statistics should be an object');
  
  // Log pipeline results for manual inspection
  console.log(`   📊 Pipeline processed ${parsedData.metadata.totalQuestions} questions`);
  console.log(`   📊 Cleaned ${parsedData.metadata.cleanedResponses} responses`);
  console.log(`   📊 Rejected ${parsedData.metadata.rejectedResponses} invalid responses`);
  
  return parsedData;
}

/**
 * Test response grouping by question
 */
async function testResponseGrouping() {
  // Get parsed data
  const extractionResult = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  const parsingResult = parseAndCleanResponses(extractionResult.data);
  
  assert(!parsingResult.error, `Failed to get parsed data: ${parsingResult.error}`);
  
  const parsedData = parsingResult.data;
  const responsesByQuestion = parsedData.responsesByQuestion;
  
  // Validate grouping structure
  assert(typeof responsesByQuestion === 'object', 'ResponsesByQuestion should be an object');
  
  // Check that all questions have responses
  for (const question of parsedData.questions) {
    const responses = responsesByQuestion[question.questionId];
    assert(Array.isArray(responses), `Responses for ${question.questionId} should be an array`);
    assert(responses.length > 0, `Should have responses for question ${question.questionId}`);
    
    // Validate response structure for Phase 2
    const firstResponse = responses[0];
    assert(firstResponse.participantId, 'Response should have participantId');
    assert(firstResponse.questionId === question.questionId, 'Response questionId should match');
    assert(firstResponse.cleanResponse, 'Response should have cleanResponse');
    assert(typeof firstResponse.responseLength === 'number', 'Response should have numeric length');
    assert(typeof firstResponse.hasConversationFormat === 'boolean', 'Response should indicate conversation format');
  }
  
  console.log(`   📋 Successfully grouped responses for ${Object.keys(responsesByQuestion).length} questions`);
}

/**
 * Test response statistics calculation
 */
async function testResponseStatistics() {
  const extractionResult = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  const parsingResult = parseAndCleanResponses(extractionResult.data);
  
  assert(!parsingResult.error, `Failed to get parsed data: ${parsingResult.error}`);
  
  const stats = parsingResult.data.responseStatistics;
  
  // Validate statistics structure
  assert(typeof stats.totalResponses === 'number' && stats.totalResponses > 0, 'Should have positive total responses');
  assert(typeof stats.averageResponseLength === 'number' && stats.averageResponseLength > 0, 'Should have positive average length');
  assert(typeof stats.conversationFormatPercentage === 'number', 'Should have conversation format percentage');
  assert(typeof stats.responseDistribution === 'object', 'Should have response distribution');
  
  // Log statistics for manual review
  console.log(`   📊 Total responses: ${stats.totalResponses}`);
  console.log(`   📊 Average length: ${stats.averageResponseLength} characters`);
  console.log(`   📊 Conversation format: ${stats.conversationFormatPercentage}%`);
  console.log(`   📊 Length range: ${stats.minLength} - ${stats.maxLength} characters`);
  
  // Validate that most responses have conversation format (should be high percentage)
  assert(stats.conversationFormatPercentage > 80, `Expected high conversation format percentage, got ${stats.conversationFormatPercentage}%`);
}

/**
 * Test data structure for Phase 2 readiness
 */
async function testPhase2Readiness() {
  const extractionResult = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
  const parsingResult = parseAndCleanResponses(extractionResult.data);
  
  assert(!parsingResult.error, `Failed to get parsed data: ${parsingResult.error}`);
  
  const parsedData = parsingResult.data;
  
  // Validate Phase 2 requirements based on architecture
  assert(parsedData.projectBackground && parsedData.projectBackground.length > 10, 'Project background should be substantial');
  assert(parsedData.responsesByQuestion, 'Should have responses grouped by question for parallel processing');
  
  // Check that we have the expected questions from real data
  const questionIds = parsedData.questions.map(q => q.questionId);
  console.log(`   📋 Questions ready for LLM analysis: ${questionIds.join(', ')}`);
  
  // Verify each question has adequate responses for analysis
  for (const questionId of questionIds) {
    const responses = parsedData.responsesByQuestion[questionId];
    assert(responses.length >= 10, `Question ${questionId} should have at least 10 responses for meaningful analysis`);
    
    // Sample response format check
    const sampleResponse = responses[0];
    assert(sampleResponse.cleanResponse.length > 20, 'Sample responses should have substantial content');
  }
  
  console.log(`   ✅ All questions have adequate response data for LLM analysis`);
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling() {
  // Test with invalid data
  const invalidResult = parseAndCleanResponses(null);
  assert(invalidResult.error, 'Should return error for null input');
  
  const emptyResult = parseAndCleanResponses({});
  assert(emptyResult.error, 'Should return error for empty object');
  
  // Test with malformed data
  const malformedData = {
    participantResponses: [
      { invalidField: 'test' } // Missing required fields
    ]
  };
  
  const malformedResult = parseAndCleanResponses(malformedData);
  assert(malformedResult.data, 'Should handle malformed responses gracefully');
  assert(malformedResult.data.metadata.rejectedResponses > 0, 'Should reject invalid responses');
  
  console.log(`   ✅ Error handling works correctly`);
}

/**
 * Run all integration tests
 */
async function runAllTests() {
  console.log('\n🧪 Running Phase 1 Integration Tests...\n');
  
  const tests = [
    ['Complete Phase 1 Pipeline', testCompletePhase1Pipeline],
    ['Response Grouping', testResponseGrouping],
    ['Response Statistics', testResponseStatistics],
    ['Phase 2 Readiness', testPhase2Readiness],
    ['Error Handling', testErrorHandling]
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [name, testFn] of tests) {
    if (await runTest(name, testFn)) {
      passed++;
    }
  }
  
  console.log(`\n📊 Integration Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All Phase 1 integration tests passed!');
    console.log('🎉 Data pipeline is ready for Phase 2 LLM integration!');
    console.log('🚀 Can now proceed with single question theme generation and analysis.');
  } else {
    console.log('❌ Some integration tests failed. Please fix issues before proceeding to Phase 2.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };
