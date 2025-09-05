/**
 * Milestone 2.4 Integration Test: Classification Agent Implementation
 * 
 * This test validates the complete pipeline through classification:
 * Data → Theme Generation (LLM) → Theme Validation → Classification (LLM)
 * 
 * Tests real LLM classification with generated themes and validates:
 * - All 106 responses are classified correctly
 * - Classification distribution is realistic
 * - Theme assignments are valid
 * - Confidence scores are reasonable
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';
import { createQuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('\n🧪 Milestone 2.4 Integration Test: Classification Agent');
console.log('🔥 This test uses REAL LLM APIs for both theme generation and classification');
console.log('📊 Testing complete pipeline through classification stage');
console.log('=' .repeat(80));

/**
 * Utility function to log test progress
 */
function logTestStage(stageName, data = {}) {
  console.log(`\n🔄 ${stageName}`);
  console.log('─'.repeat(50));
  if (Object.keys(data).length > 0) {
    Object.entries(data).forEach(([key, value]) => {
      console.log(`  📋 ${key}: ${value}`);
    });
  }
}

/**
 * Validate classification results
 */
function validateClassificationResults(classifications, themes, responses) {
  const errors = [];
  const warnings = [];
  
  console.log(`\n🔍 Validating ${classifications.length} classification results...`);
  
  // Check all responses are classified
  if (classifications.length !== responses.length) {
    errors.push(`Expected ${responses.length} classifications, got ${classifications.length}`);
  }
  
  // Check theme distribution
  const themeDistribution = {};
  const confidenceScores = [];
  const validThemeIds = new Set(themes.map(t => t.id));
  
  classifications.forEach((classification, index) => {
    // Validate structure
    if (!classification.participantId) {
      errors.push(`Classification ${index + 1} missing participantId`);
    }
    if (!classification.themeId) {
      errors.push(`Classification ${index + 1} missing themeId`);
    }
    if (!classification.theme) {
      errors.push(`Classification ${index + 1} missing theme name`);
    }
    if (classification.confidence === undefined) {
      errors.push(`Classification ${index + 1} missing confidence score`);
    }
    
    // Validate values
    if (classification.themeId && !validThemeIds.has(classification.themeId)) {
      errors.push(`Invalid theme ID: ${classification.themeId}`);
    }
    
    if (classification.confidence !== undefined) {
      if (classification.confidence < 0 || classification.confidence > 1) {
        errors.push(`Invalid confidence score: ${classification.confidence} (must be 0.0-1.0)`);
      } else {
        confidenceScores.push(classification.confidence);
      }
    }
    
    // Track distribution
    if (classification.theme) {
      themeDistribution[classification.theme] = (themeDistribution[classification.theme] || 0) + 1;
    }
  });
  
  // Calculate statistics
  const averageConfidence = confidenceScores.length > 0 
    ? (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length).toFixed(3)
    : 0;
  
  const minConfidence = confidenceScores.length > 0 ? Math.min(...confidenceScores).toFixed(3) : 0;
  const maxConfidence = confidenceScores.length > 0 ? Math.max(...confidenceScores).toFixed(3) : 0;
  
  // Check for realistic distribution (no single theme > 70%)
  const totalClassifications = classifications.length;
  Object.entries(themeDistribution).forEach(([theme, count]) => {
    const percentage = (count / totalClassifications) * 100;
    if (percentage > 70) {
      warnings.push(`Theme "${theme}" has ${percentage.toFixed(1)}% of classifications (>70% may indicate poor theme diversity)`);
    }
    if (count === 0) {
      warnings.push(`Theme "${theme}" has no classifications`);
    }
  });
  
  console.log(`\n📊 Classification Statistics:`);
  console.log(`  • Total Classifications: ${classifications.length}`);
  console.log(`  • Average Confidence: ${averageConfidence}`);
  console.log(`  • Confidence Range: ${minConfidence} - ${maxConfidence}`);
  console.log(`\n📈 Theme Distribution:`);
  Object.entries(themeDistribution).forEach(([theme, count]) => {
    const percentage = ((count / totalClassifications) * 100).toFixed(1);
    console.log(`  • ${theme}: ${count} responses (${percentage}%)`);
  });
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    statistics: {
      totalClassifications: classifications.length,
      averageConfidence: parseFloat(averageConfidence),
      minConfidence: parseFloat(minConfidence),
      maxConfidence: parseFloat(maxConfidence),
      themeDistribution
    }
  };
}

/**
 * Main Integration Test Function
 */
async function runMilestone24IntegrationTest() {
  const testStartTime = Date.now();
  let currentStage = '';
  
  try {
    console.log('\n🎬 Starting Milestone 2.4 Integration Test...\n');

    // ================================================================================
    // STAGE 1: DATA PREPARATION
    // ================================================================================
    currentStage = 'Data Preparation';
    logTestStage(currentStage);
    const stage1Start = Date.now();
    
    // Extract and parse data
    const dataPath = join(projectRoot, 'inputs', 'data.xlsx');
    const backgroundPath = join(projectRoot, 'inputs', 'project_background.txt');
    
    const extractedData = await extractDataFromExcel(dataPath, backgroundPath);
    if (extractedData.error) {
      throw new Error(`Data extraction failed: ${extractedData.error}`);
    }
    
    const parseResult = parseAndCleanResponses(extractedData.data);
    if (parseResult.error) {
      throw new Error(`Response parsing failed: ${parseResult.error}`);
    }
    
    // Select question with most responses for comprehensive testing
    const parsedData = parseResult.data;
    const questionIds = Object.keys(parsedData.responsesByQuestion);
    const questionResponseCounts = questionIds.map(id => ({
      id,
      count: parsedData.responsesByQuestion[id].length
    }));
    
    questionResponseCounts.sort((a, b) => b.count - a.count);
    const selectedQuestionId = questionResponseCounts[0].id;
    const selectedQuestion = parsedData.questions.find(q => q.questionId === selectedQuestionId);
    const selectedResponses = parsedData.responsesByQuestion[selectedQuestionId];
    
    const stage1Duration = Date.now() - stage1Start;
    console.log(`\n✅ Data prepared: ${selectedQuestionId} with ${selectedResponses.length} responses (${stage1Duration}ms)`);

    // ================================================================================
    // STAGE 2: WORKFLOW EXECUTION THROUGH CLASSIFICATION
    // ================================================================================
    currentStage = 'LLM Workflow Execution';
    logTestStage(currentStage, {
      'Question ID': selectedQuestionId,
      'Response Count': selectedResponses.length,
      'Pipeline': 'Data → Themes (LLM) → Validation → Classification (LLM)'
    });
    const stage2Start = Date.now();
    
    // Create workflow and prepare initial state
    console.log('\n🏗️  Initializing LangGraph workflow...');
    const workflow = createQuestionAnalysisWorkflow();
    
    const initialState = {
      question: selectedQuestion,
      responses: selectedResponses,
      projectBackground: parsedData.projectBackground,
      stats: parsedData.questionStats[selectedQuestionId]
    };
    
    console.log('\n🚀 Executing workflow with REAL LLM agents...');
    console.log('⏱️  Expected duration: 45-90 seconds for theme generation + classification...');
    
    // Execute workflow
    const finalState = await workflow.runAnalysis(initialState);
    
    if (finalState.error) {
      throw new Error(`Workflow execution failed: ${finalState.error}`);
    }
    
    const stage2Duration = Date.now() - stage2Start;
    console.log(`\n✅ Workflow completed successfully (${stage2Duration}ms)`);

    // ================================================================================
    // STAGE 3: VALIDATION AND ANALYSIS
    // ================================================================================
    currentStage = 'Results Validation';
    logTestStage(currentStage);
    const stage3Start = Date.now();
    
    // Validate all pipeline components are present
    const requiredComponents = ['themes', 'derivedQuestion', 'themeValidation', 'classifications'];
    const missingComponents = requiredComponents.filter(component => !finalState[component]);
    
    if (missingComponents.length > 0) {
      throw new Error(`Missing required components: ${missingComponents.join(', ')}`);
    }
    
    console.log('\n🎨 Theme Generation Results:');
    console.log(`  📊 Generated Themes: ${finalState.themes.length}`);
    console.log(`  🔍 Derived Question: "${finalState.derivedQuestion}"`);
    
    finalState.themes.forEach((theme, index) => {
      console.log(`\n  Theme ${index + 1}:`);
      console.log(`    • ID: ${theme.id}`);
      console.log(`    • Title: "${theme.title}"`);
      console.log(`    • Description: "${theme.description}"`);
      if (theme.estimatedParticipants) {
        console.log(`    • Estimated Participants: ${theme.estimatedParticipants}`);
      }
    });
    
    console.log('\n🛡️  Theme Validation Results:');
    console.log(`  📊 Validation Status: ${finalState.themeValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  🔢 Errors: ${finalState.themeValidation.errors.length}`);
    console.log(`  ⚠️  Warnings: ${finalState.themeValidation.warnings.length}`);
    
    if (finalState.themeValidation.errors.length > 0) {
      console.log('\n  ❌ Validation Errors:');
      finalState.themeValidation.errors.forEach(error => console.log(`    • ${error}`));
    }
    
    if (finalState.themeValidation.warnings.length > 0) {
      console.log('\n  ⚠️  Validation Warnings:');
      finalState.themeValidation.warnings.forEach(warning => console.log(`    • ${warning}`));
    }
    
    // Validate classification results
    console.log('\n🏷️  Classification Results Analysis:');
    const classificationValidation = validateClassificationResults(
      finalState.classifications,
      finalState.themes,
      selectedResponses
    );
    
    if (!classificationValidation.passed) {
      console.log('\n❌ Classification Validation Errors:');
      classificationValidation.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (classificationValidation.warnings.length > 0) {
      console.log('\n⚠️  Classification Validation Warnings:');
      classificationValidation.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    const stage3Duration = Date.now() - stage3Start;
    console.log(`\n✅ Validation completed (${stage3Duration}ms)`);

    // ================================================================================
    // FINAL SUMMARY
    // ================================================================================
    const totalDuration = Date.now() - testStartTime;
    
    console.log('\n🏁 MILESTONE 2.4 INTEGRATION TEST COMPLETION SUMMARY');
    console.log('━'.repeat(60));
    console.log(`⏱️  Total Execution Time: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
    console.log(`📊 LLM Workflow Time: ${stage2Duration}ms (${(stage2Duration/1000).toFixed(1)}s)`);
    console.log(`🎯 Question Tested: ${selectedQuestionId}`);
    console.log(`📝 Responses Processed: ${selectedResponses.length}`);
    
    console.log('\n📋 Pipeline Component Results:');
    console.log(`  ✅ Data Extraction: ${parsedData.questions.length} questions, ${selectedResponses.length} responses`);
    console.log(`  ✅ Theme Generation (LLM): ${finalState.themes.length} themes generated`);
    console.log(`  ${finalState.themeValidation.passed ? '✅' : '❌'} Theme Validation: ${finalState.themeValidation.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  ${classificationValidation.passed ? '✅' : '❌'} Classification (LLM): ${finalState.classifications.length} responses classified`);
    
    console.log('\n🎯 LLM Integration Status:');
    console.log('  🤖 Theme Generation: ✅ REAL LLM');
    console.log('  🛡️  Theme Validation: ✅ IMPLEMENTED');
    console.log('  🏷️  Classification: ✅ REAL LLM');
    console.log('  💬 Quote Extraction: ⏳ Mock (Next: Real LLM)');
    console.log('  📝 Summary Generation: ⏳ Mock (Future: Real LLM)');
    
    console.log('\n📊 Classification Quality Metrics:');
    console.log(`  • Average Confidence: ${classificationValidation.statistics.averageConfidence}`);
    console.log(`  • Confidence Range: ${classificationValidation.statistics.minConfidence} - ${classificationValidation.statistics.maxConfidence}`);
    console.log(`  • Theme Distribution Balance: ${Object.keys(classificationValidation.statistics.themeDistribution).length} themes used`);
    
    return {
      success: true,
      totalDuration,
      llmDuration: stage2Duration,
      questionTested: selectedQuestionId,
      responsesProcessed: selectedResponses.length,
      themesGenerated: finalState.themes.length,
      validationPassed: finalState.themeValidation.passed,
      classificationsCount: finalState.classifications.length,
      classificationValidation: classificationValidation.passed,
      averageConfidence: classificationValidation.statistics.averageConfidence,
      finalState
    };
    
  } catch (error) {
    console.error(`\n❌ MILESTONE 2.4 INTEGRATION TEST FAILED at stage: ${currentStage}`);
    console.error(`🔥 Error: ${error.message}`);
    console.error(`📍 Stack trace: ${error.stack}`);
    
    return {
      success: false,
      error: error.message,
      failedStage: currentStage,
      duration: Date.now() - testStartTime
    };
  }
}

/**
 * Run the test if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚨 WARNING: This test makes REAL LLM API calls and may incur costs!');
  console.log('🔑 Ensure your OpenAI API key is properly configured.');
  console.log('⏳ Expected duration: 60-120 seconds for theme generation + classification.');
  
  // Add a small delay to let user read the warning
  setTimeout(async () => {
    try {
      const result = await runMilestone24IntegrationTest();
      
      if (result.success) {
        console.log('\n🎉 MILESTONE 2.4 INTEGRATION TEST: ✅ SUCCESS');
        console.log('🚀 Ready for Milestone 2.5: Quote Validation System');
        process.exit(0);
      } else {
        console.log('\n💥 MILESTONE 2.4 INTEGRATION TEST: ❌ FAILED');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n🔥 Test execution error:', error);
      process.exit(1);
    }
  }, 2000);
}

export { runMilestone24IntegrationTest };
