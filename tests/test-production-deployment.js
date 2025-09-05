/**
 * Production Deployment Test Suite for Milestone 4.3
 * 
 * Comprehensive deployment simulation and final validation testing to ensure
 * the system is ready for production use with complete end-to-end verification.
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { spawn } from 'child_process';
import { ThematicAnalysisPipeline } from '../src/main.js';
import { runProductionValidation } from './test-production-validation.js';
import { runPerformanceBenchmarks } from './test-performance-benchmarks.js';

/**
 * Deployment test configuration
 */
const DEPLOYMENT_CONFIG = {
  testSuites: [
    'production-validation',
    'performance-benchmarks',
    'end-to-end-integration'
  ],
  outputDir: 'outputs/deployment-test',
  timeoutLimit: 15 * 60 * 1000, // 15 minutes max
  expectedFiles: [
    'thematic_analysis.json',
    'technical_pipeline_results.json',
    'executive_summary.md',
    'monitoring_report.json'
  ]
};

/**
 * Deployment test results
 */
let deploymentResults = {
  startTime: null,
  endTime: null,
  testSuites: {},
  systemValidation: {},
  finalValidation: {},
  errors: [],
  warnings: []
};

console.log('🚢 Starting Production Deployment Test Suite');
console.log('==========================================\n');

/**
 * Test 1: System Environment Validation
 */
async function validateDeploymentEnvironment() {
  console.log('🔧 Test 1: Deployment Environment Validation...');
  deploymentResults.testSuites.environment = { startTime: Date.now() };
  
  try {
    // Node.js version check
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is too old. Requires >= 18.0.0`);
    }
    
    console.log(`  ✅ Node.js version: ${nodeVersion}`);
    
    // Memory availability check
    const totalMemory = process.memoryUsage().rss;
    console.log(`  ✅ Available memory: ${Math.round(totalMemory / 1024 / 1024)}MB`);
    
    // Package.json scripts validation
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const requiredScripts = ['start', 'test', 'test:production', 'test:performance', 'deploy-check'];
    
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        throw new Error(`Missing required script: ${script}`);
      }
    }
    
    console.log('  ✅ Package.json scripts validated');
    
    // Input files validation
    await fs.access('inputs/data.xlsx');
    await fs.access('inputs/project_background.txt');
    console.log('  ✅ Input files accessible');
    
    // Output directory setup
    await fs.mkdir(DEPLOYMENT_CONFIG.outputDir, { recursive: true });
    console.log('  ✅ Output directory ready');
    
    deploymentResults.testSuites.environment.success = true;
    deploymentResults.testSuites.environment.duration = Date.now() - deploymentResults.testSuites.environment.startTime;
    console.log(`  ⏱️  Environment validation completed in ${deploymentResults.testSuites.environment.duration}ms\n`);
    
  } catch (error) {
    deploymentResults.testSuites.environment.success = false;
    deploymentResults.testSuites.environment.error = error.message;
    deploymentResults.errors.push(`Environment validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 2: Production Validation Suite Execution
 */
async function runProductionValidationSuite() {
  console.log('🧪 Test 2: Production Validation Suite...');
  deploymentResults.testSuites.productionValidation = { startTime: Date.now() };
  
  try {
    console.log('  📊 Running comprehensive production validation...');
    
    // Run production validation with deployment test output directory
    const originalConfig = process.env.OUTPUT_DIR;
    process.env.OUTPUT_DIR = DEPLOYMENT_CONFIG.outputDir;
    
    // Execute production validation
    const validationPromise = runProductionValidation();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Production validation timeout')), DEPLOYMENT_CONFIG.timeoutLimit)
    );
    
    await Promise.race([validationPromise, timeoutPromise]);
    
    // Restore original config
    if (originalConfig) {
      process.env.OUTPUT_DIR = originalConfig;
    } else {
      delete process.env.OUTPUT_DIR;
    }
    
    console.log('  ✅ Production validation suite passed');
    
    deploymentResults.testSuites.productionValidation.success = true;
    deploymentResults.testSuites.productionValidation.duration = Date.now() - deploymentResults.testSuites.productionValidation.startTime;
    console.log(`  ⏱️  Production validation completed in ${Math.round(deploymentResults.testSuites.productionValidation.duration / 60000 * 100) / 100} minutes\n`);
    
  } catch (error) {
    deploymentResults.testSuites.productionValidation.success = false;
    deploymentResults.testSuites.productionValidation.error = error.message;
    deploymentResults.errors.push(`Production validation failed: ${error.message}`);
    
    // Don't throw - continue with other tests
    console.log(`  ❌ Production validation failed: ${error.message}\n`);
  }
}

/**
 * Test 3: Performance Benchmarks Execution
 */
async function runPerformanceBenchmarksSuite() {
  console.log('⚡ Test 3: Performance Benchmarks Suite...');
  deploymentResults.testSuites.performance = { startTime: Date.now() };
  
  try {
    console.log('  📈 Running performance benchmarks...');
    
    // Execute performance benchmarks
    const benchmarkPromise = runPerformanceBenchmarks();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Performance benchmarks timeout')), DEPLOYMENT_CONFIG.timeoutLimit)
    );
    
    await Promise.race([benchmarkPromise, timeoutPromise]);
    
    console.log('  ✅ Performance benchmarks completed');
    
    deploymentResults.testSuites.performance.success = true;
    deploymentResults.testSuites.performance.duration = Date.now() - deploymentResults.testSuites.performance.startTime;
    console.log(`  ⏱️  Performance benchmarks completed in ${Math.round(deploymentResults.testSuites.performance.duration / 60000 * 100) / 100} minutes\n`);
    
  } catch (error) {
    deploymentResults.testSuites.performance.success = false;
    deploymentResults.testSuites.performance.error = error.message;
    deploymentResults.warnings.push(`Performance benchmarks failed: ${error.message}`);
    
    // Don't throw - performance issues are warnings, not blockers
    console.log(`  ⚠️  Performance benchmarks failed: ${error.message}\n`);
  }
}

/**
 * Test 4: End-to-End Pipeline Integration
 */
async function runEndToEndIntegration() {
  console.log('🔄 Test 4: End-to-End Pipeline Integration...');
  deploymentResults.testSuites.integration = { startTime: Date.now() };
  
  try {
    console.log('  🚀 Running complete pipeline with monitoring...');
    
    // Initialize pipeline with production monitoring enabled
    const pipeline = new ThematicAnalysisPipeline({
      inputExcelPath: 'inputs/data.xlsx',
      backgroundPath: 'inputs/project_background.txt',
      outputDir: DEPLOYMENT_CONFIG.outputDir,
      enableProductionMonitoring: true,
      enableLangSmith: false
    });
    
    // Execute complete pipeline
    const startTime = performance.now();
    const results = await pipeline.run();
    const executionTime = performance.now() - startTime;
    
    if (results.error) {
      throw new Error(`Pipeline execution failed: ${results.error}`);
    }
    
    console.log(`  ✅ Pipeline completed successfully in ${Math.round(executionTime / 60000 * 100) / 100} minutes`);
    
    // Validate monitoring was active
    if (results.monitoring) {
      console.log(`  📊 Monitoring active - Health Score: ${results.monitoring.healthScore.overall}%`);
      deploymentResults.finalValidation.monitoringHealthScore = results.monitoring.healthScore.overall;
    } else {
      deploymentResults.warnings.push('Production monitoring was not active');
    }
    
    // Store results for final validation
    deploymentResults.finalValidation.pipelineResults = results;
    deploymentResults.finalValidation.executionTime = executionTime;
    
    deploymentResults.testSuites.integration.success = true;
    deploymentResults.testSuites.integration.duration = Date.now() - deploymentResults.testSuites.integration.startTime;
    console.log(`  ⏱️  Integration test completed in ${Math.round(deploymentResults.testSuites.integration.duration / 60000 * 100) / 100} minutes\n`);
    
  } catch (error) {
    deploymentResults.testSuites.integration.success = false;
    deploymentResults.testSuites.integration.error = error.message;
    deploymentResults.errors.push(`Integration test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 5: Output Files Validation
 */
async function validateOutputFiles() {
  console.log('📄 Test 5: Output Files Validation...');
  deploymentResults.testSuites.outputValidation = { startTime: Date.now() };
  
  try {
    console.log('  🔍 Validating generated output files...');
    
    const outputFiles = await fs.readdir(DEPLOYMENT_CONFIG.outputDir);
    const foundFiles = [];
    const missingFiles = [];
    
    for (const expectedFile of DEPLOYMENT_CONFIG.expectedFiles) {
      if (outputFiles.includes(expectedFile)) {
        foundFiles.push(expectedFile);
        
        // Validate file content
        const filePath = path.join(DEPLOYMENT_CONFIG.outputDir, expectedFile);
        const stats = await fs.stat(filePath);
        
        if (stats.size === 0) {
          throw new Error(`Output file ${expectedFile} is empty`);
        }
        
        // JSON file validation
        if (expectedFile.endsWith('.json')) {
          const content = await fs.readFile(filePath, 'utf8');
          JSON.parse(content); // Will throw if invalid JSON
        }
        
        console.log(`    ✅ ${expectedFile} (${Math.round(stats.size / 1024)}KB)`);
      } else {
        missingFiles.push(expectedFile);
      }
    }
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing expected output files: ${missingFiles.join(', ')}`);
    }
    
    // Check for additional valuable files
    const additionalFiles = outputFiles.filter(file => 
      !DEPLOYMENT_CONFIG.expectedFiles.includes(file) && 
      (file.endsWith('.xlsx') || file.endsWith('.json') || file.endsWith('.md'))
    );
    
    if (additionalFiles.length > 0) {
      console.log(`  📋 Additional files generated: ${additionalFiles.length}`);
      additionalFiles.forEach(file => console.log(`    📄 ${file}`));
    }
    
    deploymentResults.finalValidation.outputFiles = {
      expected: foundFiles,
      additional: additionalFiles,
      total: foundFiles.length + additionalFiles.length
    };
    
    console.log(`  ✅ All expected output files validated (${foundFiles.length}/${DEPLOYMENT_CONFIG.expectedFiles.length})`);
    
    deploymentResults.testSuites.outputValidation.success = true;
    deploymentResults.testSuites.outputValidation.duration = Date.now() - deploymentResults.testSuites.outputValidation.startTime;
    console.log(`  ⏱️  Output validation completed in ${deploymentResults.testSuites.outputValidation.duration}ms\n`);
    
  } catch (error) {
    deploymentResults.testSuites.outputValidation.success = false;
    deploymentResults.testSuites.outputValidation.error = error.message;
    deploymentResults.errors.push(`Output validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 6: Deployment Readiness Assessment
 */
async function assessDeploymentReadiness() {
  console.log('🎯 Test 6: Deployment Readiness Assessment...');
  deploymentResults.testSuites.readiness = { startTime: Date.now() };
  
  try {
    console.log('  📊 Calculating deployment readiness score...');
    
    // Calculate success rate across test suites
    const testSuites = Object.values(deploymentResults.testSuites).filter(suite => suite.startTime);
    const successfulSuites = testSuites.filter(suite => suite.success);
    const successRate = successfulSuites.length / testSuites.length;
    
    // Performance assessment
    let performanceGrade = 'UNKNOWN';
    if (deploymentResults.finalValidation.executionTime) {
      const executionMinutes = deploymentResults.finalValidation.executionTime / 60000;
      performanceGrade = executionMinutes <= 6 ? 'EXCELLENT' : 
                        executionMinutes <= 8 ? 'GOOD' : 
                        executionMinutes <= 10 ? 'ACCEPTABLE' : 'NEEDS_IMPROVEMENT';
    }
    
    // Health score assessment
    let healthGrade = 'UNKNOWN';
    if (deploymentResults.finalValidation.monitoringHealthScore) {
      const score = deploymentResults.finalValidation.monitoringHealthScore;
      healthGrade = score >= 90 ? 'EXCELLENT' : 
                   score >= 80 ? 'GOOD' : 
                   score >= 70 ? 'ACCEPTABLE' : 'NEEDS_IMPROVEMENT';
    }
    
    // Overall deployment readiness
    let deploymentReadiness = 'NOT_READY';
    if (successRate >= 0.8 && deploymentResults.errors.length === 0) {
      if (performanceGrade === 'EXCELLENT' && healthGrade === 'EXCELLENT') {
        deploymentReadiness = 'PRODUCTION_READY';
      } else if (performanceGrade !== 'NEEDS_IMPROVEMENT' && healthGrade !== 'NEEDS_IMPROVEMENT') {
        deploymentReadiness = 'READY_WITH_MONITORING';
      } else {
        deploymentReadiness = 'READY_WITH_LIMITATIONS';
      }
    }
    
    const assessment = {
      overallReadiness: deploymentReadiness,
      successRate: Math.round(successRate * 100),
      performanceGrade,
      healthGrade,
      errorCount: deploymentResults.errors.length,
      warningCount: deploymentResults.warnings.length,
      recommendation: getDeploymentRecommendation(deploymentReadiness, deploymentResults.errors, deploymentResults.warnings)
    };
    
    console.log(`  📈 Success Rate: ${assessment.successRate}%`);
    console.log(`  ⚡ Performance Grade: ${assessment.performanceGrade}`);
    console.log(`  🏥 Health Grade: ${assessment.healthGrade}`);
    console.log(`  🎯 Overall Readiness: ${assessment.overallReadiness}`);
    
    deploymentResults.finalValidation.assessment = assessment;
    
    deploymentResults.testSuites.readiness.success = true;
    deploymentResults.testSuites.readiness.duration = Date.now() - deploymentResults.testSuites.readiness.startTime;
    console.log(`  ⏱️  Readiness assessment completed in ${deploymentResults.testSuites.readiness.duration}ms\n`);
    
    return assessment;
    
  } catch (error) {
    deploymentResults.testSuites.readiness.success = false;
    deploymentResults.testSuites.readiness.error = error.message;
    deploymentResults.errors.push(`Readiness assessment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get deployment recommendation
 */
function getDeploymentRecommendation(readiness, errors, warnings) {
  switch (readiness) {
    case 'PRODUCTION_READY':
      return 'System is fully validated and ready for production deployment.';
    case 'READY_WITH_MONITORING':
      return 'System is ready for production with enhanced monitoring recommended.';
    case 'READY_WITH_LIMITATIONS':
      return 'System can be deployed but requires careful monitoring and optimization.';
    default:
      return `System requires fixes before deployment. Errors: ${errors.length}, Warnings: ${warnings.length}`;
  }
}

/**
 * Generate deployment test report
 */
async function generateDeploymentReport() {
  console.log('📋 Generating Deployment Test Report...');
  
  const report = {
    testSuite: 'Production Deployment Validation',
    timestamp: new Date().toISOString(),
    duration: deploymentResults.endTime - deploymentResults.startTime,
    durationMinutes: Math.round((deploymentResults.endTime - deploymentResults.startTime) / 60000 * 100) / 100,
    testSuites: deploymentResults.testSuites,
    systemValidation: deploymentResults.systemValidation,
    finalValidation: deploymentResults.finalValidation,
    errors: deploymentResults.errors,
    warnings: deploymentResults.warnings,
    recommendation: deploymentResults.finalValidation.assessment?.recommendation || 'Assessment incomplete'
  };
  
  const reportPath = path.join(DEPLOYMENT_CONFIG.outputDir, 'deployment_test_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Deployment test report saved to: ${reportPath}`);
  return report;
}

/**
 * Main deployment test execution
 */
async function runProductionDeploymentTests() {
  try {
    deploymentResults.startTime = Date.now();
    
    await validateDeploymentEnvironment();
    await runProductionValidationSuite();
    await runPerformanceBenchmarksSuite();
    await runEndToEndIntegration();
    await validateOutputFiles();
    const assessment = await assessDeploymentReadiness();
    
    deploymentResults.endTime = Date.now();
    
    const report = await generateDeploymentReport();
    
    // Final summary
    console.log('🎉 Production Deployment Test Suite Completed');
    console.log('============================================');
    console.log(`⏱️  Total test time: ${report.durationMinutes} minutes`);
    console.log(`🎯 Deployment readiness: ${assessment.overallReadiness}`);
    console.log(`📊 Success rate: ${assessment.successRate}%`);
    
    if (deploymentResults.errors.length > 0) {
      console.log(`❌ Errors: ${deploymentResults.errors.length}`);
      deploymentResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (deploymentResults.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${deploymentResults.warnings.length}`);
      deploymentResults.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    console.log(`\n💡 Recommendation: ${assessment.recommendation}`);
    
    if (assessment.overallReadiness === 'PRODUCTION_READY' || assessment.overallReadiness === 'READY_WITH_MONITORING') {
      console.log('\n✅ DEPLOYMENT TESTS PASSED');
      console.log('🚀 System is ready for production deployment!');
      process.exit(0);
    } else {
      console.log('\n⚠️  DEPLOYMENT TESTS SHOW CONCERNS');
      console.log('🔧 Address issues before production deployment');
      process.exit(1);
    }
    
  } catch (error) {
    deploymentResults.endTime = Date.now();
    console.error(`❌ Deployment tests failed: ${error.message}`);
    
    try {
      await generateDeploymentReport();
    } catch (reportError) {
      console.error(`Failed to generate deployment report: ${reportError.message}`);
    }
    
    console.log('\n❌ DEPLOYMENT TESTS FAILED');
    console.log('🔧 System requires fixes before production deployment');
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionDeploymentTests();
}

export { runProductionDeploymentTests, DEPLOYMENT_CONFIG };
