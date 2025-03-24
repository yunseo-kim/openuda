/**
 * OpenUda Test Runner - Node.js Environment
 * 
 * This script runs OpenUda tests in a Node.js environment,
 * primarily for execution in GitHub Actions CI/CD pipeline.
 */

// Load Node.js environment setup
import './setup-node.js';

// Dynamic module loading (ESM)
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Set current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory for storing test results
const resultDir = resolve(__dirname, '../test-results');
if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
}

console.log('Starting OpenUda tests...');

// Load and run test modules
async function runTests() {
    try {
        // Load test suites
        console.log('Loading test modules...');
        
        // Dynamically import test modules
        const calculatorTestsModule = await import('./calculator-tests.js');
        const optimizerTestsModule = await import('./optimizer-tests.js');
        
        // Get test runners
        const calculatorTests = calculatorTestsModule.default;
        const optimizerTests = optimizerTestsModule.default;
        
        // Run each test suite
        console.log('\n==== Running Calculator Module Tests ====');
        await calculatorTests.runTests();
        
        console.log('\n==== Running Optimizer Module Tests ====');
        await optimizerTests.runTests();
        
        // Save results
        const testResults = {
            timestamp: new Date().toISOString(),
            calculator: calculatorTests.results,
            optimizer: optimizerTests.results,
            summary: {
                total: calculatorTests.results.total + optimizerTests.results.total,
                passed: calculatorTests.results.passed + optimizerTests.results.passed,
                failed: calculatorTests.results.failed + optimizerTests.results.failed,
                skipped: calculatorTests.results.skipped + optimizerTests.results.skipped
            }
        };
        
        // Save results as JSON file
        fs.writeFileSync(
            resolve(resultDir, 'test-results.json'),
            JSON.stringify(testResults, null, 2)
        );
        
        // Print summary
        console.log('\n==== Test Results Summary ====');
        console.log(`Total tests: ${testResults.summary.total}`);
        console.log(`Passed: ${testResults.summary.passed}`);
        console.log(`Failed: ${testResults.summary.failed}`);
        console.log(`Skipped: ${testResults.summary.skipped}`);
        
        // Set exit code (1 if there are failed tests, 0 otherwise)
        process.exitCode = testResults.summary.failed > 0 ? 1 : 0;
        
    } catch (error) {
        console.error('Error running tests:', error);
        process.exitCode = 1;
    }
}

// Run tests
runTests();
