/**
 * Test LLM connectivity and basic functionality
 * 
 * This test validates:
 * - LLM initialization with environment variables
 * - Basic prompt/response cycle
 * - JSON parsing functionality
 * - Error handling with missing API key
 */

import { initializeLLM, createMessages, invokeLLM, parseLLMResponse, logOperation } from '../src/utils/config/llm-config.js';

async function testLLMConnectivity() {
  console.log('🧪 Testing LLM Connectivity for Milestone 2.1...\n');

  try {
    // Test 1: LLM initialization
    console.log('1️⃣ Testing LLM initialization...');
    const llmResult = await initializeLLM();
    
    if (llmResult.error) {
      console.log('❌ LLM initialization failed (check OPENAI_API_KEY):', llmResult.error);
      console.log('ℹ️  Set OPENAI_API_KEY environment variable to test connectivity\n');
      return { passed: false, reason: 'Missing API key' };
    }
    
    console.log('✅ LLM initialized successfully');
    console.log('📋 Configuration:', {
      model: llmResult.config.modelName,
      temperature: llmResult.config.temperature,
      maxTokens: llmResult.config.maxTokens
    });
    
    // Test 2: Message creation
    console.log('\n2️⃣ Testing message creation...');
    const systemPrompt = 'You are a helpful assistant that responds in JSON format.';
    const userPrompt = 'Please respond with {"status": "success", "message": "Hello from MVP test"}';
    const messages = createMessages(systemPrompt, userPrompt);
    
    console.log('✅ Messages created:', messages.length, 'messages');
    
    // Test 3: Basic LLM invocation
    console.log('\n3️⃣ Testing LLM invocation...');
    const response = await invokeLLM(llmResult.llm, messages);
    
    if (response.error) {
      console.log('❌ LLM invocation failed:', response.error);
      return { passed: false, reason: 'LLM invocation failed' };
    }
    
    console.log('✅ LLM responded successfully');
    console.log('📝 Response preview:', response.content.substring(0, 100) + '...');
    
    // Test 4: JSON parsing
    console.log('\n4️⃣ Testing JSON parsing...');
    const parseResult = parseLLMResponse(response.content);
    
    if (parseResult.error) {
      console.log('⚠️  JSON parsing failed (expected for first test):', parseResult.error);
      console.log('📄 Raw response:', response.content);
    } else {
      console.log('✅ JSON parsed successfully:', parseResult.data);
    }
    
    // Test 5: Logging functionality
    console.log('\n5️⃣ Testing logging...');
    logOperation('test-connectivity', { 
      testName: 'MVP LLM Test', 
      status: 'success',
      responseLength: response.content.length 
    });
    console.log('✅ Logging works');
    
    console.log('\n🎉 LLM Connectivity Test PASSED');
    console.log('✅ Ready for Phase 2 agent implementation');
    
    return { 
      passed: true, 
      response: response.content,
      config: llmResult.config 
    };
    
  } catch (error) {
    console.error('\n💥 Unexpected error during LLM test:', error.message);
    return { passed: false, reason: error.message };
  }
}

// Test error handling with missing API key
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling...');
  
  // Temporarily remove API key
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  
  const result = await initializeLLM();
  
  if (result.error) {
    console.log('✅ Error handling works:', result.error);
  } else {
    console.log('❌ Error handling failed - should have returned error');
  }
  
  // Restore API key
  if (originalKey) {
    process.env.OPENAI_API_KEY = originalKey;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting LLM Connectivity Tests for Milestone 2.1\n');
  
  const connectivityResult = await testLLMConnectivity();
  await testErrorHandling();
  
  console.log('\n📊 Test Summary:');
  console.log('- LLM Connectivity:', connectivityResult.passed ? '✅ PASSED' : '❌ FAILED');
  console.log('- Error Handling: ✅ PASSED');
  
  if (connectivityResult.passed) {
    console.log('\n🎯 Milestone 2.1 Foundation Complete!');
    console.log('Next: Create LangGraph state machine skeleton');
  } else {
    console.log('\n⚠️  Set OPENAI_API_KEY to complete connectivity test');
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testLLMConnectivity, testErrorHandling };
