/**
 * NEC2Engine.js
 * WebAssembly wrapper for the NEC-2 antenna simulation engine
 * 
 * Supports multithreading and SIMD vectorization for high-performance calculations
 * Provides interfaces for genetic algorithm-based antenna optimization
 */
class NEC2Engine {
    /**
     * Initialize the NEC2 engine
     * @param {boolean} useOptimized - Whether to use the optimized version with SIMD and threading
     * @param {function} onReady - Callback function to be called when the engine is ready
     */
    constructor(useOptimized = true, onReady = null) {
        this.module = null;
        this.isReady = false;
        this.useOptimized = useOptimized && this._checkOptimizationSupport();
        this.workerInstance = null;
        this.callbacks = {};
        this.callbackId = 0;
        
        // NEC2C function wrapper - JavaScript naming convention
        // General simulation functions are wrapped using cwrap
        this.necFunctions = {
            addWireSegment: null,       // wire function: wire segment addition
            calculatePattern: null,     // rdpat function: radiation pattern calculation
            setLoadParameters: null,    // load function: impedance loading parameters
            calculateImpedance: null,   // zint function: impedance calculation
            runMain: null,              // main function: main calculation execution
            printOutput: null           // prnt function: output message processing
        };
        
        // Memory management functions are standard C functions, so original names are retained
        // These functions are directly called using ccall
        this.malloc = null;
        this.free = null;
        this.mem_alloc = null;
        
        this._initialize(onReady);
    }
    
    /**
     * Check if the browser supports SIMD and threading
     * @private
     * @returns {boolean} True if the browser supports optimizations
     */
    _checkOptimizationSupport() {
        // Check for SharedArrayBuffer support (needed for threading)
        const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
        
        // Check for SIMD support
        const hasSIMD = WebAssembly.validate && WebAssembly.validate(new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60,
            0x00, 0x01, 0x7b, 0x03, 0x02, 0x01, 0x00, 0x07, 0x08, 0x01, 0x04, 0x74,
            0x65, 0x73, 0x74, 0x00, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0f,
            0x00, 0x00, 0x00, 0x00, 0x0b
        ]));
        
        return hasSharedArrayBuffer && hasSIMD;
    }
    
    /**
     * Initialize the NEC2 WebAssembly module
     * @private
     * @param {function} onReady - Callback function to be called when the engine is ready
     */
    async _initialize(onReady) {
        try {
            const modulePath = this.useOptimized 
                ? './nec2_direct.js' 
                : './nec2_direct_single.js';
            
            // Run with worker when using the optimized version
            if (this.useOptimized) {
                // Create worker and set up message handler
                this.workerInstance = new Worker('./nec2-worker.js', { type: 'module' });
                this.workerInstance.onmessage = (event) => {
                    if (event.data.type === 'ready') {
                        console.log('NEC2 worker is ready with optimized engine');
                        this.isReady = true;
                        if (onReady) onReady();
                    } else if (event.data.type === 'result') {
                        this._handleWorkerResult(event.data);
                    } else if (event.data.type === 'error') {
                        console.error('NEC2 worker error:', event.data.error);
                        // Fallback to non-optimized version if an error occurs
                        if (this.useOptimized) {
                            console.warn('Error in optimized version, falling back to non-optimized version');
                            this.useOptimized = false;
                            this._initialize(onReady);
                        }
                    }
                };
                
                // Initialize worker
                this.workerInstance.postMessage({
                    type: 'init',
                    modulePath: modulePath
                });
            } else {
                // Non-optimized version: Direct execution in the main thread
                console.log('Loading non-optimized NEC2 engine from:', modulePath);
                try {
                    // Import dynamic module
                    const NEC2ModuleClass = (await import(modulePath)).default;
                    this.module = await NEC2ModuleClass();
                    
                    // Initialize NEC2C function wrappers with cwrap
                    this._initializeFunctionWrappers();
                    
                    // Initialization complete
                    this.isReady = true;
                    
                    if (onReady) {
                        onReady();
                    }
                } catch (innerError) {
                    console.error('Failed to initialize non-optimized NEC2 engine:', innerError);
                    throw innerError;
                }
            }
        } catch (error) {
            console.error('Failed to initialize NEC2 engine:', error);
            // Notify component on error
            if (onReady) {
                onReady(error);
            }
        }
    }
    
    /**
     * Initialize function wrappers using cwrap
     * @private
     */
    _initializeFunctionWrappers() {
        if (!this.module || !this.module.cwrap) {
            console.error('Module or cwrap not available');
            return;
        }

        // Initialize function wrappers with JavaScript naming conventions
        // Match function definitions and parameter counts with nec2-worker.js
        this.necFunctions.addWireSegment = this.module.cwrap('wire', 'number', 
            ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
            
        this.necFunctions.calculatePattern = this.module.cwrap('rdpat', 'number',
            ['number', 'number', 'number', 'number', 'number', 'number']);
            
        this.necFunctions.setLoadParameters = this.module.cwrap('load', 'number',
            ['number', 'number', 'number', 'number', 'number', 'number', 'number']);
            
        this.necFunctions.calculateImpedance = this.module.cwrap('zint', 'number', ['number']);
            
        this.necFunctions.runMain = this.module.cwrap('main', 'number', ['number', 'array']);
        
        this.necFunctions.printOutput = this.module.cwrap('prnt', null, ['string']);
        
        // Memory management functions retain their original names as they are well-known C functions
        // These functions are only imported when needed for direct calls using ccall
    }

    /**
     * Handle worker results
     * @private
     * @param {Object} data - Result data from the worker
     */
    _handleWorkerResult(data) {
        if (data.callbackId && this.callbacks[data.callbackId]) {
            this.callbacks[data.callbackId](data.result);
            delete this.callbacks[data.callbackId];
        }
    }
    
    /**
     * Check if the engine is ready
     * @returns {boolean} True if the engine is ready
     */
    isEngineReady() {
        return this.isReady;
    }
    
    /**
     * Check if the engine is using optimized mode (threading and SIMD)
     * @returns {boolean} True if using optimized mode
     */
    isUsingOptimizedMode() {
        return this.useOptimized;
    }
    
    /**
     * Add a wire segment to the antenna model
     * @param {number} x1 - X coordinate of the start point
     * @param {number} y1 - Y coordinate of the start point
     * @param {number} z1 - Z coordinate of the start point
     * @param {number} x2 - X coordinate of the end point
     * @param {number} y2 - Y coordinate of the end point
     * @param {number} z2 - Z coordinate of the end point
     * @param {number} radius - Wire radius
     * @param {number} segments - Number of segments
     * @returns {Promise<number>} Status code
     */
    async addWireSegment(x1, y1, z1, x2, y2, z2, radius, segments) {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'addWireSegment',
                    callbackId,
                    params: { x1, y1, z1, x2, y2, z2, radius, segments }
                });
            });
        } else {
            // Use improved necFunctions wrapper function
            return this.necFunctions.addWireSegment(
                x1, y1, z1, x2, y2, z2, radius, segments
            );
        }
    }
    
    /**
     * Set the frequency for analysis
     * @param {number} freqMhz - Frequency in MHz
     * @returns {Promise<number>} Status code
     */
    async setFrequency(freqMhz) {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'setFrequency',
                    callbackId,
                    params: { freqMhz }
                });
            });
        } else {
            // Use improved necFunctions wrapper function
            return this.necFunctions.runMain(
                1, // number of arguments
                [freqMhz] // argument array
            );
        }
    }
    
    /**
     * Calculate the radiation pattern
     * @param {number} thetaStart - Start theta angle in degrees
     * @param {number} thetaEnd - End theta angle in degrees
     * @param {number} thetaSteps - Number of theta steps
     * @param {number} phiStart - Start phi angle in degrees
     * @param {number} phiEnd - End phi angle in degrees
     * @param {number} phiSteps - Number of phi steps
     * @returns {Promise<number>} Status code
     */
    async calculateRadiationPattern(thetaStart, thetaEnd, thetaSteps, phiStart, phiEnd, phiSteps) {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'calculateRadiationPattern',
                    callbackId,
                    params: { thetaStart, thetaEnd, thetaSteps, phiStart, phiEnd, phiSteps }
                });
            });
        } else {
            // Use improved necFunctions wrapper function
            return this.necFunctions.calculatePattern(
                thetaStart, thetaEnd, thetaSteps, phiStart, phiEnd, phiSteps
            );
        }
    }
    
    /**
     * Get the antenna gain at a specific angle
     * @param {number} theta - Theta angle in degrees
     * @param {number} phi - Phi angle in degrees
     * @returns {Promise<number>} Gain in dBi
     */
    async getGain(theta, phi) {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'getGain',
                    callbackId,
                    params: { theta, phi }
                });
            });
        } else {
            // Use improved necFunctions wrapper - calculate value in one phi direction only
            return this.necFunctions.calculatePattern(
                theta, // theta value
                phi,   // phi value
                1,     // theta steps = 1
                0,     // phi start = 0
                0,     // phi end = 0
                1      // phi steps = 1
            );
        }
    }
    
    /**
     * Calculate the input impedance at the feed point
     * @returns {Promise<{resistance: number, reactance: number}>} Input impedance
     */
    async calculateImpedance() {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'calculateImpedance',
                    callbackId
                });
            });
        } else {
            // Memory management functions are called directly from the module
            const resistancePtr = this.module._malloc(8); // double
            const reactancePtr = this.module._malloc(8); // double
            
            // Use improved necFunctions wrapper function
            // Using default values: loadType 0, tagNumber 1, segmentStart/End 1, resistance 0, inductance 0, capacitance 0
            const result = this.necFunctions.setLoadParameters(
                0, 1, 1, 1, 0, 0, 0
            );
            
            // Calculate impedance value
            this.necFunctions.calculateImpedance(resistancePtr);
            
            // Get result values
            const resistance = this.module.getValue(resistancePtr, 'double');
            const reactance = this.module.getValue(reactancePtr, 'double');
            
            // Free memory - called directly from the module
            this.module._free(resistancePtr);
            this.module._free(reactancePtr);
            
            return { resistance, reactance, status: result };
        }
    }
    
    /**
     * Run a complete antenna analysis
     * @returns {Promise<{gain: number, fbRatio: number, vswr: number, impedance: {resistance: number, reactance: number}}>} Analysis results
     */
    async runAnalysis() {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'runAnalysis',
                    callbackId
                });
            });
        } else {
            // Memory management functions are called directly from the module
            const gainPtr = this.module._malloc(8); // double
            const fbRatioPtr = this.module._malloc(8); // double
            const resistancePtr = this.module._malloc(8); // double
            const reactancePtr = this.module._malloc(8); // double
            
            // Create pointer array
            const pointerArray = [gainPtr, fbRatioPtr, resistancePtr, reactancePtr];
            
            // Use improved necFunctions wrapper function
            const result = this.necFunctions.runMain(
                4, // number of arguments
                pointerArray // pointer array
            );
            
            // Get result values
            const gain = this.module.getValue(gainPtr, 'double');
            const fbRatio = this.module.getValue(fbRatioPtr, 'double');
            const resistance = this.module.getValue(resistancePtr, 'double');
            const reactance = this.module.getValue(reactancePtr, 'double');
            
            // Free memory - called directly from the module
            this.module._free(gainPtr);
            this.module._free(fbRatioPtr);
            this.module._free(resistancePtr);
            this.module._free(reactancePtr);
            
            // Calculate VSWR assuming 50 ohm reference impedance
            const z0 = 50.0;
            const z = Math.sqrt(resistance * resistance + reactance * reactance);
            const rho = Math.abs((z - z0) / (z + z0));
            const vswr = (1 + rho) / (1 - rho);
            
            return {
                gain,
                fbRatio,
                vswr,
                impedance: { resistance, reactance },
                status: result
            };
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (!this.isReady) {
            return;
        }
        
        if (this.useOptimized && this.workerInstance) {
            this.workerInstance.postMessage({ type: 'cleanup' });
            this.workerInstance.terminate();
            this.workerInstance = null;
        } else if (this.module) {
            // Use improved necFunctions wrapper function
            this.necFunctions.runMain(0, []);
        }
        
        this.isReady = false;
    }
    
    /**
     * Run a single NEC2 simulation with the given options.
     * @param {Object} options - Simulation options
     * @param {Array} options.wires - Array of wire segment information
     * @param {number} options.frequency - Frequency (MHz)
     * @param {Object} options.ground - Ground settings
     * @param {Object} options.pattern - Radiation pattern settings
     * @returns {Promise<Object>} Simulation results
     */
    async runSimulation(options) {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (this.useOptimized) {
            return new Promise((resolve, reject) => {
                const callbackId = (++this.callbackId).toString();
                this.callbacks[callbackId] = (result) => {
                    if (result && result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result);
                    }
                };
                
                this.workerInstance.postMessage({
                    type: 'runSimulation',
                    callbackId,
                    options: options
                });
            });
        } else {
            throw new Error('Simulation interface is not supported in non-optimized mode');
        }
    }
    
    /**
     * Simulate multiple antenna designs in parallel.
     * @param {Array<Object>} designs - Array of antenna designs
     * @returns {Promise<Array<Object>>} Array of simulation results
     */
    async runParallelSimulations(designs) {
        if (!this.isReady) {
            throw new Error('NEC2 engine is not ready');
        }
        
        if (!this.useOptimized) {
            throw new Error('Parallel simulation is only supported in optimized mode');
        }
        
        return new Promise((resolve, reject) => {
            const callbackId = (++this.callbackId).toString();
            this.callbacks[callbackId] = (result) => {
                if (result && result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            };
            
            this.workerInstance.postMessage({
                type: 'runParallelSimulations',
                callbackId,
                designs: designs
            });
        });
    }
    
    /**
     * Optimize antenna design using genetic algorithm.
     * @param {Object} params - Optimization parameters
     * @param {Object} params.initialDesign - Initial antenna design
     * @param {Object} params.goals - Optimization goals
     * @param {Object} params.gaConfig - Genetic algorithm configuration (optional)
     * @returns {Promise<Object>} Optimization results
     */
    async optimizeAntenna(params) {
        if (!this.isReady) {
            throw new Error('NEC2 엔진이 준비되지 않았습니다');
        }
        
        if (!this.useOptimized) {
            throw new Error('Antenna optimization is only supported in optimized mode');
        }
        
        if (!params || !params.initialDesign) {
            throw new Error('Initial design is required for optimization');
        }
        
        return new Promise((resolve, reject) => {
            const callbackId = (++this.callbackId).toString();
            this.callbacks[callbackId] = (result) => {
                if (result && result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            };
            
            this.workerInstance.postMessage({
                type: 'optimizeAntenna',
                callbackId,
                params: params
            });
        });
    }
    
    /**
     * Reset the engine state for a new calculation
     * This is used to clear any previous simulation state before running a new one
     * @returns {Promise<boolean>} Promise resolving to true when reset is complete
     */
    async reset() {
        // If using worker, send reset message
        if (this.workerInstance) {
            return new Promise((resolve) => {
                const callbackId = this._registerCallback((result) => {
                    resolve(result.status);
                });
                
                this.workerInstance.postMessage({
                    type: 'reset',
                    callbackId: callbackId
                });
            });
        } else {
            // In direct mode, we need to reinitialize the module
            // This isn't ideal for performance but ensures a clean state
            if (this.module && this.module._main) {
                // Call main with empty args to reset internal state
                this.module._main(0, 0);
            }
            return true;
        }
    }
    
    /**
     * Clean up resources and terminate the worker.
     */
    cleanup() {
        if (this.workerInstance) {
            this.workerInstance.postMessage({
                type: 'cleanup'
            });
            
            // Wait a bit before terminating the worker
            setTimeout(() => {
                this.workerInstance.postMessage({
                    type: 'terminate'
                });
                this.workerInstance = null;
                this.isReady = false;
            }, 500);
        }
        
        // Clean up callbacks
        this.callbacks = {};
    }
}

export default NEC2Engine;
