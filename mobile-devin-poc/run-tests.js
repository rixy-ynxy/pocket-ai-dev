#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runCommand(command, cwd, description) {
    return new Promise((resolve) => {
      console.log(`\n🚀 ${description}`);
      console.log(`📂 Working directory: ${cwd}`);
      console.log(`⚙️  Command: ${command}`);
      console.log('-'.repeat(50));

      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, {
        cwd,
        stdio: 'inherit',
        shell: true
      });

      const startTime = Date.now();

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = {
          description,
          command,
          cwd,
          exitCode: code,
          duration,
          status: code === 0 ? 'PASS' : 'FAIL'
        };
        
        this.results.push(result);
        console.log(`\n${result.status === 'PASS' ? '✅' : '❌'} ${description} - ${duration}ms`);
        resolve(result);
      });

      process.on('error', (error) => {
        const duration = Date.now() - startTime;
        const result = {
          description,
          command,
          cwd,
          exitCode: 1,
          duration,
          status: 'ERROR',
          error: error.message
        };
        
        this.results.push(result);
        console.log(`\n💥 ${description} - ERROR: ${error.message}`);
        resolve(result);
      });
    });
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');

    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'NPM', command: 'npm --version' },
      { name: 'TypeScript', command: 'npx tsc --version' },
    ];

    for (const check of checks) {
      try {
        await this.runCommand(check.command, '.', `Check ${check.name}`);
      } catch (error) {
        console.log(`❌ ${check.name} not found`);
      }
    }
  }

  async runCursorExtensionTests() {
    console.log('\n📱 Testing Cursor Extension...');
    
    const cursorDir = path.join(__dirname, 'cursor-extension');
    
    if (!fs.existsSync(cursorDir)) {
      console.log('❌ Cursor extension directory not found');
      return;
    }

    await this.runCommand('npm install', cursorDir, 'Install Cursor Extension Dependencies');
    await this.runCommand('npm run compile', cursorDir, 'Compile Cursor Extension');
    await this.runCommand('npm test', cursorDir, 'Run Cursor Extension Tests');
  }

  async runWebSocketBridgeTests() {
    console.log('\n🌐 Testing WebSocket Bridge...');
    
    const bridgeDir = path.join(__dirname, 'websocket-bridge', 'client');
    
    if (!fs.existsSync(bridgeDir)) {
      console.log('❌ WebSocket bridge directory not found');
      return;
    }

    await this.runCommand('npm install', bridgeDir, 'Install WebSocket Bridge Dependencies');
    await this.runCommand('npm test', bridgeDir, 'Run WebSocket Bridge Tests');
  }

  async runMobileAppTests() {
    console.log('\n📱 Testing Mobile App...');
    
    const mobileDir = path.join(__dirname, 'mobile-app-poc');
    
    if (!fs.existsSync(mobileDir)) {
      console.log('❌ Mobile app directory not found');
      return;
    }

    await this.runCommand('npm install', mobileDir, 'Install Mobile App Dependencies');
    await this.runCommand('npm run lint', mobileDir, 'Run Mobile App Linting');
    await this.runCommand('npm test', mobileDir, 'Run Mobile App Tests');
  }

  async runAIIntegrationTests() {
    console.log('\n🤖 Testing AI Integration...');
    
    const aiDir = path.join(__dirname, 'ai-integration-test');
    
    if (!fs.existsSync(aiDir)) {
      console.log('❌ AI integration directory not found');
      return;
    }

    await this.runCommand('npm install', aiDir, 'Install AI Integration Dependencies');
    
    // Check if .env file exists
    const envPath = path.join(aiDir, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('⚠️  No .env file found, skipping API-dependent tests');
      return;
    }

    // Run tests that don't require API calls
    await this.runCommand('npm test', aiDir, 'Run AI Integration Unit Tests');
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    this.results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
      console.log(`${index + 1}. ${icon} ${result.description} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n📈 OVERALL RESULTS:');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    console.log(`📊 Success Rate: ${successRate}%`);

    if (successRate >= 80) {
      console.log('\n🎉 POC IS READY FOR DEMONSTRATION!');
    } else if (successRate >= 60) {
      console.log('\n⚠️  POC has some issues but core functionality works');
    } else {
      console.log('\n🚨 POC needs significant fixes before demo');
    }

    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🚀 Mobile Devin POC - Comprehensive Test Suite');
    console.log('='.repeat(60));
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
      await this.checkPrerequisites();
      await this.runCursorExtensionTests();
      await this.runWebSocketBridgeTests();
      await this.runMobileAppTests();
      await this.runAIIntegrationTests();
    } catch (error) {
      console.error('💥 Test suite crashed:', error);
    } finally {
      this.printSummary();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner; 