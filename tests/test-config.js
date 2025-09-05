#!/usr/bin/env node

/**
 * Configuration Test Script
 * 
 * This script validates the configuration system and tests basic functionality
 * before proceeding with the main pipeline implementation.
 */

import { validateConfig, getConfig, ANALYSIS_CONFIG, LLM_CONFIG } from '../src/utils/config/constants.js';
import { initializeLLM, parseLLMResponse } from '../src/utils/config/llm-config.js';

/**
 * Test configuration system
 */
async function testConfiguration() {
  console.log('🔧 Testing Configuration System...\n');
  
  // Test 1: Validate configuration constants
  console.log('1. Testing configuration validation...');
  const configValidation = validateConfig();
  
  if (configValidation.passed) {
    console.log('✅ Configuration validation passed');
  } else {
    console.log('❌ Configuration validation failed:');
    configValidation.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (configValidation.warnings.length > 0) {
    console.log('⚠️  Configuration warnings:');
    configValidation.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log(`   Summary: ${configValidation.summary}\n`);
  
  // Test 2: Test getConfig function
  console.log('2. Testing configuration access...');
  
  const testPaths = [
    'ANALYSIS_CONFIG.THEMES.MAX_COUNT',
    'LLM_CONFIG.MODEL.TEMPERATURE',
    'PROCESSING_CONFIG.CONCURRENCY.MAX_QUESTIONS',
    'INVALID.PATH.TEST'
  ];
  
  for (const path of testPaths) {
    const value = getConfig(path);
    if (value !== undefined) {
      console.log(`✅ ${path} = ${value}`);
    } else {
      console.log(`❌ ${path} = undefined (expected for invalid paths)`);
    }
  }
  
  console.log();
  
  // Test 3: Environment variable check
  console.log('3. Checking environment variables...');
  
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const optionalEnvVars = ['LANGSMITH_API_KEY', 'LANGSMITH_PROJECT'];
  
  let envValid = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`❌ ${envVar} is missing (required)`);
      envValid = false;
    }
  }
  
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set (optional)`);
    } else {
      console.log(`⚠️  ${envVar} is not set (optional)`);
    }
  }
  
  console.log();
  
  return { configValidation, envValid };
}

/**
 * Test LLM configuration and connectivity
 */
async function testLLMConfiguration() {
  console.log('🤖 Testing LLM Configuration...\n');
  
  try {
    // Test 1: Initialize LLM (will use placeholder until dependencies installed)
    console.log('1. Testing LLM initialization...');
    const llm = await initializeLLM();
    console.log('✅ LLM initialized successfully');
    
    // Test 2: Validate LLM configuration
    console.log('\n2. Testing LLM configuration validation...');
    const llmValidation = validateLLMConfig(llm.config);
    
    if (llmValidation.passed) {
      console.log('✅ LLM configuration validation passed');
    } else {
      console.log('❌ LLM configuration validation failed:');
      llmValidation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (llmValidation.warnings.length > 0) {
      console.log('⚠️  LLM configuration warnings:');
      llmValidation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    console.log(`   Summary: ${llmValidation.summary}`);
    
    // Test 3: Test LLM invocation (placeholder)
    console.log('\n3. Testing LLM invocation...');
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, this is a test message.' }
    ];
    
    const response = await llm.invoke(testMessages);
    console.log('✅ LLM invocation successful');
    console.log(`   Response: ${response.content.substring(0, 100)}...`);
    
    // Test 4: Test JSON parsing
    console.log('\n4. Testing JSON response parsing...');
    const testJsonResponse = '```json\n{"test": "success", "number": 42}\n```';
    
    try {
      const parsed = parseLLMResponse(testJsonResponse);
      console.log('✅ JSON parsing successful');
      console.log(`   Parsed: ${JSON.stringify(parsed)}`);
    } catch (error) {
      console.log(`❌ JSON parsing failed: ${error.message}`);
    }
    
    // Test 5: Initialize LangSmith (optional)
    console.log('\n5. Testing LangSmith initialization...');
    const langSmith = await initializeLangSmith();
    
    if (langSmith) {
      console.log('✅ LangSmith initialized successfully');
      await langSmith.trace('test-operation', { test: true });
    } else {
      console.log('⚠️  LangSmith not initialized (API key not provided)');
    }
    
    return { llm, langSmith, validation: llmValidation };
    
  } catch (error) {
    console.error('❌ LLM configuration test failed:', error.message);
    return { error };
  }
}

/**
 * Test configuration integration
 */
async function testIntegration() {
  console.log('\n🔄 Testing Configuration Integration...\n');
  
  console.log('1. Testing configuration constants access in context...');
  
  // Test accessing various configuration sections
  const configSections = [
    { name: 'Analysis Config', path: 'ANALYSIS_CONFIG' },
    { name: 'Processing Config', path: 'PROCESSING_CONFIG' },
    { name: 'LLM Config', path: 'LLM_CONFIG' },
    { name: 'Validation Config', path: 'VALIDATION_CONFIG' }
  ];
  
  for (const section of configSections) {
    const config = getConfig(section.path);
    if (config && typeof config === 'object') {
      console.log(`✅ ${section.name}: ${Object.keys(config).length} settings available`);
    } else {
      console.log(`❌ ${section.name}: Not accessible`);
    }
  }
  
  console.log('\n2. Testing direct constant access...');
  console.log(`✅ ANALYSIS_CONFIG.THEMES available: ${Object.keys(ANALYSIS_CONFIG.THEMES).join(', ')}`);
  
  console.log('\n3. Testing configuration coherence...');
  
  // Check if configurations make sense together
  const maxQuestions = getConfig('PROCESSING_CONFIG.CONCURRENCY.MAX_QUESTIONS');
  const themesPerQuestion = getConfig('ANALYSIS_CONFIG.THEMES.MAX_COUNT');
  
  if (maxQuestions && themesPerQuestion) {
    const totalThemes = maxQuestions * themesPerQuestion;
    console.log(`✅ Configuration coherence: Max ${maxQuestions} questions × ${themesPerQuestion} themes = ${totalThemes} total themes`);
  }
  
  console.log('\n✅ Configuration integration test completed');
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Configuration Test Suite\n');
  console.log('=' .repeat(50));
  
  try {
    // Run configuration tests
    const { configValidation, envValid } = await testConfiguration();
    
    // Run LLM tests
    const llmTest = await testLLMConfiguration();
    
    // Run integration tests
    await testIntegration();
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Test Summary:');
    console.log(`   Configuration: ${configValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Environment: ${envValid ? '✅ READY' : '❌ NEEDS SETUP'}`);
    console.log(`   LLM Config: ${llmTest.validation?.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Integration: ✅ COMPLETED`);
    
    if (configValidation.passed && envValid && llmTest.validation?.passed) {
      console.log('\n🎉 All tests passed! Configuration system is ready.');
      console.log('   Ready to proceed with Milestone 1.2: Data Models & Validation Utilities');
    } else {
      console.log('\n⚠️  Some tests failed. Please address the issues before proceeding.');
      
      if (!envValid) {
        console.log('\n🔧 To fix environment issues:');
        console.log('   1. Copy env.example to .env');
        console.log('   2. Add your OPENAI_API_KEY to the .env file');
        console.log('   3. Optionally add LANGSMITH_API_KEY for monitoring');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
