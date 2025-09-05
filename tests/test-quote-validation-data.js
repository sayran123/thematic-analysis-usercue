/**
 * Real Quote Test Dataset for Validation Testing
 * 
 * This module contains real quotes extracted from 106 participant responses
 * and hallucinated quotes for comprehensive validation testing.
 */

/**
 * Real quotes that should PASS validation
 * These are actual quotes extracted from real participant responses in 2.6
 */
export const validQuotes = [
  {
    quote: "not in US or EU data protection/retention policies",
    participantId: "4434",
    conversationText: "assistant: What features do you consider when choosing a VPN? user: not in US or EU data protection/retention policies, want to make sure that any data collected is minimal and that there are no logs kept of my browsing activity",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies",
    shouldPass: true,
    description: "Real quote about data protection policies"
  },
  {
    quote: "No logs policy and multiple servers across multiple locations",
    participantId: "4435", 
    conversationText: "assistant: When selecting a VPN service, what factors are most important to you? user: No logs policy and multiple servers across multiple locations. I want to ensure my privacy is protected and I have good connection speeds regardless of where I am.",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies", 
    shouldPass: true,
    description: "Real quote about no-logs policy and server locations"
  },
  {
    quote: "Security",
    participantId: "4449",
    conversationText: "assistant: What do you look for in a VPN service? user: Security, speed, and reliability are my top priorities. I need to trust that my data is protected.",
    themeId: "security-features", 
    themeName: "Security Features and Encryption",
    shouldPass: true,
    description: "Real but short quote about security"
  },
  {
    quote: "speed and reliability are my top priorities",
    participantId: "4449",
    conversationText: "assistant: What do you look for in a VPN service? user: Security, speed, and reliability are my top priorities. I need to trust that my data is protected.",
    themeId: "speed-performance",
    themeName: "Speed and Performance",
    shouldPass: true,
    description: "Real quote about speed and reliability priorities"
  },
  {
    quote: "I need to trust that my data is protected",
    participantId: "4449", 
    conversationText: "assistant: What do you look for in a VPN service? user: Security, speed, and reliability are my top priorities. I need to trust that my data is protected.",
    themeId: "security-features",
    themeName: "Security Features and Encryption",
    shouldPass: true,
    description: "Real quote about data protection trust"
  },
  {
    quote: "want to make sure that any data collected is minimal and that there are no logs kept of my browsing activity",
    participantId: "4434",
    conversationText: "assistant: What features do you consider when choosing a VPN? user: not in US or EU data protection/retention policies, want to make sure that any data collected is minimal and that there are no logs kept of my browsing activity", 
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies",
    shouldPass: true,
    description: "Real long quote about minimal data collection and no logs"
  },
  {
    quote: "I want to ensure my privacy is protected and I have good connection speeds",
    participantId: "4435",
    conversationText: "assistant: When selecting a VPN service, what factors are most important to you? user: No logs policy and multiple servers across multiple locations. I want to ensure my privacy is protected and I have good connection speeds regardless of where I am.",
    themeId: "privacy-policies", 
    themeName: "Privacy and No-Logs Policies",
    shouldPass: true,
    description: "Real quote combining privacy and speed concerns"
  }
];

/**
 * Hallucinated quotes that should FAIL validation
 * These are modified or completely fabricated quotes that don't exist in source conversations
 */
export const hallucinatedQuotes = [
  {
    quote: "privacy is very important to me",
    participantId: "4434",
    conversationText: "assistant: What features do you consider when choosing a VPN? user: not in US or EU data protection/retention policies, want to make sure that any data collected is minimal and that there are no logs kept of my browsing activity",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies", 
    shouldPass: false,
    expectedError: "HALLUCINATED QUOTE",
    description: "Paraphrased version of real privacy concern - not verbatim"
  },
  {
    quote: "I always choose VPNs with strong encryption",
    participantId: "4449",
    conversationText: "assistant: What do you look for in a VPN service? user: Security, speed, and reliability are my top priorities. I need to trust that my data is protected.",
    themeId: "security-features",
    themeName: "Security Features and Encryption",
    shouldPass: false, 
    expectedError: "HALLUCINATED QUOTE",
    description: "Completely fabricated quote about encryption preferences"
  },
  {
    quote: "Speed is the most critical factor for me",
    participantId: "4449",
    conversationText: "assistant: What do you look for in a VPN service? user: Security, speed, and reliability are my top priorities. I need to trust that my data is protected.",
    themeId: "speed-performance", 
    themeName: "Speed and Performance",
    shouldPass: false,
    expectedError: "HALLUCINATED QUOTE", 
    description: "Modified quote - original says 'top priorities' not 'most critical factor'"
  },
  {
    quote: "No logs policy and excellent customer support",
    participantId: "4435",
    conversationText: "assistant: When selecting a VPN service, what factors are most important to you? user: No logs policy and multiple servers across multiple locations. I want to ensure my privacy is protected and I have good connection speeds regardless of where I am.",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies",
    shouldPass: false,
    expectedError: "HALLUCINATED QUOTE",
    description: "Partially real quote with added fabricated content (customer support)"
  },
  {
    quote: "Data protection is my number one concern when choosing VPN services",
    participantId: "4434", 
    conversationText: "assistant: What features do you consider when choosing a VPN? user: not in US or EU data protection/retention policies, want to make sure that any data collected is minimal and that there are no logs kept of my browsing activity",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies",
    shouldPass: false,
    expectedError: "HALLUCINATED QUOTE",
    description: "Completely rewritten/summarized version of real privacy concerns"
  }
];

/**
 * Edge case test scenarios
 */
export const edgeCaseQuotes = [
  {
    quote: "",
    participantId: "4434", 
    conversationText: "assistant: What features do you consider? user: Privacy and security",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies",
    shouldPass: false,
    expectedError: "Empty or invalid quote",
    description: "Empty quote string"
  },
  {
    quote: "Privacy and security",
    participantId: "9999",
    conversationText: "assistant: What features do you consider? user: Privacy and security", 
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies", 
    shouldPass: false,
    expectedError: "No conversation found for participant",
    description: "Non-existent participant ID"
  },
  {
    quote: "This quote is way too long and probably shouldn't be used as it exceeds reasonable length limits and becomes unwieldy for readers while also potentially containing multiple different ideas that should be separated into distinct quotes rather than being combined into one massive quote that loses focus and clarity",
    participantId: "4434",
    conversationText: "assistant: What features do you consider? user: This quote is way too long and probably shouldn't be used as it exceeds reasonable length limits and becomes unwieldy for readers while also potentially containing multiple different ideas that should be separated into distinct quotes rather than being combined into one massive quote that loses focus and clarity",
    themeId: "privacy-policies", 
    themeName: "Privacy and No-Logs Policies",
    shouldPass: true, // Should pass validation but generate warning
    expectedWarning: "Quote is very long",
    description: "Very long quote that should generate length warning"
  },
  {
    quote: "Security",
    participantId: "4434",
    conversationText: "assistant: What do you look for? user: ", // Empty user response
    themeId: "security-features",
    themeName: "Security Features and Encryption", 
    shouldPass: false,
    expectedError: "No user responses found in conversation",
    description: "Quote with empty user response in conversation"
  },
  {
    quote: "Privacy ... Security",
    participantId: "4434",
    conversationText: "assistant: What matters to you? user: Privacy is important. Security is also crucial.",
    themeId: "privacy-policies",
    themeName: "Privacy and No-Logs Policies",
    shouldPass: true,
    description: "Multi-part quote with separator (should work if both parts exist)"
  }
];

/**
 * Complete test dataset combining all scenarios
 */
export const completeTestDataset = {
  valid: validQuotes,
  hallucinated: hallucinatedQuotes, 
  edgeCases: edgeCaseQuotes,
  
  // Quick access methods
  getAllValidQuotes() {
    return [...this.valid];
  },
  
  getAllInvalidQuotes() {
    return [...this.hallucinated, ...this.edgeCases.filter(q => !q.shouldPass)];
  },
  
  getAllQuotes() {
    return [...this.valid, ...this.hallucinated, ...this.edgeCases];
  },
  
  getQuotesByTheme(themeId) {
    return this.getAllQuotes().filter(q => q.themeId === themeId);
  },
  
  getQuotesByParticipant(participantId) {
    return this.getAllQuotes().filter(q => q.participantId === participantId);
  }
};

/**
 * Mock themes for testing
 */
export const mockThemes = [
  {
    id: "privacy-policies",
    title: "Privacy and No-Logs Policies",
    description: "Focus on data protection and logging policies"
  },
  {
    id: "security-features", 
    title: "Security Features and Encryption",
    description: "Focus on security and encryption capabilities" 
  },
  {
    id: "speed-performance",
    title: "Speed and Performance", 
    description: "Focus on connection speed and reliability"
  }
];

/**
 * Mock classifications for testing
 */
export const mockClassifications = [
  { participantId: "4434", themeId: "privacy-policies", theme: "Privacy and No-Logs Policies", confidence: 0.9 },
  { participantId: "4435", themeId: "privacy-policies", theme: "Privacy and No-Logs Policies", confidence: 0.85 },
  { participantId: "4449", themeId: "security-features", theme: "Security Features and Encryption", confidence: 0.8 }
];

/**
 * Generate test validation input from test dataset
 * @param {Array} quotes - Array of quote test cases
 * @returns {Object} Validation input object
 */
export function generateValidationInput(quotes = completeTestDataset.getAllQuotes()) {
  // Organize quotes by theme
  const selectedQuotes = {};
  for (const theme of mockThemes) {
    selectedQuotes[theme.id] = quotes
      .filter(q => q.themeId === theme.id)
      .map(q => ({
        quote: q.quote,
        participantId: q.participantId
      }));
  }
  
  // Create responses from quote conversations
  const responses = quotes.map(q => ({
    participantId: q.participantId,
    questionId: "test_question",
    cleanResponse: q.conversationText
  }));
  
  // Remove duplicates
  const uniqueResponses = responses.filter((resp, index, arr) => 
    arr.findIndex(r => r.participantId === resp.participantId) === index
  );
  
  return {
    selectedQuotes,
    responses: uniqueResponses,
    themes: mockThemes,
    classifications: mockClassifications
  };
}
