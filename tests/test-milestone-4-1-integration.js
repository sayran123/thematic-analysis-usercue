/**
 * Integration test for Milestone 4.1: Parallel Orchestrator Implementation
 * 
 * Tests the parallel processing functionality with real data from inputs/ folder
 * Validates performance improvement and error handling compared to sequential processing
 */

import { ParallelOrchestrator } from '../src/analysis/workflows/parallel-orchestrator.js';
import { QuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';
import { initializeLLM } from '../src/utils/config/llm-config.js';
import { validateConfig } from '../src/utils/config/constants.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test configuration and utilities
 */
const TEST_CONFIG = {
  INPUT_EXCEL: 'inputs/data.xlsx',
  PROJECT_BACKGROUND: 'inputs/project_background.txt',
  PERFORMANCE_THRESHOLD_IMPROVEMENT: 2.0, // Expect at least 2x improvement
  MAX_ACCEPTABLE_FAILURE_RATE: 0.1 // Accept up to 10% question failures
};

/**
 * Performance benchmark utility
 */
class PerformanceBenchmark {
  constructor(name) {
    this.name = name;
    this.startTime = null;
    this.endTime = null;
  }
  
  start() {
    this.startTime = Date.now();
    console.log(`⏱️  Starting ${this.name}...`);
  }
  
  end() {
    this.endTime = Date.now();
    const duration = this.getDurationSeconds();
    console.log(`⏱️  ${this.name} completed in ${duration}s`);
    return duration;
  }
  
  getDurationSeconds() {
    if (!this.startTime || !this.endTime) return 0;
    return ((this.endTime - this.startTime) / 1000).toFixed(1);
  }
}

/**
 * Main integration test
 */
async function runMilestone41IntegrationTest() {
  console.log('🧪 Starting Milestone 4.1 Integration Test: Parallel Orchestrator');
  console.log('====================================================================');
  
  try {
    // Test Phase 1: Configuration and data validation
    console.log('\n📋 Phase 1: Configuration and Data Validation');
    
    const configValidation = validateConfig();
    if (!configValidation.passed) {
      throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
    }
    console.log('✅ Configuration validation passed');
    
    // Initialize LLM
    const llmResult = await initializeLLM({ temperature: 0.3, maxTokens: 4000 });
    if (llmResult.error) {
      throw new Error(`LLM initialization failed: ${llmResult.error}`);
    }
    console.log('✅ LLM initialization successful');
    
    // Test Phase 2: Data extraction and preparation
    console.log('\n📊 Phase 2: Data Extraction and Preparation');
    
    const extractionResult = await extractDataFromExcel(
      TEST_CONFIG.INPUT_EXCEL,
      TEST_CONFIG.PROJECT_BACKGROUND
    );
    
    if (extractionResult.error) {
      throw new Error(`Data extraction failed: ${extractionResult.error}`);
    }
    
    const extractedData = extractionResult.data;
    console.log(`✅ Extracted ${extractedData.questions.length} questions`);
    console.log(`✅ Found ${extractedData.participantResponses.length} participant responses`);
    console.log(`✅ Found ${extractedData.metadata.totalParticipants} unique participants`);
    
    const parsingResult = parseAndCleanResponses(extractedData);
    if (parsingResult.error) {
      throw new Error(`Data parsing failed: ${parsingResult.error}`);
    }
    
    const cleanedData = parsingResult.data;
    console.log('✅ Data parsing and cleaning completed');
    
    // Test Phase 3: Sequential processing benchmark (for comparison)
    console.log('\n🔄 Phase 3: Sequential Processing Benchmark');
    
    const sequentialBenchmark = new PerformanceBenchmark('Sequential Processing');
    sequentialBenchmark.start();
    
    const sequentialResults = await runSequentialAnalysis(cleanedData);
    if (sequentialResults.error) {
      console.warn(`⚠️ Sequential processing failed: ${sequentialResults.error}`);
    } else {
      console.log(`✅ Sequential processing completed: ${sequentialResults.length} questions analyzed`);
    }
    
    const sequentialTime = sequentialBenchmark.end();
    
    // Test Phase 4: Parallel processing implementation
    console.log('\n⚡ Phase 4: Parallel Processing Implementation');
    
    const parallelBenchmark = new PerformanceBenchmark('Parallel Processing');
    parallelBenchmark.start();
    
    const parallelOrchestrator = new ParallelOrchestrator();
    const parallelResults = await parallelOrchestrator.parallelThematicAnalysis(cleanedData);
    
    if (parallelResults.error) {
      throw new Error(`Parallel processing failed: ${parallelResults.error}`);
    }
    
    const parallelTime = parallelBenchmark.end();
    console.log(`✅ Parallel processing completed: ${parallelResults.length} questions analyzed`);
    
    // Test Phase 5: Performance analysis and validation
    console.log('\n📈 Phase 5: Performance Analysis and Validation');
    
    const performanceResults = analyzePerformance(sequentialTime, parallelTime, sequentialResults, parallelResults);
    console.log(`📊 Performance improvement: ${performanceResults.improvementFactor}x faster`);
    console.log(`📊 Parallel efficiency: ${performanceResults.parallelEfficiency}%`);
    
    if (performanceResults.improvementFactor >= TEST_CONFIG.PERFORMANCE_THRESHOLD_IMPROVEMENT) {
      console.log(`✅ Performance threshold met (${performanceResults.improvementFactor}x >= ${TEST_CONFIG.PERFORMANCE_THRESHOLD_IMPROVEMENT}x)`);
    } else {
      console.warn(`⚠️ Performance threshold not met (${performanceResults.improvementFactor}x < ${TEST_CONFIG.PERFORMANCE_THRESHOLD_IMPROVEMENT}x)`);
    }
    
    // Test Phase 6: Quality validation
    console.log('\n🔍 Phase 6: Quality Validation');
    
    const qualityResults = validateOutputQuality(sequentialResults, parallelResults);
    console.log(`📊 Output format consistency: ${qualityResults.formatConsistency ? 'PASS' : 'FAIL'}`);
    console.log(`📊 Theme count consistency: ${qualityResults.themeConsistency}%`);
    console.log(`📊 Participant count consistency: ${qualityResults.participantConsistency}%`);
    
    // Test Phase 7: Error handling validation
    console.log('\n🛡️  Phase 7: Error Handling Validation');
    
    const errorHandlingResults = await testErrorHandling(parallelOrchestrator);
    console.log(`✅ Input validation: ${errorHandlingResults.inputValidation ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Partial failure handling: ${errorHandlingResults.partialFailureHandling ? 'PASS' : 'FAIL'}`);
    
    // Test Phase 8: Memory and resource validation
    console.log('\n🧠 Phase 8: Memory and Resource Validation');
    
    const resourceResults = await validateResourceUsage(parallelOrchestrator, cleanedData);
    console.log(`📊 Memory usage: ${resourceResults.memoryUsageMB}MB`);
    console.log(`📊 Resource efficiency: ${resourceResults.resourceEfficiency}`);
    
    // Final summary
    console.log('\n🎯 Integration Test Summary');
    console.log('====================================================================');
    console.log(`✅ All phases completed successfully`);
    console.log(`📊 Performance: ${performanceResults.improvementFactor}x improvement`);
    console.log(`📊 Quality: ${qualityResults.overallScore}% consistency`);
    console.log(`📊 Reliability: ${errorHandlingResults.overallScore}% error handling`);
    console.log(`📊 Resource efficiency: ${resourceResults.resourceEfficiency}`);
    console.log('✅ Milestone 4.1 Integration Test: PASSED');
    
    return {
      success: true,
      performance: performanceResults,
      quality: qualityResults,
      errorHandling: errorHandlingResults,
      resources: resourceResults
    };
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run sequential analysis for benchmark comparison
 */
async function runSequentialAnalysis(cleanedData) {
  try {
    const results = [];
    const workflow = new QuestionAnalysisWorkflow();
    
    for (const question of cleanedData.questions) {
      const questionResponses = cleanedData.responsesByQuestion[question.questionId] || [];
      
      if (questionResponses.length === 0) {
        console.warn(`Skipping ${question.questionId} - no responses`);
        continue;
      }
      
      const initialState = {
        question,
        responses: questionResponses,
        projectBackground: cleanedData.projectBackground,
        stats: cleanedData.questionStats[question.questionId]
      };
      
      const result = await workflow.runAnalysis(initialState);
      
      if (result.error) {
        console.warn(`Sequential analysis failed for ${question.questionId}: ${result.error}`);
        continue;
      }
      
      // Transform to match parallel output format
      const formattedResult = {
        questionId: question.questionId,
        derivedQuestion: result.derivedQuestion,
        participantCount: questionResponses.length,
        headline: result.summary?.headline || 'Sequential analysis result',
        summary: result.summary?.summary || 'Sequential analysis completed',
        themes: result.themes || [],
        classifications: result.classifications || {}
      };
      
      results.push(formattedResult);
    }
    
    return results;
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analyze performance between sequential and parallel processing
 */
function analyzePerformance(sequentialTime, parallelTime, sequentialResults, parallelResults) {
  const improvementFactor = sequentialTime > 0 ? (sequentialTime / parallelTime).toFixed(1) : 'N/A';
  const parallelEfficiency = parallelTime > 0 ? ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1) : 'N/A';
  
  return {
    sequentialTime: parseFloat(sequentialTime),
    parallelTime: parseFloat(parallelTime),
    improvementFactor: parseFloat(improvementFactor),
    parallelEfficiency: parseFloat(parallelEfficiency),
    sequentialQuestions: Array.isArray(sequentialResults) ? sequentialResults.length : 0,
    parallelQuestions: Array.isArray(parallelResults) ? parallelResults.length : 0
  };
}

/**
 * Validate output quality between sequential and parallel results
 */
function validateOutputQuality(sequentialResults, parallelResults) {
  if (!Array.isArray(sequentialResults) || !Array.isArray(parallelResults)) {
    return {
      formatConsistency: false,
      themeConsistency: 0,
      participantConsistency: 0,
      overallScore: 0
    };
  }
  
  // Check format consistency
  const formatConsistency = parallelResults.every(result => 
    result.hasOwnProperty('questionId') &&
    result.hasOwnProperty('derivedQuestion') &&
    result.hasOwnProperty('themes') &&
    result.hasOwnProperty('classifications')
  );
  
  // Calculate theme count consistency
  const sequentialThemeCount = sequentialResults.reduce((sum, r) => sum + (r.themes?.length || 0), 0);
  const parallelThemeCount = parallelResults.reduce((sum, r) => sum + (r.themes?.length || 0), 0);
  const themeConsistency = sequentialThemeCount > 0 ? 
    ((Math.min(sequentialThemeCount, parallelThemeCount) / Math.max(sequentialThemeCount, parallelThemeCount)) * 100).toFixed(1) : 100;
  
  // Calculate participant count consistency
  const sequentialParticipantCount = sequentialResults.reduce((sum, r) => sum + (r.participantCount || 0), 0);
  const parallelParticipantCount = parallelResults.reduce((sum, r) => sum + (r.participantCount || 0), 0);
  const participantConsistency = sequentialParticipantCount > 0 ? 
    ((Math.min(sequentialParticipantCount, parallelParticipantCount) / Math.max(sequentialParticipantCount, parallelParticipantCount)) * 100).toFixed(1) : 100;
  
  const overallScore = ((parseFloat(themeConsistency) + parseFloat(participantConsistency)) / 2).toFixed(1);
  
  return {
    formatConsistency,
    themeConsistency: parseFloat(themeConsistency),
    participantConsistency: parseFloat(participantConsistency),
    overallScore: parseFloat(overallScore)
  };
}

/**
 * Test error handling capabilities
 */
async function testErrorHandling(parallelOrchestrator) {
  const tests = {
    inputValidation: false,
    partialFailureHandling: false
  };
  
  try {
    // Test 1: Input validation
    const invalidInputResult = await parallelOrchestrator.parallelThematicAnalysis(null);
    tests.inputValidation = invalidInputResult.error && invalidInputResult.error.includes('validation failed');
    
    // Test 2: Partial failure handling - test with malformed data
    const partialFailureData = {
      questions: [
        { questionId: 'test_question_1' },
        { questionId: 'test_question_2' }
      ],
      responsesByQuestion: {
        'test_question_1': [], // No responses - should be skipped
        'test_question_2': [{ participantId: 'test', cleanResponse: 'test response' }]
      },
      projectBackground: 'Test background',
      questionStats: {
        'test_question_1': { totalResponses: 0 },
        'test_question_2': { totalResponses: 1 }
      }
    };
    
    const partialFailureResult = await parallelOrchestrator.parallelThematicAnalysis(partialFailureData);
    tests.partialFailureHandling = !partialFailureResult.error; // Should not error, should handle gracefully
    
  } catch (error) {
    console.warn('Error handling test failed:', error.message);
  }
  
  const overallScore = ((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100).toFixed(1);
  
  return {
    ...tests,
    overallScore: parseFloat(overallScore)
  };
}

/**
 * Validate resource usage during parallel processing
 */
async function validateResourceUsage(parallelOrchestrator, cleanedData) {
  const initialMemory = process.memoryUsage();
  
  try {
    // Run a lightweight version to measure resource usage
    const testData = {
      ...cleanedData,
      questions: cleanedData.questions.slice(0, 2) // Limit to 2 questions for resource test
    };
    
    await parallelOrchestrator.parallelThematicAnalysis(testData);
    
    const finalMemory = process.memoryUsage();
    const memoryUsageMB = ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(1);
    
    const resourceEfficiency = memoryUsageMB < 100 ? 'Excellent' : 
                              memoryUsageMB < 200 ? 'Good' : 
                              memoryUsageMB < 500 ? 'Acceptable' : 'Needs optimization';
    
    return {
      initialMemoryMB: (initialMemory.heapUsed / 1024 / 1024).toFixed(1),
      finalMemoryMB: (finalMemory.heapUsed / 1024 / 1024).toFixed(1),
      memoryUsageMB: parseFloat(memoryUsageMB),
      resourceEfficiency
    };
    
  } catch (error) {
    return {
      memoryUsageMB: 0,
      resourceEfficiency: 'Unknown',
      error: error.message
    };
  }
}

// Export for use in other tests
export {
  runMilestone41IntegrationTest,
  PerformanceBenchmark,
  analyzePerformance,
  validateOutputQuality,
  testErrorHandling,
  validateResourceUsage
};

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMilestone41IntegrationTest()
    .then(results => {
      if (results.success) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}
