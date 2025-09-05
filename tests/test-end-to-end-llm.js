/**
 * End-to-End LLM Integration Test
 * 
 * This test runs the complete pipeline with real LLM calls and provides detailed logging
 * at each step to track data flow and transformations. This test will grow as we add
 * more agents to the pipeline.
 * 
 * Current Pipeline: Data → Themes (LLM) → Validation → Classification (mock) → Quotes (mock) → Summary (mock)
 * Future Pipeline: Data → Themes (LLM) → Validation → Classification (LLM) → Quotes (LLM) → Summary (LLM)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';
import { createQuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('\n🚀 End-to-End LLM Pipeline Test');
console.log('🔥 This test hits REAL LLM APIs - expect longer execution times');
console.log('📊 Detailed logging enabled for data flow tracking');
console.log('=' .repeat(80));

/**
 * Utility function to log data structure details
 */
function logDataStructure(label, data, options = {}) {
  const { showSample = true, maxItems = 3, showKeys = true } = options;
  
  console.log(`\n📋 ${label}:`);
  console.log('─'.repeat(50));
  
  if (!data) {
    console.log('  ❌ Data is null/undefined');
    return;
  }
  
  if (Array.isArray(data)) {
    console.log(`  📊 Array with ${data.length} items`);
    if (showSample && data.length > 0) {
      console.log(`  🔍 Sample items (showing first ${Math.min(maxItems, data.length)}):`);
      data.slice(0, maxItems).forEach((item, index) => {
        console.log(`    [${index}]:`, JSON.stringify(item, null, 6));
      });
    }
  } else if (typeof data === 'object') {
    if (showKeys) {
      console.log(`  🗝️  Object keys: [${Object.keys(data).join(', ')}]`);
    }
    if (showSample) {
      console.log(`  📄 Object content:`, JSON.stringify(data, null, 4));
    }
  } else {
    console.log(`  📝 ${typeof data}: ${data}`);
  }
}

/**
 * Log pipeline stage completion
 */
function logStageComplete(stageName, duration, success = true) {
  const status = success ? '✅' : '❌';
  const time = duration ? ` (${duration}ms)` : '';
  console.log(`\n${status} Stage Complete: ${stageName}${time}`);
  console.log('═'.repeat(50));
}

/**
 * Main End-to-End Test Function
 */
async function runEndToEndLLMTest() {
  const testStartTime = Date.now();
  let currentStage = '';
  
  try {
    console.log('\n🎬 Starting End-to-End LLM Pipeline Test...\n');

    // ================================================================================
    // STAGE 1: DATA EXTRACTION
    // ================================================================================
    currentStage = 'Data Extraction';
    console.log(`🔄 STAGE 1: ${currentStage}`);
    const stage1Start = Date.now();
    
    console.log('📁 Reading files:');
    console.log(`  • Excel: inputs/data.xlsx`);
    console.log(`  • Background: inputs/project_background.txt`);
    
    const dataPath = join(projectRoot, 'inputs', 'data.xlsx');
    const backgroundPath = join(projectRoot, 'inputs', 'project_background.txt');
    
    const extractedData = await extractDataFromExcel(dataPath, backgroundPath);
    
    if (extractedData.error) {
      throw new Error(`Data extraction failed: ${extractedData.error}`);
    }
    
    const data = extractedData.data;
    const stage1Duration = Date.now() - stage1Start;
    
    // Log extraction results
    logDataStructure('Extracted Questions', data.questions, { maxItems: 2 });
    logDataStructure('Project Background', data.projectBackground, { showKeys: false });
    logDataStructure('Question Statistics', data.questionStats);
    
    console.log(`\n📊 Extraction Summary:`);
    console.log(`  • Questions: ${data.questions.length}`);
    console.log(`  • Total Responses: ${data.participantResponses.length}`);
    console.log(`  • Unique Participants: ${data.metadata.totalParticipants}`);
    
    logStageComplete(currentStage, stage1Duration);

    // ================================================================================
    // STAGE 2: RESPONSE PARSING
    // ================================================================================
    currentStage = 'Response Parsing';
    console.log(`\n🔄 STAGE 2: ${currentStage}`);
    const stage2Start = Date.now();
    
    const parseResult = parseAndCleanResponses(data);
    
    if (parseResult.error) {
      throw new Error(`Response parsing failed: ${parseResult.error}`);
    }
    
    const parsedData = parseResult.data;
    const stage2Duration = Date.now() - stage2Start;
    
    // Log parsing results
    logDataStructure('Responses by Question', Object.keys(parsedData.responsesByQuestion), { showSample: false });
    
    console.log(`\n📊 Parsing Summary:`);
    Object.entries(parsedData.responsesByQuestion).forEach(([questionId, responses]) => {
      console.log(`  • ${questionId}: ${responses.length} responses`);
    });
    
    logStageComplete(currentStage, stage2Duration);

    // ================================================================================
    // STAGE 3: SELECT TEST QUESTION
    // ================================================================================
    currentStage = 'Question Selection';
    console.log(`\n🔄 STAGE 3: ${currentStage}`);
    const stage3Start = Date.now();
    
    // Use the first question with the most responses for comprehensive testing
    const questionIds = Object.keys(parsedData.responsesByQuestion);
    const questionResponseCounts = questionIds.map(id => ({
      id,
      count: parsedData.responsesByQuestion[id].length
    }));
    
    // Sort by response count and pick the one with most responses
    questionResponseCounts.sort((a, b) => b.count - a.count);
    const selectedQuestionId = questionResponseCounts[0].id;
    const selectedQuestion = parsedData.questions.find(q => q.questionId === selectedQuestionId);
    const selectedResponses = parsedData.responsesByQuestion[selectedQuestionId];
    
    const stage3Duration = Date.now() - stage3Start;
    
    console.log(`\n🎯 Selected Question for LLM Testing:`);
    console.log(`  • Question ID: ${selectedQuestionId}`);
    console.log(`  • Response Count: ${selectedResponses.length}`);
    console.log(`  • Using ALL ${selectedResponses.length} responses for maximum accuracy`);
    
    // Log sample responses for LLM context
    logDataStructure('Sample Responses for LLM', selectedResponses.slice(0, 3), { maxItems: 3 });
    
    logStageComplete(currentStage, stage3Duration);

    // ================================================================================
    // STAGE 4: LLM WORKFLOW EXECUTION
    // ================================================================================
    currentStage = 'LLM Workflow Execution';
    console.log(`\n🔄 STAGE 4: ${currentStage}`);
    console.log('🤖 This stage will make REAL LLM API calls');
    const stage4Start = Date.now();
    
    // Create workflow
    console.log('\n🏗️  Initializing LangGraph workflow...');
    const workflow = createQuestionAnalysisWorkflow();
    
    // Prepare initial state - using ALL responses for accuracy over cost
    const initialState = {
      question: selectedQuestion,
      responses: selectedResponses, // Use ALL responses for maximum accuracy
      projectBackground: parsedData.projectBackground,
      stats: parsedData.questionStats[selectedQuestionId]
    };
    
    logDataStructure('Initial Workflow State', {
      questionId: initialState.question.questionId,
      responseCount: initialState.responses.length,
      backgroundLength: initialState.projectBackground.length,
      stats: initialState.stats
    });
    
    console.log('\n🚀 Executing LangGraph workflow with LLM agents...');
    console.log('⏱️  This may take 60-120 seconds due to 2 LLM API calls (themes + classification)...');
    
    // Execute workflow
    const finalState = await workflow.runAnalysis(initialState);
    
    if (finalState.error) {
      throw new Error(`Workflow execution failed: ${finalState.error}`);
    }
    
    const stage4Duration = Date.now() - stage4Start;
    
    // ================================================================================
    // STAGE 5: DETAILED RESULTS ANALYSIS
    // ================================================================================
    currentStage = 'Results Analysis';
    console.log(`\n🔄 STAGE 5: ${currentStage}`);
    const stage5Start = Date.now();
    
    console.log('\n🔍 DETAILED WORKFLOW RESULTS ANALYSIS');
    console.log('━'.repeat(60));
    
    // 5.1: Theme Analysis (LLM Generated)
    console.log('\n🎨 THEME GENERATION RESULTS (LLM):');
    if (finalState.themes) {
      console.log(`  📊 Generated ${finalState.themes.length} themes`);
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
    } else {
      console.log('  ❌ No themes generated');
    }
    
    // 5.2: Theme Validation Results
    console.log('\n🛡️  THEME VALIDATION RESULTS:');
    if (finalState.themeValidation) {
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
    } else {
      console.log('  ❌ No validation results');
    }
    
    // 5.3: Classifications (Real LLM)
    console.log('\n🏷️  CLASSIFICATION RESULTS (LLM):');
    if (finalState.classifications) {
      console.log(`  📊 Classified ${finalState.classifications.length} responses using real LLM`);
      
      // Calculate confidence statistics
      const confidenceScores = finalState.classifications
        .map(c => c.confidence)
        .filter(c => c !== undefined);
      
      if (confidenceScores.length > 0) {
        const avgConfidence = (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length).toFixed(3);
        const minConfidence = Math.min(...confidenceScores).toFixed(3);
        const maxConfidence = Math.max(...confidenceScores).toFixed(3);
        
        console.log(`  🎯 Confidence Statistics:`);
        console.log(`    • Average: ${avgConfidence}`);
        console.log(`    • Range: ${minConfidence} - ${maxConfidence}`);
      }
      
      // Show classification distribution
      const classificationCounts = {};
      finalState.classifications.forEach(c => {
        classificationCounts[c.theme] = (classificationCounts[c.theme] || 0) + 1;
      });
      
      console.log('\n  📈 Classification Distribution:');
      Object.entries(classificationCounts).forEach(([theme, count]) => {
        const percentage = ((count / finalState.classifications.length) * 100).toFixed(1);
        console.log(`    • ${theme}: ${count} responses (${percentage}%)`);
      });
      
      // Show sample classifications with confidence and reasoning
      console.log('\n  🔍 Sample Classifications:');
      finalState.classifications.slice(0, 3).forEach((c, index) => {
        console.log(`    [${index + 1}] Participant ${c.participantId}:`);
        console.log(`        → Theme: ${c.theme}`);
        console.log(`        → Confidence: ${c.confidence}`);
        if (c.reasoning) {
          console.log(`        → Reasoning: ${c.reasoning.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('  ❌ No classifications generated');
    }
    
    // 5.4: Quotes (Mock - will be LLM in future)
    console.log('\n💬 QUOTE EXTRACTION RESULTS (Mock - Future LLM):');
    if (finalState.quotes) {
      logDataStructure('Extracted Quotes by Theme', finalState.quotes);
    } else {
      console.log('  ❌ No quotes extracted');
    }
    
    // 5.5: Summary (Mock - will be LLM in future)
    console.log('\n📝 SUMMARY GENERATION RESULTS (Mock - Future LLM):');
    if (finalState.summary) {
      logDataStructure('Generated Summary', finalState.summary);
    } else {
      console.log('  ❌ No summary generated');
    }
    
    const stage5Duration = Date.now() - stage5Start;
    logStageComplete(currentStage, stage5Duration);
    
    // ================================================================================
    // FINAL SUMMARY
    // ================================================================================
    const totalDuration = Date.now() - testStartTime;
    
    console.log('\n🏁 END-TO-END TEST COMPLETION SUMMARY');
    console.log('━'.repeat(60));
    console.log(`⏱️  Total Execution Time: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
    console.log(`📊 LLM Workflow Time: ${stage4Duration}ms (${(stage4Duration/1000).toFixed(1)}s)`);
    console.log(`🎯 Question Tested: ${selectedQuestionId}`);
    console.log(`📝 Responses Processed: ${initialState.responses.length}`);
    
    console.log('\n📋 Pipeline Stage Results:');
    console.log(`  ✅ Data Extraction: ${data.questions.length} questions, ${data.participantResponses.length} responses`);
    console.log(`  ✅ Response Parsing: Grouped by ${Object.keys(parsedData.responsesByQuestion).length} questions`);
    console.log(`  ✅ Question Selection: ${selectedQuestionId} (${selectedResponses.length} responses)`);
    console.log(`  ${finalState.themes ? '✅' : '❌'} Theme Generation (LLM): ${finalState.themes?.length || 0} themes`);
    console.log(`  ${finalState.themeValidation?.passed ? '✅' : '❌'} Theme Validation: ${finalState.themeValidation?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  ${finalState.classifications ? '✅' : '❌'} Classifications (LLM): ${finalState.classifications?.length || 0} items`);
    console.log(`  ${finalState.quotes ? '✅' : '❌'} Quote Extraction (Mock): Available`);
    console.log(`  ${finalState.summary ? '✅' : '❌'} Summary Generation (Mock): Available`);
    
    console.log('\n🎯 LLM Integration Status:');
    console.log('  🤖 Theme Generation: ✅ REAL LLM');
    console.log('  🛡️  Theme Validation: ✅ IMPLEMENTED');
    console.log('  🏷️  Classification: ✅ REAL LLM');
    console.log('  💬 Quote Extraction: ⏳ Mock (Next: Real LLM)');
    console.log('  📝 Summary Generation: ⏳ Mock (Future: Real LLM)');
    
    return {
      success: true,
      totalDuration,
      llmDuration: stage4Duration,
      questionTested: selectedQuestionId,
      responsesProcessed: initialState.responses.length,
      themesGenerated: finalState.themes?.length || 0,
      validationPassed: finalState.themeValidation?.passed || false,
      classificationsCount: finalState.classifications?.length || 0,
      finalState
    };
    
  } catch (error) {
    console.error(`\n❌ END-TO-END TEST FAILED at stage: ${currentStage}`);
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
  console.log('⏳ Expected duration: 60-120 seconds for 2 LLM API calls (theme generation + classification).');
  
  // Add a small delay to let user read the warning
  setTimeout(async () => {
    try {
      const result = await runEndToEndLLMTest();
      
      if (result.success) {
        console.log('\n🎉 END-TO-END LLM TEST: ✅ SUCCESS');
        process.exit(0);
      } else {
        console.log('\n💥 END-TO-END LLM TEST: ❌ FAILED');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n🔥 Test execution error:', error);
      process.exit(1);
    }
  }, 2000);
}

export { runEndToEndLLMTest };
