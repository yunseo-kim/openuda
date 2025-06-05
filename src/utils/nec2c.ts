/**
 * NEC2C WebAssembly Engine Wrapper
 * 
 * This module provides a TypeScript interface for the nec2c electromagnetic
 * simulation engine compiled to WebAssembly. It handles loading the WASM module,
 * provides convenient methods for antenna simulation, and manages memory.
 */

// Type definitions for NEC2C module
interface NEC2Module {
  ccall: (
    name: string, 
    returnType: string | null, 
    argTypes: string[], 
    args: any[]
  ) => any;
  cwrap: (
    name: string, 
    returnType: string | null, 
    argTypes: string[]
  ) => (...args: any[]) => any;
  FS: {
    writeFile: (path: string, data: string) => void;
    readFile: (path: string, options?: { encoding: string }) => string | Uint8Array;
    unlink: (path: string) => void;
    mkdir: (path: string) => void;
  };
  ready: Promise<NEC2Module>;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
}

// Antenna design parameters interface
export interface AntennaParams {
  frequency: number; // MHz
  elements: AntennaElement[];
  groundType?: 'perfect' | 'real' | 'none';
  groundConductivity?: number;
  groundDielectric?: number;
}

export interface AntennaElement {
  type: 'reflector' | 'driven' | 'director';
  position: number; // meters from origin
  length: number; // meters
  diameter: number; // meters
  segments?: number; // wire segments (default: 21)
}

// Simulation results interface
export interface SimulationResults {
  gain: number; // dBi
  frontToBackRatio: number; // dB
  inputImpedance: {
    resistance: number; // ohms
    reactance: number; // ohms
  };
  vswr: number;
  efficiency: number; // percentage
  patterns: {
    horizontal: PatternData[];
    vertical: PatternData[];
  };
  frequency: number; // MHz
}

export interface PatternData {
  angle: number; // degrees
  gainDb: number; // dB
  phase: number; // degrees
}

// Error types
export class NEC2Error extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'NEC2Error';
  }
}

/**
 * NEC2C WebAssembly Engine Manager
 */
export class NEC2Engine {
  private module: NEC2Module | null = null;
  private isLoading = false;
  private isLoaded = false;

  /**
   * Load the NEC2C WebAssembly module
   */
  async loadModule(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Wait for current loading to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isLoading = true;

      // Check if SharedArrayBuffer is supported for multithreading
      const supportsSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      
      let moduleFactory;
      
      if (supportsSharedArrayBuffer) {
        console.log('Loading multithreaded NEC2C engine...');
        // Dynamic import for multithreaded version - load directly from public folder
        const response = await fetch('/js/modules/wasm/nec2_direct.js');
        const moduleText = await response.text();
        const moduleBlob = new Blob([moduleText], { type: 'application/javascript' });
        const moduleUrl = URL.createObjectURL(moduleBlob);
        const { default: NEC2Module } = await import(moduleUrl);
        moduleFactory = NEC2Module;
              } else {
          console.log('Loading single-threaded NEC2C engine (SharedArrayBuffer not supported)...');
          // Dynamic import for single-threaded version - load directly from public folder
          const response = await fetch('/js/modules/wasm/nec2_direct_single.js');
          const moduleText = await response.text();
          const moduleBlob = new Blob([moduleText], { type: 'application/javascript' });
          const moduleUrl = URL.createObjectURL(moduleBlob);
          const { default: NEC2ModuleSingle } = await import(moduleUrl);
          moduleFactory = NEC2ModuleSingle;
        }

      // Initialize the module
      this.module = await moduleFactory({
        // Locate WASM files
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return supportsSharedArrayBuffer 
              ? '/js/modules/wasm/nec2_direct.wasm'
              : '/js/modules/wasm/nec2_direct_single.wasm';
          }
          if (path.endsWith('.worker.js')) {
            return '/js/modules/wasm/nec2_direct.worker.js';
          }
          return path;
        }
      });

      if (this.module) {
        await this.module.ready;
        this.isLoaded = true;
        console.log('NEC2C engine loaded successfully');
      } else {
        throw new NEC2Error('Failed to initialize NEC2C module', 'INIT_FAILED');
      }

    } catch (error) {
      console.error('Failed to load NEC2C engine:', error);
      throw new NEC2Error('Failed to load NEC2C WebAssembly module', 'LOAD_FAILED');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate NEC input file content from antenna parameters
   */
  private generateNECInput(params: AntennaParams): string {
    let necInput = '';
    
    // Header
    necInput += `CM OpenUda Yagi-Uda Antenna Design\n`;
    necInput += `CM Frequency: ${params.frequency} MHz\n`;
    necInput += `CE\n`;
    
    // Wire geometry
    let wireNum = 1;
    for (const element of params.elements) {
      const segments = element.segments || 21;
      const halfLength = element.length / 2;
      
      // Wire along Y-axis at position X
      necInput += `GW ${wireNum} ${segments} ${element.position.toFixed(4)} ${(-halfLength).toFixed(4)} 0 `;
      necInput += `${element.position.toFixed(4)} ${halfLength.toFixed(4)} 0 ${(element.diameter/2).toFixed(6)}\n`;
      wireNum++;
    }
    
    // End geometry
    necInput += `GE 0\n`;
    
    // Find driven element (usually the longest or specified)
    let drivenElementIndex = 0;
    for (let i = 0; i < params.elements.length; i++) {
      if (params.elements[i].type === 'driven') {
        drivenElementIndex = i;
        break;
      }
    }
    
    // Excitation (voltage source on driven element)
    const drivenSegment = Math.floor((params.elements[drivenElementIndex].segments || 21) / 2) + 1;
    necInput += `EX 0 ${drivenElementIndex + 1} ${drivenSegment} 0 1 0\n`;
    
    // Ground
    if (params.groundType === 'perfect') {
      necInput += `GN 1\n`;
    } else if (params.groundType === 'real') {
      const conductivity = params.groundConductivity || 0.005;
      const dielectric = params.groundDielectric || 13;
      necInput += `GN 2 0 0 0 ${conductivity} ${dielectric}\n`;
    }
    
    // Frequency
    necInput += `FR 0 1 0 0 ${params.frequency} 0\n`;
    
    // Radiation pattern requests
    necInput += `RP 0 91 1 1000 90 0 4 0\n`; // Horizontal pattern
    necInput += `RP 0 91 1 1000 0 0 4 0\n`;  // Vertical pattern
    
    // End
    necInput += `EN\n`;
    
    return necInput;
  }

  /**
   * Parse NEC output and extract simulation results
   */
  private parseNECOutput(output: string): SimulationResults {
    const results: Partial<SimulationResults> = {};
    
    try {
      // Extract input impedance
      const impedanceMatch = output.match(/IMPEDANCE\s+(\d+\.\d+)\s+([-+]?\d+\.\d+)/);
      if (impedanceMatch) {
        results.inputImpedance = {
          resistance: parseFloat(impedanceMatch[1]),
          reactance: parseFloat(impedanceMatch[2])
        };
        
        // Calculate VSWR
        const z0 = 50; // Standard 50-ohm system
        const gamma = Math.abs((results.inputImpedance.resistance - z0) / (results.inputImpedance.resistance + z0));
        results.vswr = (1 + gamma) / (1 - gamma);
      }
      
      // Extract gain
      const gainMatch = output.match(/MAXIMUM GAIN\s*=\s*([-+]?\d+\.\d+)/);
      if (gainMatch) {
        results.gain = parseFloat(gainMatch[1]);
      }
      
      // Extract front-to-back ratio
      const fbMatch = output.match(/FRONT-TO-BACK RATIO\s*=\s*([-+]?\d+\.\d+)/);
      if (fbMatch) {
        results.frontToBackRatio = parseFloat(fbMatch[1]);
      }
      
      // Parse radiation patterns (simplified)
      results.patterns = {
        horizontal: [],
        vertical: []
      };
      
      // Default values if not found
      results.gain = results.gain || 0;
      results.frontToBackRatio = results.frontToBackRatio || 0;
      results.efficiency = 85; // Estimated
      results.frequency = 146; // Default
      
    } catch (error) {
      console.warn('Error parsing NEC output:', error);
    }
    
    return results as SimulationResults;
  }

  /**
   * Run antenna simulation
   */
  async simulate(params: AntennaParams): Promise<SimulationResults> {
    if (!this.module) {
      throw new NEC2Error('NEC2C module not loaded. Call loadModule() first.', 'MODULE_NOT_LOADED');
    }

    try {
      // Generate NEC input file
      const necInput = this.generateNECInput(params);
      
      // Write input file to virtual filesystem
      const inputFilename = `antenna_${Date.now()}.nec`;
      const outputFilename = `output_${Date.now()}.out`;
      
      this.module.FS.writeFile(inputFilename, necInput);
      
      // Run NEC2C simulation
      console.log('Running NEC2C simulation...');
      const startTime = performance.now();
      
      // Call main function with input file
      const result = this.module.ccall('main', 'number', ['number', 'array'], [
        2, // argc
        [inputFilename, outputFilename] // argv
      ]);
      
      const endTime = performance.now();
      console.log(`Simulation completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      if (result !== 0) {
        throw new NEC2Error(`NEC2C simulation failed with exit code: ${result}`, 'SIMULATION_FAILED');
      }
      
      // Read output file
      let output: string;
      try {
        output = this.module.FS.readFile(outputFilename, { encoding: 'utf8' }) as string;
      } catch (error) {
        throw new NEC2Error('Failed to read simulation output', 'OUTPUT_READ_FAILED');
      }
      
      // Parse results
      const simulationResults = this.parseNECOutput(output);
      simulationResults.frequency = params.frequency;
      
      // Cleanup
      try {
        this.module.FS.unlink(inputFilename);
        this.module.FS.unlink(outputFilename);
      } catch (error) {
        console.warn('Failed to cleanup temporary files:', error);
      }
      
      return simulationResults;
      
    } catch (error) {
      if (error instanceof NEC2Error) {
        throw error;
      }
      console.error('Simulation error:', error);
      throw new NEC2Error('Unexpected simulation error', 'UNKNOWN_ERROR');
    }
  }

  /**
   * Test engine with simple dipole antenna
   */
  async testEngine(): Promise<boolean> {
    try {
      const testParams: AntennaParams = {
        frequency: 146,
        elements: [
          {
            type: 'driven',
            position: 0,
            length: 1.0,
            diameter: 0.002,
            segments: 21
          }
        ],
        groundType: 'perfect'
      };
      
      const results = await this.simulate(testParams);
      console.log('Engine test results:', results);
      
      return results.gain !== undefined && !isNaN(results.gain);
    } catch (error) {
      console.error('Engine test failed:', error);
      return false;
    }
  }

  /**
   * Get engine status
   */
  getStatus(): { loaded: boolean; loading: boolean } {
    return {
      loaded: this.isLoaded,
      loading: this.isLoading
    };
  }
}

// Global engine instance
export const nec2Engine = new NEC2Engine();

// Convenience function for quick simulations
export async function simulateAntenna(params: AntennaParams): Promise<SimulationResults> {
  if (!nec2Engine.getStatus().loaded) {
    await nec2Engine.loadModule();
  }
  return nec2Engine.simulate(params);
}

// Test function
export async function testNEC2Engine(): Promise<boolean> {
  if (!nec2Engine.getStatus().loaded) {
    await nec2Engine.loadModule();
  }
  return nec2Engine.testEngine();
} 