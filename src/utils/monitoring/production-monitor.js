/**
 * Production Monitoring and Performance Tracking
 * 
 * Comprehensive monitoring system for production deployment with performance tracking,
 * health monitoring, and quality metrics collection.
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

/**
 * Production Monitor for comprehensive system monitoring
 */
export class ProductionMonitor {
  constructor(options = {}) {
    this.options = {
      enableDetailedMetrics: options.enableDetailedMetrics !== false,
      enableMemoryTracking: options.enableMemoryTracking !== false,
      logLevel: options.logLevel || 'INFO',
      outputDir: options.outputDir || 'outputs',
      ...options
    };
    
    this.metrics = {
      session: {
        id: this.generateSessionId(),
        startTime: Date.now(),
        startTimeHR: performance.now(),
        endTime: null,
        endTimeHR: null
      },
      phases: new Map(),
      performance: {
        memory: [],
        cpu: [],
        api: []
      },
      quality: {
        dataProcessing: {},
        llmOperations: {},
        validation: {},
        outputs: {}
      },
      errors: [],
      warnings: []
    };
    
    this.activePhases = new Map();
    this.memoryMonitor = null;
    
    // Start memory monitoring if enabled
    if (this.options.enableMemoryTracking) {
      this.startMemoryMonitoring();
    }
  }
  
  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Start monitoring a phase
   */
  startPhase(phaseName, metadata = {}) {
    const phaseData = {
      name: phaseName,
      startTime: Date.now(),
      startTimeHR: performance.now(),
      startMemory: process.memoryUsage(),
      metadata,
      subPhases: new Map(),
      metrics: {
        operations: 0,
        errors: 0,
        warnings: 0
      }
    };
    
    this.activePhases.set(phaseName, phaseData);
    this.log('INFO', `Phase started: ${phaseName}`, metadata);
    
    return phaseName;
  }
  
  /**
   * End monitoring a phase
   */
  endPhase(phaseName, results = {}) {
    const phaseData = this.activePhases.get(phaseName);
    if (!phaseData) {
      this.log('WARNING', `Attempted to end non-existent phase: ${phaseName}`);
      return null;
    }
    
    const endTime = Date.now();
    const endTimeHR = performance.now();
    const endMemory = process.memoryUsage();
    
    const completedPhase = {
      ...phaseData,
      endTime,
      endTimeHR,
      endMemory,
      duration: endTime - phaseData.startTime,
      durationHR: endTimeHR - phaseData.startTimeHR,
      memoryDelta: endMemory.rss - phaseData.startMemory.rss,
      results
    };
    
    this.phases.set(phaseName, completedPhase);
    this.activePhases.delete(phaseName);
    
    this.log('INFO', `Phase completed: ${phaseName}`, {
      duration: Math.round(completedPhase.durationHR),
      memoryDelta: Math.round(completedPhase.memoryDelta / 1024 / 1024)
    });
    
    return completedPhase;
  }
  
  /**
   * Monitor LLM API calls
   */
  recordLLMCall(operation, duration, success, metadata = {}) {
    const apiCall = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
      metadata
    };
    
    this.metrics.performance.api.push(apiCall);
    
    if (success) {
      this.log('DEBUG', `LLM API call successful: ${operation}`, { duration });
    } else {
      this.log('WARNING', `LLM API call failed: ${operation}`, { duration, ...metadata });
      this.recordError('LLM_API_FAILURE', `${operation} failed`, metadata);
    }
    
    return apiCall;
  }
  
  /**
   * Record quality metrics
   */
  recordQualityMetric(category, metric, value, context = {}) {
    if (!this.metrics.quality[category]) {
      this.metrics.quality[category] = {};
    }
    
    this.metrics.quality[category][metric] = {
      value,
      timestamp: Date.now(),
      context
    };
    
    this.log('DEBUG', `Quality metric recorded: ${category}.${metric}`, { value, ...context });
  }
  
  /**
   * Record error
   */
  recordError(type, message, context = {}) {
    const error = {
      type,
      message,
      timestamp: Date.now(),
      context,
      sessionId: this.metrics.session.id
    };
    
    this.metrics.errors.push(error);
    this.log('ERROR', `${type}: ${message}`, context);
    
    return error;
  }
  
  /**
   * Record warning
   */
  recordWarning(type, message, context = {}) {
    const warning = {
      type,
      message,
      timestamp: Date.now(),
      context,
      sessionId: this.metrics.session.id
    };
    
    this.metrics.warnings.push(warning);
    this.log('WARNING', `${type}: ${message}`, context);
    
    return warning;
  }
  
  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    this.memoryMonitor = setInterval(() => {
      const memory = process.memoryUsage();
      this.metrics.performance.memory.push({
        timestamp: Date.now(),
        ...memory,
        memoryMB: Math.round(memory.rss / 1024 / 1024)
      });
    }, 5000); // Sample every 5 seconds
  }
  
  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
  }
  
  /**
   * Calculate comprehensive metrics
   */
  calculateMetrics() {
    const phases = Array.from(this.metrics.phases.values());
    const apiCalls = this.metrics.performance.api;
    const memoryReadings = this.metrics.performance.memory;
    
    // Performance metrics
    const performance = {
      totalDuration: this.metrics.session.endTimeHR - this.metrics.session.startTimeHR,
      totalDurationMinutes: Math.round((this.metrics.session.endTimeHR - this.metrics.session.startTimeHR) / 60000 * 100) / 100,
      phaseBreakdown: phases.reduce((acc, phase) => {
        acc[phase.name] = {
          duration: Math.round(phase.durationHR),
          percentage: Math.round((phase.durationHR / (this.metrics.session.endTimeHR - this.metrics.session.startTimeHR)) * 100)
        };
        return acc;
      }, {})
    };
    
    // API metrics
    const api = {
      totalCalls: apiCalls.length,
      successfulCalls: apiCalls.filter(call => call.success).length,
      failedCalls: apiCalls.filter(call => !call.success).length,
      successRate: apiCalls.length > 0 ? apiCalls.filter(call => call.success).length / apiCalls.length : 0,
      averageDuration: apiCalls.length > 0 ? apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length : 0,
      totalApiTime: apiCalls.reduce((sum, call) => sum + call.duration, 0)
    };
    
    // Memory metrics
    const memory = {
      peak: memoryReadings.length > 0 ? Math.max(...memoryReadings.map(r => r.rss)) : 0,
      peakMB: memoryReadings.length > 0 ? Math.round(Math.max(...memoryReadings.map(r => r.rss)) / 1024 / 1024) : 0,
      average: memoryReadings.length > 0 ? memoryReadings.reduce((sum, r) => sum + r.rss, 0) / memoryReadings.length : 0,
      averageMB: memoryReadings.length > 0 ? Math.round((memoryReadings.reduce((sum, r) => sum + r.rss, 0) / memoryReadings.length) / 1024 / 1024) : 0,
      samples: memoryReadings.length
    };
    
    // Error and warning analysis
    const reliability = {
      errorCount: this.metrics.errors.length,
      warningCount: this.metrics.warnings.length,
      errorRate: this.metrics.errors.length / Math.max(1, this.getOperationCount()),
      errorTypes: this.groupByType(this.metrics.errors),
      warningTypes: this.groupByType(this.metrics.warnings)
    };
    
    return {
      performance,
      api,
      memory,
      reliability,
      quality: this.metrics.quality
    };
  }
  
  /**
   * Group errors/warnings by type
   */
  groupByType(items) {
    return items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
  }
  
  /**
   * Get total operation count
   */
  getOperationCount() {
    const phases = Array.from(this.metrics.phases.values());
    return phases.reduce((sum, phase) => sum + phase.metrics.operations, 0);
  }
  
  /**
   * Generate health score
   */
  generateHealthScore() {
    const metrics = this.calculateMetrics();
    
    // Performance score (40% weight)
    let performanceScore = 100;
    if (metrics.performance.totalDurationMinutes > 10) {
      performanceScore = Math.max(0, 100 - (metrics.performance.totalDurationMinutes - 10) * 5);
    }
    
    // API reliability score (30% weight)
    const apiScore = metrics.api.successRate * 100;
    
    // Memory efficiency score (20% weight)
    let memoryScore = 100;
    if (metrics.memory.peakMB > 512) {
      memoryScore = Math.max(0, 100 - (metrics.memory.peakMB - 512) / 10);
    }
    
    // Error rate score (10% weight)
    const errorScore = Math.max(0, 100 - (metrics.reliability.errorRate * 1000));
    
    const overallScore = (
      performanceScore * 0.4 +
      apiScore * 0.3 +
      memoryScore * 0.2 +
      errorScore * 0.1
    );
    
    return {
      overall: Math.round(overallScore),
      breakdown: {
        performance: Math.round(performanceScore),
        api: Math.round(apiScore),
        memory: Math.round(memoryScore),
        errors: Math.round(errorScore)
      },
      grade: overallScore >= 90 ? 'EXCELLENT' : 
             overallScore >= 80 ? 'GOOD' : 
             overallScore >= 70 ? 'ACCEPTABLE' : 'NEEDS_IMPROVEMENT'
    };
  }
  
  /**
   * End monitoring session
   */
  endSession(results = {}) {
    this.metrics.session.endTime = Date.now();
    this.metrics.session.endTimeHR = performance.now();
    
    // End any active phases
    for (const phaseName of this.activePhases.keys()) {
      this.endPhase(phaseName, { forced: true });
    }
    
    this.stopMemoryMonitoring();
    
    const metrics = this.calculateMetrics();
    const healthScore = this.generateHealthScore();
    
    this.log('INFO', 'Monitoring session ended', {
      duration: metrics.performance.totalDurationMinutes,
      healthScore: healthScore.overall,
      grade: healthScore.grade
    });
    
    return {
      session: this.metrics.session,
      metrics,
      healthScore,
      results
    };
  }
  
  /**
   * Generate monitoring report
   */
  async generateReport(outputPath = null) {
    const report = {
      sessionId: this.metrics.session.id,
      timestamp: new Date().toISOString(),
      session: this.metrics.session,
      metrics: this.calculateMetrics(),
      healthScore: this.generateHealthScore(),
      phases: Array.from(this.metrics.phases.values()),
      errors: this.metrics.errors,
      warnings: this.metrics.warnings,
      quality: this.metrics.quality,
      rawData: this.options.enableDetailedMetrics ? {
        memoryReadings: this.metrics.performance.memory,
        apiCalls: this.metrics.performance.api
      } : null
    };
    
    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      this.log('INFO', `Monitoring report saved to: ${outputPath}`);
    }
    
    return report;
  }
  
  /**
   * Logging utility
   */
  log(level, message, data = {}) {
    const logLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
    const currentLevelIndex = logLevels.indexOf(this.options.logLevel);
    const messageLevelIndex = logLevels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const sessionId = this.metrics.session.id.substr(-8);
      
      console.log(`[${timestamp}] [${level}] [${sessionId}] ${message}`, 
        Object.keys(data).length > 0 ? data : '');
    }
  }
}

/**
 * Utility functions for monitoring integration
 */

/**
 * Create production monitor instance
 */
export function createProductionMonitor(options = {}) {
  return new ProductionMonitor(options);
}

/**
 * Phase monitoring decorator
 */
export function monitorPhase(monitor, phaseName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      monitor.startPhase(phaseName);
      try {
        const result = await originalMethod.apply(this, args);
        monitor.endPhase(phaseName, { success: true });
        return result;
      } catch (error) {
        monitor.endPhase(phaseName, { success: false, error: error.message });
        monitor.recordError('PHASE_FAILURE', `Phase ${phaseName} failed: ${error.message}`);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * LLM call monitoring wrapper
 */
export function monitorLLMCall(monitor, operation) {
  return async function(llmFunction, ...args) {
    const startTime = performance.now();
    
    try {
      const result = await llmFunction(...args);
      const duration = performance.now() - startTime;
      
      monitor.recordLLMCall(operation, duration, true, {
        args: args.length,
        resultSize: JSON.stringify(result).length
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      monitor.recordLLMCall(operation, duration, false, {
        error: error.message,
        args: args.length
      });
      
      throw error;
    }
  };
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  constructor(interval = 1000) {
    this.interval = interval;
    this.readings = [];
    this.timer = null;
  }
  
  start() {
    this.readings = [];
    this.timer = setInterval(() => {
      const memory = process.memoryUsage();
      this.readings.push({
        timestamp: Date.now(),
        ...memory,
        memoryMB: Math.round(memory.rss / 1024 / 1024)
      });
    }, this.interval);
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    return {
      readings: this.readings,
      peak: this.readings.length > 0 ? Math.max(...this.readings.map(r => r.rss)) : 0,
      average: this.readings.length > 0 ? this.readings.reduce((sum, r) => sum + r.rss, 0) / this.readings.length : 0
    };
  }
}

export default ProductionMonitor;
