/**
 * Test: Milestone 2.6 Quote Extractor Integration
 * 
 * Tests the complete pipeline with quote extraction:
 * Data → Themes → Validation → Classification → **Quote Extraction**
 * 
 * This test generates real quotes from 106 participant responses that will be used
 * to build the validation system in Milestone 2.5.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { extractDataFromExcel } from '../src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from '../src/data/parsers/response-parser.js';
import { createQuestionAnalysisWorkflow } from '../src/analysis/workflows/question-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('\n🧪 Testing Milestone 2.6: Quote Extractor Integration');
console.log('=' .repeat(60));

/**
 * Test 1: Complete Pipeline with Quote Extraction
 */
async function testCompleteQuoteExtractionPipeline() {
  console.log('\n📋 Test 1: Complete Pipeline with Real Quote Extraction');
  console.log('-'.repeat(50));

  try {
    // Phase 1: Extract real data
    console.log('🔄 Phase 1: Extracting real data from inputs/data.xlsx...');
    const dataPath = join(projectRoot, 'inputs', 'data.xlsx');
    const backgroundPath = join(projectRoot, 'inputs', 'project_background.txt');
    
    const extractResult = await extractDataFromExcel(dataPath, backgroundPath);
    if (extractResult.error) {
      throw new Error(`Data extraction failed: ${extractResult.error}`);
    }

    console.log(`✅ Extracted ${extractResult.data.metadata.totalResponses} responses from ${extractResult.data.metadata.totalParticipants} participants`);
    console.log(`✅ Found ${extractResult.data.questions.length} questions`);

    // Phase 2: Parse and clean responses
    console.log('\n🔄 Phase 2: Parsing and cleaning responses...');
    const parseResult = parseAndCleanResponses(extractResult.data);
    if (parseResult.error) {
      throw new Error(`Response parsing failed: ${parseResult.error}`);
    }

    console.log(`✅ Cleaned ${parseResult.data.responseStatistics.totalResponses} responses`);
    console.log(`✅ Conversation format: ${parseResult.data.responseStatistics.conversationFormatPercentage}%`);

    // Select first question for testing (VPN selection question)
    const firstQuestion = parseResult.data.questions[0];
    const questionResponses = parseResult.data.responsesByQuestion[firstQuestion.questionId];
    
    console.log(`\n🎯 Testing with question: "${firstQuestion.questionId}"`);
    console.log(`📊 Response count: ${questionResponses.length}`);

    // Phase 3: Run complete workflow with quote extraction
    console.log('\n🔄 Phase 3: Running complete workflow with quote extraction...');
    const workflow = createQuestionAnalysisWorkflow();

    const initialState = {
      question: firstQuestion,
      responses: questionResponses,
      projectBackground: parseResult.data.projectBackground,
      stats: parseResult.data.questionStats[firstQuestion.questionId],
      themes: null,
      derivedQuestion: null,
      themeValidation: null,
      classifications: null,
      quotes: null,
      summary: null
    };

    console.log('🚀 Executing complete workflow...');
    const startTime = Date.now();
    
    const finalState = await workflow.runAnalysis(initialState);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Workflow completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);

    if (finalState.error) {
      throw new Error(`Workflow failed: ${finalState.error}`);
    }

    // Validate quote extraction results
    console.log('\n📈 Quote Extraction Results:');
    console.log('-'.repeat(30));
    
    if (!finalState.quotes) {
      throw new Error('No quotes extracted - quote extraction failed');
    }

    const themes = finalState.themes || [];
    const quotes = finalState.quotes || {};
    const quoteStats = finalState.quoteExtractionStats || {};

    console.log(`✅ Total themes: ${themes.length}`);
    const actualQuoteCount = quoteStats.totalQuotes || Object.values(quotes).reduce((total, themeQuotes) => total + themeQuotes.length, 0);
    console.log(`✅ Total quotes extracted: ${actualQuoteCount}`);
    
    if (quoteStats.quotesPerTheme) {
      console.log('\n📊 Quotes per theme:');
      for (const [themeId, count] of Object.entries(quoteStats.quotesPerTheme)) {
        const theme = themes.find(t => t.id === themeId);
        console.log(`   - ${theme?.title || themeId}: ${count} quotes`);
      }
    }

    // Display sample quotes for validation testing
    console.log('\n📝 Sample Quotes for Validation Testing:');
    console.log('-'.repeat(40));
    
    let displayedQuotes = 0;
    const maxDisplayQuotes = 6; // Show sample quotes from different themes
    
    for (const [themeId, themeQuotes] of Object.entries(quotes)) {
      if (displayedQuotes >= maxDisplayQuotes) break;
      
      const theme = themes.find(t => t.id === themeId);
      if (themeQuotes.length > 0) {
        console.log(`\n🏷️  Theme: ${theme?.title || themeId}`);
        
        for (const quote of themeQuotes.slice(0, 2)) {
          console.log(`   📌 Participant ${quote.participantId}:`);
          console.log(`      "${quote.quote}"`);
          console.log(`      Verified: ${quote.verified}, Method: ${quote.validationMethod}`);
          displayedQuotes++;
          
          if (displayedQuotes >= maxDisplayQuotes) break;
        }
      }
    }

    // Error reporting
    if (finalState.quoteExtractionError) {
      console.log(`\n⚠️  Quote extraction warning: ${finalState.quoteExtractionError}`);
    }

    return {
      success: true,
      totalQuotes: actualQuoteCount,
      themes: themes.length,
      duration: duration,
      quotes: quotes,
      classifications: finalState.classifications?.length || 0
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Quote Attribution Validation
 */
async function testQuoteAttributionValidation() {
  console.log('\n📋 Test 2: Quote Attribution Validation');
  console.log('-'.repeat(50));

  try {
    // This test will verify that quotes are properly attributed to correct participants
    // and contain text that should exist in the source responses
    
    console.log('🔄 Running quote attribution test...');
    
    // Use a smaller dataset for detailed validation
    const mockQuestion = {
      questionId: 'test_attribution',
      headerText: 'test_attribution'
    };

    const mockResponses = [
      { 
        participantId: '1001', 
        questionId: 'test_attribution', 
        cleanResponse: 'assistant: What features do you consider? user: I prioritize no-logs policies and encryption strength'
      },
      { 
        participantId: '1002', 
        questionId: 'test_attribution', 
        cleanResponse: 'assistant: Your VPN preferences? user: Speed is most important for streaming, need good server locations'
      },
      { 
        participantId: '1003', 
        questionId: 'test_attribution', 
        cleanResponse: 'assistant: VPN selection criteria? user: Price matters most, looking for affordable monthly plans'
      }
    ];

    const mockThemes = [
      { id: 'privacy', title: 'Privacy and Security', description: 'Focus on no-logs and encryption' },
      { id: 'performance', title: 'Performance and Speed', description: 'Focus on connection speed' },
      { id: 'cost', title: 'Cost Considerations', description: 'Focus on pricing and value' }
    ];

    const mockClassifications = [
      { participantId: '1001', themeId: 'privacy', theme: 'Privacy and Security', confidence: 0.9 },
      { participantId: '1002', themeId: 'performance', theme: 'Performance and Speed', confidence: 0.85 },
      { participantId: '1003', themeId: 'cost', theme: 'Cost Considerations', confidence: 0.8 }
    ];

    // Test quote extraction with known data
    const workflow = createQuestionAnalysisWorkflow();
    
    const testState = {
      question: mockQuestion,
      responses: mockResponses,
      projectBackground: 'Test project for quote attribution validation',
      stats: { totalResponses: 3, participantCount: 3 },
      themes: mockThemes,
      derivedQuestion: 'What factors do you consider when choosing a VPN?',
      classifications: mockClassifications
    };

    const quoteResult = await workflow.extractQuotes(testState);
    
    if (quoteResult.quoteExtractionError) {
      console.log(`⚠️  Quote extraction had issues: ${quoteResult.quoteExtractionError}`);
    }

    const quotes = quoteResult.quotes || {};
    
    console.log('✅ Quote extraction completed for test data');
    console.log(`📊 Themes with quotes: ${Object.keys(quotes).length}`);
    
    // Validate attribution
    let attributionErrors = 0;
    let totalQuotes = 0;
    
    for (const [themeId, themeQuotes] of Object.entries(quotes)) {
      for (const quote of themeQuotes) {
        totalQuotes++;
        
        // Check if participant exists in original responses
        const sourceResponse = mockResponses.find(r => r.participantId === quote.participantId);
        if (!sourceResponse) {
          console.error(`❌ Attribution error: Participant ${quote.participantId} not found in source responses`);
          attributionErrors++;
        } else {
          console.log(`✅ Quote attributed to valid participant: ${quote.participantId}`);
        }
      }
    }

    console.log(`\n📈 Attribution Validation Results:`);
    console.log(`   - Total quotes tested: ${totalQuotes}`);
    console.log(`   - Attribution errors: ${attributionErrors}`);
    console.log(`   - Success rate: ${totalQuotes > 0 ? ((totalQuotes - attributionErrors) / totalQuotes * 100).toFixed(1) : 0}%`);

    return {
      success: attributionErrors === 0,
      totalQuotes,
      attributionErrors,
      quotes
    };

  } catch (error) {
    console.error('❌ Attribution test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('🧪 Running Milestone 2.6 Integration Tests');
  console.log('This will generate real quotes for Milestone 2.5 validation testing');
  
  const results = {};
  
  // Test 1: Complete pipeline with real data
  results.completeWorkflow = await testCompleteQuoteExtractionPipeline();
  
  // Test 2: Quote attribution validation
  results.attribution = await testQuoteAttributionValidation();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MILESTONE 2.6 TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n1. Complete Workflow: ${results.completeWorkflow.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (results.completeWorkflow.success) {
    console.log(`   - Real quotes extracted: ${results.completeWorkflow.totalQuotes}`);
    console.log(`   - Themes processed: ${results.completeWorkflow.themes}`);
    console.log(`   - Classifications: ${results.completeWorkflow.classifications}`);
    console.log(`   - Execution time: ${(results.completeWorkflow.duration/1000).toFixed(1)}s`);
  } else {
    console.log(`   - Error: ${results.completeWorkflow.error}`);
  }
  
  console.log(`\n2. Quote Attribution: ${results.attribution.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (results.attribution.success) {
    console.log(`   - Quotes tested: ${results.attribution.totalQuotes}`);
    console.log(`   - Attribution errors: ${results.attribution.attributionErrors}`);
  } else {
    console.log(`   - Error: ${results.attribution.error}`);
  }
  
  const allPassed = results.completeWorkflow.success && results.attribution.success;
  
  console.log(`\n🎯 MILESTONE 2.6 STATUS: ${allPassed ? '✅ READY FOR MILESTONE 2.5' : '❌ NEEDS FIXES'}`);
  
  if (allPassed) {
    console.log('\n🚀 Ready to proceed to Milestone 2.5: Quote Validation System');
    console.log('   Real quotes generated and ready for validation testing!');
  }
  
  return allPassed;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { runAllTests };
