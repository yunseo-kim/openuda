/**
 * NEC2Engine.js
 * WebAssembly wrapper for the NEC-2 antenna simulation engine
 * 
 * 고성능 계산을 위한 멀티스레딩 및 SIMD 벡터화 최적화 지원
 * 유전 알고리즘 기반 안테나 최적화를 위한 인터페이스 제공
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
            
            // 최적화된 버전 사용 시 워커로 실행
            if (this.useOptimized) {
                // 워커 생성 및 메시지 핸들러 설정
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
                        // 오류 발생 시 최적화되지 않은 버전으로 폴백
                        if (this.useOptimized) {
                            console.warn('Error in optimized version, falling back to non-optimized version');
                            this.useOptimized = false;
                            this._initialize(onReady);
                        }
                    }
                };
                
                // 워커 초기화
                this.workerInstance.postMessage({
                    type: 'init',
                    modulePath: modulePath
                });
            } else {
                // 최적화되지 않은 버전: 메인 스레드에서 직접 실행
                console.log('Loading non-optimized NEC2 engine from:', modulePath);
                try {
                    // 동적 모듈 가져오기
                    const NEC2ModuleClass = (await import(modulePath)).default;
                    this.module = await NEC2ModuleClass();
                    
                    // NEC2 엔진은 직접 main() 함수를 호출하므로 별도의 초기화 필요 없음
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
            // 오류 발생 시 컴포넌트에 알림
            if (onReady) {
                onReady(error);
            }
        }
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
            return this.module.ccall(
                'nec2_add_wire_segment',
                'number',
                ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
                [x1, y1, z1, x2, y2, z2, radius, segments]
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
            return this.module.ccall(
                'nec2_set_frequency',
                'number',
                ['number'],
                [freqMhz]
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
            return this.module.ccall(
                'nec2_calculate_radiation_pattern',
                'number',
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [thetaStart, thetaEnd, thetaSteps, phiStart, phiEnd, phiSteps]
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
            return this.module.ccall(
                'nec2_get_gain',
                'number',
                ['number', 'number'],
                [theta, phi]
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
            const resistancePtr = this.module._malloc(8); // double
            const reactancePtr = this.module._malloc(8); // double
            
            const result = this.module.ccall(
                'nec2_calculate_impedance',
                'number',
                ['number', 'number'],
                [resistancePtr, reactancePtr]
            );
            
            const resistance = this.module.getValue(resistancePtr, 'double');
            const reactance = this.module.getValue(reactancePtr, 'double');
            
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
            const gainPtr = this.module._malloc(8); // double
            const fbRatioPtr = this.module._malloc(8); // double
            const resistancePtr = this.module._malloc(8); // double
            const reactancePtr = this.module._malloc(8); // double
            
            const result = this.module.ccall(
                'nec2_run_analysis',
                'number',
                ['number', 'number', 'number', 'number'],
                [gainPtr, fbRatioPtr, resistancePtr, reactancePtr]
            );
            
            const gain = this.module.getValue(gainPtr, 'double');
            const fbRatio = this.module.getValue(fbRatioPtr, 'double');
            const resistance = this.module.getValue(resistancePtr, 'double');
            const reactance = this.module.getValue(reactancePtr, 'double');
            
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
            this.module.ccall('nec2_cleanup', null, [], []);
        }
        
        this.isReady = false;
    }
    
    /**
     * 주어진 옵션으로 단일 NEC2 시뮬레이션을 실행합니다.
     * @param {Object} options - 시뮬레이션 옵션
     * @param {Array} options.wires - 와이어 세그먼트 정보 배열
     * @param {number} options.frequency - 주파수 (MHz)
     * @param {Object} options.ground - 지면 설정
     * @param {Object} options.pattern - 방사 패턴 설정
     * @returns {Promise<Object>} 시뮬레이션 결과
     */
    async runSimulation(options) {
        if (!this.isReady) {
            throw new Error('NEC2 엔진이 준비되지 않았습니다');
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
            throw new Error('비최적화 모드에서는 시뮬레이션 인터페이스가 지원되지 않습니다');
        }
    }
    
    /**
     * 여러 안테나 설계를 병렬로 시뮬레이션합니다.
     * @param {Array<Object>} designs - 안테나 설계 배열
     * @returns {Promise<Array<Object>>} 시뮬레이션 결과 배열
     */
    async runParallelSimulations(designs) {
        if (!this.isReady) {
            throw new Error('NEC2 엔진이 준비되지 않았습니다');
        }
        
        if (!this.useOptimized) {
            throw new Error('병렬 시뮬레이션은 최적화 모드에서만 지원됩니다');
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
     * 유전 알고리즘을 사용하여 안테나 설계를 최적화합니다.
     * @param {Object} params - 최적화 매개변수
     * @param {Object} params.initialDesign - 초기 안테나 설계
     * @param {Object} params.goals - 최적화 목표
     * @param {Object} params.gaConfig - 유전 알고리즘 설정 (선택적)
     * @returns {Promise<Object>} 최적화 결과
     */
    async optimizeAntenna(params) {
        if (!this.isReady) {
            throw new Error('NEC2 엔진이 준비되지 않았습니다');
        }
        
        if (!this.useOptimized) {
            throw new Error('안테나 최적화는 최적화 모드에서만 지원됩니다');
        }
        
        if (!params || !params.initialDesign) {
            throw new Error('최적화를 위한 초기 설계가 필요합니다');
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
     * 리소스를 정리하고 워커를 종료합니다.
     */
    cleanup() {
        if (this.workerInstance) {
            this.workerInstance.postMessage({
                type: 'cleanup'
            });
            
            // 조금 기다린 후 워커 종료
            setTimeout(() => {
                this.workerInstance.postMessage({
                    type: 'terminate'
                });
                this.workerInstance = null;
                this.isReady = false;
            }, 500);
        }
        
        // 콜백 정리
        this.callbacks = {};
    }
}

export default NEC2Engine;
