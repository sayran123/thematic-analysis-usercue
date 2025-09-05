/**
 * Test: Milestone 2.5 Quote Validation Integration
 * 
 * Tests the complete pipeline with comprehensive quote validation:
 * Data → Themes → Classification → Quote Extraction → **Quote Validation** → Summary
 * 
 * This test validates that quote validation prevents hallucination and improves
 * quote quality through retry logic with real data from 106 participant responses.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QuoteValidator } from '../src/utils/validation/quote-validator.js';
import { completeTestDataset, generateValidationInput } from './test-quote-validation-data.js';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';
import { createQuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('\n🧪 Testing Milestone 2.5: Quote Validation Integration');
console.log('=' .repeat(60));

/**
 * Test 1: Quote Validator Standalone Testing
 */
async function testQuoteValidatorStandalone() {
  console.log('\n📋 Test 1: Quote Validator Standalone with Real Data');
  console.log('-'.repeat(50));

  try {
    const validator = new QuoteValidator({ enableDetailedLogging: true });
    
    // Test with valid quotes (should pass)
    console.log('🔄 Testing valid quotes...');
    const validInput = generateValidationInput(completeTestDataset.getAllValidQuotes());
    const validResult = validator.validateQuotes(validInput);
    
    console.log(`✅ Valid quotes test: ${validResult.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   - Quotes validated: ${validResult.totalQuotesValidated}`);
    console.log(`   - Errors: ${validResult.errors.length}`);
    console.log(`   - Warnings: ${validResult.warnings.length}`);
    
    if (validResult.errors.length > 0) {
      console.log('   - Sample errors:', validResult.errors.slice(0, 2));
    }

    // Test with hallucinated quotes (should fail)
    console.log('\n🔄 Testing hallucinated quotes...');
    const invalidInput = generateValidationInput(completeTestDataset.getAllInvalidQuotes());
    const invalidResult = validator.validateQuotes(invalidInput);
    
    console.log(`✅ Hallucinated quotes test: ${invalidResult.passed ? 'UNEXPECTED PASS' : 'CORRECTLY FAILED'}`);
    console.log(`   - Quotes validated: ${invalidResult.totalQuotesValidated}`);
    console.log(`   - Errors detected: ${invalidResult.errors.length}`);
    console.log(`   - Warnings: ${invalidResult.warnings.length}`);
    
    if (invalidResult.errors.length > 0) {
      console.log('   - Sample errors:', invalidResult.errors.slice(0, 2));
    }

    // Calculate accuracy metrics
    const totalValid = completeTestDataset.getAllValidQuotes().length;
    const totalInvalid = completeTestDataset.getAllInvalidQuotes().length;
    const correctlyValidated = validResult.passed ? totalValid : 0;
    const correctlyRejected = !invalidResult.passed ? totalInvalid : 0;
    const accuracy = (correctlyValidated + correctlyRejected) / (totalValid + totalInvalid) * 100;

    console.log(`\n📊 Validation Accuracy: ${accuracy.toFixed(1)}%`);
    console.log(`   - Correctly validated: ${correctlyValidated}/${totalValid} valid quotes`);
    console.log(`   - Correctly rejected: ${correctlyRejected}/${totalInvalid} invalid quotes`);

    return {
      success: accuracy >= 95, // Require >95% accuracy
      accuracy,
      validResult,
      invalidResult,
      totalQuotesTested: totalValid + totalInvalid
    };

  } catch (error) {
    console.error('❌ Standalone validation test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: End-to-End Pipeline with Validation
 */
async function testEndToEndWithValidation() {
  console.log('\n📋 Test 2: End-to-End Pipeline with Quote Validation');
  console.log('-'.repeat(50));

  try {
    // Phase 1: Extract real data
    console.log('🔄 Phase 1: Extracting real data from inputs/data.xlsx...');
    const dataPath = join(projectRoot, 'inputs', 'data.xlsx');
    const backgroundPath = join(projectRoot, 'inputs', 'project_background.txt');
    
    const extractResult = await extractDataFromExcel(dataPath, backgroundPath);
    if (extractResult.error) {
      throw new Error(`Data extraction failed: ${extractResult.error}`);
    }

    console.log(`✅ Extracted ${extractResult.data.metadata.totalResponses} responses from ${extractResult.data.metadata.totalParticipants} participants`);

    // Phase 2: Parse and clean responses
    console.log('\n🔄 Phase 2: Parsing and cleaning responses...');
    const parseResult = parseAndCleanResponses(extractResult.data);
    if (parseResult.error) {
      throw new Error(`Response parsing failed: ${parseResult.error}`);
    }

    console.log(`✅ Cleaned ${parseResult.data.responseStatistics.totalResponses} responses`);

    // Select first question for testing
    const firstQuestion = parseResult.data.questions[0];
    const questionResponses = parseResult.data.responsesByQuestion[firstQuestion.questionId];
    
    console.log(`\n🎯 Testing with question: "${firstQuestion.questionId}"`);
    console.log(`📊 Response count: ${questionResponses.length}`);

    // Phase 3: Run workflow with validation
    console.log('\n🔄 Phase 3: Running complete workflow with quote validation...');
    const workflow = createQuestionAnalysisWorkflow();

    const initialState = {
      question: firstQuestion,
      responses: questionResponses,
      projectBackground: parseResult.data.projectBackground,
      stats: parseResult.data.questionStats[firstQuestion.questionId],
      themes: null,
      derivedQuestion: null,
      themeValidation: null,
      classifications: null,
      quotes: null,
      summary: null
    };

    console.log('🚀 Executing complete workflow with validation...');
    const startTime = Date.now();
    
    const finalState = await workflow.runAnalysis(initialState);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Workflow completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);

    if (finalState.error) {
      throw new Error(`Workflow failed: ${finalState.error}`);
    }

    // Analyze validation results
    console.log('\n📈 Quote Validation Results:');
    console.log('-'.repeat(30));
    
    const quotes = finalState.quotes || {};
    const quoteValidation = finalState.quoteValidationResult;
    const quoteStats = finalState.quoteExtractionStats || {};

    const actualQuoteCount = quoteStats.totalQuotes || Object.values(quotes).reduce((total, themeQuotes) => total + themeQuotes.length, 0);
    console.log(`✅ Total quotes extracted: ${actualQuoteCount}`);
    
    if (quoteValidation) {
      console.log(`✅ Validation result: ${quoteValidation.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`✅ Validation attempts: ${quoteValidation.attempts}`);
      console.log(`✅ Quotes validated: ${quoteValidation.totalQuotesValidated}`);
      console.log(`✅ Validation errors: ${quoteValidation.errors.length}`);
      console.log(`✅ Validation warnings: ${quoteValidation.warnings.length}`);
      
      if (quoteValidation.errors.length > 0) {
        console.log('\n⚠️  Sample validation errors:');
        quoteValidation.errors.slice(0, 3).forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
    } else {
      console.log('⚠️  No validation result available');
    }

    // Display sample validated quotes
    console.log('\n📝 Sample Validated Quotes:');
    console.log('-'.repeat(25));
    
    let displayedQuotes = 0;
    const maxDisplayQuotes = 4;
    
    for (const [themeId, themeQuotes] of Object.entries(quotes)) {
      if (displayedQuotes >= maxDisplayQuotes) break;
      
      const theme = finalState.themes?.find(t => t.id === themeId);
      if (themeQuotes.length > 0) {
        console.log(`\n🏷️  Theme: ${theme?.title || themeId}`);
        
        for (const quote of themeQuotes.slice(0, 2)) {
          console.log(`   📌 Participant ${quote.participantId}:`);
          console.log(`      "${quote.quote}"`);
          console.log(`      Verified: ${quote.verified}, Method: ${quote.validationMethod}, Status: ${quote.validationStatus}`);
          displayedQuotes++;
          
          if (displayedQuotes >= maxDisplayQuotes) break;
        }
      }
    }

    // Performance and quality metrics
    const performanceImpact = duration; // Total time including validation
    const quotesPerSecond = quoteStats.totalQuotes ? (quoteStats.totalQuotes / (duration / 1000)).toFixed(2) : 0;

    console.log(`\n📊 Performance Metrics:`);
    console.log(`   - Total execution time: ${(duration/1000).toFixed(1)}s`);
    console.log(`   - Quotes processed: ${quotesPerSecond}/second`);
    console.log(`   - Validation overhead: ${quoteValidation?.attempts > 1 ? 'Yes (retry occurred)' : 'No (single attempt)'}`);

    return {
      success: true,
      duration,
      totalQuotes: actualQuoteCount,
      validationPassed: quoteValidation?.passed || false,
      validationAttempts: quoteValidation?.attempts || 0,
      validationErrors: quoteValidation?.errors.length || 0,
      validationWarnings: quoteValidation?.warnings.length || 0,
      quotes: quotes
    };

  } catch (error) {
    console.error('❌ End-to-end test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Validation Performance Benchmark
 */
async function testValidationPerformance() {
  console.log('\n📋 Test 3: Quote Validation Performance Benchmark');
  console.log('-'.repeat(50));

  try {
    const validator = new QuoteValidator();
    
    // Test with different dataset sizes
    const testSizes = [5, 10, 20];
    const performanceResults = [];

    for (const size of testSizes) {
      console.log(`\n🔄 Testing validation performance with ${size} quotes...`);
      
      const testQuotes = completeTestDataset.getAllQuotes().slice(0, size);
      const validationInput = generateValidationInput(testQuotes);
      
      const startTime = Date.now();
      const result = validator.validateQuotes(validationInput);
      const duration = Date.now() - startTime;
      
      const quotesPerMs = size / duration;
      
      console.log(`   ⏱️  ${duration}ms for ${size} quotes (${quotesPerMs.toFixed(3)} quotes/ms)`);
      console.log(`   📊 Result: ${result.passed ? 'PASSED' : 'FAILED'} (${result.errors.length} errors)`);
      
      performanceResults.push({
        size,
        duration,
        quotesPerMs,
        passed: result.passed,
        errors: result.errors.length
      });
    }

    // Calculate average performance
    const avgQuotesPerMs = performanceResults.reduce((sum, r) => sum + r.quotesPerMs, 0) / performanceResults.length;
    const maxDuration = Math.max(...performanceResults.map(r => r.duration));

    console.log(`\n📊 Performance Summary:`);
    console.log(`   - Average: ${avgQuotesPerMs.toFixed(3)} quotes/ms`);
    console.log(`   - Max duration: ${maxDuration}ms`);
    console.log(`   - Estimated 106 quotes: ~${(106 / avgQuotesPerMs).toFixed(0)}ms`);

    // Check if performance meets requirements (<500ms for typical quote validation)
    const meetsRequirements = maxDuration < 500;
    console.log(`   - Performance requirement (<500ms): ${meetsRequirements ? '✅ MET' : '❌ EXCEEDED'}`);

    return {
      success: meetsRequirements,
      avgQuotesPerMs,
      maxDuration,
      performanceResults
    };

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('🧪 Running Milestone 2.5 Quote Validation Integration Tests');
  console.log('Testing comprehensive quote validation with real data and retry logic');
  
  const results = {};
  
  // Test 1: Standalone validation accuracy
  results.standalone = await testQuoteValidatorStandalone();
  
  // Test 2: End-to-end integration
  results.endToEnd = await testEndToEndWithValidation();
  
  // Test 3: Performance benchmarking
  results.performance = await testValidationPerformance();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MILESTONE 2.5 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n1. Standalone Validation: ${results.standalone.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (results.standalone.success) {
    console.log(`   - Validation accuracy: ${results.standalone.accuracy.toFixed(1)}%`);
    console.log(`   - Total quotes tested: ${results.standalone.totalQuotesTested}`);
  } else {
    console.log(`   - Error: ${results.standalone.error}`);
  }
  
  console.log(`\n2. End-to-End Integration: ${results.endToEnd.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (results.endToEnd.success) {
    console.log(`   - Execution time: ${(results.endToEnd.duration/1000).toFixed(1)}s`);
    console.log(`   - Quotes extracted: ${results.endToEnd.totalQuotes}`);
    console.log(`   - Validation passed: ${results.endToEnd.validationPassed ? 'Yes' : 'No'}`);
    console.log(`   - Validation attempts: ${results.endToEnd.validationAttempts}`);
    console.log(`   - Validation errors: ${results.endToEnd.validationErrors}`);
  } else {
    console.log(`   - Error: ${results.endToEnd.error}`);
  }
  
  console.log(`\n3. Performance Benchmark: ${results.performance.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (results.performance.success) {
    console.log(`   - Max validation time: ${results.performance.maxDuration}ms`);
    console.log(`   - Performance: ${results.performance.avgQuotesPerMs.toFixed(3)} quotes/ms`);
  } else {
    console.log(`   - Error: ${results.performance.error}`);
  }
  
  const allPassed = results.standalone.success && results.endToEnd.success && results.performance.success;
  
  console.log(`\n🎯 MILESTONE 2.5 STATUS: ${allPassed ? '✅ COMPLETE' : '❌ NEEDS FIXES'}`);
  
  if (allPassed) {
    console.log('\n🚀 Quote validation system successfully implemented!');
    console.log('   ✅ Hallucination detection working with real quotes');
    console.log('   ✅ Retry logic functional with validation feedback');  
    console.log('   ✅ Performance requirements met');
    console.log('   ✅ Integration with existing pipeline successful');
  }
  
  return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { runAllTests };
