/**
 * NEC-2 Web Worker
 * This worker runs the NEC-2 WebAssembly module in a separate thread
 * 
 * Supports multithreading and SIMD vectorization optimization
 * Supports parallel processing for genetic algorithm-based antenna optimization
 */

let necModule = null;
let isReady = false;
let isOptimized = false;
let modulePath = '';

// NEC2C function wrappers - applying JavaScript naming conventions
let necFunctions = {
    addWireSegment: null,       // wire function: add wire segment
    calculatePattern: null,     // rdpat function: calculate radiation pattern
    setLoadParameters: null,    // load function: set impedance loading parameters
    calculateImpedance: null,   // zint function: calculate impedance
    runMain: null,              // main function: run main calculations
    printOutput: null           // prnt function: handle output messages
};

// Genetic algorithm parameters
const GA_CONFIG = {
    populationSize: 30,
    maxGenerations: 20,
    mutationRate: 0.15,
    crossoverRate: 0.8,
    elitism: 2 // Number of top individuals preserved
};

// Parallel simulation management
let simulationQueue = [];
let isSimulating = false;

// Process messages from the main thread
self.onmessage = async function(event) {
    const data = event.data;
    
    try {
        switch (data.type) {
            case 'init':
                // Initialize WebAssembly module
                modulePath = data.modulePath || './nec2_direct.js';
                await initializeModule();
                break;
                
            case 'addWireSegment':
            if (!checkReady(data.callbackId)) return;
            
            const segResult = necFunctions.addWireSegment(
                data.params.x1, 
                data.params.y1, 
                data.params.z1, 
                data.params.x2, 
                data.params.y2, 
                data.params.z2, 
                data.params.radius,
                data.params.segments,
                1.0,  // rdel - segment length ratio (default 1.0)
                1.0,  // rrad - segment radius ratio (default 1.0)
                1     // tag number (default 1)
            );
            
            postResult(data.callbackId, segResult);
            break;
            
            case 'setFrequency':
            if (!checkReady(data.callbackId)) return;
            
            const freqResult = necModule.ccall(
                'main',
                'number',
                ['number'],
                [data.params.freqMhz]
            );
            
            postResult(data.callbackId, freqResult);
            break;
            
            case 'calculateRadiationPattern':
            if (!checkReady(data.callbackId)) return;
            
            const patternResult = necFunctions.calculatePattern(
                data.params.thetaStart, 
                data.params.thetaEnd, 
                data.params.thetaSteps, 
                data.params.phiStart, 
                data.params.phiEnd, 
                data.params.phiSteps
            );
            
            postResult(data.callbackId, patternResult);
            break;
            
            case 'getGain':
            if (!checkReady(data.callbackId)) return;
            
            const gainValue = necFunctions.calculatePattern(
                data.params.theta, 
                data.params.phi, 
                1,  // theta steps = 1
                0,  // phi start = 0
                0,  // phi end = 0
                1   // phi steps = 1
            );
            
            postResult(data.callbackId, gainValue);
            break;
            
            case 'calculateImpedance':
            if (!checkReady(data.callbackId)) return;
            
            const impedanceResistancePtr = necModule._malloc(8); // double
            const impedanceReactancePtr = necModule._malloc(8); // double
            
            const impedanceResult = necFunctions.setLoadParameters(
                data.params.loadType || 0,
                data.params.tagNumber || 1,
                data.params.segmentStart || 1,
                data.params.segmentEnd || 1,
                data.params.resistance || 0,
                data.params.inductance || 0,
                data.params.capacitance || 0
            );
            
            const resistance = necModule.getValue(impedanceResistancePtr, 'double');
            const reactance = necModule.getValue(impedanceReactancePtr, 'double');
            
            necModule._free(impedanceResistancePtr);
            necModule._free(impedanceReactancePtr);
            
            postResult(data.callbackId, { 
                resistance, 
                reactance, 
                status: impedanceResult 
            });
            break;
            
            case 'runAnalysis':
            if (!checkReady(data.callbackId)) return;
            
            // Allocate memory using direct module calls
            const gainPtr = necModule._malloc(8); // double
            const fbRatioPtr = necModule._malloc(8); // double
            const analysisResistancePtr = necModule._malloc(8); // double
            const analysisReactancePtr = necModule._malloc(8); // double
            
            // Prepare analysis parameters for main function call
            const analysisParams = new Float64Array(4);
            analysisParams[0] = data.params.frequency || 14.0; // MHz
            analysisParams[1] = data.params.segments || 20;
            analysisParams[2] = data.params.wireRadius || 0.001; // meters
            analysisParams[3] = data.params.wireLength || 0.5; // meters
            
            // Allocate memory using direct module call
            const analysisBuffer = necModule._malloc(analysisParams.length * 8);
            necModule.HEAPF64.set(analysisParams, analysisBuffer / 8);
            
            // Call function with improved naming convention
            const analysisResult = necFunctions.runMain(analysisBuffer / 8, [gainPtr, fbRatioPtr, analysisResistancePtr, analysisReactancePtr]);
            
            const gain = necModule.getValue(gainPtr, 'double');
            const fbRatio = necModule.getValue(fbRatioPtr, 'double');
            const analysisResistance = necModule.getValue(analysisResistancePtr, 'double');
            const analysisReactance = necModule.getValue(analysisReactancePtr, 'double');
            
            // Free memory using direct module calls
            necModule._free(gainPtr);
            necModule._free(fbRatioPtr);
            necModule._free(analysisResistancePtr);
            necModule._free(analysisReactancePtr);
            necModule._free(analysisBuffer);
            
            // Calculate VSWR assuming 50 ohm reference impedance
            const z0 = 50.0;
            const z = Math.sqrt(analysisResistance * analysisResistance + analysisReactance * analysisReactance);
            const rho = Math.abs((z - z0) / (z + z0));
            const vswr = (1 + rho) / (1 - rho);
            
            postResult(data.callbackId, {
                gain,
                fbRatio,
                vswr,
                impedance: { resistance: analysisResistance, reactance: analysisReactance },
                status: analysisResult
            });
            break;
            
        case 'runSimulation':
                if (!checkReady(data.callbackId)) return;
                
                // Generate NEC2 input file and run simulation
                try {
                    const result = await runNEC2Simulation(data.options);
                    postResult(data.callbackId, result);
                } catch (error) {
                    postError(data.callbackId, error.message);
                }
                break;
                
            case 'runParallelSimulations':
                if (!checkReady(data.callbackId)) return;
                
                // Run parallel simulations (for genetic algorithm)
                try {
                    const results = await runParallelSimulations(data.designs);
                    postResult(data.callbackId, results);
                } catch (error) {
                    postError(data.callbackId, error.message);
                }
                break;
                
            case 'optimizeAntenna':
                if (!checkReady(data.callbackId)) return;
                
                // Genetic algorithm-based antenna optimization
                try {
                    const result = await runGeneticOptimization(data.params);
                    postResult(data.callbackId, result);
                } catch (error) {
                    postError(data.callbackId, error.message);
                }
                break;
                
            case 'cleanup':
                // Clean up resources
                if (isReady && necModule) {
                    try {
                        // Clean up unnecessary files in the virtual file system
                        for (const file of necModule.FS.readdir('/')) {
                            if (file !== '.' && file !== '..' && file !== 'tmp') {
                                try {
                                    necModule.FS.unlink('/' + file);
                                } catch (e) {}
                            }
                        }
                    } catch (error) {
                        console.warn('Error during FS cleanup:', error);
                    }
                    isReady = false;
                }
                break;
                
            default:
                console.error(`Unknown command: ${data.type}`);
                postError(data.callbackId, `Unknown command: ${data.type}`);
        }
    } catch (error) {
        console.error('Worker error:', error);
        if (data.callbackId) {
            postError(data.callbackId, error.message);
        } else {
            self.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
};

/**
 * Initialize NEC-2 WebAssembly module
 * Import using ES module format
 */
async function initializeModule() {
    try {
        // Dynamic module import (using ES modules instead of importScripts)
        const moduleUrl = new URL(modulePath, self.location.href).href;
        const module = await import(moduleUrl);
        const moduleClass = module.default;
        
        if (!moduleClass) {
            throw new Error(`Module class not found: ${modulePath}`);
        }
        
        // Initialize module
        console.log('Initializing NEC2 WebAssembly module...');
        necModule = await moduleClass();
        
        // Check SIMD support
        isOptimized = typeof WebAssembly.validate === 'function' && 
            WebAssembly.validate(new Uint8Array([
                0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60,
                0x00, 0x01, 0x7b, 0x03, 0x02, 0x01, 0x00, 0x07, 0x08, 0x01, 0x04, 0x74,
                0x65, 0x73, 0x74, 0x00, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0f,
                0x00, 0x00, 0x00, 0x00, 0x0b
            ]));
        
        // Initialize NEC2C function wrappers with JavaScript naming convention
        necFunctions.addWireSegment = necModule.cwrap('wire', 'number', [
            'number', 'number', 'number', 'number', 'number', 'number', 
            'number', 'number', 'number', 'number', 'number'
        ]);
        
        necFunctions.calculatePattern = necModule.cwrap('rdpat', 'number', [
            'number', 'number', 'number', 'number', 'number', 'number'
        ]);
        
        necFunctions.setLoadParameters = necModule.cwrap('load', 'number', [
            'number', 'number', 'number', 'number', 'number', 'number', 'number'
        ]);
        
        necFunctions.calculateImpedance = necModule.cwrap('zint', 'number', ['number']);
        
        necFunctions.runMain = necModule.cwrap('main', 'number', ['number', 'array']);
        
        // Memory management functions will be called directly via necModule._malloc, necModule._free, etc.
        
        necFunctions.printOutput = necModule.cwrap('prnt', null, ['string']);
        
        // NEC2 main program directly calls the main() function, so no separate initialization function call is needed
        isReady = true;
        
        // Notify ready status
        self.postMessage({ 
            type: 'ready',
            optimized: isOptimized,
            success: isReady
        });
        
        console.log(`NEC2 engine initialization complete (Optimization: ${isOptimized ? 'Enabled' : 'Disabled'})`);
    } catch (error) {
        console.error('Failed to initialize NEC2 module in worker:', error);
        self.postMessage({ 
            type: 'ready',
            optimized: false,
            success: false,
            error: error.message
        });
    }
}

/**
 * Check if the module is ready
 * @param {string} callbackId - Callback ID for responding
 * @returns {boolean} True if ready
 */
function checkReady(callbackId) {
    if (!isReady || !necModule) {
        postResult(callbackId, { error: 'NEC2 module not initialized' });
        return false;
    }
    return true;
}

/**
 * Send results to the main thread
 * @param {string} callbackId - Callback ID
 * @param {*} result - Result data
 */
function postResult(callbackId, result) {
    if (!callbackId) return;
    
    self.postMessage({
        type: 'result',
        callbackId: callbackId,
        result: result
    });
}

/**
 * Send errors to the main thread
 * @param {string} callbackId - Callback ID
 * @param {string} errorMessage - Error message
 */
function postError(callbackId, errorMessage) {
    if (!callbackId) {
        self.postMessage({
            type: 'error',
            error: errorMessage
        });
        return;
    }
    
    self.postMessage({
        type: 'result',
        callbackId: callbackId,
        result: { error: errorMessage }
    });
}

/**
 * Generate NEC2 input file
 * @param {Object} options - Simulation options
 * @returns {string} NEC2 input file content
 */
function generateNEC2Input(options) {
    const lines = [];
    
    // CM cards (Comment)
    lines.push('CM NEC2 Input File Generated by OpenUda');
    lines.push(`CM Frequency: ${options.frequency || 300} MHz`);
    
    // GW cards (Wire)
    if (options.wires && Array.isArray(options.wires)) {
        options.wires.forEach((wire, index) => {
            // GW tag segments x1 y1 z1 x2 y2 z2 radius
            lines.push(`GW ${wire.tag || index + 1} ${wire.segments} ${wire.start.x.toFixed(6)} ${wire.start.y.toFixed(6)} ${wire.start.z.toFixed(6)} ${wire.end.x.toFixed(6)} ${wire.end.y.toFixed(6)} ${wire.end.z.toFixed(6)} ${wire.radius.toFixed(6)}`);
        });
    }
    
    // GE card (End Geometry)
    lines.push('GE');
    
    // GN card (Ground)
    const ground = options.ground || { type: 'free' };
    if (ground.type === 'perfect') {
        lines.push('GN 1');
    } else if (ground.type === 'real') {
        lines.push(`GN 0 0 0 0 ${ground.dielectric || 13} ${ground.conductivity || 0.005}`);
    } else { // free space
        lines.push('GN -1');
    }
    
    // FR card (Frequency)
    lines.push(`FR 0 1 0 0 ${options.frequency || 300}`);
    
    // EX card (Excitation)
    const excitation = options.excitation || { type: 'voltage', segment: 1, tag: 1 };
    lines.push(`EX 0 ${excitation.tag || 1} ${excitation.segment || 1} 0 1 0 0 0 0 0`);
    
    // RP card (Radiation Pattern)
    const pattern = options.pattern || { 
        thetaStart: 0, thetaEnd: 180, thetaSteps: 19,
        phiStart: 0, phiEnd: 360, phiSteps: 37
    };
    const thetaStep = (pattern.thetaEnd - pattern.thetaStart) / (pattern.thetaSteps - 1);
    const phiStep = (pattern.phiEnd - pattern.phiStart) / (pattern.phiSteps - 1);
    
    lines.push(`RP 0 ${pattern.thetaSteps} ${pattern.phiSteps} 0 0 0 0 ${pattern.thetaStart} ${thetaStep} ${pattern.phiStart} ${phiStep}`);
    
    // End card
    lines.push('EN');
    
    return lines.join('\n');
}

/**
 * Parse NEC2 output data
 * @param {string} outputData - NEC2 output content
 * @returns {Object} Parsed results
 */
function parseNEC2Output(outputData) {
    const result = {
        gain: {
            max: -999,
            data: []
        },
        impedance: {
            resistance: 0,
            reactance: 0
        },
        vswr: 0,
        frontToBackRatio: 0,
        errors: []
    };
    
    try {
        // Check for error messages
        if (outputData.includes('ERROR')) {
            const errorMatch = outputData.match(/ERROR[^\n]*/g);
            if (errorMatch) {
                result.errors = errorMatch;
            }
        }
        
        // Extract impedance
        const impedanceMatch = outputData.match(/IMPEDANCE\s*=\s*(\d+\.\d+)\s*([+-]\s*j\s*\d+\.\d+)/i);
        if (impedanceMatch) {
            result.impedance.resistance = parseFloat(impedanceMatch[1]);
            
            // Process reactance sign
            const reactanceStr = impedanceMatch[2].replace(/\s+/g, '');
            if (reactanceStr.includes('+j')) {
                result.impedance.reactance = parseFloat(reactanceStr.replace('+j', ''));
            } else if (reactanceStr.includes('-j')) {
                result.impedance.reactance = -parseFloat(reactanceStr.replace('-j', ''));
            }
        }
        
        // VSWR calculation (50 ohm reference)
        const r = result.impedance.resistance;
        const x = result.impedance.reactance;
        const z0 = 50;
        
        const numerator = Math.sqrt((r - z0) ** 2 + x ** 2);
        const denominator = Math.sqrt((r + z0) ** 2 + x ** 2);
        
        if (denominator - numerator !== 0) {
            result.vswr = (numerator + denominator) / (denominator - numerator);
        } else {
            result.vswr = 999; // Infinite VSWR
        }
        
        // Extract radiation pattern data
        const patternSection = outputData.match(/RADIATION PATTERNS[\s\S]*?END OF RUN/i);
        if (patternSection) {
            const patternLines = patternSection[0].split('\n');
            let frontGain = null;
            let backGain = null;
            
            for (const line of patternLines) {
                // Gain data row format: THETA PHI ... POWER GAINS...
                const gainMatch = line.match(/^\s*(\d+\.\d+)\s+(\d+\.\d+)\s+.*\s+(\d+\.\d+)\s*$/);
                if (gainMatch) {
                    const theta = parseFloat(gainMatch[1]);
                    const phi = parseFloat(gainMatch[2]);
                    const gainDb = parseFloat(gainMatch[3]);
                    
                    // Update maximum gain
                    if (gainDb > result.gain.max) {
                        result.gain.max = gainDb;
                    }
                    
                    // Store radiation pattern data
                    result.gain.data.push({ theta, phi, gain: gainDb });
                    
                    // Collect data for front-to-back ratio calculation
                    if (Math.abs(theta - 90) < 0.1) {
                        if (Math.abs(phi) < 0.1 || Math.abs(phi - 360) < 0.1) {
                            frontGain = gainDb; // Front gain (90°, 0°)
                        } else if (Math.abs(phi - 180) < 0.1) {
                            backGain = gainDb; // Back gain (90°, 180°)
                        }
                    }
                }
            }
            
            // Calculate front-to-back ratio
            if (frontGain !== null && backGain !== null) {
                result.frontToBackRatio = frontGain - backGain;
            }
        }
    } catch (error) {
        console.error('Error parsing NEC2 output:', error);
        result.errors.push(`Parse error: ${error.message}`);
    }
    
    return result;
}

/**
 * Run NEC2 simulation
 * @param {Object} options - Simulation options
 * @returns {Promise<Object>} Simulation results
 */
async function runNEC2Simulation(options) {
    if (!isReady || !necModule) {
        throw new Error('NEC2 module is not ready');
    }
    
    try {
        // Generate NEC2 input file
        const inputData = generateNEC2Input(options);
        
        // Write input file to virtual file system
        necModule.FS.writeFile('input.nec', inputData);
        
        // Execute NEC2 
        const result = necFunctions.runMain(
            4, // number of arguments
            ['nec2c', '-c', 'input.nec', 'output.nec'] // argument array
        );
        
        if (result !== 0) {
            console.warn(`NEC2 simulation return code: ${result}`);
        }
        
        // Read output file
        let outputData;
        try {
            outputData = necModule.FS.readFile('output.nec', { encoding: 'utf8' });
        } catch (err) {
            console.error('Error reading output file:', err);
            throw new Error('Cannot read NEC2 output file');
        }
        
        // Parse and return results
        return parseNEC2Output(outputData);
    } catch (error) {
        console.error('NEC2 simulation error:', error);
        throw error;
    }
}

/**
 * Simulate multiple antenna designs in parallel
 * @param {Array<Object>} designs - Array of antenna designs
 * @returns {Promise<Array<Object>>} Array of simulation results
 */
async function runParallelSimulations(designs) {
    if (!Array.isArray(designs) || designs.length === 0) {
        throw new Error('Valid design array is required');
    }
    
    // WebAssembly is single-threaded, so execution is actually sequential
    // Use queue to prevent SharedArrayBuffer access conflicts
    const results = [];
    
    // Run simulation for all designs
    for (let i = 0; i < designs.length; i++) {
        try {
            const result = await runNEC2Simulation(designs[i]);
            results.push({
                index: i,
                success: true,
                data: result
            });
        } catch (error) {
            results.push({
                index: i,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Calculate fitness of an antenna design
 * @param {Object} result - Simulation result
 * @param {Object} goals - Optimization goals
 * @returns {number} Fitness score (higher is better)
 */
function calculateFitness(result, goals) {
    // Validate results
    if (!result) {
        console.error('No simulation results available');
        return -999;
    }
    
    // Return lowest score if there are errors
    if (result.errors && result.errors.length > 0) {
        console.warn('Simulation errors found:', result.errors);
        return -999;
    }
    
    try {
        let fitness = 0;
        const weights = goals.weights || {
            gain: 1.0,
            frontToBack: 0.5,
            vswr: 2.0,
            balanced: 1.5 // Weight for balanced performance
        };
        
        // Check for NaN or undefined values
        if (!result.gain || isNaN(result.gain.max)) {
            console.warn('Gain data is not valid');
            return -888; // Use different error code
        }
        
        if (isNaN(result.frontToBackRatio)) {
            console.warn('Front-to-back ratio data is not valid');
            return -888;
        }
        
        if (isNaN(result.vswr)) {
            console.warn('VSWR data is not valid');
            return -888;
        }
        
        // Gain (higher is better)
        if (goals.includeGain !== false) {
            const gainWeight = weights.gain || 1.0;
            const normalizedGain = Math.min(Math.max(result.gain.max, 0), 15) / 15; // Normalize 0~15dBi to 0~1
            fitness += gainWeight * normalizedGain * 10; // Scaling
        }
        
        // Front-to-back ratio (higher is better)
        if (goals.includeFrontToBack !== false) {
            const fbWeight = weights.frontToBack || 0.5;
            const normalizedFB = Math.min(result.frontToBackRatio, 30) / 30; // Normalize 0~30dB to 0~1
            fitness += fbWeight * normalizedFB * 10; // Scaling
        }
        
        // VSWR (lower is better, inverse transformation)
        if (goals.includeVSWR !== false) {
            const vswrWeight = weights.vswr || 2.0;
            let vswrScore;
            
            if (result.vswr <= 1.5) {
                // Maximum score if VSWR is 1.5 or below
                vswrScore = 1.0;
            } else if (result.vswr <= 3.0) {
                // Linear decrease for range 1.5~3.0
                vswrScore = 1.0 - (result.vswr - 1.5) / 1.5;
            } else {
                // Very low score for values over 3.0
                vswrScore = Math.max(0, 0.5 - (result.vswr - 3.0) / 14.0); // From 0.5 to 0 in range 3~10
            }
            
            fitness += vswrWeight * vswrScore * 10; // Scaling
        }
        
        // Balanced performance (bonus if all values are above average)
        if (goals.includeBalanced !== false) {
            const balancedWeight = weights.balanced || 1.5;
            
            // Check if each metric is better than average
            let balanceScore = 0;
            
            if (result.gain.max >= 8) balanceScore++; // Above 8dBi
            if (result.frontToBackRatio >= 15) balanceScore++; // Above 15dB
            if (result.vswr <= 2.0) balanceScore++; // Below 2.0
            
            // Additional bonus if all metrics are above average
            if (balanceScore === 3) {
                balanceScore = 4;
            }
            
            fitness += balancedWeight * (balanceScore / 4) * 10; // Scaling
        }
        
        // Penalty: abnormal impedance
        const impedance = result.impedance;
        if (!impedance || !impedance.resistance) {
            console.warn('Impedance data is not valid');
            fitness -= 5; // Mild penalty
        } else {
            // Check impedance range (10~300 ohm is appropriate range)
            if (impedance.resistance < 10 || impedance.resistance > 300) {
                const penalty = Math.min(10, Math.abs(impedance.resistance < 10 ? 
                    10 - impedance.resistance : impedance.resistance - 300) / 10);
                fitness -= penalty;
            }
        }
        
        return fitness;
    } catch (error) {
        console.error('Error calculating fitness:', error);
        return -777; // Use different error code
    }
}

/**
 * Create a child design from two parent designs
 * @param {Object} parent1 - First parent design
 * @param {Object} parent2 - Second parent design
 * @param {number} crossoverRate - Crossover probability
 * @param {number} mutationRate - Mutation probability
 * @returns {Object} Child design
 */
function crossoverDesigns(parent1, parent2, crossoverRate, mutationRate) {
    const child = JSON.parse(JSON.stringify(parent1)); // Deep copy
    
    // Crossover
    if (Math.random() < crossoverRate) {
        // Wire element crossover
        if (child.wires && parent2.wires && child.wires.length === parent2.wires.length) {
            for (let i = 0; i < child.wires.length; i++) {
                // Randomly select parent
                if (Math.random() < 0.5) {
                    child.wires[i] = JSON.parse(JSON.stringify(parent2.wires[i]));
                }
            }
        }
        
        // Frequency crossover
        if (Math.random() < 0.5) {
            child.frequency = parent2.frequency;
        }
    }
    
    // Mutation
    if (Math.random() < mutationRate) {
        // Apply mutation opportunity to all wires
        if (child.wires && child.wires.length > 0) {
            for (let i = 0; i < child.wires.length; i++) {
                const wire = child.wires[i];
                
                // Starting point mutation
                if (Math.random() < mutationRate) {
                    wire.start.x += (Math.random() - 0.5) * 0.1;
                    wire.start.y += (Math.random() - 0.5) * 0.1;
                    wire.start.z += (Math.random() - 0.5) * 0.1;
                }
                
                // Ending point mutation
                if (Math.random() < mutationRate) {
                    wire.end.x += (Math.random() - 0.5) * 0.1;
                    wire.end.y += (Math.random() - 0.5) * 0.1;
                    wire.end.z += (Math.random() - 0.5) * 0.1;
                }
                
                // Radius mutation (within 10%)
                if (Math.random() < mutationRate) {
                    wire.radius *= 0.9 + Math.random() * 0.2; // 0.9~1.1 times
                }
                
                // Segment count mutation
                if (Math.random() < mutationRate) {
                    // Segment count must be an integer
                    const change = Math.random() < 0.5 ? -1 : 1;
                    wire.segments = Math.max(3, wire.segments + change); // Maintain minimum 3 segments
                }
            }
        }
        
        // Frequency mutation (within 5%)
        if (Math.random() < mutationRate) {
            child.frequency *= 0.95 + Math.random() * 0.1; // 0.95~1.05 times
        }
    }
    
    return child;
}

/**
 * Optimize antenna design using genetic algorithm
 * @param {Object} params - Optimization parameters
 * @returns {Promise<Object>} Optimization results
 */
async function runGeneticOptimization(params) {
    try {
        // Use GA_CONFIG as default genetic algorithm settings, override with user settings
        const config = { ...GA_CONFIG, ...params.gaConfig };
        
        // Validate and adjust settings
        if (config.populationSize < 10) {
            console.warn('Population size is too small. Adjusting to minimum of 10.');
            config.populationSize = 10;
        }
        
        if (config.mutationRate < 0.01 || config.mutationRate > 0.5) {
            console.warn(`Mutation rate is not appropriate (${config.mutationRate}). Adjusting to range 0.01~0.5.`);
            config.mutationRate = Math.max(0.01, Math.min(0.5, config.mutationRate));
        }
        
        if (config.crossoverRate < 0.5 || config.crossoverRate > 1.0) {
            console.warn(`Crossover rate is not appropriate (${config.crossoverRate}). Adjusting to range 0.5~1.0.`);
            config.crossoverRate = Math.max(0.5, Math.min(1.0, config.crossoverRate));
        }
        
        if (config.elitism < 0 || config.elitism > config.populationSize / 3) {
            console.warn(`Number of elite individuals is not appropriate. Adjusting to at most 1/3 of population size.`);
            config.elitism = Math.max(0, Math.min(Math.floor(config.populationSize / 3), config.elitism));
        }
        
        // Validate initial design model
        if (!params.initialDesign) {
            throw new Error('Initial design model is required');
        }
        
        // Set optimization goals - add balanced performance goal
        const goals = params.goals || {
            includeGain: true,
            includeFrontToBack: true,
            includeVSWR: true,
            includeBalanced: true, // Add balanced performance goal
            weights: {
                gain: 1.0,
                frontToBack: 0.5,
                vswr: 2.0,
                balanced: 1.5 // Balance weight
            }
        };
    
    // Create initial population
    let population = [];
    const baseDesign = params.initialDesign;
    
    // Include base model
    population.push(JSON.parse(JSON.stringify(baseDesign)));
    
    // Generate remaining individuals as variants of the base model
    for (let i = 1; i < config.populationSize; i++) {
        const design = JSON.parse(JSON.stringify(baseDesign));
        
        // Design variation (ensure initial diversity)
        if (design.wires) {
            for (const wire of design.wires) {
                // Random variation to start and end points (±10%)
                wire.start.x += (Math.random() - 0.5) * 0.2 * Math.abs(wire.start.x || 0.1);
                wire.start.y += (Math.random() - 0.5) * 0.2 * Math.abs(wire.start.y || 0.1);
                wire.start.z += (Math.random() - 0.5) * 0.2 * Math.abs(wire.start.z || 0.1);
                
                wire.end.x += (Math.random() - 0.5) * 0.2 * Math.abs(wire.end.x || 0.1);
                wire.end.y += (Math.random() - 0.5) * 0.2 * Math.abs(wire.end.y || 0.1);
                wire.end.z += (Math.random() - 0.5) * 0.2 * Math.abs(wire.end.z || 0.1);
                
                // Random variation to radius (±20%)
                wire.radius *= 0.8 + Math.random() * 0.4; // 0.8~1.2 times
            }
        }
        
        // Random variation to frequency (±5%)
        if (design.frequency) {
            design.frequency *= 0.95 + Math.random() * 0.1; // 0.95~1.05 times
        }
        
        population.push(design);
    }
    
    // Record optimal results for each generation
    const generationResults = [];
    let bestDesign = null;
    let bestFitness = -Infinity;
    let bestResult = null;
    
    // Start generation evolution
    for (let generation = 0; generation < config.maxGenerations; generation++) {
        console.log(`Generation ${generation + 1}/${config.maxGenerations} simulating...`);
        
        // Run simulations for all designs
        const simResults = await runParallelSimulations(population);
        
        // Calculate fitness and assign to designs
        const populationWithFitness = [];
        let generationBestFitness = -Infinity;
        let generationBestDesign = null;
        let generationBestResult = null;
        let validDesignCount = 0;
        
        for (let i = 0; i < population.length; i++) {
            const simResult = simResults.find(r => r.index === i);
            
            if (simResult && simResult.success && simResult.data) {
                try {
                    const fitness = calculateFitness(simResult.data, goals);
                    
                    // Validate fitness score
                    if (fitness > -700) { // Not a serious error (larger than -999, -888, -777)
                        validDesignCount++;
                        
                        populationWithFitness.push({
                            design: population[i],
                            fitness: fitness,
                            result: simResult.data
                        });
                        
                        // Update best design within generation
                        if (fitness > generationBestFitness) {
                            generationBestFitness = fitness;
                            generationBestDesign = JSON.parse(JSON.stringify(population[i]));
                            generationBestResult = simResult.data;
                        }
                        
                        // Update overall best design
                        if (fitness > bestFitness) {
                            bestFitness = fitness;
                            bestDesign = JSON.parse(JSON.stringify(population[i]));
                            bestResult = simResult.data;
                        }
                    } else {
                        console.warn(`Design #${i}: Invalid fitness (${fitness})`);
                        populationWithFitness.push({
                            design: population[i],
                            fitness: -600, // Invalid but not a complete failure
                            result: null
                        });
                    }
                } catch (error) {
                    console.error(`Error calculating fitness for design #${i}:`, error);
                    populationWithFitness.push({
                        design: population[i],
                        fitness: -800, // Error occurred
                        result: null
                    });
                }
            } else {
                // Assign penalty fitness to designs that failed simulation
                console.warn(`Design #${i}: Simulation failed or no results`);
                populationWithFitness.push({
                    design: population[i],
                    fitness: -999, // Complete failure
                    result: null
                });
            }
        }
        
        // Warning if too few valid designs
        if (validDesignCount < config.populationSize * 0.3) {
            console.warn(`Warning: Too few valid designs. ${validDesignCount}/${config.populationSize} (${Math.round(validDesignCount/config.populationSize*100)}%)`);
        }
        
        // Record generation results
        generationResults.push({
            generation: generation + 1,
            bestFitness: populationWithFitness.length > 0 ? 
                Math.max(...populationWithFitness.map(p => p.fitness)) : -999,
            averageFitness: populationWithFitness.length > 0 ? 
                populationWithFitness.reduce((sum, p) => sum + p.fitness, 0) / populationWithFitness.length : -999,
            bestDesignInGeneration: populationWithFitness.length > 0 ? 
                populationWithFitness.reduce((best, current) => 
                    current.fitness > best.fitness ? current : best, 
                    populationWithFitness[0]).design : null
        });
        
        // End evolution if this is the last generation
        if (generation >= config.maxGenerations - 1) {
            break;
        }
        
        // Sort by fitness
        populationWithFitness.sort((a, b) => b.fitness - a.fitness);
        
        // Create new generation
        const newPopulation = [];
        
        // Elitism: Pass top designs directly to the next generation
        for (let i = 0; i < config.elitism; i++) {
            if (i < populationWithFitness.length) {
                newPopulation.push(JSON.parse(JSON.stringify(populationWithFitness[i].design)));
            }
        }
        
        // Fill the rest with selection and crossover
        while (newPopulation.length < config.populationSize) {
            // Roulette wheel selection
            const fitnessSum = populationWithFitness.reduce((sum, p) => sum + Math.max(0, p.fitness + 1000), 0);
            
            // Parent selection function
            const selectParent = () => {
                const threshold = Math.random() * fitnessSum;
                let sum = 0;
                
                for (const p of populationWithFitness) {
                    sum += Math.max(0, p.fitness + 1000); // Add 1000 to make all fitness values positive
                    if (sum >= threshold) {
                        return p.design;
                    }
                }
                
                // Return top design as default
                return populationWithFitness[0].design;
            };
            
            // Select two parents
            const parent1 = selectParent();
            const parent2 = selectParent();
            
            // Create and add child
            const child = crossoverDesigns(parent1, parent2, config.crossoverRate, config.mutationRate);
            newPopulation.push(child);
        }
        
        // Replace with new generation
        population = newPopulation;
    }
    
    // Return final optimization results
    return {
        bestDesign: bestDesign,
        bestFitness: bestFitness,
        bestResult: bestResult,
        generations: generationResults,
        config: config,
        optimizationTime: new Date().toISOString(),
        status: 'success'
    };
    } catch (error) {
        console.error('Serious error occurred during genetic algorithm optimization:', error);
        return {
            error: error.message,
            stack: error.stack,
            status: 'failed',
            optimizationTime: new Date().toISOString()
        };
    }
}
