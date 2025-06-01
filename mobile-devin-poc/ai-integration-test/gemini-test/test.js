require('dotenv').config();
const { VertexAI } = require('@google-cloud/vertexai');

class GeminiTester {
  constructor() {
    this.vertex_ai = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    });
    
    this.model = 'gemini-1.5-pro';
    this.generativeModel = this.vertex_ai.preview.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
        topP: 0.8,
      },
    });
  }

  async testCodeGeneration() {
    console.log('🤖 Testing Gemini Code Generation...');
    
    const prompt = `
      Generate a React Native component for a simple todo item with the following requirements:
      - Accept props: title, completed, onToggle
      - Use TypeScript
      - Apply dark theme styling
      - Include TouchableOpacity for interaction
      
      Return only the code without explanations.
    `;

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response;
      const text = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Code Generation Success!');
      console.log('Generated Code:');
      console.log('=' .repeat(50));
      console.log(text);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        code: text,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Code Generation Failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testCodeAnalysis() {
    console.log('🔍 Testing Gemini Code Analysis...');
    
    const codeToAnalyze = `
      import React, { useState } from 'react';
      import { View, Text, TouchableOpacity } from 'react-native';
      
      const TodoItem = ({ title, completed, onToggle }) => {
        const [isPressed, setIsPressed] = useState(false);
        
        return (
          <TouchableOpacity
            onPress={onToggle}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            style={{
              padding: 15,
              backgroundColor: isPressed ? '#333' : '#2a2a2a',
              borderRadius: 8,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: completed ? '#4CAF50' : '#666',
              backgroundColor: completed ? '#4CAF50' : 'transparent',
              marginRight: 12
            }} />
            <Text style={{
              color: completed ? '#888' : '#fff',
              textDecorationLine: completed ? 'line-through' : 'none',
              fontSize: 16
            }}>
              {title}
            </Text>
          </TouchableOpacity>
        );
      };
      
      export default TodoItem;
    `;

    const prompt = `
      Analyze the following React Native component code and provide:
      1. Code quality assessment (1-10)
      2. Potential improvements
      3. TypeScript conversion suggestions
      4. Performance optimizations
      5. Accessibility improvements
      
      Code to analyze:
      ${codeToAnalyze}
    `;

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response;
      const analysis = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Code Analysis Success!');
      console.log('Analysis Result:');
      console.log('=' .repeat(50));
      console.log(analysis);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        analysis,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Code Analysis Failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testContextUnderstanding() {
    console.log('🧠 Testing Gemini Context Understanding...');
    
    const projectContext = `
      Project: Mobile Devin POC
      Framework: React Native
      Language: TypeScript
      Architecture: Clean Architecture
      Design System: Dark theme with blue accent (#2196F3)
      Current Files:
      - src/services/WebSocketClient.ts (WebSocket communication)
      - src/components/MonacoEditor.tsx (Code editor WebView)
      - src/screens/MainScreen.tsx (Main application screen)
      
      User Request: "Add a new screen for AI chat functionality where users can ask questions about their code"
    `;

    const prompt = `
      Based on the following project context, generate a plan for implementing the requested feature:
      
      ${projectContext}
      
      Provide:
      1. File structure suggestions
      2. Component architecture
      3. Integration points with existing code
      4. UI/UX considerations
      5. Implementation steps
    `;

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = result.response;
      const plan = response.candidates[0].content.parts[0].text;
      
      console.log('✅ Context Understanding Success!');
      console.log('Implementation Plan:');
      console.log('=' .repeat(50));
      console.log(plan);
      console.log('=' .repeat(50));
      
      return {
        success: true,
        plan,
        tokenCount: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('❌ Context Understanding Failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Gemini AI Integration Tests...\n');
    
    const results = {
      codeGeneration: await this.testCodeGeneration(),
      codeAnalysis: await this.testCodeAnalysis(),
      contextUnderstanding: await this.testContextUnderstanding(),
    };
    
    console.log('\n📊 Test Summary:');
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const tokens = result.tokenCount ? ` (${result.tokenCount} tokens)` : '';
      console.log(`${testName}: ${status}${tokens}`);
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
  const tester = new GeminiTester();
  tester.runAllTests().catch(console.error);
}

module.exports = GeminiTester; 