/**
 * Production Validation Test Suite for Milestone 4.3: Final Production Readiness
 * 
 * Comprehensive end-to-end testing with full dataset validation, performance monitoring,
 * edge case testing, and production deployment simulation.
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { ThematicAnalysisPipeline } from '../src/main.js';
import { analyzeMultiQuestionErrors } from '../src/utils/validation/error-analyzer.js';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { validateConfig } from '../src/utils/config/constants.js';

/**
 * Production test configuration
 */
const PRODUCTION_CONFIG = {
  inputExcelPath: 'inputs/data.xlsx',
  backgroundPath: 'inputs/project_background.txt',
  outputDir: 'outputs/production-validation',
  maxExecutionTime: 8 * 60 * 1000, // 8 minutes max for production
  minPerformanceThreshold: 6 * 60 * 1000, // 6 minutes expected
  expectedFullDataset: {
    minQuestions: 6,
    minParticipants: 100,
    minResponses: 500
  }
};

/**
 * Production test results tracker
 */
let productionResults = {
  startTime: null,
  endTime: null,
  phases: {},
  errors: [],
  warnings: [],
  metrics: {
    performance: {},
    quality: {},
    reliability: {}
  },
  outputValidation: {}
};

console.log('🏭 Starting Production Validation Test Suite');
console.log('============================================\n');

/**
 * Phase 1: Environment and Configuration Validation
 */
async function validateProductionEnvironment() {
  console.log('🔧 Phase 1: Production Environment Validation...');
  productionResults.phases.environment = { startTime: Date.now() };
  
  try {
    // Test configuration validation
    console.log('  📋 Validating system configuration...');
    const configValidation = validateConfig();
    if (configValidation.error) {
      throw new Error(`Configuration validation failed: ${configValidation.error}`);
    }
    console.log('  ✅ Configuration validation passed');
    
    // Verify input files exist
    console.log('  📂 Checking input file availability...');
    await fs.access(PRODUCTION_CONFIG.inputExcelPath);
    await fs.access(PRODUCTION_CONFIG.backgroundPath);
    console.log('  ✅ Input files accessible');
    
    // Test output directory creation
    console.log('  📁 Testing output directory creation...');
    await fs.mkdir(PRODUCTION_CONFIG.outputDir, { recursive: true });
    console.log('  ✅ Output directory ready');
    
    // Validate environment variables
    console.log('  🔑 Checking required environment variables...');
    const requiredEnvVars = ['OPENAI_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    console.log('  ✅ Environment variables configured');
    
    productionResults.phases.environment.success = true;
    productionResults.phases.environment.duration = Date.now() - productionResults.phases.environment.startTime;
    console.log(`  ⏱️  Environment validation completed in ${productionResults.phases.environment.duration}ms\n`);
    
  } catch (error) {
    productionResults.phases.environment.success = false;
    productionResults.phases.environment.error = error.message;
    productionResults.errors.push(`Environment validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Phase 2: Full Dataset Processing and Performance Benchmarking
 */
async function runFullDatasetBenchmark() {
  console.log('📊 Phase 2: Full Dataset Processing Benchmark...');
  productionResults.phases.fullDataset = { startTime: Date.now() };
  
  try {
    // Initialize pipeline
    console.log('  🚀 Initializing production pipeline...');
    const pipeline = new ThematicAnalysisPipeline({
      inputExcelPath: PRODUCTION_CONFIG.inputExcelPath,
      backgroundPath: PRODUCTION_CONFIG.backgroundPath,
      outputDir: PRODUCTION_CONFIG.outputDir,
      enableLangSmith: false // Disable for consistent testing
    });
    
    // Run complete analysis with performance monitoring
    console.log('  ⚡ Running complete analysis with full dataset...');
    const startTime = Date.now();
    const results = await pipeline.run();
    const executionTime = Date.now() - startTime;
    
    if (results.error) {
      throw new Error(`Pipeline execution failed: ${results.error}`);
    }
    
    console.log('  ✅ Pipeline execution completed successfully');
    
    // Performance validation
    productionResults.metrics.performance.executionTime = executionTime;
    productionResults.metrics.performance.executionTimeMinutes = Math.round(executionTime / 60000 * 100) / 100;
    
    console.log(`  ⏱️  Total execution time: ${productionResults.metrics.performance.executionTimeMinutes} minutes`);
    
    if (executionTime > PRODUCTION_CONFIG.maxExecutionTime) {
      productionResults.warnings.push(`Execution time ${productionResults.metrics.performance.executionTimeMinutes}min exceeds maximum threshold of ${PRODUCTION_CONFIG.maxExecutionTime / 60000}min`);
    }
    
    if (executionTime <= PRODUCTION_CONFIG.minPerformanceThreshold) {
      console.log('  🎯 Performance meets production requirements');
    } else {
      console.log('  ⚠️  Performance slightly above expected threshold but acceptable');
    }
    
    // Dataset validation
    console.log('  📈 Validating dataset processing...');
    const datasetStats = results.extractedData.metadata;
    
    productionResults.metrics.quality.totalQuestions = datasetStats.totalQuestions;
    productionResults.metrics.quality.totalParticipants = datasetStats.totalParticipants;
    productionResults.metrics.quality.totalResponses = datasetStats.totalResponses;
    
    console.log(`    Questions processed: ${datasetStats.totalQuestions}`);
    console.log(`    Participants: ${datasetStats.totalParticipants}`);
    console.log(`    Total responses: ${datasetStats.totalResponses}`);
    
    // Verify expected dataset size
    const expectedDataset = PRODUCTION_CONFIG.expectedFullDataset;
    if (datasetStats.totalQuestions < expectedDataset.minQuestions) {
      throw new Error(`Dataset too small: ${datasetStats.totalQuestions} questions < ${expectedDataset.minQuestions} minimum`);
    }
    if (datasetStats.totalParticipants < expectedDataset.minParticipants) {
      throw new Error(`Dataset too small: ${datasetStats.totalParticipants} participants < ${expectedDataset.minParticipants} minimum`);
    }
    if (datasetStats.totalResponses < expectedDataset.minResponses) {
      throw new Error(`Dataset too small: ${datasetStats.totalResponses} responses < ${expectedDataset.minResponses} minimum`);
    }
    
    console.log('  ✅ Dataset size validation passed');
    
    // Store results for subsequent phases
    productionResults.analysisResults = results.analyses;
    productionResults.outputFiles = results.outputFiles;
    
    productionResults.phases.fullDataset.success = true;
    productionResults.phases.fullDataset.duration = Date.now() - productionResults.phases.fullDataset.startTime;
    console.log(`  ⏱️  Full dataset processing completed in ${Math.round(productionResults.phases.fullDataset.duration / 60000 * 100) / 100} minutes\n`);
    
  } catch (error) {
    productionResults.phases.fullDataset.success = false;
    productionResults.phases.fullDataset.error = error.message;
    productionResults.errors.push(`Full dataset processing failed: ${error.message}`);
    throw error;
  }
}

/**
 * Phase 3: Output File Validation and Quality Assessment
 */
async function validateOutputQuality() {
  console.log('📋 Phase 3: Output Quality Validation...');
  productionResults.phases.outputValidation = { startTime: Date.now() };
  
  try {
    console.log('  📄 Validating JSON output files...');
    
    // Validate main results JSON
    const mainResultsPath = path.join(PRODUCTION_CONFIG.outputDir, 'thematic_analysis.json');
    const technicalResultsPath = path.join(PRODUCTION_CONFIG.outputDir, 'technical_pipeline_results.json');
    
    await fs.access(mainResultsPath);
    await fs.access(technicalResultsPath);
    
    const mainResults = JSON.parse(await fs.readFile(mainResultsPath, 'utf8'));
    const technicalResults = JSON.parse(await fs.readFile(technicalResultsPath, 'utf8'));
    
    console.log('  ✅ JSON files exist and are valid');
    
    // Validate main results structure
    assert(mainResults.analyses && Array.isArray(mainResults.analyses), 'Main results should contain analyses array');
    assert(mainResults.metadata, 'Main results should contain metadata');
    assert(mainResults.processedAt, 'Main results should contain processedAt timestamp');
    
    productionResults.outputValidation.mainResultsValid = true;
    productionResults.outputValidation.analysesCount = mainResults.analyses.length;
    
    console.log(`    Analyses in main results: ${mainResults.analyses.length}`);
    
    // Validate technical results structure
    assert(technicalResults.projectSummary, 'Technical results should contain project summary');
    assert(technicalResults.questionAnalyses, 'Technical results should contain question analyses');
    
    productionResults.outputValidation.technicalResultsValid = true;
    
    console.log('  📊 Validating Excel output files...');
    
    // Check for Excel classification files
    const outputFiles = await fs.readdir(PRODUCTION_CONFIG.outputDir);
    const excelFiles = outputFiles.filter(file => file.endsWith('_classifications.xlsx'));
    
    productionResults.outputValidation.excelFilesCount = excelFiles.length;
    console.log(`    Excel classification files: ${excelFiles.length}`);
    
    if (excelFiles.length === 0) {
      productionResults.warnings.push('No Excel classification files generated');
    }
    
    console.log('  📝 Validating Markdown executive summary...');
    
    // Validate executive summary
    const summaryPath = path.join(PRODUCTION_CONFIG.outputDir, 'executive_summary.md');
    await fs.access(summaryPath);
    
    const summaryContent = await fs.readFile(summaryPath, 'utf8');
    assert(summaryContent.length > 1000, 'Executive summary should be substantial (>1000 characters)');
    assert(summaryContent.includes('# Executive Summary'), 'Executive summary should have proper header');
    
    productionResults.outputValidation.summaryValid = true;
    productionResults.outputValidation.summaryLength = summaryContent.length;
    
    console.log(`    Executive summary length: ${summaryContent.length} characters`);
    console.log('  ✅ All output files validated successfully');
    
    productionResults.phases.outputValidation.success = true;
    productionResults.phases.outputValidation.duration = Date.now() - productionResults.phases.outputValidation.startTime;
    console.log(`  ⏱️  Output validation completed in ${productionResults.phases.outputValidation.duration}ms\n`);
    
  } catch (error) {
    productionResults.phases.outputValidation.success = false;
    productionResults.phases.outputValidation.error = error.message;
    productionResults.errors.push(`Output validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Phase 4: Error Handling and Resilience Testing
 */
async function testErrorHandlingResilience() {
  console.log('🛡️ Phase 4: Error Handling and Resilience Testing...');
  productionResults.phases.resilience = { startTime: Date.now() };
  
  try {
    console.log('  🔍 Testing error analysis capabilities...');
    
    // Test error analysis system with mock failure scenarios
    const mockAnalyses = [
      {
        questionId: 'test_success',
        themes: [{ title: 'Success Theme', description: 'Test' }],
        classifications: Array(10).fill({ participantId: 'test', theme: 'Success Theme' }),
        quotes: { 'Success Theme': [{ quote: 'test quote', participantId: 'test' }] },
        summary: { headline: 'Test Success', summary: 'All good' }
      },
      {
        questionId: 'test_partial_failure',
        themes: [{ title: 'Partial Theme', description: 'Test' }],
        classifications: [], // Missing classifications
        quotes: {},
        summary: { headline: 'Partial Success', summary: 'Some issues' }
      },
      {
        questionId: 'test_complete_failure',
        error: 'LLM_FAILURE: Mock failure for testing'
      }
    ];
    
    const errorAnalysis = analyzeMultiQuestionErrors(mockAnalyses);
    
    assert(errorAnalysis.summary, 'Error analysis should provide summary');
    assert(errorAnalysis.errorCategories, 'Error analysis should categorize errors');
    assert(errorAnalysis.recommendations, 'Error analysis should provide recommendations');
    
    productionResults.metrics.reliability.errorAnalysisWorking = true;
    
    console.log('  ✅ Error analysis system functioning correctly');
    
    // Test graceful degradation
    console.log('  🔄 Testing graceful degradation patterns...');
    
    if (productionResults.analysisResults) {
      // Check if system handled partial failures gracefully
      const failedAnalyses = productionResults.analysisResults.filter(analysis => analysis.error);
      const successfulAnalyses = productionResults.analysisResults.filter(analysis => !analysis.error);
      
      productionResults.metrics.reliability.failureRate = failedAnalyses.length / productionResults.analysisResults.length;
      productionResults.metrics.reliability.successRate = successfulAnalyses.length / productionResults.analysisResults.length;
      
      console.log(`    Success rate: ${Math.round(productionResults.metrics.reliability.successRate * 100)}%`);
      console.log(`    Failure rate: ${Math.round(productionResults.metrics.reliability.failureRate * 100)}%`);
      
      if (productionResults.metrics.reliability.successRate >= 0.8) {
        console.log('  ✅ Acceptable success rate for production');
      } else {
        productionResults.warnings.push(`Success rate ${Math.round(productionResults.metrics.reliability.successRate * 100)}% below 80% threshold`);
      }
    }
    
    productionResults.phases.resilience.success = true;
    productionResults.phases.resilience.duration = Date.now() - productionResults.phases.resilience.startTime;
    console.log(`  ⏱️  Resilience testing completed in ${productionResults.phases.resilience.duration}ms\n`);
    
  } catch (error) {
    productionResults.phases.resilience.success = false;
    productionResults.phases.resilience.error = error.message;
    productionResults.errors.push(`Resilience testing failed: ${error.message}`);
    throw error;
  }
}

/**
 * Phase 5: Production Readiness Assessment
 */
async function assessProductionReadiness() {
  console.log('🎯 Phase 5: Production Readiness Assessment...');
  productionResults.phases.readiness = { startTime: Date.now() };
  
  try {
    console.log('  📊 Calculating overall production readiness score...');
    
    // Performance score (40% weight)
    let performanceScore = 100;
    if (productionResults.metrics.performance.executionTime > PRODUCTION_CONFIG.maxExecutionTime) {
      performanceScore = Math.max(0, 100 - ((productionResults.metrics.performance.executionTime - PRODUCTION_CONFIG.maxExecutionTime) / 60000) * 10);
    }
    
    // Quality score (30% weight)
    let qualityScore = 100;
    const expectedDataset = PRODUCTION_CONFIG.expectedFullDataset;
    if (productionResults.metrics.quality.totalQuestions < expectedDataset.minQuestions) {
      qualityScore -= 20;
    }
    if (productionResults.metrics.quality.totalParticipants < expectedDataset.minParticipants) {
      qualityScore -= 20;
    }
    
    // Reliability score (30% weight)
    let reliabilityScore = 100;
    if (productionResults.metrics.reliability.successRate < 0.8) {
      reliabilityScore = productionResults.metrics.reliability.successRate * 100;
    }
    
    // Overall score
    const overallScore = (performanceScore * 0.4) + (qualityScore * 0.3) + (reliabilityScore * 0.3);
    
    productionResults.metrics.productionReadiness = {
      overallScore: Math.round(overallScore),
      performanceScore: Math.round(performanceScore),
      qualityScore: Math.round(qualityScore),
      reliabilityScore: Math.round(reliabilityScore),
      recommendation: overallScore >= 90 ? 'READY' : overallScore >= 80 ? 'READY_WITH_MONITORING' : 'NEEDS_IMPROVEMENT'
    };
    
    console.log(`    Performance Score: ${Math.round(performanceScore)}%`);
    console.log(`    Quality Score: ${Math.round(qualityScore)}%`);
    console.log(`    Reliability Score: ${Math.round(reliabilityScore)}%`);
    console.log(`    Overall Score: ${Math.round(overallScore)}%`);
    console.log(`    Recommendation: ${productionResults.metrics.productionReadiness.recommendation}`);
    
    // Production readiness checklist
    console.log('  ✅ Production Readiness Checklist:');
    console.log(`    ✅ Environment validation: ${productionResults.phases.environment?.success ? 'PASS' : 'FAIL'}`);
    console.log(`    ✅ Full dataset processing: ${productionResults.phases.fullDataset?.success ? 'PASS' : 'FAIL'}`);
    console.log(`    ✅ Output quality validation: ${productionResults.phases.outputValidation?.success ? 'PASS' : 'FAIL'}`);
    console.log(`    ✅ Error handling resilience: ${productionResults.phases.resilience?.success ? 'PASS' : 'FAIL'}`);
    console.log(`    ✅ Performance requirements: ${performanceScore >= 80 ? 'PASS' : 'FAIL'}`);
    
    productionResults.phases.readiness.success = true;
    productionResults.phases.readiness.duration = Date.now() - productionResults.phases.readiness.startTime;
    console.log(`  ⏱️  Readiness assessment completed in ${productionResults.phases.readiness.duration}ms\n`);
    
  } catch (error) {
    productionResults.phases.readiness.success = false;
    productionResults.phases.readiness.error = error.message;
    productionResults.errors.push(`Readiness assessment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate production validation report
 */
async function generateValidationReport() {
  console.log('📋 Generating Production Validation Report...');
  
  const report = {
    testSuite: 'Production Validation',
    timestamp: new Date().toISOString(),
    duration: productionResults.endTime - productionResults.startTime,
    durationMinutes: Math.round((productionResults.endTime - productionResults.startTime) / 60000 * 100) / 100,
    phases: productionResults.phases,
    metrics: productionResults.metrics,
    outputValidation: productionResults.outputValidation,
    errors: productionResults.errors,
    warnings: productionResults.warnings,
    recommendation: productionResults.metrics.productionReadiness?.recommendation || 'UNKNOWN'
  };
  
  const reportPath = path.join(PRODUCTION_CONFIG.outputDir, 'production_validation_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Production validation report saved to: ${reportPath}`);
  return report;
}

/**
 * Main test execution
 */
async function runProductionValidation() {
  try {
    productionResults.startTime = Date.now();
    
    await validateProductionEnvironment();
    await runFullDatasetBenchmark();
    await validateOutputQuality();
    await testErrorHandlingResilience();
    await assessProductionReadiness();
    
    productionResults.endTime = Date.now();
    
    const report = await generateValidationReport();
    
    // Final summary
    console.log('🎉 Production Validation Test Suite Completed');
    console.log('===========================================');
    console.log(`⏱️  Total execution time: ${report.durationMinutes} minutes`);
    console.log(`📊 Overall production readiness: ${report.metrics.productionReadiness.overallScore}%`);
    console.log(`🎯 Recommendation: ${report.recommendation}`);
    
    if (productionResults.errors.length > 0) {
      console.log(`❌ Errors encountered: ${productionResults.errors.length}`);
      productionResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (productionResults.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${productionResults.warnings.length}`);
      productionResults.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    const allPhasesPassed = Object.values(productionResults.phases).every(phase => phase.success);
    if (allPhasesPassed && productionResults.errors.length === 0) {
      console.log('\n✅ ALL PRODUCTION VALIDATION TESTS PASSED');
      console.log('🚀 System is ready for production deployment!');
      process.exit(0);
    } else {
      console.log('\n❌ SOME PRODUCTION VALIDATION TESTS FAILED');
      console.log('🔧 Review errors and warnings before production deployment');
      process.exit(1);
    }
    
  } catch (error) {
    productionResults.endTime = Date.now();
    console.error(`❌ Production validation failed: ${error.message}`);
    console.error('🔧 System requires fixes before production deployment');
    
    try {
      await generateValidationReport();
    } catch (reportError) {
      console.error(`Failed to generate validation report: ${reportError.message}`);
    }
    
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionValidation();
}

export { runProductionValidation, PRODUCTION_CONFIG };
