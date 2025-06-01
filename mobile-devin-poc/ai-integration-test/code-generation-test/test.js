require('dotenv').config();
const GeminiTester = require('../gemini-test/test');
const VertexAITester = require('../vertex-ai-test/test');

class CodeGenerationIntegrationTester {
  constructor() {
    this.geminiTester = new GeminiTester();
    this.vertexAITester = new VertexAITester();
    this.testScenarios = [
      {
        name: 'React Native Component Generation',
        scenario: 'TodoList Component',
        prompt: 'Create a React Native TodoList component with TypeScript',
        complexity: 'medium',
      },
      {
        name: 'WebSocket Client Generation',
        scenario: 'Real-time Communication',
        prompt: 'Generate a WebSocket client for React Native with reconnection logic',
        complexity: 'high',
      },
      {
        name: 'State Management Hook',
        scenario: 'Custom Hook',
        prompt: 'Create a custom React hook for managing async state with error handling',
        complexity: 'medium',
      },
    ];
  }

  async runScenarioTest(scenario) {
    console.log(`\n🎯 Testing Scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.scenario}`);
    console.log(`Complexity: ${scenario.complexity}`);
    console.log('-'.repeat(50));

    const results = {
      scenario: scenario.name,
      gemini: null,
      vertexAI: null,
      comparison: null,
    };

    // Test with Gemini
    try {
      console.log('🤖 Testing with Gemini...');
      const geminiResult = await this.geminiTester.generativeModel.generateContent(scenario.prompt);
      const geminiCode = geminiResult.response.candidates[0].content.parts[0].text;
      
      results.gemini = {
        success: true,
        code: geminiCode,
        tokenCount: geminiResult.response.usageMetadata?.totalTokenCount || 0,
        quality: this.analyzeCodeQuality(geminiCode),
      };
      
      console.log('✅ Gemini generation completed');
    } catch (error) {
      console.error('❌ Gemini generation failed:', error.message);
      results.gemini = {
        success: false,
        error: error.message,
      };
    }

    // Test with Vertex AI
    try {
      console.log('🤖 Testing with Vertex AI...');
      const vertexResult = await this.vertexAITester.codeGenerativeModel.generateContent(scenario.prompt);
      const vertexCode = vertexResult.response.candidates[0].content.parts[0].text;
      
      results.vertexAI = {
        success: true,
        code: vertexCode,
        tokenCount: vertexResult.response.usageMetadata?.totalTokenCount || 0,
        quality: this.analyzeCodeQuality(vertexCode),
      };
      
      console.log('✅ Vertex AI generation completed');
    } catch (error) {
      console.error('❌ Vertex AI generation failed:', error.message);
      results.vertexAI = {
        success: false,
        error: error.message,
      };
    }

    // Compare results
    if (results.gemini?.success && results.vertexAI?.success) {
      results.comparison = this.compareGenerations(results.gemini, results.vertexAI);
    }

    return results;
  }

  analyzeCodeQuality(code) {
    const metrics = {
      linesOfCode: code.split('\n').length,
      hasTypeScript: code.includes(': ') || code.includes('interface ') || code.includes('type '),
      hasErrorHandling: code.includes('try') || code.includes('catch') || code.includes('throw'),
      hasComments: code.includes('//') || code.includes('/*'),
      hasImports: code.includes('import ') || code.includes('require('),
      complexity: 'low', // Simplified assessment
    };

    // Simple complexity assessment
    const complexityIndicators = [
      'async', 'await', 'Promise', 'useState', 'useEffect', 'interface', 'type'
    ];
    const complexityCount = complexityIndicators.filter(indicator => 
      code.includes(indicator)
    ).length;

    if (complexityCount > 5) metrics.complexity = 'high';
    else if (complexityCount > 2) metrics.complexity = 'medium';

    return metrics;
  }

  compareGenerations(geminiResult, vertexResult) {
    return {
      tokenEfficiency: {
        gemini: geminiResult.tokenCount,
        vertexAI: vertexResult.tokenCount,
        winner: geminiResult.tokenCount < vertexResult.tokenCount ? 'gemini' : 'vertexAI',
      },
      codeLength: {
        gemini: geminiResult.quality.linesOfCode,
        vertexAI: vertexResult.quality.linesOfCode,
        winner: Math.abs(geminiResult.quality.linesOfCode - 50) < 
                Math.abs(vertexResult.quality.linesOfCode - 50) ? 'gemini' : 'vertexAI',
      },
      features: {
        gemini: {
          typescript: geminiResult.quality.hasTypeScript,
          errorHandling: geminiResult.quality.hasErrorHandling,
          comments: geminiResult.quality.hasComments,
        },
        vertexAI: {
          typescript: vertexResult.quality.hasTypeScript,
          errorHandling: vertexResult.quality.hasErrorHandling,
          comments: vertexResult.quality.hasComments,
        },
      },
    };
  }

  async runAllScenarios() {
    console.log('🚀 Starting Code Generation Integration Tests...\n');
    console.log(`Testing ${this.testScenarios.length} scenarios with multiple AI models...\n`);

    const results = [];

    for (const scenario of this.testScenarios) {
      const result = await this.runScenarioTest(scenario);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.printSummaryReport(results);
    return results;
  }

  printSummaryReport(results) {
    console.log('\n📊 Code Generation Test Summary');
    console.log('='.repeat(60));

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.scenario}`);
      console.log(`   Gemini: ${result.gemini?.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Vertex AI: ${result.vertexAI?.success ? '✅ PASS' : '❌ FAIL'}`);
      
      if (result.comparison) {
        console.log(`   Token Efficiency Winner: ${result.comparison.tokenEfficiency.winner}`);
        console.log(`   Code Quality Winner: ${result.comparison.codeLength.winner}`);
      }
    });

    // Overall statistics
    const geminiSuccesses = results.filter(r => r.gemini?.success).length;
    const vertexSuccesses = results.filter(r => r.vertexAI?.success).length;
    const totalTests = results.length;

    console.log('\n📈 Overall Performance:');
    console.log(`Gemini Success Rate: ${geminiSuccesses}/${totalTests} (${Math.round(geminiSuccesses/totalTests*100)}%)`);
    console.log(`Vertex AI Success Rate: ${vertexSuccesses}/${totalTests} (${Math.round(vertexSuccesses/totalTests*100)}%)`);

    // Token usage summary
    const geminiTokens = results
      .filter(r => r.gemini?.success)
      .reduce((sum, r) => sum + (r.gemini?.tokenCount || 0), 0);
    const vertexTokens = results
      .filter(r => r.vertexAI?.success)
      .reduce((sum, r) => sum + (r.vertexAI?.tokenCount || 0), 0);

    console.log(`\n💰 Token Usage:`);
    console.log(`Gemini Total: ${geminiTokens} tokens`);
    console.log(`Vertex AI Total: ${vertexTokens} tokens`);
    console.log('='.repeat(60));
  }

  async testReactNativeSpecificGeneration() {
    console.log('\n🎯 Testing React Native Specific Generation...');
    
    const rnPrompts = [
      'Create a React Native screen with navigation and dark theme',
      'Generate a custom hook for handling device orientation changes',
      'Write a WebView component with JavaScript bridge communication',
      'Create a performant FlatList with pull-to-refresh functionality',
    ];

    const results = [];
    
    for (const prompt of rnPrompts) {
      console.log(`\nTesting: ${prompt.substring(0, 50)}...`);
      
      try {
        const geminiResult = await this.geminiTester.generativeModel.generateContent(
          `${prompt}\n\nRequirements:\n- Use TypeScript\n- Follow React Native best practices\n- Include proper imports\n- Add error handling`
        );
        
        const code = geminiResult.response.candidates[0].content.parts[0].text;
        const quality = this.analyzeCodeQuality(code);
        
        results.push({
          prompt: prompt.substring(0, 30) + '...',
          success: true,
          quality,
          hasReactNativeImports: code.includes('react-native'),
          hasProperTypes: quality.hasTypeScript,
        });
        
        console.log('✅ Generated successfully');
      } catch (error) {
        console.error('❌ Generation failed:', error.message);
        results.push({
          prompt: prompt.substring(0, 30) + '...',
          success: false,
          error: error.message,
        });
      }
    }
    
    console.log('\n📱 React Native Specific Results:');
    results.forEach((result, i) => {
      console.log(`${i+1}. ${result.prompt}`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      if (result.success) {
        console.log(`   RN Imports: ${result.hasReactNativeImports ? '✅' : '❌'}`);
        console.log(`   TypeScript: ${result.hasProperTypes ? '✅' : '❌'}`);
      }
    });
    
    return results;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CodeGenerationIntegrationTester();
  
  async function runTests() {
    try {
      await tester.runAllScenarios();
      await tester.testReactNativeSpecificGeneration();
    } catch (error) {
      console.error('Test suite failed:', error);
    }
  }
  
  runTests();
}

module.exports = CodeGenerationIntegrationTester; 