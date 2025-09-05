/**
 * Test basic LangGraph workflow functionality
 * 
 * This test validates:
 * - LangGraph state machine initialization
 * - State transitions through all 4 stages
 * - Mock data processing (before real LLM agents)
 * - End-to-end pipeline execution
 */

import { createQuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';

async function testBasicWorkflow() {
  console.log('🧪 Testing Basic LangGraph Workflow for Milestone 2.1...\n');

  try {
    // Test 1: Workflow initialization
    console.log('1️⃣ Testing workflow initialization...');
    const workflow = createQuestionAnalysisWorkflow();
    console.log('✅ Workflow initialized successfully');
    console.log('📋 Graph has compiled graph:', !!workflow.compiledGraph);
    
    // Test 2: Create mock initial state (using Phase 1 data structure)
    console.log('\n2️⃣ Creating mock initial state...');
    const initialState = {
      question: {
        questionId: 'test_question',
        headerText: 'Test Question for Workflow'
      },
      responses: [
        {
          participantId: 'p001',
          questionId: 'test_question',
          cleanResponse: 'This is a test response from participant 1'
        },
        {
          participantId: 'p002', 
          questionId: 'test_question',
          cleanResponse: 'This is a test response from participant 2'
        },
        {
          participantId: 'p003',
          questionId: 'test_question', 
          cleanResponse: 'This is a test response from participant 3'
        }
      ],
      projectBackground: 'This is a test project for validating the workflow',
      stats: {
        totalResponses: 3,
        participantCount: 3
      },
      // Initial state - these should be null
      themes: null,
      derivedQuestion: null,
      classifications: null,
      quotes: null,
      summary: null
    };
    
    console.log('✅ Initial state created');
    console.log('📊 State:', {
      questionId: initialState.question.questionId,
      responseCount: initialState.responses.length,
      hasProjectBackground: !!initialState.projectBackground
    });
    
    // Test 3: Run the complete workflow
    console.log('\n3️⃣ Running complete workflow...');
    const startTime = Date.now();
    const finalState = await workflow.runAnalysis(initialState);
    const duration = Date.now() - startTime;
    
    if (finalState.error) {
      console.log('❌ Workflow execution failed:', finalState.error);
      return { passed: false, reason: finalState.error };
    }
    
    console.log('✅ Workflow completed successfully');
    console.log('⏱️  Duration:', duration, 'ms');
    
    // Test 4: Validate final state structure
    console.log('\n4️⃣ Validating final state...');
    const validationResults = {
      hasThemes: !!finalState.themes && finalState.themes.length > 0,
      hasDerivedQuestion: !!finalState.derivedQuestion,
      hasClassifications: !!finalState.classifications && finalState.classifications.length > 0,
      hasQuotes: !!finalState.quotes,
      hasSummary: !!finalState.summary
    };
    
    console.log('📋 Final state validation:', validationResults);
    
    // Test 5: Detailed state inspection
    console.log('\n5️⃣ Inspecting workflow outputs...');
    console.log('🎯 Themes generated:', finalState.themes?.length || 0);
    finalState.themes?.forEach((theme, i) => {
      console.log(`   ${i+1}. ${theme.title} (${theme.estimatedParticipants} participants)`);
    });
    
    console.log('❓ Derived question:', finalState.derivedQuestion);
    console.log('📊 Classifications:', finalState.classifications?.length || 0);
    console.log('💬 Quote themes:', Object.keys(finalState.quotes || {}).length);
    console.log('📝 Summary headline:', finalState.summary?.headline);
    
    // Test 6: Verify state progression
    console.log('\n6️⃣ Verifying state progression...');
    const progressionValid = (
      finalState.question &&
      finalState.responses &&
      finalState.themes &&
      finalState.derivedQuestion &&
      finalState.classifications &&
      finalState.quotes &&
      finalState.summary
    );
    
    if (progressionValid) {
      console.log('✅ All workflow stages completed successfully');
    } else {
      console.log('❌ Some workflow stages incomplete');
      return { passed: false, reason: 'Incomplete state progression' };
    }
    
    console.log('\n🎉 Basic Workflow Test PASSED');
    console.log('✅ LangGraph state machine works correctly');
    console.log('✅ Ready for real LLM agent integration');
    
    return { 
      passed: true,
      finalState,
      duration,
      stages: Object.keys(validationResults).filter(key => validationResults[key])
    };
    
  } catch (error) {
    console.error('\n💥 Unexpected error during workflow test:', error.message);
    console.error(error.stack);
    return { passed: false, reason: error.message };
  }
}

// Test error handling with invalid state
async function testErrorHandling() {
  console.log('\n🧪 Testing workflow error handling...');
  
  try {
    const workflow = createQuestionAnalysisWorkflow();
    
    // Test with missing question
    const invalidState = {
      responses: [{ participantId: 'p1', cleanResponse: 'test' }]
    };
    
    const result = await workflow.runAnalysis(invalidState);
    
    if (result.error) {
      console.log('✅ Error handling works:', result.error);
      return true;
    } else {
      console.log('❌ Should have returned error for invalid state');
      return false;
    }
    
  } catch (error) {
    console.log('✅ Exception handling works:', error.message);
    return true;
  }
}

// Integration test with Phase 1 data format
async function testPhase1Integration() {
  console.log('\n🧪 Testing Phase 1 integration...');
  
  // Simulate Phase 1 parsed data format
  const phase1Output = {
    projectBackground: 'Research project testing integration',
    questions: [
      { columnIndex: 1, questionId: 'vpn_selection', headerText: 'vpn_selection' }
    ],
    responsesByQuestion: {
      'vpn_selection': [
        {
          participantId: '4434',
          questionId: 'vpn_selection',
          cleanResponse: 'assistant: What factors do you consider? user: Privacy and security are most important to me'
        },
        {
          participantId: '4435', 
          questionId: 'vpn_selection',
          cleanResponse: 'assistant: What factors do you consider? user: Speed and server locations matter'
        }
      ]
    },
    questionStats: {
      'vpn_selection': { totalResponses: 2, participantCount: 2 }
    }
  };
  
  // Convert to workflow state format
  const workflowState = {
    question: phase1Output.questions[0],
    responses: phase1Output.responsesByQuestion['vpn_selection'],
    projectBackground: phase1Output.projectBackground,
    stats: phase1Output.questionStats['vpn_selection'],
    themes: null,
    derivedQuestion: null,
    classifications: null,
    quotes: null,
    summary: null
  };
  
  const workflow = createQuestionAnalysisWorkflow();
  const result = await workflow.runAnalysis(workflowState);
  
  if (result.error) {
    console.log('❌ Phase 1 integration failed:', result.error);
    return false;
  } else {
    console.log('✅ Phase 1 integration successful');
    console.log('📊 Processed question:', result.question.questionId);
    console.log('📝 Generated themes:', result.themes?.length);
    return true;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting LangGraph Workflow Tests for Milestone 2.1\n');
  
  const basicResult = await testBasicWorkflow();
  const errorHandling = await testErrorHandling();
  const integration = await testPhase1Integration();
  
  console.log('\n📊 Test Summary:');
  console.log('- Basic Workflow:', basicResult.passed ? '✅ PASSED' : '❌ FAILED');
  console.log('- Error Handling:', errorHandling ? '✅ PASSED' : '❌ FAILED');
  console.log('- Phase 1 Integration:', integration ? '✅ PASSED' : '❌ FAILED');
  
  if (basicResult.passed && errorHandling && integration) {
    console.log('\n🎯 Milestone 2.1 LangGraph Foundation Complete!');
    console.log('✅ State machine working');
    console.log('✅ Error handling functional');
    console.log('✅ Phase 1 integration ready');
    console.log('\nNext: Implement real LLM agents (Milestone 2.2)');
  } else {
    console.log('\n⚠️  Some tests failed - review implementation');
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testBasicWorkflow, testErrorHandling, testPhase1Integration };
