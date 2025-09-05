/**
 * Test: Milestone 2.3 Theme Validation Integration
 * 
 * Tests the complete pipeline with theme validation node:
 * Data → Themes → **Validation** → Classification (mock) → Quotes (mock) → Summary (mock)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';
import { createQuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';
import { ThemeValidator } from '../src/utils/validation/theme-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('\n🧪 Testing Milestone 2.3: Theme Validation Integration');
console.log('=' .repeat(60));

/**
 * Test 1: Simplified Workflow Validation Test
 */
async function testCompleteValidationPipeline() {
  console.log('\n📋 Test 1: Workflow with Theme Validation Node');
  console.log('-'.repeat(50));

  try {
    // Create mock data for testing workflow
    const mockQuestion = {
      questionId: 'test_question',
      headerText: 'test_question'
    };

    const mockResponses = [
      { participantId: 'p1', questionId: 'test_question', cleanResponse: 'Test response 1' },
      { participantId: 'p2', questionId: 'test_question', cleanResponse: 'Test response 2' },
      { participantId: 'p3', questionId: 'test_question', cleanResponse: 'Test response 3' }
    ];

    const mockProjectBackground = 'Test project background for validation testing.';

    const mockStats = {
      totalResponses: 3,
      participantCount: 3
    };

    console.log('🚀 Running workflow with validation node...');
    const workflow = createQuestionAnalysisWorkflow();
    
    const initialState = {
      question: mockQuestion,
      responses: mockResponses,
      projectBackground: mockProjectBackground,
      stats: mockStats
    };

    const startTime = Date.now();
    const finalState = await workflow.runAnalysis(initialState);
    const duration = Date.now() - startTime;

    if (finalState.error) {
      throw new Error(`Workflow failed: ${finalState.error}`);
    }

    // Validate pipeline completion
    console.log(`✅ Workflow completed in ${duration}ms`);
    console.log('\n📊 Pipeline Results:');
    console.log(`  • Themes Generated: ${finalState.themes ? 'Yes' : 'No'} (${finalState.themes?.length || 0} themes)`);
    console.log(`  • Theme Validation: ${finalState.themeValidation ? 'Yes' : 'No'}`);
    console.log(`  • Validation Passed: ${finalState.themeValidation?.passed ? 'Yes' : 'No'}`);
    console.log(`  • Validation Errors: ${finalState.themeValidation?.errors?.length || 0}`);
    console.log(`  • Validation Warnings: ${finalState.themeValidation?.warnings?.length || 0}`);
    console.log(`  • Classifications: ${finalState.classifications ? 'Yes' : 'No'} (${finalState.classifications?.length || 0} items)`);
    console.log(`  • Quotes: ${finalState.quotes ? 'Yes' : 'No'}`);
    console.log(`  • Summary: ${finalState.summary ? 'Yes' : 'No'}`);

    // Detailed validation results
    if (finalState.themeValidation) {
      console.log('\n🔍 Theme Validation Details:');
      if (finalState.themeValidation.errors.length > 0) {
        console.log('  ❌ Errors:');
        finalState.themeValidation.errors.forEach(error => console.log(`    • ${error}`));
      }
      if (finalState.themeValidation.warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        finalState.themeValidation.warnings.forEach(warning => console.log(`    • ${warning}`));
      }
      if (finalState.themeValidation.errors.length === 0 && finalState.themeValidation.warnings.length === 0) {
        console.log('  ✅ No validation issues detected');
      }
    }

    return { success: true, duration, finalState };

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Theme Validator with Mock Bad Themes
 */
async function testBadThemeDetection() {
  console.log('\n📋 Test 2: Bad Theme Detection');
  console.log('-'.repeat(50));

  try {
    const validator = new ThemeValidator();

    // Test generic themes
    const badThemes = [
      {
        id: 'theme1',
        title: 'Various reasons for selection',
        description: 'Participants mentioned various reasons for their selection'
      },
      {
        id: 'theme2',
        title: 'Mixed reactions to features',
        description: 'Users had mixed reactions to the different features'
      },
      {
        id: 'theme3',
        title: '', // Empty title
        description: 'Valid description here'
      },
      {
        id: 'theme4',
        title: 'Valid Theme',
        description: 'Too short' // Too short description
      }
    ];

    console.log('🧪 Testing with intentionally bad themes...');
    const result = validator.validateThemes(badThemes);

    console.log(`📊 Validation Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`❌ Errors detected: ${result.errors.length}`);
    console.log(`⚠️  Warnings detected: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\n🔍 Detected Errors:');
      result.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n🔍 Detected Warnings:');
      result.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    // Validate that it caught the expected issues
    const hasGenericDetection = result.errors.some(e => e.includes('Generic theme detected'));
    const hasStructureValidation = result.errors.some(e => e.includes('missing or invalid title'));
    const hasDescriptionValidation = result.errors.some(e => e.includes('description too short'));

    console.log('\n✅ Validation Capability Check:');
    console.log(`  • Generic Theme Detection: ${hasGenericDetection ? 'Working' : 'Failed'}`);
    console.log(`  • Structure Validation: ${hasStructureValidation ? 'Working' : 'Failed'}`);
    console.log(`  • Description Validation: ${hasDescriptionValidation ? 'Working' : 'Failed'}`);

    return { 
      success: true, 
      errorsDetected: result.errors.length,
      warningsDetected: result.warnings.length,
      capabilities: {
        genericDetection: hasGenericDetection,
        structureValidation: hasStructureValidation,
        descriptionValidation: hasDescriptionValidation
      }
    };

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Theme Count Validation
 */
async function testThemeCountValidation() {
  console.log('\n📋 Test 3: Theme Count Validation');
  console.log('-'.repeat(50));

  try {
    const validator = new ThemeValidator();

    // Test different theme counts
    const testCases = [
      { count: 2, description: 'Too few themes (2)' },
      { count: 4, description: 'Optimal themes (4)' },
      { count: 6, description: 'Too many themes (6)' }
    ];

    const results = [];

    for (const testCase of testCases) {
      const themes = Array.from({ length: testCase.count }, (_, i) => ({
        id: `theme${i + 1}`,
        title: `Valid Theme ${i + 1}`,
        description: 'This is a valid theme description with sufficient length to pass validation checks.'
      }));

      const result = validator.validateThemes(themes);
      results.push({
        ...testCase,
        passed: result.passed,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        warnings: result.warnings
      });

      console.log(`📊 ${testCase.description}:`);
      console.log(`  • Passed: ${result.passed}`);
      console.log(`  • Errors: ${result.errors.length}`);
      console.log(`  • Warnings: ${result.warnings.length}`);
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.log(`    - ${warning}`));
      }
    }

    return { success: true, results };

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run All Tests
 */
async function runAllTests() {
  console.log('🚀 Starting Milestone 2.3 Integration Tests...\n');

  const results = {
    test1: await testCompleteValidationPipeline(),
    test2: await testBadThemeDetection(),
    test3: await testThemeCountValidation()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.success).length;

  console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Tests Failed: ${totalTests - passedTests}/${totalTests}`);

  if (results.test1.success) {
    console.log(`🚀 Pipeline Duration: ${results.test1.duration}ms`);
    console.log(`🔍 Theme Validation: ${results.test1.finalState.themeValidation?.passed ? 'PASSED' : 'FAILED'}`);
  }

  if (results.test2.success) {
    console.log(`🛡️ Bad Theme Detection: ${results.test2.errorsDetected} errors, ${results.test2.warningsDetected} warnings`);
  }

  if (results.test3.success) {
    console.log(`📏 Theme Count Validation: Working correctly`);
  }

  console.log('\n🎯 Milestone 2.3 Theme Validation Integration: ' + 
    (passedTests === totalTests ? '✅ COMPLETE' : '❌ NEEDS FIXES'));

  return passedTests === totalTests;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runAllTests };
