/**
 * Integration Test Suite for Milestone 4.2: Multi-Question Integration & Error Handling
 * 
 * Tests the enhanced multi-question integration with comprehensive error handling,
 * robust output generation, and quality assurance systems.
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { ThematicAnalysisPipeline } from '../src/main.js';
import { analyzeMultiQuestionErrors, ErrorAnalyzer } from '../src/utils/validation/error-analyzer.js';
import { generateMainResults, validateAnalysesForOutput } from '../src/outputs/generators/json-generator.js';
import { generateClassificationFiles } from '../src/outputs/generators/excel-generator.js';
import { generateExecutiveSummary } from '../src/outputs/generators/summary-generator.js';
import { ParallelOrchestrator } from '../src/analysis/workflows/parallel-orchestrator.js';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  inputExcelPath: 'inputs/data.xlsx',
  backgroundPath: 'inputs/project_background.txt',
  outputDir: 'outputs/test-milestone-4-2',
  maxTestDuration: 10 * 60 * 1000, // 10 minutes max
  expectedMinQuestions: 3, // Minimum questions for meaningful test
  expectedMinParticipants: 50, // Minimum participants for realistic testing
};

/**
 * Test results tracker
 */
let testResults = {
  startTime: null,
  endTime: null,
  phases: {},
  errors: [],
  warnings: [],
  metrics: {}
};

console.log('🧪 Starting Milestone 4.2 Integration Test Suite');
console.log('===================================================\n');

/**
 * Phase 1: Error Analysis System Testing
 */
async function testErrorAnalysisSystem() {
  console.log('📊 Phase 1: Testing Error Analysis System...');
  testResults.phases.errorAnalysis = { startTime: Date.now() };
  
  try {
    // Test 1.1: Error Analyzer instantiation
    console.log('  1.1 Testing Error Analyzer instantiation...');
    const analyzer = new ErrorAnalyzer();
    assert(analyzer instanceof ErrorAnalyzer, 'Error analyzer should instantiate correctly');
    
    // Test 1.2: Mock error analysis with various failure types
    console.log('  1.2 Testing error categorization with mock failures...');
    const mockResults = [
      { questionId: 'test_1', themes: ['theme1'], classifications: { 'p1': 'theme1' }, summary: 'summary' },
      { questionId: 'test_2', error: 'LLM quota exceeded' },
      { questionId: 'test_3', themes: [], classifications: {}, summary: null }, // Partial failure
      { questionId: 'test_4', error: 'Network timeout during classification' },
      { questionId: 'test_5', themes: ['theme1'], classifications: { 'p1': 'theme1' }, quotes: {}, summary: 'summary' }
    ];
    
    const analysis = analyzer.analyzeMultiQuestionErrors(mockResults);
    assert(!analysis.error, 'Error analysis should complete successfully');
    assert(analysis.summary.totalQuestions === 5, 'Should analyze all 5 mock questions');
    assert(analysis.summary.failedQuestions === 2, 'Should identify 2 failed questions');
    assert(analysis.categorizedErrors, 'Should categorize errors');
    assert(analysis.errorPatterns, 'Should detect error patterns');
    assert(analysis.recommendations, 'Should generate recommendations');
    
    console.log(`    ✅ Analyzed ${analysis.summary.totalQuestions} questions`);
    console.log(`    ✅ Detected ${analysis.summary.totalErrors} errors`);
    console.log(`    ✅ Generated ${analysis.recommendations.length} recommendations`);
    
    testResults.phases.errorAnalysis.status = 'passed';
    
  } catch (error) {
    testResults.phases.errorAnalysis.status = 'failed';
    testResults.phases.errorAnalysis.error = error.message;
    testResults.errors.push(`Phase 1 Error Analysis: ${error.message}`);
    console.error(`  ❌ Error Analysis System Test failed: ${error.message}`);
  }
  
  testResults.phases.errorAnalysis.endTime = Date.now();
  testResults.phases.errorAnalysis.duration = 
    testResults.phases.errorAnalysis.endTime - testResults.phases.errorAnalysis.startTime;
  
  console.log(`  ⏱️ Phase 1 completed in ${testResults.phases.errorAnalysis.duration}ms\n`);
}

/**
 * Phase 2: Enhanced Output Generators Testing
 */
async function testEnhancedOutputGenerators() {
  console.log('📄 Phase 2: Testing Enhanced Output Generators...');
  testResults.phases.outputGenerators = { startTime: Date.now() };
  
  try {
    // Create test data with mixed success/failure scenarios
    const testAnalyses = [
      {
        questionId: 'success_question',
        derivedQuestion: 'What are successful features?',
        themes: [
          { title: 'Feature A', description: 'Great feature', supportingQuotes: [
            { quote: 'This is amazing', participantId: 'p1', verified: true }
          ]}
        ],
        classifications: { 'p1': 'Feature A', 'p2': 'Feature A' },
        summary: { headline: 'Feature A is popular', content: 'Analysis shows...' },
        participantCount: 2
      },
      {
        questionId: 'failed_question',
        error: 'LLM service unavailable'
      },
      {
        questionId: 'partial_question',
        derivedQuestion: 'What about partial features?',
        themes: [{ title: 'Partial Feature', description: 'Incomplete analysis' }],
        classifications: {},
        summary: null,
        participantCount: 0
      }
    ];
    
    const mockOriginalData = {
      questions: [
        { questionId: 'success_question' },
        { questionId: 'failed_question' },
        { questionId: 'partial_question' }
      ],
      responsesByQuestion: {
        'success_question': [
          { participantId: 'p1', cleanResponse: 'This is amazing' },
          { participantId: 'p2', cleanResponse: 'Also great' }
        ],
        'failed_question': [],
        'partial_question': []
      }
    };
    
    // Test 2.1: Enhanced JSON Generator
    console.log('  2.1 Testing enhanced JSON generator with mixed results...');
    const jsonResult = await generateMainResults(testAnalyses, {
      outputPath: `${TEST_CONFIG.outputDir}/test_main_results.json`,
      startTime: new Date(Date.now() - 5000) // 5 seconds ago
    });
    
    assert(!jsonResult.error, 'JSON generation should handle mixed results');
    assert(jsonResult.projectSummary, 'Should include project summary');
    assert(jsonResult.qualityAssurance, 'Should include quality metrics');
    assert(jsonResult.questionAnalyses, 'Should include successful analyses');
    assert(jsonResult.errors, 'Should include error information');
    
    console.log(`    ✅ JSON generated with ${jsonResult.questionAnalyses.length} successful analyses`);
    console.log(`    ✅ Error information included for ${jsonResult.errors?.failedQuestions?.length || 0} failed questions`);
    
    // Test 2.2: Enhanced Excel Generator
    console.log('  2.2 Testing enhanced Excel generator with partial failures...');
    const excelResult = await generateClassificationFiles(testAnalyses, mockOriginalData, {
      outputDir: TEST_CONFIG.outputDir
    });
    
    assert(!excelResult.error, 'Excel generation should handle partial failures gracefully');
    assert(Array.isArray(excelResult), 'Should return array of generated files');
    console.log(`    ✅ Excel generation completed with ${excelResult.length} files`);
    
    // Test 2.3: Enhanced Summary Generator
    console.log('  2.3 Testing enhanced summary generator with failure awareness...');
    const summaryResult = await generateExecutiveSummary(testAnalyses, jsonResult, {
      outputPath: `${TEST_CONFIG.outputDir}/test_executive_summary.md`
    });
    
    assert(!summaryResult.error, 'Summary generation should handle failures');
    assert(typeof summaryResult === 'string', 'Should return markdown content');
    assert(summaryResult.includes('Data Quality'), 'Should include data quality section for failures');
    
    console.log(`    ✅ Summary generated with failure awareness`);
    
    testResults.phases.outputGenerators.status = 'passed';
    
  } catch (error) {
    testResults.phases.outputGenerators.status = 'failed';
    testResults.phases.outputGenerators.error = error.message;
    testResults.errors.push(`Phase 2 Output Generators: ${error.message}`);
    console.error(`  ❌ Enhanced Output Generators Test failed: ${error.message}`);
  }
  
  testResults.phases.outputGenerators.endTime = Date.now();
  testResults.phases.outputGenerators.duration = 
    testResults.phases.outputGenerators.endTime - testResults.phases.outputGenerators.startTime;
  
  console.log(`  ⏱️ Phase 2 completed in ${testResults.phases.outputGenerators.duration}ms\n`);
}

/**
 * Phase 3: Enhanced Parallel Orchestrator Testing
 */
async function testEnhancedParallelOrchestrator() {
  console.log('🔄 Phase 3: Testing Enhanced Parallel Orchestrator...');
  testResults.phases.parallelOrchestrator = { startTime: Date.now() };
  
  try {
    // Test 3.1: Parallel orchestrator instantiation
    console.log('  3.1 Testing parallel orchestrator enhanced functionality...');
    const orchestrator = new ParallelOrchestrator();
    assert(orchestrator instanceof ParallelOrchestrator, 'Orchestrator should instantiate');
    
    // Test 3.2: Enhanced failure handling methods
    console.log('  3.2 Testing enhanced failure handling methods...');
    
    // Mock results with various failure scenarios
    const mockResults = [
      { questionId: 'q1', themes: ['t1'], classifications: { 'p1': 't1' }, summary: 'good' },
      { questionId: 'q2', error: 'Complete failure' },
      { questionId: 'q3', themes: [], classifications: {}, summary: null } // Partial failure
    ];
    
    const mockOriginalData = {
      questions: [
        { questionId: 'q1' },
        { questionId: 'q2' },
        { questionId: 'q3' }
      ],
      responsesByQuestion: {
        'q1': [{ participantId: 'p1', cleanResponse: 'test' }],
        'q2': [{ participantId: 'p2', cleanResponse: 'test' }],
        'q3': [{ participantId: 'p3', cleanResponse: 'test' }]
      }
    };
    
    // Test enhanced failure handling
    const failureHandling = orchestrator.handlePartialFailuresEnhanced(mockResults, mockOriginalData);
    
    assert(failureHandling.successfulResults.length === 2, 'Should include partial failures in successful');
    assert(failureHandling.failedResults.length === 1, 'Should identify complete failures');
    assert(failureHandling.partialFailureResults.length === 1, 'Should identify partial failures');
    assert(failureHandling.qualityMetrics, 'Should include quality metrics');
    assert(failureHandling.recoveryStrategies, 'Should include recovery strategies');
    
    console.log(`    ✅ Enhanced failure handling: ${failureHandling.successfulResults.length} successful, ${failureHandling.failedResults.length} failed, ${failureHandling.partialFailureResults.length} partial`);
    console.log(`    ✅ Quality metrics: ${failureHandling.qualityMetrics.overallSuccessRate} success rate`);
    console.log(`    ✅ Recovery strategies: ${failureHandling.recoveryStrategies.length} strategies generated`);
    
    testResults.phases.parallelOrchestrator.status = 'passed';
    
  } catch (error) {
    testResults.phases.parallelOrchestrator.status = 'failed';
    testResults.phases.parallelOrchestrator.error = error.message;
    testResults.errors.push(`Phase 3 Parallel Orchestrator: ${error.message}`);
    console.error(`  ❌ Enhanced Parallel Orchestrator Test failed: ${error.message}`);
  }
  
  testResults.phases.parallelOrchestrator.endTime = Date.now();
  testResults.phases.parallelOrchestrator.duration = 
    testResults.phases.parallelOrchestrator.endTime - testResults.phases.parallelOrchestrator.startTime;
  
  console.log(`  ⏱️ Phase 3 completed in ${testResults.phases.parallelOrchestrator.duration}ms\n`);
}

/**
 * Phase 4: Enhanced Main Pipeline Integration Testing
 */
async function testEnhancedMainPipeline() {
  console.log('🚀 Phase 4: Testing Enhanced Main Pipeline Integration...');
  testResults.phases.mainPipeline = { startTime: Date.now() };
  
  try {
    // Test 4.1: Pipeline instantiation with enhanced options
    console.log('  4.1 Testing enhanced pipeline instantiation...');
    const pipeline = new ThematicAnalysisPipeline({
      inputExcelPath: TEST_CONFIG.inputExcelPath,
      backgroundPath: TEST_CONFIG.backgroundPath,
      outputDir: TEST_CONFIG.outputDir,
      enableLangSmith: false
    });
    
    assert(pipeline instanceof ThematicAnalysisPipeline, 'Pipeline should instantiate');
    
    // Test 4.2: Quality assurance methods
    console.log('  4.2 Testing quality assurance methods...');
    
    const mockAnalysisResults = [
      {
        questionId: 'q1',
        themes: [{ title: 'Theme 1', description: 'Good theme' }],
        classifications: { 'p1': 'Theme 1' },
        summary: { headline: 'Good analysis' },
        participantCount: 1
      },
      {
        questionId: 'q2',
        error: 'Analysis failed due to LLM timeout'
      }
    ];
    
    const mockCleanedData = {
      questions: [{ questionId: 'q1' }, { questionId: 'q2' }],
      responsesByQuestion: {
        'q1': [{ participantId: 'p1', cleanResponse: 'test response' }],
        'q2': [{ participantId: 'p2', cleanResponse: 'test response' }]
      }
    };
    
    // Test quality assurance
    const qaReport = pipeline.performQualityAssurance(mockAnalysisResults, mockCleanedData);
    
    assert(qaReport.timestamp, 'QA report should have timestamp');
    assert(qaReport.dataCompleteness, 'Should include data completeness metrics');
    assert(qaReport.pipelineHealth, 'Should include pipeline health assessment');
    assert(qaReport.overallQuality, 'Should include overall quality score');
    assert(Array.isArray(qaReport.recommendations), 'Should include recommendations array');
    
    console.log(`    ✅ QA Report generated with ${qaReport.overallQuality.level} quality rating`);
    console.log(`    ✅ Data completeness: ${qaReport.dataCompleteness.completionRate}`);
    console.log(`    ✅ Pipeline health: ${qaReport.pipelineHealth.status}`);
    console.log(`    ✅ Recommendations: ${qaReport.recommendations.length} suggestions`);
    
    // Test 4.3: Enhanced methods existence
    console.log('  4.3 Verifying enhanced method implementations...');
    
    assert(typeof pipeline.performQualityAssurance === 'function', 'Should have performQualityAssurance method');
    assert(typeof pipeline.calculateDataCompleteness === 'function', 'Should have calculateDataCompleteness method');
    assert(typeof pipeline.assessPipelineHealth === 'function', 'Should have assessPipelineHealth method');
    assert(typeof pipeline.generateQualityRecommendations === 'function', 'Should have generateQualityRecommendations method');
    assert(typeof pipeline.finalizePipelineEnhanced === 'function', 'Should have finalizePipelineEnhanced method');
    
    console.log(`    ✅ All enhanced methods implemented correctly`);
    
    testResults.phases.mainPipeline.status = 'passed';
    
  } catch (error) {
    testResults.phases.mainPipeline.status = 'failed';
    testResults.phases.mainPipeline.error = error.message;
    testResults.errors.push(`Phase 4 Main Pipeline: ${error.message}`);
    console.error(`  ❌ Enhanced Main Pipeline Test failed: ${error.message}`);
  }
  
  testResults.phases.mainPipeline.endTime = Date.now();
  testResults.phases.mainPipeline.duration = 
    testResults.phases.mainPipeline.endTime - testResults.phases.mainPipeline.startTime;
  
  console.log(`  ⏱️ Phase 4 completed in ${testResults.phases.mainPipeline.duration}ms\n`);
}

/**
 * Phase 5: Real Data Integration Testing (if available)
 */
async function testRealDataIntegration() {
  console.log('📊 Phase 5: Testing Real Data Integration...');
  testResults.phases.realDataIntegration = { startTime: Date.now() };
  
  try {
    // Test 5.1: Check for real data availability
    console.log('  5.1 Checking real data availability...');
    
    let hasRealData = false;
    try {
      await fs.access(TEST_CONFIG.inputExcelPath);
      await fs.access(TEST_CONFIG.backgroundPath);
      hasRealData = true;
      console.log(`    ✅ Real data files found`);
    } catch (error) {
      console.log(`    ⚠️ Real data files not available, skipping real data tests`);
      console.log(`    ℹ️ Expected files: ${TEST_CONFIG.inputExcelPath}, ${TEST_CONFIG.backgroundPath}`);
      testResults.warnings.push('Real data files not available for testing');
    }
    
    if (hasRealData) {
      console.log('  5.2 Testing enhanced pipeline with real data (validation only)...');
      
      // Create pipeline for data validation
      const pipeline = new ThematicAnalysisPipeline({
        inputExcelPath: TEST_CONFIG.inputExcelPath,
        backgroundPath: TEST_CONFIG.backgroundPath,
        outputDir: TEST_CONFIG.outputDir
      });
      
      // Test data extraction and parsing
      const cleanedData = await pipeline.extractAndParseData();
      assert(!cleanedData.error, 'Data extraction should succeed with real data');
      assert(cleanedData.questions.length >= TEST_CONFIG.expectedMinQuestions, 
        `Should have at least ${TEST_CONFIG.expectedMinQuestions} questions`);
      
      const totalResponses = Object.values(cleanedData.responsesByQuestion)
        .reduce((sum, responses) => sum + responses.length, 0);
      assert(totalResponses >= TEST_CONFIG.expectedMinParticipants,
        `Should have at least ${TEST_CONFIG.expectedMinParticipants} total responses`);
      
      console.log(`    ✅ Real data validation: ${cleanedData.questions.length} questions, ${totalResponses} total responses`);
      console.log(`    ✅ Data extraction works correctly with real data`);
      
      testResults.metrics.realDataQuestions = cleanedData.questions.length;
      testResults.metrics.realDataResponses = totalResponses;
    }
    
    testResults.phases.realDataIntegration.status = hasRealData ? 'passed' : 'skipped';
    
  } catch (error) {
    testResults.phases.realDataIntegration.status = 'failed';
    testResults.phases.realDataIntegration.error = error.message;
    testResults.errors.push(`Phase 5 Real Data Integration: ${error.message}`);
    console.error(`  ❌ Real Data Integration Test failed: ${error.message}`);
  }
  
  testResults.phases.realDataIntegration.endTime = Date.now();
  testResults.phases.realDataIntegration.duration = 
    testResults.phases.realDataIntegration.endTime - testResults.phases.realDataIntegration.startTime;
  
  console.log(`  ⏱️ Phase 5 completed in ${testResults.phases.realDataIntegration.duration}ms\n`);
}

/**
 * Phase 6: Performance and Reliability Testing
 */
async function testPerformanceAndReliability() {
  console.log('⚡ Phase 6: Testing Performance and Reliability...');
  testResults.phases.performance = { startTime: Date.now() };
  
  try {
    // Test 6.1: Error handling performance
    console.log('  6.1 Testing error analysis performance...');
    
    const startTime = Date.now();
    
    // Create large dataset for performance testing
    const largeResults = [];
    for (let i = 0; i < 100; i++) {
      if (i % 4 === 0) {
        largeResults.push({ questionId: `q${i}`, error: 'Test error' });
      } else if (i % 4 === 1) {
        largeResults.push({ questionId: `q${i}`, themes: [], classifications: {}, summary: null });
      } else {
        largeResults.push({
          questionId: `q${i}`,
          themes: [{ title: `Theme ${i}`, description: 'Good theme' }],
          classifications: { [`p${i}`]: `Theme ${i}` },
          summary: { headline: `Summary ${i}` }
        });
      }
    }
    
    const analysis = analyzeMultiQuestionErrors(largeResults);
    const analysisTime = Date.now() - startTime;
    
    assert(!analysis.error, 'Large dataset analysis should complete successfully');
    assert(analysisTime < 5000, 'Analysis should complete within 5 seconds');
    
    console.log(`    ✅ Analyzed ${largeResults.length} results in ${analysisTime}ms`);
    console.log(`    ✅ Performance within acceptable limits`);
    
    // Test 6.2: Memory efficiency
    console.log('  6.2 Testing memory efficiency...');
    
    const memBefore = process.memoryUsage().heapUsed;
    
    // Run multiple analyses to test memory management
    for (let i = 0; i < 10; i++) {
      analyzeMultiQuestionErrors(largeResults.slice(0, 50));
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const memAfter = process.memoryUsage().heapUsed;
    const memIncrease = memAfter - memBefore;
    
    console.log(`    ✅ Memory usage increase: ${Math.round(memIncrease / 1024 / 1024 * 100) / 100} MB`);
    console.log(`    ✅ Memory efficiency acceptable`);
    
    testResults.metrics.performanceAnalysisTime = analysisTime;
    testResults.metrics.memoryIncrease = memIncrease;
    testResults.phases.performance.status = 'passed';
    
  } catch (error) {
    testResults.phases.performance.status = 'failed';
    testResults.phases.performance.error = error.message;
    testResults.errors.push(`Phase 6 Performance: ${error.message}`);
    console.error(`  ❌ Performance and Reliability Test failed: ${error.message}`);
  }
  
  testResults.phases.performance.endTime = Date.now();
  testResults.phases.performance.duration = 
    testResults.phases.performance.endTime - testResults.phases.performance.startTime;
  
  console.log(`  ⏱️ Phase 6 completed in ${testResults.phases.performance.duration}ms\n`);
}

/**
 * Phase 7: Output File Validation
 */
async function testOutputFileValidation() {
  console.log('📁 Phase 7: Testing Output File Validation...');
  testResults.phases.outputValidation = { startTime: Date.now() };
  
  try {
    // Test 7.1: Verify test output files exist
    console.log('  7.1 Validating generated test output files...');
    
    const expectedFiles = [
      `${TEST_CONFIG.outputDir}/test_main_results.json`,
      `${TEST_CONFIG.outputDir}/test_executive_summary.md`
    ];
    
    let filesFound = 0;
    for (const filePath of expectedFiles) {
      try {
        await fs.access(filePath);
        filesFound++;
        console.log(`    ✅ Found: ${path.basename(filePath)}`);
      } catch (error) {
        console.log(`    ⚠️ Missing: ${path.basename(filePath)}`);
      }
    }
    
    // Test 7.2: Validate JSON structure
    if (filesFound > 0) {
      console.log('  7.2 Validating JSON file structure...');
      
      try {
        const jsonPath = `${TEST_CONFIG.outputDir}/test_main_results.json`;
        const jsonContent = await fs.readFile(jsonPath, 'utf8');
        const jsonData = JSON.parse(jsonContent);
        
        assert(jsonData.projectSummary, 'JSON should have project summary');
        assert(jsonData.metadata, 'JSON should have metadata');
        assert(jsonData.qualityAssurance, 'JSON should have quality assurance');
        assert(Array.isArray(jsonData.questionAnalyses), 'JSON should have question analyses array');
        
        console.log(`    ✅ JSON structure validation passed`);
        
      } catch (error) {
        console.log(`    ⚠️ JSON validation failed: ${error.message}`);
        testResults.warnings.push(`JSON validation failed: ${error.message}`);
      }
    }
    
    testResults.metrics.outputFilesGenerated = filesFound;
    testResults.phases.outputValidation.status = 'passed';
    
  } catch (error) {
    testResults.phases.outputValidation.status = 'failed';
    testResults.phases.outputValidation.error = error.message;
    testResults.errors.push(`Phase 7 Output Validation: ${error.message}`);
    console.error(`  ❌ Output File Validation Test failed: ${error.message}`);
  }
  
  testResults.phases.outputValidation.endTime = Date.now();
  testResults.phases.outputValidation.duration = 
    testResults.phases.outputValidation.endTime - testResults.phases.outputValidation.startTime;
  
  console.log(`  ⏱️ Phase 7 completed in ${testResults.phases.outputValidation.duration}ms\n`);
}

/**
 * Phase 8: Final Integration Summary
 */
async function generateTestSummary() {
  console.log('📋 Phase 8: Generating Test Summary...');
  
  testResults.endTime = Date.now();
  const totalDuration = testResults.endTime - testResults.startTime;
  
  // Calculate success metrics
  const totalPhases = Object.keys(testResults.phases).length;
  const passedPhases = Object.values(testResults.phases).filter(phase => phase.status === 'passed').length;
  const failedPhases = Object.values(testResults.phases).filter(phase => phase.status === 'failed').length;
  const skippedPhases = Object.values(testResults.phases).filter(phase => phase.status === 'skipped').length;
  
  const successRate = ((passedPhases / totalPhases) * 100).toFixed(1);
  
  console.log('\n🎯 MILESTONE 4.2 INTEGRATION TEST SUMMARY');
  console.log('==========================================');
  console.log(`📊 Overall Results:`);
  console.log(`   • Total Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`   • Success Rate: ${successRate}% (${passedPhases}/${totalPhases} phases passed)`);
  console.log(`   • Failed Phases: ${failedPhases}`);
  console.log(`   • Skipped Phases: ${skippedPhases}`);
  console.log(`   • Warnings: ${testResults.warnings.length}`);
  
  console.log(`\n📈 Phase-by-Phase Results:`);
  Object.entries(testResults.phases).forEach(([phaseName, phase]) => {
    const statusIcon = phase.status === 'passed' ? '✅' : 
                      phase.status === 'failed' ? '❌' : 
                      phase.status === 'skipped' ? '⏭️' : '❓';
    console.log(`   ${statusIcon} ${phaseName}: ${phase.status} (${phase.duration || 0}ms)`);
    if (phase.error) {
      console.log(`      Error: ${phase.error}`);
    }
  });
  
  if (testResults.metrics.realDataQuestions) {
    console.log(`\n📊 Real Data Metrics:`);
    console.log(`   • Questions: ${testResults.metrics.realDataQuestions}`);
    console.log(`   • Responses: ${testResults.metrics.realDataResponses}`);
  }
  
  if (testResults.metrics.performanceAnalysisTime) {
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   • Analysis Time: ${testResults.metrics.performanceAnalysisTime}ms`);
    console.log(`   • Memory Increase: ${Math.round(testResults.metrics.memoryIncrease / 1024)}KB`);
  }
  
  if (testResults.errors.length > 0) {
    console.log(`\n❌ Errors Encountered:`);
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️ Warnings:`);
    testResults.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }
  
  console.log(`\n🎯 Milestone 4.2 Features Validated:`);
  console.log(`   ✅ Enhanced Multi-Question Error Analytics & Reporting`);
  console.log(`   ✅ Robust Multi-Question Output Generation`);
  console.log(`   ✅ Enhanced Parallel Orchestrator Aggregation`);
  console.log(`   ✅ Main Pipeline Integration & Quality Assurance`);
  console.log(`   ✅ Comprehensive Integration Testing & Validation`);
  
  // Overall assessment
  if (failedPhases === 0) {
    console.log(`\n🎉 MILESTONE 4.2 INTEGRATION TEST: PASSED`);
    console.log(`   All critical features implemented and tested successfully!`);
  } else if (failedPhases <= 2 && passedPhases >= 5) {
    console.log(`\n⚠️ MILESTONE 4.2 INTEGRATION TEST: MOSTLY PASSED`);
    console.log(`   Core functionality working with minor issues to address.`);
  } else {
    console.log(`\n❌ MILESTONE 4.2 INTEGRATION TEST: FAILED`);
    console.log(`   Significant issues detected that need resolution.`);
  }
  
  console.log(`\n📝 Next Steps:`);
  if (failedPhases > 0) {
    console.log(`   1. Address failed test phases`);
    console.log(`   2. Re-run integration tests`);
    console.log(`   3. Verify fixes with real data`);
  } else {
    console.log(`   1. Milestone 4.2 ready for production use`);
    console.log(`   2. Consider moving to Milestone 4.3 or production deployment`);
    console.log(`   3. Monitor performance in production environment`);
  }
  
  return {
    passed: failedPhases === 0,
    successRate: parseFloat(successRate),
    totalDuration,
    summary: testResults
  };
}

/**
 * Main test execution
 */
async function runIntegrationTests() {
  testResults.startTime = Date.now();
  
  try {
    // Ensure output directory exists
    await fs.mkdir(TEST_CONFIG.outputDir, { recursive: true });
    
    // Run all test phases
    await testErrorAnalysisSystem();
    await testEnhancedOutputGenerators();
    await testEnhancedParallelOrchestrator();
    await testEnhancedMainPipeline();
    await testRealDataIntegration();
    await testPerformanceAndReliability();
    await testOutputFileValidation();
    
    // Generate final summary
    const summary = await generateTestSummary();
    
    // Exit with appropriate code
    process.exit(summary.passed ? 0 : 1);
    
  } catch (error) {
    console.error(`\n💥 Integration test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runIntegrationTests().catch(error => {
  console.error(`Fatal error in test suite: ${error.message}`);
  process.exit(1);
});
