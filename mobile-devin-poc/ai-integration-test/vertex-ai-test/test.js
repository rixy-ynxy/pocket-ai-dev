require('dotenv').config();
const { VertexAI } = require('@google-cloud/vertexai');

class VertexAITester {
  constructor() {
    this.vertex_ai = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
    
    this.codeModel = 'code-bison';
    this.textModel = 'text-bison';
    
    this.codeGenerativeModel = this.vertex_ai.preview.getGenerativeModel({
      model: this.codeModel,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.1,
      },
    });
    
    this.textGenerativeModel = this.vertex_ai.preview.getGenerativeModel({
      model: this.textModel,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.2,
      },
    });
  }

  async testCodeBison() {
    console.log('🤖 Testing Vertex AI Code-Bison...');
    
    const prompt = `
      Write a TypeScript function that validates an email address using regex.
      Include proper type annotations and JSDoc comments.
      Function should return boolean.
    `;

    try {
      const result = await this.codeGenerativeModel.generateContent(prompt);
      const response = result.response;
      const code = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Code-Bison Success!');
      console.log('Generated Code:');
      console.log('=' .repeat(50));
      console.log(code);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        code,
        model: this.codeModel,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Code-Bison Failed:', error);
      return {
        success: false,
        error: error.message,
        model: this.codeModel
      };
    }
  }

  async testTextBison() {
    console.log('📝 Testing Vertex AI Text-Bison...');
    
    const prompt = `
      Explain the benefits of using TypeScript over JavaScript for React Native development.
      Focus on type safety, development experience, and maintainability.
      Keep the response concise (3-4 paragraphs).
    `;

    try {
      const result = await this.textGenerativeModel.generateContent(prompt);
      const response = result.response;
      const text = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Text-Bison Success!');
      console.log('Generated Text:');
      console.log('=' .repeat(50));
      console.log(text);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        text,
        model: this.textModel,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Text-Bison Failed:', error);
      return {
        success: false,
        error: error.message,
        model: this.textModel
      };
    }
  }

  async testCodeRefactoring() {
    console.log('🔧 Testing Code Refactoring...');
    
    const originalCode = `
      function calculateTotal(items) {
        var total = 0;
        for (var i = 0; i < items.length; i++) {
          if (items[i].price && items[i].quantity) {
            total = total + (items[i].price * items[i].quantity);
          }
        }
        return total;
      }
    `;
    
    const prompt = `
      Refactor the following JavaScript function to modern TypeScript:
      - Use proper type annotations
      - Use modern ES6+ syntax
      - Add error handling
      - Improve readability
      
      Original code:
      ${originalCode}
    `;

    try {
      const result = await this.codeGenerativeModel.generateContent(prompt);
      const response = result.response;
      const refactoredCode = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Code Refactoring Success!');
      console.log('Refactored Code:');
      console.log('=' .repeat(50));
      console.log(refactoredCode);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        originalCode,
        refactoredCode,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Code Refactoring Failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testPerformanceAnalysis() {
    console.log('⚡ Testing Performance Analysis...');
    
    const performanceIssueCode = `
      const processLargeDataset = (data) => {
        const results = [];
        
        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].items.length; j++) {
            const item = data[i].items[j];
            
            // Expensive operation in nested loop
            const processed = JSON.parse(JSON.stringify(item));
            processed.calculated = expensiveCalculation(processed.value);
            results.push(processed);
          }
        }
        
        // Sort entire array every time
        return results.sort((a, b) => a.calculated - b.calculated);
      };
      
      function expensiveCalculation(value) {
        let result = 0;
        for (let i = 0; i < 10000; i++) {
          result += Math.sqrt(value * i);
        }
        return result;
      }
    `;
    
    const prompt = `
      Analyze the following code for performance issues and suggest optimizations:
      
      ${performanceIssueCode}
      
      Provide:
      1. Identified performance bottlenecks
      2. Optimization suggestions
      3. Improved code example
      4. Performance impact estimation
    `;

    try {
      const result = await this.codeGenerativeModel.generateContent(prompt);
      const response = result.response;
      const analysis = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Performance Analysis Success!');
      console.log('Analysis Result:');
      console.log('=' .repeat(50));
      console.log(analysis);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        analysis,
        originalCode: performanceIssueCode,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Performance Analysis Failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Vertex AI Integration Tests...\n');
    
    const results = {
      codeBison: await this.testCodeBison(),
      textBison: await this.testTextBison(),
      codeRefactoring: await this.testCodeRefactoring(),
      performanceAnalysis: await this.testPerformanceAnalysis(),
    };
    
    console.log('\n📊 Test Summary:');
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const model = result.model ? ` (${result.model})` : '';
      const tokens = result.tokenCount ? ` [${result.tokenCount} tokens]` : '';
      console.log(`${testName}: ${status}${model}${tokens}`);
    });
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\nOverall: ${successCount}/${totalCount} tests passed`);
    console.log('=' .repeat(50));
    
    return results;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new VertexAITester();
  tester.runAllTests().catch(console.error);
}

module.exports = VertexAITester; 