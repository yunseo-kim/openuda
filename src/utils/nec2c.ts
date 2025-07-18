/**
 * NEC2C WebAssembly Engine Wrapper
 *
 * This module provides a TypeScript interface for the nec2c electromagnetic
 * simulation engine compiled to WebAssembly. It handles loading the WASM module,
 * provides convenient methods for antenna simulation, and manages memory.
 */

// Type definitions for NEC2C module
interface NEC2Module {
  ccall: (name: string, returnType: string | null, argTypes: string[], args: unknown[]) => number
  cwrap: (
    name: string,
    returnType: string | null,
    argTypes: string[]
  ) => (...args: unknown[]) => unknown
  FS: {
    writeFile: (path: string, data: string) => void
    readFile: (path: string, options?: { encoding: string }) => string | Uint8Array
    unlink: (path: string) => void
    mkdir: (path: string) => void
    readdir: (path: string) => string[]
    chdir: (path: string) => void
  }
  ready: Promise<NEC2Module>
  _malloc: (size: number) => number
  _free: (ptr: number) => void
  callMain?: (args: string[]) => number
}

// Antenna design parameters interface
export interface AntennaParams {
  frequency: number // MHz
  elements: AntennaElement[]
  groundType?: 'perfect' | 'real' | 'none'
  groundConductivity?: number
  groundDielectric?: number
}

export interface AntennaElement {
  type: 'reflector' | 'driven' | 'director'
  position: number // mm from origin
  length: number // mm
  diameter: number // mm
  segments?: number // wire segments (default: 21)
}

// Simulation results interface
export interface SimulationResults {
  gain: number // dBi
  frontToBackRatio: number // dB
  inputImpedance: {
    resistance: number // ohms
    reactance: number // ohms
  }
  vswr: number
  efficiency: number // percentage
  patterns: {
    horizontal: PatternData[]
    vertical: PatternData[]
  }
  frequency: number // MHz
}

export interface PatternData {
  angle: number // degrees
  gainDb: number // dB
  phase: number // degrees
}

// Error types
export class NEC2Error extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'NEC2Error'
  }
}

/**
 * NEC2C WebAssembly Engine Manager
 */
export class NEC2Engine {
  private module: NEC2Module | null = null
  private isLoading = false
  private isLoaded = false

  /**
   * Load the NEC2C WebAssembly module
   */
  async loadModule(): Promise<void> {
    // This loop robustly handles race conditions where the module is unloaded
    // by another process while this one was waiting for the initial load.
    while (!this.isLoaded) {
      if (this.isLoading) {
        // Wait for the other loading process to complete.
        while (this.isLoading) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        // After waiting, loop again to re-check `isLoaded`, as the other
        // process might have unloaded the module after loading it.
        continue
      }

      let moduleUrl: string | undefined
      try {
        this.isLoading = true

        // Always use single-threaded version to avoid Worker issues
        console.log('Loading single-threaded NEC2C engine...')

        // Load the single-threaded version
        const response = await fetch('/wasm/nec2_direct_single.js')
        const moduleText = await response.text()

        // Replace Worker creation code to avoid errors
        const modifiedModuleText = moduleText
          .replace(/new Worker\\(new URL\\([^)]+\\)[^)]*\\)/g, 'null')
          .replace(/allocateUnusedWorker/g, 'function(){}')

        const moduleBlob = new Blob([modifiedModuleText], { type: 'application/javascript' })
        moduleUrl = URL.createObjectURL(moduleBlob)

        const { default: moduleFactory } = await import(/* @vite-ignore */ moduleUrl)

        // Initialize the module with single-threaded configuration
        this.module = await moduleFactory({
          // Prevent main() from running on initialization
          noInitialRun: true,
          // Locate WASM files
          locateFile: (path: string) => {
            if (path.endsWith('.wasm')) {
              return '/wasm/nec2_direct_single.wasm'
            }
            return path
          },
          // Single-threaded configuration
          ENVIRONMENT_IS_PTHREAD: false,
          USE_PTHREADS: false,
          PTHREAD_POOL_SIZE: 0,
          // Print function for debugging
          print: (text: string) => console.log('[NEC2C]', text),
          printErr: (text: string) => console.error('[NEC2C]', text),
        })

        if (this.module) {
          await this.module.ready
          this.isLoaded = true

          // Create a working directory to avoid issues with current directory changes
          try {
            this.module.FS.mkdir('/work')
          } catch {
            // Directory may already exist if the module is re-initialized. This is fine.
          }
          this.module.FS.chdir('/work') // Set current directory

          console.log('NEC2C engine loaded successfully')
        } else {
          throw new NEC2Error('Failed to initialize NEC2C module', 'INIT_FAILED')
        }
      } catch (error) {
        console.error('Failed to load NEC2C engine:', error)
        throw new NEC2Error('Failed to load NEC2C WebAssembly module', 'LOAD_FAILED')
      } finally {
        this.isLoading = false
        if (moduleUrl) {
          URL.revokeObjectURL(moduleUrl)
        }
      }
    }
  }

  /**
   * Generate NEC input file content from antenna parameters
   */
  private generateNECInput(params: AntennaParams): string {
    let necInput = ''

    // Header
    necInput += `CM OpenUda Yagi-Uda Antenna Design\n`
    necInput += `CM Frequency: ${params.frequency} MHz\n`
    necInput += `CE\n`

    // Wire geometry
    let wireNum = 1
    for (const element of params.elements) {
      const segments = element.segments || 21
      // Convert mm to meters for NEC format
      const position = element.position / 1000
      const length = element.length / 1000
      const diameter = element.diameter / 1000
      const halfLength = length / 2

      // Wire along Y-axis at position X
      necInput += `GW ${wireNum} ${segments} ${position.toFixed(4)} ${(-halfLength).toFixed(4)} 0 `
      necInput += `${position.toFixed(4)} ${halfLength.toFixed(4)} 0 ${(diameter / 2).toFixed(6)}\n`
      wireNum++
    }

    // End geometry
    necInput += `GE 0\n`

    // Find driven element (usually the longest or specified)
    let drivenElementIndex = 0
    for (let i = 0; i < params.elements.length; i++) {
      if (params.elements[i].type === 'driven') {
        drivenElementIndex = i
        break
      }
    }

    // Excitation (voltage source on driven element)
    const drivenSegment = Math.floor((params.elements[drivenElementIndex].segments || 21) / 2) + 1
    necInput += `EX 0 ${drivenElementIndex + 1} ${drivenSegment} 0 1 0\n`

    // Ground
    if (params.groundType === 'perfect') {
      necInput += `GN 1\n`
    } else if (params.groundType === 'real') {
      const conductivity = params.groundConductivity || 0.005
      const dielectric = params.groundDielectric || 13
      necInput += `GN 2 0 0 0 ${conductivity} ${dielectric}\n`
    }

    // Frequency
    necInput += `FR 0 1 0 0 ${params.frequency} 0\n`

    // Radiation pattern requests
    // Horizontal pattern: Theta=90, Phi sweep 0-360 deg, 1-deg steps
    necInput += `RP 0 1 361 1000 90 0 0 1\n`
    // Vertical pattern: Phi=0, Theta sweep based on ground presence
    if (params.groundType === 'none') {
      // Full vertical plane for free space
      necInput += `RP 0 181 1 1000 0 0 1 0\n`
    } else {
      // Upper hemisphere only for ground plane
      necInput += `RP 0 91 1 1000 0 0 1 0\n`
    }

    // End
    necInput += `EN\n`

    return necInput
  }

  /**
   * Parse NEC output and extract simulation results
   */
  private parseNECOutput(output: string): SimulationResults {
    const results: Partial<SimulationResults> & {
      patterns: { horizontal: PatternData[]; vertical: PatternData[] }
    } = {
      gain: 0,
      frontToBackRatio: 0,
      vswr: 0,
      efficiency: 100, // Default to 100% for perfect conductors
      inputImpedance: { resistance: 0, reactance: 0 },
      patterns: {
        horizontal: [],
        vertical: [],
      },
    }

    try {
      // A more specific regex to capture impedance from the correct table row.
      // This regex skips the 4 values for voltage and current before capturing impedance.
      const impedanceMatch = output.match(
        /ANTENNA INPUT PARAMETERS -+[\s\S]*?IMPEDANCE \(OHMS\)[\s\S]*?\n\s*\d+\s+\d+\s+(?:[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?\s+){4}([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/
      )

      if (impedanceMatch) {
        const resistance = parseFloat(impedanceMatch[1])
        const reactance = parseFloat(impedanceMatch[2])
        results.inputImpedance = { resistance, reactance }

        const z0 = 50 // 50-ohm system
        const gamma = Math.sqrt(
          ((resistance - z0) ** 2 + reactance ** 2) / ((resistance + z0) ** 2 + reactance ** 2)
        )
        results.vswr = (1 + gamma) / (1 - gamma)
      }

      // Extract radiation patterns
      const patternSections = output.split('RADIATION PATTERNS')
      if (patternSections.length > 1) {
        // First pattern is horizontal (phi sweep), second is vertical (theta sweep)
        const horizontalPatternText = patternSections[1]
        const verticalPatternText = patternSections[2]

        const parsePattern = (
          text: string,
          patternType: 'horizontal' | 'vertical'
        ): PatternData[] => {
          if (!text) return []
          const lines = text.split('\n')
          const patternData: PatternData[] = []
          const angleIndex = patternType === 'horizontal' ? 1 : 0 // PHI for H, THETA for V
          const phaseIndex = patternType === 'horizontal' ? 9 : 8 // E(PHI) for H, E(THETA) for V

          for (const line of lines) {
            const values = line.trim().split(/\s+/)
            if (values.length >= 10 && !isNaN(parseFloat(values[0]))) {
              patternData.push({
                angle: parseFloat(values[angleIndex]),
                gainDb: parseFloat(values[4]), // TOTAL GAIN in DB
                phase: parseFloat(values[phaseIndex]) || 0,
              })
            }
          }
          return patternData
        }

        results.patterns.horizontal = parsePattern(horizontalPatternText, 'horizontal')
        results.patterns.vertical = parsePattern(verticalPatternText, 'vertical')

        // Find max gain from both patterns
        let maxGain = -Infinity
        results.patterns.horizontal.forEach(p => (maxGain = Math.max(maxGain, p.gainDb)))
        results.patterns.vertical.forEach(p => (maxGain = Math.max(maxGain, p.gainDb)))
        results.gain = isFinite(maxGain) ? maxGain : 0

        // More robust F/B ratio calculation from horizontal pattern
        if (results.patterns.horizontal.length > 0) {
          let hMaxGain = -Infinity
          let frontAngle = 0
          // Find angle of maximum gain
          results.patterns.horizontal.forEach(p => {
            if (p.gainDb > hMaxGain) {
              hMaxGain = p.gainDb
              frontAngle = p.angle
            }
          })

          const backAngle = (frontAngle + 180) % 360

          // Find the closest point to the ideal back angle
          let backPoint: PatternData | null = null
          let minAngleDiff = Infinity

          for (const p of results.patterns.horizontal) {
            const angleDiff = Math.abs(p.angle - backAngle)
            if (angleDiff < minAngleDiff) {
              minAngleDiff = angleDiff
              backPoint = p
            }
          }

          if (backPoint) {
            results.frontToBackRatio = hMaxGain - backPoint.gainDb
          } else {
            console.warn(`Could not find back lobe gain near angle ${backAngle}. F/B set to 0.`)
            results.frontToBackRatio = 0
          }
        }
      }

      // Extract efficiency if available
      const efficiencyMatch = output.match(/RADIATION EFFICIENCY\s+=\s+([-+]?\d+\.\d+)\s+PERCENT/)
      if (efficiencyMatch) {
        results.efficiency = parseFloat(efficiencyMatch[1])
      }

      // Extract frequency
      const freqMatch = output.match(/FREQUENCY=\s*([0-9.E\s+-]+)\s*MHZ/)
      if (freqMatch) {
        results.frequency = parseFloat(freqMatch[1])
      }

      console.log('Parsed results:', results)
    } catch (error) {
      console.warn('Error parsing NEC output:', error)
      console.log('First 500 chars of output:', output.substring(0, 500))
    }

    return results as SimulationResults
  }

  /**
   * Run a simulation with the given antenna parameters.
   * Ensures the module is loaded before running.
   */
  async simulate(params: AntennaParams): Promise<SimulationResults> {
    if (!this.isLoaded || !this.module) {
      console.log('NEC2C module not loaded, loading now...')
      await this.loadModule()
    }

    if (!this.module) {
      throw new NEC2Error('NEC2C module not loaded. Call loadModule() first.', 'NOT_LOADED')
    }

    // Ensure we are in the correct working directory before simulation
    this.module.FS.chdir('/work')

    // Generate unique filenames for this simulation instance to allow parallel execution.
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const inputFilename = `input_${uniqueId}.nec`
    const outputFilename = `output_${uniqueId}.out`

    const necInput = this.generateNECInput(params)
    this.module.FS.writeFile(inputFilename, necInput)

    try {
      // Run NEC2C simulation
      console.log('Running NEC2C simulation for file:', inputFilename)
      const startTime = performance.now()

      if (!this.module.callMain) {
        throw new NEC2Error('callMain is not defined on the module.', 'CALLMAIN_UNDEFINED')
      }

      let result = 0
      try {
        // Use callMain with input and output file arguments
        result = this.module.callMain(['-i', inputFilename, '-o', outputFilename])
      } catch (err) {
        // This catch is for Emscripten's exit() which throws an exception
        if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'ExitStatus') {
          // This is a normal exit, not a true error.
        } else {
          // It might be a real error.
          console.error('Error calling NEC2C:', err)
          throw err // Re-throw if it's not an exit status
        }
      }

      const endTime = performance.now()
      console.log(`NEC2C execution finished in ${(endTime - startTime).toFixed(2)} ms.`)

      if (result !== 0) {
        console.warn(`NEC2C exited with non-zero status: ${result}`)
      }

      // Try to read output file
      let output: string
      try {
        const outputData = this.module.FS.readFile(outputFilename, { encoding: 'utf8' })
        output = outputData as string
      } catch (readError) {
        console.error(`Failed to read output file: ${outputFilename}`, readError)
        throw new NEC2Error('Failed to read NEC2C output file.', 'READ_FAILED')
      }

      if (!output) {
        throw new NEC2Error('NEC2C output file is empty.', 'EMPTY_OUTPUT')
      }

      // Parse output
      const simulationResults = this.parseNECOutput(output)
      simulationResults.frequency = params.frequency
      return simulationResults
    } finally {
      // Cleanup
      try {
        if (this.module) {
          this.module.FS.unlink(inputFilename)
          this.module.FS.unlink(outputFilename)
        }
      } catch {
        // This might fail if the file was never created, which is fine.
        // console.warn(`Failed to clean up NEC files: ${inputFilename}`, error)
      }
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
            length: 1000, // 1m in mm
            diameter: 2, // 2mm in mm
            segments: 21,
          },
        ],
        groundType: 'perfect',
      }

      const results = await this.simulate(testParams)
      console.log('Engine test results:', results)

      return results.gain !== undefined && !isNaN(results.gain)
    } catch (error) {
      console.error('Engine test failed:', error)
      return false
    }
  }

  /**
   * Get engine status
   */
  getStatus(): { loaded: boolean; loading: boolean } {
    return {
      loaded: this.isLoaded,
      loading: this.isLoading,
    }
  }

  /**
   * Unload the engine and reset the state
   */
  unload(): void {
    this.module = null
    this.isLoaded = false
    console.log('NEC2C engine unloaded and state reset.')
  }
}

// Global engine instance
export const nec2Engine = new NEC2Engine()

/**
 * Simulates an antenna design using the NEC2 engine.
 * This function handles the full lifecycle of loading the engine, running the
 * simulation, and unloading the engine to ensure a clean state for every run.
 * This is crucial for stability, especially when running multiple simulations
 * in sequence, as in the optimizer.
 * @param params - The antenna parameters for the simulation.
 * @returns A promise that resolves with the simulation results.
 */
export async function simulateAntenna(params: AntennaParams): Promise<SimulationResults> {
  try {
    // The simulate method will internally handle loading if needed.
    const results = await nec2Engine.simulate(params)
    return results
  } catch (error) {
    console.error('An error occurred during the simulateAntenna lifecycle:', error)
    // Re-throw the error to be handled by the caller
    throw error
  } finally {
    // Always unload the engine to guarantee a pristine state for the next call.
    nec2Engine.unload()
  }
}

// Test function
export async function testNEC2Engine(): Promise<boolean> {
  if (!nec2Engine.getStatus().loaded) {
    await nec2Engine.loadModule()
  }
  return nec2Engine.testEngine()
}
