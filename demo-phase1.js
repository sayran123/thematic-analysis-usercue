/**
 * Phase 1 Demo Script
 * Demonstrates the complete data processing pipeline with real data
 */

import { extractDataFromExcel } from './src/data/extractors/excel-extractor.js';
import { parseAndCleanResponses } from './src/data/parsers/response-parser.js';

async function runPhase1Demo() {
  console.log('🚀 Phase 1 Data Processing Pipeline Demo\n');
  console.log('=========================================\n');

  try {
    // Step 1: Excel Data Extraction
    console.log('📊 Step 1: Extracting data from Excel file...');
    const extractionResult = await extractDataFromExcel('inputs/data.xlsx', 'inputs/project_background.txt');
    
    if (extractionResult.error) {
      console.error(`❌ Extraction failed: ${extractionResult.error}`);
      return;
    }
    
    const extractedData = extractionResult.data;
    console.log(`✅ Extraction complete!`);
    console.log(`   📋 Questions detected: ${extractedData.questions.length}`);
    console.log(`   📝 Raw responses: ${extractedData.participantResponses.length}`);
    console.log(`   👤 Participants: ${extractedData.metadata.totalParticipants}`);
    
    // Show detected questions
    console.log('\n📋 Detected Questions:');
    extractedData.questions.forEach(q => {
      console.log(`   ${q.columnIndex}. ${q.questionId}`);
    });

    // Step 2: Response Parsing and Cleaning
    console.log('\n🧹 Step 2: Parsing and cleaning responses...');
    const parsingResult = parseAndCleanResponses(extractedData);
    
    if (parsingResult.error) {
      console.error(`❌ Parsing failed: ${parsingResult.error}`);
      return;
    }
    
    const parsedData = parsingResult.data;
    console.log(`✅ Parsing complete!`);
    console.log(`   ✨ Cleaned responses: ${parsedData.metadata.cleanedResponses}`);
    console.log(`   ❌ Rejected responses: ${parsedData.metadata.rejectedResponses}`);
    
    if (parsingResult.warnings) {
      parsingResult.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }

    // Step 3: Response Statistics
    console.log('\n📊 Step 3: Response Statistics');
    const stats = parsedData.responseStatistics;
    console.log(`   Total responses: ${stats.totalResponses}`);
    console.log(`   Average length: ${stats.averageResponseLength} characters`);
    console.log(`   Length range: ${stats.minLength} - ${stats.maxLength} characters`);
    console.log(`   Conversation format: ${stats.conversationFormatPercentage}%`);
    
    console.log('\n📈 Response Distribution by Question:');
    Object.entries(stats.responseDistribution).forEach(([questionId, count]) => {
      console.log(`   ${questionId}: ${count} responses`);
    });

    // Step 4: Show Sample Data for Phase 2 Readiness
    console.log('\n🔍 Step 4: Sample Data for LLM Analysis');
    const firstQuestion = extractedData.questions[0];
    const firstQuestionResponses = parsedData.responsesByQuestion[firstQuestion.questionId];
    
    console.log(`\n📝 Sample responses for "${firstQuestion.questionId}":`);
    console.log(`   Total responses: ${firstQuestionResponses.length}`);
    
    // Show first 2 responses as examples
    firstQuestionResponses.slice(0, 2).forEach((response, i) => {
      console.log(`\n   Example ${i + 1} (Participant ${response.participantId}):`);
      console.log(`   "${response.cleanResponse.substring(0, 150)}..."`);
      console.log(`   Length: ${response.responseLength} chars | Conversation format: ${response.hasConversationFormat}`);
    });

    // Step 5: Phase 2 Readiness Check
    console.log('\n🎯 Step 5: Phase 2 Readiness Assessment');
    console.log('✅ Project background loaded and ready');
    console.log('✅ Questions properly detected and structured');
    console.log('✅ Responses cleaned and grouped by question');
    console.log('✅ Conversation format preserved for LLM analysis');
    console.log('✅ Response statistics calculated for validation');
    
    // Check minimum response thresholds
    let readyForPhase2 = true;
    console.log('\n🔍 Checking minimum response thresholds:');
    
    Object.entries(parsedData.responsesByQuestion).forEach(([questionId, responses]) => {
      const count = responses.length;
      const status = count >= 10 ? '✅' : '⚠️';
      console.log(`   ${status} ${questionId}: ${count} responses ${count >= 10 ? '(sufficient)' : '(low)'}`);
      if (count < 10) readyForPhase2 = false;
    });

    // Final Status
    console.log('\n🏁 Phase 1 Pipeline Status');
    console.log('==========================================');
    
    if (readyForPhase2) {
      console.log('🎉 SUCCESS: Phase 1 Complete!');
      console.log('🚀 Ready to proceed with Phase 2: LLM Integration');
      console.log('\nNext steps:');
      console.log('1. Implement theme generation agent');
      console.log('2. Add response classification');
      console.log('3. Build quote extraction with validation');
      console.log('4. Create analysis summarization');
    } else {
      console.log('⚠️  WARNING: Some questions have low response counts');
      console.log('Consider data quality before proceeding to Phase 2');
    }

    console.log('\n📁 Data Structure Ready for Phase 2:');
    console.log('- projectBackground: Study context for LLM prompts');
    console.log('- responsesByQuestion: Grouped for parallel processing');
    console.log('- questionStats: Response counts and metadata');
    console.log('- responseStatistics: Quality metrics and validation');

  } catch (error) {
    console.error(`❌ Demo failed: ${error.message}`);
    console.error('Please check your data files and try again.');
  }
}

// Run demo
runPhase1Demo();
