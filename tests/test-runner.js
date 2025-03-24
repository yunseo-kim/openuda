/**
 * OpenUda Test Runner
 * 
 * Simple test runner for the OpenUda project modules
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        };
    }

    /**
     * Add a test to the runner
     * @param {string} name Test name
     * @param {Function} testFn The test function to run
     * @param {boolean} skip Whether to skip this test
     */
    addTest(name, testFn, skip = false) {
        this.tests.push({ name, testFn, skip });
    }

    /**
     * Create a test suite for grouping related tests
     * @param {string} name Suite name
     * @returns {object} Test suite object
     */
    suite(name) {
        const suite = {
            name,
            tests: [],
            addTest: (testName, testFn, skip = false) => {
                suite.tests.push({ 
                    name: `${name} - ${testName}`, 
                    testFn, 
                    skip 
                });
                return suite;
            }
        };
        
        return suite;
    }

    /**
     * Add all tests from a suite
     * @param {object} suite The test suite
     */
    addSuite(suite) {
        this.tests = this.tests.concat(suite.tests);
    }

    /**
     * Run all registered tests
     */
    async runTests() {
        console.log(`Running ${this.tests.length} tests...`);
        
        this.results.total = this.tests.length;
        
        for (const test of this.tests) {
            if (test.skip) {
                console.log(`⚠️ SKIPPED: ${test.name}`);
                this.results.skipped++;
                continue;
            }
            
            try {
                await test.testFn();
                console.log(`✅ PASSED: ${test.name}`);
                this.results.passed++;
            } catch (error) {
                console.error(`❌ FAILED: ${test.name}`);
                console.error(`   Error: ${error.message}`);
                if (error.stack) {
                    console.error(`   Stack: ${error.stack.split('\n')[1]}`);
                }
                this.results.failed++;
            }
        }
        
        this.printSummary();
    }

    /**
     * Print test results summary
     */
    printSummary() {
        console.log('\n=== Test Results ===');
        console.log(`Total: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Skipped: ${this.results.skipped}`);
        
        if (this.results.failed === 0) {
            console.log('\n✅ All tests passed!');
        } else {
            console.log(`\n❌ ${this.results.failed} tests failed.`);
        }
    }
}

/**
 * Simple assertion utilities
 */
class Assert {
    static equal(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message ? message + ': ' : ''}Expected ${expected}, got ${actual}`);
        }
    }
    
    static notEqual(actual, expected, message = '') {
        if (actual === expected) {
            throw new Error(`${message ? message + ': ' : ''}Expected ${actual} to not equal ${expected}`);
        }
    }
    
    static true(value, message = '') {
        if (value !== true) {
            throw new Error(`${message ? message + ': ' : ''}Expected true, got ${value}`);
        }
    }
    
    static false(value, message = '') {
        if (value !== false) {
            throw new Error(`${message ? message + ': ' : ''}Expected false, got ${value}`);
        }
    }
    
    static approximately(actual, expected, epsilon = 0.0001, message = '') {
        if (Math.abs(actual - expected) > epsilon) {
            throw new Error(`${message ? message + ': ' : ''}Expected ${expected} ± ${epsilon}, got ${actual}`);
        }
    }
    
    static throws(fn, expectedErrorType = Error, message = '') {
        try {
            fn();
            throw new Error(`${message ? message + ': ' : ''}Expected function to throw ${expectedErrorType.name}`);
        } catch (error) {
            if (!(error instanceof expectedErrorType)) {
                throw new Error(`${message ? message + ': ' : ''}Expected ${expectedErrorType.name}, got ${error.constructor.name}`);
            }
        }
    }
    
    static doesNotThrow(fn, message = '') {
        try {
            fn();
        } catch (error) {
            throw new Error(`${message ? message + ': ' : ''}Expected function not to throw, but got ${error.message}`);
        }
    }
    
    static defined(value, message = '') {
        if (value === undefined) {
            throw new Error(`${message ? message + ': ' : ''}Expected value to be defined`);
        }
    }
    
    static undefined(value, message = '') {
        if (value !== undefined) {
            throw new Error(`${message ? message + ': ' : ''}Expected value to be undefined, got ${value}`);
        }
    }
    
    static null(value, message = '') {
        if (value !== null) {
            throw new Error(`${message ? message + ': ' : ''}Expected null, got ${value}`);
        }
    }
    
    static notNull(value, message = '') {
        if (value === null) {
            throw new Error(`${message ? message + ': ' : ''}Expected value to not be null`);
        }
    }
}

export { TestRunner, Assert };
