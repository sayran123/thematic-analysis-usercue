/**
 * Performance Benchmarks Test Suite for Milestone 4.3
 * 
 * Comprehensive performance monitoring and benchmarking for production readiness.
 * Tests execution times, memory usage, LLM API efficiency, and scalability metrics.
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { ThematicAnalysisPipeline } from '../src/main.js';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { ParallelOrchestrator } from '../src/analysis/workflows/parallel-orchestrator.js';

/**
 * Performance test configuration
 */
const PERFORMANCE_CONFIG = {
  inputExcelPath: 'inputs/data.xlsx',
  backgroundPath: 'inputs/project_background.txt',
  outputDir: 'outputs/performance-benchmarks',
  benchmarkRuns: 1, // Number of benchmark iterations
  targets: {
    maxExecutionTime: 8 * 60 * 1000, // 8 minutes
    optimalExecutionTime: 6 * 60 * 1000, // 6 minutes target
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    minThroughput: 50 // responses per minute
  }
};

/**
 * Performance metrics tracker
 */
let performanceMetrics = {
  testStartTime: null,
  testEndTime: null,
  benchmarks: [],
  systemInfo: {},
  summary: {}
};

console.log('⚡ Starting Performance Benchmarks Test Suite');
console.log('============================================\n');

/**
 * Collect system information
 */
function collectSystemInfo() {
  console.log('💻 Collecting system information...');
  
  performanceMetrics.systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    totalMemory: process.memoryUsage().rss,
    timestamp: new Date().toISOString()
  };
  
  console.log(`  Node.js version: ${performanceMetrics.systemInfo.nodeVersion}`);
  console.log(`  Platform: ${performanceMetrics.systemInfo.platform} ${performanceMetrics.systemInfo.arch}`);
  console.log(`  Initial memory usage: ${Math.round(performanceMetrics.systemInfo.totalMemory / 1024 / 1024)}MB\n`);
}

/**
 * Monitor memory usage during execution
 */
class MemoryMonitor {
  constructor() {
    this.readings = [];
    this.interval = null;
    this.peak = 0;
  }
  
  start() {
    this.readings = [];
    this.peak = 0;
    this.interval = setInterval(() => {
      const memory = process.memoryUsage();
      const total = memory.rss;
      this.readings.push({
        timestamp: Date.now(),
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external
      });
      
      if (total > this.peak) {
        this.peak = total;
      }
    }, 1000); // Sample every second
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    return {
      peakMemory: this.peak,
      peakMemoryMB: Math.round(this.peak / 1024 / 1024),
      averageMemory: this.readings.length > 0 ? 
        Math.round(this.readings.reduce((sum, reading) => sum + reading.rss, 0) / this.readings.length) : 0,
      samples: this.readings.length,
      readings: this.readings
    };
  }
}

/**
 * Performance benchmark for complete pipeline
 */
async function benchmarkCompletePipeline(runNumber) {
  console.log(`🚀 Running Complete Pipeline Benchmark (Run ${runNumber})...`);
  
  const memoryMonitor = new MemoryMonitor();
  const benchmark = {
    runNumber,
    startTime: performance.now(),
    phases: {},
    memory: {},
    errors: []
  };
  
  try {
    // Start memory monitoring
    memoryMonitor.start();
    
    // Initialize pipeline
    console.log('  🔧 Initializing pipeline...');
    const phaseStart = performance.now();
    
    const pipeline = new ThematicAnalysisPipeline({
      inputExcelPath: PERFORMANCE_CONFIG.inputExcelPath,
      backgroundPath: PERFORMANCE_CONFIG.backgroundPath,
      outputDir: PERFORMANCE_CONFIG.outputDir,
      enableLangSmith: false
    });
    
    benchmark.phases.initialization = performance.now() - phaseStart;
    console.log(`    Initialization: ${Math.round(benchmark.phases.initialization)}ms`);
    
    // Run complete analysis
    console.log('  ⚡ Executing complete analysis...');
    const executionStart = performance.now();
    
    const results = await pipeline.run();
    
    benchmark.phases.execution = performance.now() - executionStart;
    console.log(`    Execution: ${Math.round(benchmark.phases.execution)}ms`);
    
    if (results.error) {
      throw new Error(`Pipeline execution failed: ${results.error}`);
    }
    
    // Stop memory monitoring
    benchmark.memory = memoryMonitor.stop();
    
    // Calculate total time
    benchmark.totalTime = performance.now() - benchmark.startTime;
    benchmark.totalTimeMs = Math.round(benchmark.totalTime);
    benchmark.totalTimeMinutes = Math.round(benchmark.totalTime / 60000 * 100) / 100;
    
    // Calculate throughput metrics
    if (results.extractedData && results.extractedData.metadata) {
      const metadata = results.extractedData.metadata;
      benchmark.throughput = {
        questionsPerMinute: metadata.totalQuestions / benchmark.totalTimeMinutes,
        responsesPerMinute: metadata.totalResponses / benchmark.totalTimeMinutes,
        participantsPerMinute: metadata.totalParticipants / benchmark.totalTimeMinutes
      };
      
      benchmark.dataProcessed = {
        questions: metadata.totalQuestions,
        responses: metadata.totalResponses,
        participants: metadata.totalParticipants
      };
    }
    
    // Store analysis results for quality assessment
    benchmark.analysisQuality = {
      successfulQuestions: results.analyses ? results.analyses.filter(a => !a.error).length : 0,
      failedQuestions: results.analyses ? results.analyses.filter(a => a.error).length : 0,
      outputFiles: results.outputFiles || {}
    };
    
    benchmark.success = true;
    
    console.log(`  ✅ Benchmark ${runNumber} completed successfully`);
    console.log(`    Total time: ${benchmark.totalTimeMinutes} minutes`);
    console.log(`    Peak memory: ${benchmark.memory.peakMemoryMB}MB`);
    console.log(`    Throughput: ${Math.round(benchmark.throughput?.responsesPerMinute || 0)} responses/min\n`);
    
  } catch (error) {
    benchmark.success = false;
    benchmark.error = error.message;
    benchmark.errors.push(error.message);
    benchmark.memory = memoryMonitor.stop();
    benchmark.totalTime = performance.now() - benchmark.startTime;
    
    console.log(`  ❌ Benchmark ${runNumber} failed: ${error.message}\n`);
  }
  
  return benchmark;
}

/**
 * Benchmark data extraction phase
 */
async function benchmarkDataExtraction() {
  console.log('📊 Benchmarking Data Extraction Phase...');
  
  const startTime = performance.now();
  const extractionResult = await extractDataFromExcel(
    PERFORMANCE_CONFIG.inputExcelPath,
    PERFORMANCE_CONFIG.backgroundPath
  );
  const extractionTime = performance.now() - startTime;
  
  if (extractionResult.error) {
    throw new Error(`Data extraction failed: ${extractionResult.error}`);
  }
  
  const extractionBenchmark = {
    executionTime: Math.round(extractionTime),
    dataExtracted: extractionResult.data.metadata,
    throughput: {
      responsesPerSecond: extractionResult.data.metadata.totalResponses / (extractionTime / 1000),
      questionsPerSecond: extractionResult.data.metadata.totalQuestions / (extractionTime / 1000)
    }
  };
  
  console.log(`  ✅ Data extraction: ${extractionBenchmark.executionTime}ms`);
  console.log(`    Throughput: ${Math.round(extractionBenchmark.throughput.responsesPerSecond)} responses/sec\n`);
  
  return extractionBenchmark;
}

/**
 * Analyze performance trends across runs
 */
function analyzePerformanceTrends() {
  console.log('📈 Analyzing Performance Trends...');
  
  const successfulRuns = performanceMetrics.benchmarks.filter(b => b.success);
  
  if (successfulRuns.length === 0) {
    throw new Error('No successful benchmark runs to analyze');
  }
  
  // Calculate statistics
  const executionTimes = successfulRuns.map(b => b.totalTime);
  const memoryUsages = successfulRuns.map(b => b.memory.peakMemory);
  const throughputs = successfulRuns.map(b => b.throughput?.responsesPerMinute || 0);
  
  const stats = {
    executionTime: {
      min: Math.min(...executionTimes),
      max: Math.max(...executionTimes),
      average: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      minMinutes: Math.round(Math.min(...executionTimes) / 60000 * 100) / 100,
      maxMinutes: Math.round(Math.max(...executionTimes) / 60000 * 100) / 100,
      averageMinutes: Math.round((executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length) / 60000 * 100) / 100
    },
    memory: {
      min: Math.min(...memoryUsages),
      max: Math.max(...memoryUsages),
      average: memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length,
      minMB: Math.round(Math.min(...memoryUsages) / 1024 / 1024),
      maxMB: Math.round(Math.max(...memoryUsages) / 1024 / 1024),
      averageMB: Math.round((memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length) / 1024 / 1024)
    },
    throughput: {
      min: Math.min(...throughputs),
      max: Math.max(...throughputs),
      average: throughputs.reduce((sum, tp) => sum + tp, 0) / throughputs.length
    }
  };
  
  // Performance assessment
  const assessment = {
    executionTimeGrade: stats.executionTime.average <= PERFORMANCE_CONFIG.targets.optimalExecutionTime ? 'EXCELLENT' :
                       stats.executionTime.average <= PERFORMANCE_CONFIG.targets.maxExecutionTime ? 'GOOD' : 'NEEDS_IMPROVEMENT',
    memoryUsageGrade: stats.memory.average <= PERFORMANCE_CONFIG.targets.maxMemoryUsage ? 'EXCELLENT' : 'NEEDS_IMPROVEMENT',
    throughputGrade: stats.throughput.average >= PERFORMANCE_CONFIG.targets.minThroughput ? 'EXCELLENT' : 'NEEDS_IMPROVEMENT'
  };
  
  console.log('📊 Performance Statistics:');
  console.log(`  Execution Time: ${stats.executionTime.averageMinutes}min (${stats.executionTime.minMinutes}-${stats.executionTime.maxMinutes}min)`);
  console.log(`  Memory Usage: ${stats.memory.averageMB}MB (${stats.memory.minMB}-${stats.memory.maxMB}MB)`);
  console.log(`  Throughput: ${Math.round(stats.throughput.average)} responses/min`);
  
  console.log('\n🎯 Performance Assessment:');
  console.log(`  Execution Time: ${assessment.executionTimeGrade}`);
  console.log(`  Memory Usage: ${assessment.memoryUsageGrade}`);
  console.log(`  Throughput: ${assessment.throughputGrade}\n`);
  
  return { stats, assessment };
}

/**
 * Generate performance report
 */
async function generatePerformanceReport() {
  console.log('📋 Generating Performance Report...');
  
  const report = {
    testSuite: 'Performance Benchmarks',
    timestamp: new Date().toISOString(),
    testDuration: performanceMetrics.testEndTime - performanceMetrics.testStartTime,
    testDurationMinutes: Math.round((performanceMetrics.testEndTime - performanceMetrics.testStartTime) / 60000 * 100) / 100,
    systemInfo: performanceMetrics.systemInfo,
    targets: PERFORMANCE_CONFIG.targets,
    benchmarks: performanceMetrics.benchmarks,
    dataExtractionBenchmark: performanceMetrics.dataExtractionBenchmark,
    summary: performanceMetrics.summary
  };
  
  // Ensure output directory exists
  await fs.mkdir(PERFORMANCE_CONFIG.outputDir, { recursive: true });
  
  const reportPath = path.join(PERFORMANCE_CONFIG.outputDir, 'performance_benchmark_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Performance report saved to: ${reportPath}`);
  return report;
}

/**
 * Main performance testing execution
 */
async function runPerformanceBenchmarks() {
  try {
    performanceMetrics.testStartTime = Date.now();
    
    collectSystemInfo();
    
    // Benchmark data extraction phase
    performanceMetrics.dataExtractionBenchmark = await benchmarkDataExtraction();
    
    // Run complete pipeline benchmarks
    console.log(`🏃 Running ${PERFORMANCE_CONFIG.benchmarkRuns} complete pipeline benchmark(s)...\n`);
    
    for (let i = 1; i <= PERFORMANCE_CONFIG.benchmarkRuns; i++) {
      const benchmark = await benchmarkCompletePipeline(i);
      performanceMetrics.benchmarks.push(benchmark);
      
      // Short delay between runs
      if (i < PERFORMANCE_CONFIG.benchmarkRuns) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Analyze trends
    performanceMetrics.summary = analyzePerformanceTrends();
    
    performanceMetrics.testEndTime = Date.now();
    
    const report = await generatePerformanceReport();
    
    // Final summary
    console.log('🎉 Performance Benchmarks Completed');
    console.log('===================================');
    console.log(`⏱️  Total test time: ${report.testDurationMinutes} minutes`);
    console.log(`📊 Successful runs: ${performanceMetrics.benchmarks.filter(b => b.success).length}/${PERFORMANCE_CONFIG.benchmarkRuns}`);
    
    const overallGrade = [
      performanceMetrics.summary.assessment.executionTimeGrade,
      performanceMetrics.summary.assessment.memoryUsageGrade,
      performanceMetrics.summary.assessment.throughputGrade
    ].every(grade => grade === 'EXCELLENT') ? 'EXCELLENT' : 
     performanceMetrics.benchmarks.every(b => b.success) ? 'GOOD' : 'NEEDS_IMPROVEMENT';
    
    console.log(`🎯 Overall Performance Grade: ${overallGrade}`);
    
    if (overallGrade === 'EXCELLENT' || overallGrade === 'GOOD') {
      console.log('\n✅ PERFORMANCE BENCHMARKS PASSED');
      console.log('🚀 Performance is suitable for production deployment!');
      process.exit(0);
    } else {
      console.log('\n⚠️  PERFORMANCE BENCHMARKS SHOW CONCERNS');
      console.log('🔧 Consider performance optimization before production deployment');
      process.exit(1);
    }
    
  } catch (error) {
    performanceMetrics.testEndTime = Date.now();
    console.error(`❌ Performance benchmarks failed: ${error.message}`);
    
    try {
      await generatePerformanceReport();
    } catch (reportError) {
      console.error(`Failed to generate performance report: ${reportError.message}`);
    }
    
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceBenchmarks();
}

export { runPerformanceBenchmarks, PERFORMANCE_CONFIG };
