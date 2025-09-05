#!/usr/bin/env node
/**
 * Single Question Testing Script
 * 
 * Tests the thematic analysis pipeline with just one question to validate fixes
 * for summary/headline and quote extraction issues.
 */

import { config } from 'dotenv';
import { ThematicAnalysisPipeline } from './src/main.js';
import { extractDataFromExcel } from './src/data/extractors/excel-extractor.js';
import { ParallelOrchestrator } from './src/analysis/workflows/parallel-orchestrator.js';
import fs from 'fs/promises';

// Load environment variables
config();

const TEST_CONFIG = {
  inputExcelPath: 'inputs/data.xlsx',
  backgroundPath: 'inputs/project_background.txt',
  outputDir: 'outputs/single-question-test',
  targetQuestion: 'vpn_selection', // Only test this question
  enableDetailedLogging: true
};

async function runSingleQuestionTest() {
  console.log('🧪 Single Question Test: vpn_selection');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Data Extraction
    console.log('\n📊 Step 1: Data Extraction');
    const extractionResult = await extractDataFromExcel(TEST_CONFIG.inputExcelPath, TEST_CONFIG.backgroundPath);
    
    if (extractionResult.error) {
      throw new Error(`Data extraction failed: ${extractionResult.error}`);
    }
    
    const { data } = extractionResult;
    
    // Find the target question
    const targetQuestion = data.questions.find(q => q.questionId === TEST_CONFIG.targetQuestion);
    if (!targetQuestion) {
      throw new Error(`Target question "${TEST_CONFIG.targetQuestion}" not found`);
    }
    
    console.log(`✅ Found target question: ${targetQuestion.questionId}`);
    console.log(`   Response count: ${data.questionStats[targetQuestion.questionId]?.totalResponses || 0}`);
    
    // Step 2: Get responses for target question
    console.log('\n📝 Step 2: Filtering Responses');
    const targetResponses = data.participantResponses
      .filter(r => r.questionId === TEST_CONFIG.targetQuestion)
      .map(r => ({
        participantId: r.participantId,
        questionId: r.questionId,
        cleanResponse: r.response // The response content
      }));
    
    if (!targetResponses || targetResponses.length === 0) {
      throw new Error(`No responses found for question: ${TEST_CONFIG.targetQuestion}`);
    }
    
    console.log(`✅ Found ${targetResponses.length} responses for ${TEST_CONFIG.targetQuestion}`);
    
    // Step 3: Project Background
    console.log('\n📖 Step 3: Project Background');
    const projectBackground = data.projectBackground;
    console.log(`✅ Loaded project background (${projectBackground.length} characters)`);
    
    // Step 4: Single Question Analysis
    console.log('\n🔍 Step 4: Single Question Analysis');
    console.log(`⏱️  Starting analysis of "${TEST_CONFIG.targetQuestion}" with real LLM calls...`);
    
    const orchestrator = new ParallelOrchestrator();
    
    // Prepare single question for analysis in the format expected by orchestrator
    const singleQuestionData = {
      questions: [targetQuestion],
      responsesByQuestion: {
        [TEST_CONFIG.targetQuestion]: targetResponses
      },
      projectBackground,
      questionStats: {
        [TEST_CONFIG.targetQuestion]: data.questionStats[targetQuestion.questionId]
      }
    };
    
    const analysisResults = await orchestrator.parallelThematicAnalysis(singleQuestionData);
    
    if (analysisResults.error) {
      throw new Error(`Analysis failed: ${analysisResults.error}`);
    }
    
    console.log(`✅ Analysis completed successfully`);
    
    // Step 5: Validate Results
    console.log('\n🔬 Step 5: Validating Results');
    const result = analysisResults[0]; // parallelThematicAnalysis returns array directly
    
    // Check summary and headline
    console.log('\n📋 Summary & Headline Validation:');
    console.log(`   Has headline: ${!!result.headline}`);
    console.log(`   Headline: "${result.headline || 'MISSING'}"`);
    console.log(`   Has summary: ${!!result.summary}`);
    console.log(`   Summary length: ${result.summary?.length || 0} characters`);
    
    if (!result.headline || result.headline === "Analysis completed") {
      console.warn('⚠️  WARNING: Headline appears to be default/placeholder value');
    }
    
    if (!result.summary || result.summary.length < 100) {
      console.warn('⚠️  WARNING: Summary appears to be missing or too short');
    }
    
    // Check themes and quotes
    console.log('\n💬 Quote Validation:');
    if (result.themes && Array.isArray(result.themes)) {
      console.log(`   Total themes: ${result.themes.length}`);
      
      let totalQuotes = 0;
      let themesWithQuotes = 0;
      let quoteLengthTotal = 0;
      
      result.themes.forEach((theme, index) => {
        const quoteCount = theme.supportingQuotes ? theme.supportingQuotes.length : 0;
        totalQuotes += quoteCount;
        
        if (quoteCount > 0) {
          themesWithQuotes++;
          theme.supportingQuotes.forEach(quote => {
            const quoteText = quote.quote || quote.text || '';
            quoteLengthTotal += quoteText.length;
          });
        }
        
        console.log(`   Theme ${index + 1}: "${theme.title}" - ${quoteCount} quotes`);
        
        if (quoteCount > 0) {
          theme.supportingQuotes.forEach((quote, qIndex) => {
            const quoteText = quote.quote || quote.text || 'NO TEXT';
            const truncatedQuote = quoteText.length > 100 ? quoteText.substring(0, 100) + '...' : quoteText;
            console.log(`     Quote ${qIndex + 1}: "${truncatedQuote}" (${quoteText.length} chars)`);
          });
        }
      });
      
      console.log(`\n📊 Quote Statistics:`);
      console.log(`   Total quotes: ${totalQuotes}`);
      console.log(`   Themes with quotes: ${themesWithQuotes}/${result.themes.length}`);
      console.log(`   Average quote length: ${totalQuotes > 0 ? Math.round(quoteLengthTotal / totalQuotes) : 0} characters`);
      
      if (totalQuotes === 0) {
        console.warn('⚠️  WARNING: No quotes found for any theme');
      } else if (themesWithQuotes < result.themes.length / 2) {
        console.warn('⚠️  WARNING: Less than half of themes have quotes');
      }
    }
    
    // Step 6: Generate Test Output
    console.log('\n📁 Step 6: Generating Test Output');
    await fs.mkdir(TEST_CONFIG.outputDir, { recursive: true });
    
    const outputData = {
      testTimestamp: new Date().toISOString(),
      testConfig: TEST_CONFIG,
      questionAnalyzed: TEST_CONFIG.targetQuestion,
      analysisResult: result,
              validation: {
        hasSummary: !!result.summary,
        hasHeadline: !!result.headline && result.headline !== "Analysis completed",
        hasMeaningfulSummary: !!result.summary && result.summary.length >= 100,
        totalThemes: result.themes?.length || 0,
        totalQuotes: result.themes?.reduce((sum, theme) => sum + (theme.supportingQuotes?.length || 0), 0) || 0,
        themesWithQuotes: result.themes?.filter(theme => theme.supportingQuotes?.length > 0).length || 0
      }
    };
    
    const outputPath = `${TEST_CONFIG.outputDir}/single_question_test_results.json`;
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`✅ Test results saved to: ${outputPath}`);
    
    // Step 7: Success Summary
    console.log('\n🎉 Test Completed Successfully!');
    console.log('=' .repeat(60));
    console.log(`✅ Summary Fix: ${outputData.validation.hasMeaningfulSummary ? 'WORKING' : 'NEEDS ATTENTION'}`);
    console.log(`✅ Headline Fix: ${outputData.validation.hasHeadline ? 'WORKING' : 'NEEDS ATTENTION'}`);
    console.log(`✅ Quote Extraction: ${outputData.validation.totalQuotes > 0 ? 'WORKING' : 'NEEDS ATTENTION'} (${outputData.validation.totalQuotes} quotes found)`);
    console.log(`✅ Quote Coverage: ${outputData.validation.themesWithQuotes}/${outputData.validation.totalThemes} themes have quotes`);
    
    const issuesFound = [];
    if (!outputData.validation.hasMeaningfulSummary) issuesFound.push('Summary');
    if (!outputData.validation.hasHeadline) issuesFound.push('Headline');
    if (outputData.validation.totalQuotes === 0) issuesFound.push('Quotes');
    
    if (issuesFound.length === 0) {
      console.log('\n🎯 ALL FIXES WORKING CORRECTLY! Ready to scale to full pipeline.');
    } else {
      console.log(`\n⚠️  Issues still present: ${issuesFound.join(', ')}`);
      console.log('   Additional debugging needed before scaling up.');
    }
    
    return {
      success: true,
      validation: outputData.validation,
      issuesFound
    };
    
  } catch (error) {
    console.error('\n❌ Single Question Test Failed:');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runSingleQuestionTest()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { runSingleQuestionTest };
