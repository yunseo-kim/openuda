/**
 * OpenUda - Calculator Module Tests
 * 
 * Tests for the antenna performance calculation module
 */

import { TestRunner, Assert } from './test-runner.js';
import { AntennaCalculator } from '../js/modules/calculator.js';
import { AntennaModel } from '../js/modules/antenna-model.js';

// Create a test runner
const runner = new TestRunner();

// Set up a mock NEC2C engine for testing
class MockNEC2CEngine {
    constructor() {
        this.ready = true;
        this.segments = [];
        this.frequency = 0;
    }
    
    async isReady() {
        return this.ready;
    }
    
    async addWireSegment(x1, y1, z1, x2, y2, z2, radius, segments) {
        this.segments.push({ x1, y1, z1, x2, y2, z2, radius, segments });
        return true;
    }
    
    async setFrequency(freq) {
        this.frequency = freq;
        return true;
    }
    
    async runAnalysis() {
        return {
            impedance: { r: 50, x: 0 },
            gain: 7.5,
            efficiency: 0.95
        };
    }
    
    async calculateRadiationPattern(azimuth, elevation) {
        // Simulate a realistic radiation pattern
        // Return higher gain in the forward direction (0 deg azimuth)
        const frontGain = 8.0;
        const backGain = 2.0;
        const gainDropRate = 0.05;
        
        // Simulate front-to-back pattern
        const azFactor = Math.cos(azimuth * Math.PI / 180);
        const elFactor = Math.sin(elevation * Math.PI / 180);
        
        // Basic pattern simulation - higher in forward direction, lower in rear
        const gain = frontGain * Math.max(0.1, azFactor * azFactor) * elFactor + backGain;
        
        return {
            azimuth,
            elevation,
            gain,
            directivity: gain + 1.0
        };
    }
}

// Create a calculator suite
const calculatorSuite = runner.suite('AntennaCalculator');

// Test initialization
calculatorSuite.addTest('initialization', async () => {
    const mockEngine = new MockNEC2CEngine();
    const calculator = new AntennaCalculator(mockEngine);
    
    Assert.defined(calculator, 'Calculator should be defined');
    Assert.equal(calculator.isReady, false, 'Calculator should not be ready initially');
    
    // Wait for ready
    await calculator._waitForEngine();
    Assert.equal(calculator.isReady, true, 'Calculator should be ready after waiting');
});

// Test VSWR calculation
calculatorSuite.addTest('VSWR calculation', () => {
    const mockEngine = new MockNEC2CEngine();
    const calculator = new AntennaCalculator(mockEngine);
    
    // Test perfect match (VSWR = 1.0)
    const perfectMatch = calculator.calculateVSWR({ r: 50, x: 0 }, 50);
    Assert.approximately(perfectMatch, 1.0, 0.001, 'Perfect match should have VSWR of 1.0');
    
    // Test with real resistance mismatch
    const resMismatch = calculator.calculateVSWR({ r: 25, x: 0 }, 50);
    Assert.approximately(resMismatch, 2.0, 0.01, 'Resistance mismatch should have correct VSWR');
    
    // Test with reactive component
    const reactiveMismatch = calculator.calculateVSWR({ r: 50, x: 50 }, 50);
    Assert.approximately(reactiveMismatch, 3.0, 0.1, 'Reactive mismatch should have correct VSWR');
});

// Test radiation pattern calculation
calculatorSuite.addTest('radiation pattern calculation', async () => {
    const mockEngine = new MockNEC2CEngine();
    const calculator = new AntennaCalculator(mockEngine);
    await calculator._waitForEngine();
    
    // Create a simple dipole model
    const model = new AntennaModel();
    model.frequency = 300; // 300 MHz
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.25, 0, 0.01, 1);
    model.addElement('director', 0.45, 0.5, 0, 0.01, 0);
    
    // Calculate pattern
    const pattern = await calculator.calculateRadiationPattern(model, 300, 45);
    
    // Verify pattern structure
    Assert.defined(pattern, 'Pattern should be defined');
    Assert.defined(pattern.data3D, 'Pattern should have 3D data');
    Assert.true(pattern.data3D.length > 0, 'Pattern data should have elements');
    
    // Verify first data point
    const point = pattern.data3D[0];
    Assert.defined(point.x, 'Point should have x coordinate');
    Assert.defined(point.y, 'Point should have y coordinate');
    Assert.defined(point.z, 'Point should have z coordinate');
    Assert.defined(point.gain, 'Point should have gain value');
    Assert.defined(point.azimuth, 'Point should have azimuth angle');
    Assert.defined(point.elevation, 'Point should have elevation angle');
});

// Test error handling
calculatorSuite.addTest('error handling', async () => {
    // Create a failing mock engine
    const failingEngine = {
        isReady: async () => { throw new Error('Engine error'); },
        addWireSegment: async () => { throw new Error('Segment error'); },
        setFrequency: async () => { throw new Error('Frequency error'); },
        runAnalysis: async () => { throw new Error('Analysis error'); },
        calculateRadiationPattern: async () => { throw new Error('Pattern error'); }
    };
    
    const calculator = new AntennaCalculator(failingEngine);
    
    // Create a simple model
    const model = new AntennaModel();
    model.frequency = 300;
    model.addElement('driven', 0.47, 0, 0, 0.01, 1);
    
    // Test error recovery in radiation pattern calculation
    const pattern = await calculator.calculateRadiationPattern(model, 300, 45);
    
    // Should still return a pattern object even with engine errors
    Assert.defined(pattern, 'Pattern should be defined even with errors');
    Assert.defined(pattern.data3D, 'Pattern should have 3D data structure');
    
    // Test performance calculation error handling - it should not throw
    try {
        await calculator.calculateAntennaPerformance(model);
        // We expect it to handle the error internally, not throw
        Assert.true(true, 'Should handle errors gracefully');
    } catch (error) {
        Assert.true(false, 'Should not throw unhandled errors');
    }
});

// Add calculator suite to the runner
runner.addSuite(calculatorSuite);

// Run the tests when this module is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    runner.runTests();
} else {
    // Browser environment
    window.runCalculatorTests = () => runner.runTests();
}

export default runner;
