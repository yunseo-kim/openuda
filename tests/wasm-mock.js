/**
 * OpenUda - NEC2C WebAssembly Mock Object
 * 
 * This file provides a mock implementation to replace the actual WebAssembly NEC2C engine
 * in a test environment. This allows testing of the JavaScript interface functionality
 * without requiring the actual computing engine.
 */

// Mock implementation of the NEC2C WebAssembly module
export class NEC2CWasmMock {
  constructor() {
    this.memory = {
      buffer: new ArrayBuffer(1024 * 1024) // 1MB buffer
    };
    this.initialized = false;
    this.segments = [];
    this.frequency = 0;
    this.lastAntennaState = null;
  }

  // Initialization function
  async initialize() {
    this.initialized = true;
    return true;
  }

  // Add wire segment
  async addWireSegment(tag, segments, x1, y1, z1, x2, y2, z2, radius) {
    this.segments.push({
      tag, segments, x1, y1, z1, x2, y2, z2, radius
    });
    return true;
  }

  // Set frequency
  async setFrequency(freq) {
    this.frequency = freq;
    return true;
  }

  // Run analysis - return simple results instead of actual NEC2C calculations
  async runAnalysis() {
    // Save antenna state (can be verified in future tests)
    this.lastAntennaState = {
      segments: [...this.segments],
      frequency: this.frequency
    };

    // Return mock results
    return {
      success: true,
      impedance: { real: 50.0, imag: 0.0 }, // Ideal 50 ohm impedance
      vswr: 1.0, // Ideal VSWR
      gain: 10.0, // Default gain
      frontToBack: 20.0 // Default front-to-back ratio
    };
  }

  // Calculate radiation pattern
  async calculateRadiationPattern(azimuthStepDeg = 5, elevationStepDeg = 5) {
    const azimuthPoints = Math.floor(360 / azimuthStepDeg);
    const elevationPoints = Math.floor(180 / elevationStepDeg) + 1;
    
    // Generate mock radiation pattern
    const pattern = {
      azimuth: new Array(azimuthPoints).fill(0).map((_, i) => ({
        angle: i * azimuthStepDeg,
        gain: 10.0 * Math.sin(i * azimuthStepDeg * Math.PI / 180) // Simple sine pattern
      })),
      elevation: new Array(elevationPoints).fill(0).map((_, i) => ({
        angle: i * elevationStepDeg,
        gain: 10.0 * Math.cos(i * elevationStepDeg * Math.PI / 180) // Simple cosine pattern
      })),
      full3D: []
    };
    
    // Generate 3D pattern
    for (let az = 0; az < 360; az += azimuthStepDeg) {
      for (let el = 0; el <= 180; el += elevationStepDeg) {
        pattern.full3D.push({
          azimuth: az,
          elevation: el,
          gain: 10.0 * Math.sin(az * Math.PI / 180) * Math.cos(el * Math.PI / 180)
        });
      }
    }
    
    return pattern;
  }

  // Reset memory
  reset() {
    this.segments = [];
    this.frequency = 0;
    this.lastAntennaState = null;
  }

  // Helper function to verify mock object state (for testing)
  _getState() {
    return {
      initialized: this.initialized,
      segments: this.segments,
      frequency: this.frequency,
      lastAntennaState: this.lastAntennaState
    };
  }
}

// Function to create a NEC2C engine mock object
export async function createMockNEC2CEngine() {
  const mock = new NEC2CWasmMock();
  await mock.initialize();
  return mock;
}

export default {
  createMockNEC2CEngine
};
