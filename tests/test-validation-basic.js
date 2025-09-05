/**
 * Basic validation tests for Milestone 1.2
 * Tests the essential validation functions needed for Excel extraction
 */

import { 
  isRequired, 
  isNonEmptyString, 
  isNonEmptyArray, 
  isValidNumber,
  isValidParticipantId,
  isValidQuestionId,
  validateExtractedData
} from '../src/utils/helpers/validation.js';

/**
 * Simple test runner - follows pattern from test-config.js
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
 * Assert function for validation results
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Test validation functions return errors instead of throwing
 */
function testErrorHandlingPattern() {
  // Test isRequired with invalid input
  const result1 = isRequired(null, 'testField');
  assert(result1.error === 'testField is required', 'isRequired should return error object');
  
  // Test isRequired with valid input
  const result2 = isRequired('valid', 'testField');
  assert(!result2.error, 'isRequired should return empty object for valid input');
  
  // Test isNonEmptyString with invalid input
  const result3 = isNonEmptyString('', 'testString');
  assert(result3.error === 'testString cannot be empty', 'isNonEmptyString should return error for empty string');
  
  // Test isNonEmptyString with valid input
  const result4 = isNonEmptyString('hello', 'testString');
  assert(!result4.error, 'isNonEmptyString should return empty object for valid input');
}

/**
 * Test basic validation functions
 */
function testBasicValidations() {
  // Test isNonEmptyArray
  const arrayResult1 = isNonEmptyArray([], 'testArray');
  assert(arrayResult1.error === 'testArray cannot be empty', 'Empty array should return error');
  
  const arrayResult2 = isNonEmptyArray(['item'], 'testArray');
  assert(!arrayResult2.error, 'Non-empty array should be valid');
  
  // Test isValidNumber
  const numberResult1 = isValidNumber('not a number', 'testNumber');
  assert(numberResult1.error === 'testNumber must be a valid number', 'Invalid number should return error');
  
  const numberResult2 = isValidNumber(42, 'testNumber');
  assert(!numberResult2.error, 'Valid number should pass');
  
  // Test with options
  const numberResult3 = isValidNumber(5, 'testNumber', { min: 10 });
  assert(numberResult3.error === 'testNumber must be at least 10', 'Number below minimum should return error');
}

/**
 * Test domain-specific validations
 */
function testDomainValidations() {
  // Test participant ID validation
  const participantResult1 = isValidParticipantId('');
  assert(participantResult1.error === 'participantId cannot be empty', 'Empty participant ID should return error');
  
  const participantResult2 = isValidParticipantId('participant123');
  assert(!participantResult2.error, 'Valid participant ID should pass');
  
  const participantResult3 = isValidParticipantId('invalid@id');
  assert(participantResult3.error.includes('alphanumeric characters'), 'Invalid characters should return error');
  
  // Test question ID validation
  const questionResult1 = isValidQuestionId('vpn_selection');
  assert(!questionResult1.error, 'Valid question ID should pass');
  
  const questionResult2 = isValidQuestionId('');
  assert(questionResult2.error === 'questionId cannot be empty', 'Empty question ID should return error');
}

/**
 * Test validateExtractedData function
 */
function testExtractedDataValidation() {
  // Test with missing data
  const result1 = validateExtractedData(null);
  assert(result1.error === 'extractedData is required', 'Null data should return error');
  
  // Test with missing properties
  const result2 = validateExtractedData({});
  assert(result2.error === 'Missing required property: projectBackground', 'Missing properties should return error');
  
  // Test with valid data structure
  const validData = {
    projectBackground: 'Test project',
    questions: [
      { columnIndex: 1, questionId: 'test_question', headerText: 'Test Question' }
    ],
    participantResponses: [
      { participantId: 'p123', questionId: 'test_question', response: 'Test response' }
    ],
    questionStats: {
      'test_question': { totalResponses: 1, participantCount: 1 }
    },
    metadata: {
      totalParticipants: 1,
      totalQuestions: 1,
      totalResponses: 1
    }
  };
  
  const result3 = validateExtractedData(validData);
  assert(!result3.error, 'Valid data structure should pass validation');
  
  // Test with data consistency warnings
  const inconsistentData = {
    ...validData,
    metadata: {
      totalParticipants: 1,
      totalQuestions: 2, // Mismatch - only 1 question in array
      totalResponses: 1
    }
  };
  
  const result4 = validateExtractedData(inconsistentData);
  assert(result4.warnings && result4.warnings.length > 0, 'Inconsistent data should return warnings');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('\n🧪 Running Validation Tests for Milestone 1.2...\n');
  
  const tests = [
    ['Error Handling Pattern', testErrorHandlingPattern],
    ['Basic Validations', testBasicValidations],
    ['Domain Validations', testDomainValidations],
    ['Excel Data Validation', testExtractedDataValidation]
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [name, testFn] of tests) {
    if (runTest(name, testFn)) {
      passed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All validation tests passed! Milestone 1.2 validation is ready for Excel extraction.');
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
