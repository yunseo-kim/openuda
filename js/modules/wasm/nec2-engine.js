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
                    
                    // 가상 파일 시스템 설정 및 기본 인수 셋업
                    this.module = await NEC2ModuleClass({
                        // 가상 파일 시스템 설정
                        preRun: [(moduleInstance) => {
                            // NEC2C 엔진이 사용할 디렉토리 생성을 시도합니다
                            try {
                                moduleInstance.FS.mkdir('/tmp');
                                console.log('Created /tmp directory for NEC2C');  
                            } catch (dirError) {
                                console.log('tmp directory may already exist:', dirError);
                            }
                            
                            // NEC2C가 인식할 수 있는 기본 입력 파일 생성
                            // CM 카드는 주석, GW는 와이어 정의, FR은 주파수, EN은 실행
                            const defaultNecInput = `CM DEFAULT INPUT FILE FOR NEC2C ENGINE
CM OpenUda Web Application
CM ----
CE
GW 1,1,0.0,0.0,0.0,0.0,0.0,1.0,0.001
FR 0,1,0,0,144.0,0.0
EN
`;
                            
                            // 파일을 여러 위치에 생성하여 NEC2C가 파일을 찾을 수 있도록 합니다
                            moduleInstance.FS.writeFile('/nec2.inp', defaultNecInput, { encoding: 'utf8' });
                            moduleInstance.FS.writeFile('/tmp/nec2.inp', defaultNecInput, { encoding: 'utf8' });
                            
                            // 출력 파일 생성
                            moduleInstance.FS.writeFile('/nec2.out', '', { encoding: 'utf8' });
                            moduleInstance.FS.writeFile('/tmp/nec2.out', '', { encoding: 'utf8' });
                            
                            // Emscripten 모듈의 argv 설정 (명령줄 인수)
                            if (moduleInstance.argv && Array.isArray(moduleInstance.argv)) {
                                // 이전 설정값을 제거하고 새로 추가
                                moduleInstance.argv.length = 0;
                                moduleInstance.argv.push('./nec2c');
                                moduleInstance.argv.push('-i/nec2.inp');
                                moduleInstance.argv.push('-o/nec2.out');
                            }
                            console.log('NEC2C virtual file system initialized with valid input and output files');
                        }],
                        // 모듈 생성 시 기본 인수 지정
                        arguments: ['-i/nec2.inp', '-o/nec2.out']
                    });
                    
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
            
        // rdpat 함수는 인자 없이 호출되어야 함 - 파일 기반 입출력 사용
        this.necFunctions.calculatePattern = this.module.cwrap('rdpat', 'number', []);
            
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
            // Direct manipulation of input file in main thread
            if (!this.module || !this.module.FS) {
                throw new Error('NEC2 module not fully initialized');
            }
            
            try {
                console.log(`Setting frequency to ${freqMhz} MHz`);
                
                // Format the FR card for NEC2 input file
                const frCard = `FR 0 1 0 0 ${freqMhz} 0\n`;
                
                // Read existing input file
                let inputContent;
                try {
                    inputContent = this.module.FS.readFile('/nec2.inp', { encoding: 'utf8' });
                } catch (readError) {
                    console.warn('Could not read input file:', readError);
                    // Create a basic input file if it doesn't exist
                    inputContent = 'CM DEFAULT INPUT FILE\nCE\nGW 1,1,0.0,0.0,0.0,0.0,0.0,1.0,0.001\nEN\n';
                }
                
                // Replace or add FR card in the input file
                let newContent;
                if (inputContent.includes('FR ')) {
                    // Replace existing FR card
                    newContent = inputContent.replace(/FR.*\n/, frCard);
                } else {
                    // Add FR card before EN card
                    newContent = inputContent.replace('EN', frCard + 'EN');
                }
                
                // Write updated file to both locations
                this.module.FS.writeFile('/nec2.inp', newContent, { encoding: 'utf8' });
                try {
                    // Also write to alternate location
                    this.module.FS.writeFile('/tmp/nec2.inp', newContent, { encoding: 'utf8' });
                } catch (tmpError) {
                    console.warn('Could not write to /tmp/nec2.inp:', tmpError);
                }
                
                console.log('Updated frequency in input file');
                return 0; // Success
            } catch (error) {
                console.error('Error setting frequency:', error);
                throw error;
            }
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
     * Add feed point (excitation) to antenna element
     * @param {number} tagNumber - Tag number for the wire segment
     * @param {number} segmentNumber - Segment number on the wire
     * @returns {Promise<number>} Status code
     */
    async addExcitation(tagNumber, segmentNumber) {
        if (!this.isReady) {
            throw new Error('NEC2 engine not ready');
        }
        
        if (this.useOptimized && this.workerInstance) {
            return new Promise((resolve) => {
                const callbackId = Date.now().toString();
                this.callbacks[callbackId] = resolve;
                
                this.workerInstance.postMessage({
                    type: 'addExcitation',
                    callbackId,
                    params: { tagNumber, segmentNumber }
                });
            });
        } else {
            // Add feed point card to NEC2 input file
            if (!this.module || !this.module.FS) {
                throw new Error('NEC2 module not fully initialized');
            }
            
            try {
                console.log(`Adding excitation at tag ${tagNumber}, segment ${segmentNumber}`);
                
                // Read existing input file
                let inputContent;
                try {
                    inputContent = this.module.FS.readFile('/nec2.inp', { encoding: 'utf8' });
                } catch (readError) {
                    console.warn('Could not read input file:', readError);
                    // Create basic input file if doesn't exist
                    inputContent = 'CM DEFAULT INPUT FILE\nCE\nGW 1,1,0.0,0.0,0.0,0.0,0.0,1.0,0.001\nEN\n';
                }
                
                // Create excitation (EX) card
                // Format: EX 0 tagNumber segmentNumber 0 1.0 0.0 (Voltage source with 1+j0 volts)
                const exCard = `EX 0 ${tagNumber} ${segmentNumber} 0 1.0 0.0\n`;
                
                // Add or replace EX card in the input file
                let newContent;
                if (inputContent.includes('EX ')) {
                    // Replace existing EX card
                    newContent = inputContent.replace(/EX.*\n/, exCard);
                } else {
                    // Add EX card before EN card
                    newContent = inputContent.replace('EN', exCard + 'EN');
                }
                
                // Write updated file to both locations
                this.module.FS.writeFile('/nec2.inp', newContent, { encoding: 'utf8' });
                try {
                    this.module.FS.writeFile('/tmp/nec2.inp', newContent, { encoding: 'utf8' });
                } catch (tmpError) {
                    console.warn('Could not write to /tmp/nec2.inp:', tmpError);
                }
                
                console.log('Updated input file with excitation');
                return 0; // Success
            } catch (error) {
                console.error('Error adding excitation:', error);
                throw error;
            }
        }
    }
    
    /**
     * Run a complete antenna analysis
     * @returns {Promise<{gain: number, fbRatio: number, vswr: number, impedance: {resistance: number, reactance: number}}>} Analysis results
     */
    async runAnalysis() {
        if (!this.isReady) {
            throw new Error('NEC2 engine not ready');
        }
        
        try {
            // 디버깅을 위해 가상 파일 시스템의 상태 로깅
            if (!this.useOptimized && this.module && this.module.FS) {
                try {
                    console.log('Input file contents:', this.module.FS.readFile('/nec2.inp', { encoding: 'utf8' }));
                    console.log('Virtual file system available paths:', this.module.FS.readdir('/'));
                } catch (fsError) {
                    console.warn('Could not read virtual filesystem:', fsError);
                }
            }
            
            let result;
            if (this.useOptimized && this.workerInstance) {
                // 워커 스레드에서 실행
                result = await new Promise((resolve) => {
                    const callbackId = Date.now().toString();
                    this.callbacks[callbackId] = resolve;
                    
                    this.workerInstance.postMessage({
                        type: 'runAnalysis',
                        callbackId
                    });
                });
            } else {
                // 메인 스레드에서 실행
                result = await this._runAnalysisOnMainThread();
            }
            
            return result;
        } catch (error) {
            console.error('Error in NEC2 analysis:', error);
            // 애플리케이션 크래시 방지를 위해 오류 발생 시 기본값 반환
            return {
                gain: 0,
                fbRatio: 0,
                vswr: 999,
                impedance: {
                    resistance: 50,
                    reactance: 0
                },
                error: error.message || 'Unknown error in NEC2 analysis',
                status: -1
            };
        }
    }
    
    /**
     * Run NEC2 analysis directly on the main thread
     * @private
     * @returns {Promise<Object>} Analysis results
     */
    async _runAnalysisOnMainThread() {
        if (!this.module || !this.module.FS) {
            throw new Error('NEC2 module not fully initialized');
        }
        
        console.log('Starting main thread analysis...');
        
        try {
            // Check virtual file system state before execution
            try {
                const inputContent = this.module.FS.readFile('/nec2.inp', { encoding: 'utf8' });
                console.log('Input file before analysis:\n', inputContent);
            } catch (fsError) {
                console.warn('Could not read input file:', fsError);
            }
            
            // NEC2 결과를 파일에서 읽는 방식으로 동작하므로 메모리 직접 할당은 생략
            // NEC2C는 파일 입출력 방식으로 동작하기 때문에 메모리 직접 조작보다 파일 IO 사용
            
            // Execute NEC2 calculation
            console.log('Executing NEC2 calculation...');
            
            // Run with command-line arguments (without pointer arguments)
            let result = 0;
            try {
                // Run NEC2 simulation (not using pointers as arguments)
                const args = ['-i/nec2.inp', '-o/nec2.out'];
                result = this.necFunctions.runMain(args);
                console.log('NEC2 analysis completed with exit code:', result);
            } catch (execError) {
                // ExitStatus errors may occur but results might still be valid
                console.warn('NEC2 execution warning:', execError);
                if (execError.name === 'ExitStatus') {
                    console.log('NEC2 exited with status code:', execError.status);
                    result = execError.status;
                } else {
                    throw execError; // Propagate other errors
                }
            }
            
            // Attempt to read output file
            let outputContent = '';
            try {
                outputContent = this.module.FS.readFile('/nec2.out', { encoding: 'utf8' });
                console.log('Output file after analysis:\n', outputContent);
            } catch (outError) {
                console.warn('Could not read output file:', outError);
                // Try alternative location
                try {
                    outputContent = this.module.FS.readFile('/tmp/nec2.out', { encoding: 'utf8' });
                    console.log('Found output in alternate location');
                } catch (tmpError) {
                    console.warn('Could not read alternate output file:', tmpError);
                }
            }
            
            // Parse NEC2 output file
            let impedance = { resistance: 50, reactance: 0 };
            let gain = 0;
            let fbRatio = 0;
            
            // Simple output file parsing (in practice, implement more robust parsing)
            if (outputContent) {
                // Try parsing impedance
                const impedanceMatch = outputContent.match(/IMPEDANCE:\s+(\d+\.\d+)\s*([-+]\s*j\s*\d+\.\d+)/i);
                if (impedanceMatch && impedanceMatch.length >= 3) {
                    impedance.resistance = parseFloat(impedanceMatch[1]) || 50;
                    
                    // Parse reactance (with sign handling)
                    const reactanceStr = impedanceMatch[2];
                    const sign = reactanceStr.includes('-') ? -1 : 1;
                    const reactanceValue = parseFloat(reactanceStr.replace(/[^0-9.]/g, '')) || 0;
                    impedance.reactance = sign * reactanceValue;
                }
                
                // Try parsing gain
                const gainMatch = outputContent.match(/GAIN:\s*(\d+\.\d+)\s*dBi/i);
                if (gainMatch && gainMatch.length >= 2) {
                    gain = parseFloat(gainMatch[1]) || 0;
                }
                
                // Try parsing F/B ratio
                const fbMatch = outputContent.match(/F\/B\s*RATIO:\s*(\d+\.\d+)\s*dB/i);
                if (fbMatch && fbMatch.length >= 2) {
                    fbRatio = parseFloat(fbMatch[1]) || 0;
                }
            }
            
            // 메모리 할당을 하지 않았으므로 해제도 필요 없음
            // 직접 포인터 사용 대신 파일 기반 처리 방식 사용
            
            // Calculate VSWR (based on 50 ohm)
            const z0 = 50.0;
            const z = Math.sqrt(impedance.resistance * impedance.resistance + impedance.reactance * impedance.reactance);
            const rho = Math.abs((z - z0) / (z + z0));
            const vswr = (1 + rho) / (1 - rho);
            
            return {
                gain: gain,
                fbRatio: fbRatio,
                impedance: impedance,
                vswr: isFinite(vswr) ? vswr : 999,
                status: result
            };
        } catch (error) {
            console.error('Main thread analysis failed:', error);
            throw error;
        }
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
        
        try {
            if (this.useOptimized && this.workerInstance) {
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
        } catch (error) {
            console.error('Error running simulation:', error);
            throw error;
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
        
        if (!this.useOptimized || !this.workerInstance) {
            throw new Error('Parallel simulation is only supported in optimized mode');
        }
        
        try {
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
        } catch (error) {
            console.error('Error running parallel simulations:', error);
            throw error;
        }
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
            throw new Error('NEC2 engine is not ready');
        }
        
        if (!this.useOptimized || !this.workerInstance) {
            throw new Error('Antenna optimization is only supported in optimized mode');
        }
        
        if (!params || !params.initialDesign) {
            throw new Error('Initial design is required for optimization');
        }
        
        try {
            // 유전 알고리즘 기본 설정 적용 (없는 경우)
            const gaConfig = params.gaConfig || {
                populationSize: 30,
                maxGenerations: 20,
                mutationRate: 0.15,
                crossoverRate: 0.8,
                elitism: 2
            };
            
            // goals 값이 없으면 기본값 설정
            const goals = params.goals || {
                gain: 0.4,     // 40% 중요도
                fbRatio: 0.3,  // 30% 중요도
                vswr: 0.3      // 30% 중요도
            };
            
            // 완성된 최적화 매개변수
            const optimizationParams = {
                initialDesign: params.initialDesign,
                goals: goals,
                gaConfig: gaConfig
            };
            
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
                    params: optimizationParams
                });
            });
        } catch (error) {
            console.error('Error in antenna optimization:', error);
            throw error;
        }
    }
    
    /**
     * Reset the engine state for a new calculation
     * This is used to clear any previous simulation state before running a new one
     * @returns {Promise<boolean>} Promise resolving to true when reset is complete
     */
    async reset() {
        if (!this.isReady) {
            await this.initialize();
            return true;
        }
        
        try {
            // If using worker, send reset message
            if (this.useOptimized && this.workerInstance) {
                return new Promise((resolve) => {
                    const callbackId = Date.now().toString();
                    this.callbacks[callbackId] = (result) => {
                        resolve(result && result.status ? result.status : true);
                    };
                    
                    this.workerInstance.postMessage({
                        type: 'reset',
                        callbackId: callbackId
                    });
                });
            } else {
                // In direct mode, we need to reinitialize the module
                // This isn't ideal for performance but ensures a clean state
                if (this.module && this.module.FS) {
                    // 초기 입력 파일 다시 작성
                    const initialInput = 'CM DEFAULT NEC2 INPUT FILE\nCE\n';
                    this.module.FS.writeFile('/nec2.inp', initialInput, { encoding: 'utf8' });
                    
                    try {
                        // 대체 위치에도 작성
                        this.module.FS.writeFile('/tmp/nec2.inp', initialInput, { encoding: 'utf8' });
                    } catch (fsError) {
                        console.warn('Could not write to alternate location:', fsError);
                    }
                }
                return true;
            }
        } catch (error) {
            console.error('Error during reset:', error);
            return false;
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (!this.isReady) {
            return;
        }
        
        try {
            if (this.useOptimized && this.workerInstance) {
                this.workerInstance.postMessage({ type: 'cleanup' });
                
                // 워커 종료 전 짧은 대기 시간 추가
                setTimeout(() => {
                    try {
                        this.workerInstance.terminate();
                    } catch (termError) {
                        console.warn('Error terminating worker:', termError);
                    }
                    this.workerInstance = null;
                    this.isReady = false;
                }, 200);
            } else if (this.module) {
                // 메모리 해제 시도
                try {
                    if (typeof this.module._free === 'function') {
                        // 할당된 메모리가 있다면 해제하는 로직 추가
                    }
                } catch (freeError) {
                    console.warn('Error freeing memory:', freeError);
                }
            }
            
            // 콜백 정리
            this.callbacks = {};
            this.isReady = false;
            
            console.log('NEC2 engine cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

export default NEC2Engine;
