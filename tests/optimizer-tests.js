/**
 * OpenUda - Optimizer Module Tests
 * 
 * Tests for the genetic algorithm optimizer module
 */

import { TestRunner, Assert } from './test-runner.js';
import { Optimizer } from '../js/modules/optimizer.js';
import { AntennaCalculator } from '../js/modules/calculator.js';
import { AntennaModel } from '../js/modules/antenna-model.js';

// Create a test runner
const runner = new TestRunner();

// Create a mock calculator for testing
class MockCalculator {
    constructor() {
        this.isReady = true;
        this.performance = {
            gain: 8.5,
            fbRatio: 15.0,
            vswr: 1.5,
            impedance: { r: 50, x: 0 }
        };
    }
    
    async _waitForEngine() {
        return true;
    }
    
    async calculateAntennaPerformance(model) {
        // Return different performance based on element count to simulate optimization
        const elementCount = model.elements.length;
        const gainMultiplier = 1 + (elementCount - 3) * 0.1; // More elements = better gain
        
        return {
            gain: this.performance.gain * gainMultiplier,
            fbRatio: this.performance.fbRatio * gainMultiplier,
            vswr: this.performance.vswr,
            impedance: this.performance.impedance,
            efficiency: 0.95
        };
    }
    
    async calculateRadiationPattern(model, freq, step) {
        return {
            data3D: Array(10).fill().map((_, i) => ({
                x: Math.sin(i * 0.1) * Math.cos(i * 0.2),
                y: Math.sin(i * 0.1) * Math.sin(i * 0.2),
                z: Math.cos(i * 0.1),
                gain: 0.5 + i * 0.05,
                azimuth: i * 36,
                elevation: 45
            }))
        };
    }
}

// Create a test suite for the optimizer
const optimizerSuite = runner.suite('Optimizer');

// Test optimizer initialization
optimizerSuite.addTest('initialization', () => {
    const mockCalculator = new MockCalculator();
    const model = new AntennaModel();
    model.frequency = 300;
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.2, 0, 0.01, 1);
    
    const optimizer = new Optimizer(model, mockCalculator);
    
    // Check default parameters
    Assert.equal(optimizer.populationSize, 30, 'Default population size should be 30');
    Assert.equal(optimizer.maxGenerations, 20, 'Default max generations should be 20');
    Assert.approximately(optimizer.mutationRate, 0.15, 0.001, 'Default mutation rate should be 0.15');
    Assert.approximately(optimizer.crossoverRate, 0.8, 0.001, 'Default crossover rate should be 0.8');
    Assert.equal(optimizer.elitism, 2, 'Default elitism should be 2');
});

// Test balanced metric calculation
optimizerSuite.addTest('balanced metric calculation', () => {
    const mockCalculator = new MockCalculator();
    const model = new AntennaModel();
    model.frequency = 300;
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.2, 0, 0.01, 1);
    
    const optimizer = new Optimizer(model, mockCalculator);
    
    // Test with ideal values
    const idealPerf = {
        gain: 15,
        fbRatio: 20,
        vswr: 1.0
    };
    
    const idealMetric = optimizer.calculateBalancedMetric(idealPerf);
    Assert.approximately(idealMetric, 10, 0.1, 'Ideal performance should have max metric');
    
    // Test with poor values
    const poorPerf = {
        gain: 0,
        fbRatio: 0,
        vswr: 3.0
    };
    
    const poorMetric = optimizer.calculateBalancedMetric(poorPerf);
    Assert.true(poorMetric < 3.0, 'Poor performance should have low metric');
    
    // Test with middle values
    const midPerf = {
        gain: 7.5,
        fbRatio: 10,
        vswr: 2.0
    };
    
    const midMetric = optimizer.calculateBalancedMetric(midPerf);
    Assert.true(midMetric > poorMetric && midMetric < idealMetric, 'Middle performance should have medium metric');
});

// Test fitness function creation and error handling
optimizerSuite.addTest('fitness function creation', async () => {
    const mockCalculator = new MockCalculator();
    const model = new AntennaModel();
    model.frequency = 300;
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.2, 0, 0.01, 1);
    
    const optimizer = new Optimizer(model, mockCalculator);
    
    // Create fitness function for maxGain goal
    const fitnessFn = optimizer.createFitnessFunction('maxGain');
    Assert.defined(fitnessFn, 'Fitness function should be defined');
    
    // Test with valid parameters
    const validParams = [0.5, 0.47, 0.2, 0.45, 0.4];
    const validFitness = await fitnessFn(validParams);
    Assert.true(validFitness > 0, 'Valid parameters should return positive fitness');
    
    // Test with invalid parameters
    const invalidParams = [NaN, 0.47, Infinity, 0.45];
    const invalidFitness = await fitnessFn(invalidParams);
    Assert.equal(invalidFitness, -Infinity, 'Invalid parameters should return worst fitness');
    
    // Test with null parameters
    const nullFitness = await fitnessFn(null);
    Assert.equal(nullFitness, -Infinity, 'Null parameters should return worst fitness');
});

// Test constraints creation
optimizerSuite.addTest('constraints creation', () => {
    const mockCalculator = new MockCalculator();
    const model = new AntennaModel();
    model.frequency = 300; // 300 MHz = 1m wavelength
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.2, 0, 0.01, 1);
    model.addElement('director', 0.45, 0.4, 0, 0.01, 0);
    
    const optimizer = new Optimizer(model, mockCalculator);
    
    // Create constraints
    const constraints = optimizer.createConstraints(model);
    
    Assert.defined(constraints, 'Constraints should be defined');
    Assert.defined(constraints.elementLengths, 'Element length constraints should be defined');
    Assert.defined(constraints.elementPositions, 'Element position constraints should be defined');
    
    // Check constraint ranges - each element should have min and max values
    Assert.equal(constraints.elementLengths.length, 3, 'Should have constraints for all elements');
    
    // Display all elements for debugging
    console.log('Model elements:', model.elements);
    console.log('Element 0 (reflector) type:', model.elements[0].type);
    console.log('Element 1 (driven) type:', model.elements[1].type);
    console.log('Element 2 (director) type:', model.elements[2].type);
    
    // Reflector length should be around 0.5 wavelength
    const reflectorConstraint = constraints.elementLengths[0];
    console.log('Reflector constraint values:', reflectorConstraint);
    console.log('Wavelength test:', model.getWavelength());
    Assert.true(reflectorConstraint.min < 0.5 && reflectorConstraint.min > 0.4, 'Reflector min length should be ~0.48λ');
    Assert.true(reflectorConstraint.max > 0.5 && reflectorConstraint.max < 0.6, 'Reflector max length should be ~0.52λ');
});

// Test model creation from parameters
optimizerSuite.addTest('model creation from parameters', () => {
    const mockCalculator = new MockCalculator();
    const model = new AntennaModel();
    model.frequency = 300;
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.2, 0, 0.01, 1);
    model.addElement('director', 0.45, 0.4, 0, 0.01, 0);
    
    const optimizer = new Optimizer(model, mockCalculator);
    
    // Create parameters array (alternating length and position)
    const params = [
        0.52, // Reflector length
        0.0,  // Reflector position (fixed)
        0.48, // Driven length
        0.25, // Driven position
        0.42, // Director length
        0.45  // Director position
    ];
    
    // Create new model
    const newModel = optimizer.createModelFromParameters(model, params);
    
    // Verify model elements
    Assert.equal(newModel.elements.length, 3, 'New model should have 3 elements');
    Assert.approximately(newModel.elements[0].length, 0.52, 0.001, 'Reflector length should match parameter');
    Assert.approximately(newModel.elements[1].length, 0.48, 0.001, 'Driven length should match parameter');
    Assert.approximately(newModel.elements[2].length, 0.42, 0.001, 'Director length should match parameter');
    
    Assert.approximately(newModel.elements[0].position, 0.0, 0.001, 'Reflector position should match parameter');
    Assert.approximately(newModel.elements[1].position, 0.25, 0.001, 'Driven position should match parameter');
    Assert.approximately(newModel.elements[2].position, 0.45, 0.001, 'Director position should match parameter');
});

// Test error recovery in optimization
optimizerSuite.addTest('error recovery', async () => {
    // Create a failing calculator
    const failingCalculator = {
        async _waitForEngine() { return true; },
        async calculateAntennaPerformance() { 
            throw new Error('Calculation error');
        }
    };
    
    const model = new AntennaModel();
    model.frequency = 300;
    model.addElement('reflector', 0.5, 0, 0, 0.01, 0);
    model.addElement('driven', 0.47, 0.2, 0, 0.01, 1);
    
    const optimizer = new Optimizer(model, failingCalculator);
    
    // Optimize should throw a controlled error
    try {
        await optimizer.optimize('maxGain');
        Assert.true(false, 'Should throw error with failing calculator');
    } catch (error) {
        Assert.true(error instanceof Error, 'Should throw specific error');
        Assert.true(error.message.includes('baseline performance'), 'Error should mention baseline performance');
    }
});

// Add optimizer suite to the runner
runner.addSuite(optimizerSuite);

// Run the tests when this module is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    runner.runTests();
} else {
    // Browser environment
    window.runOptimizerTests = () => runner.runTests();
}

export default runner;
