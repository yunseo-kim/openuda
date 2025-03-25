/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Antenna Calculator Module
 * 
 * This module handles the antenna performance calculations including gain,
 * front-to-back ratio, impedance, and radiation pattern calculations.
 * Uses the NEC2C WebAssembly engine for accurate electromagnetic simulations.
 */

import NEC2Engine from './wasm/nec2-engine.js';

export class AntennaCalculator {
    constructor() {
        // Speed of light in free space (mm/s)
        this.c = 299792458 * 1000;
        
        // Reference impedance for VSWR calculations
        this.referenceImpedance = 50; // ohms

        // NEC2C WASM 엔진
        this.engine = null;
        this.isReady = false;
        
        // 엔진 초기화 시작
        this._initEngine();
    }
    
    /**
     * NEC2C 엔진을 초기화합니다
     * @private
     */
    async _initEngine() {
        try {
            console.log('Starting NEC2C engine initialization...');
            // Try to use optimized engine first, with fallback
            this.engine = new NEC2Engine(true, (error) => {
                // 중요: error 매개변수를 확인하여 오류 처리
                if (error) {
                    console.error('NEC2C engine initialization error (callback):', error);
                    this.isReady = false;
                    // 여기서는 fallback을 시도하지 않음 - 이미 _initEngine 메서드에서 catch 블록으로 이동
                    return;
                }
                
                this.isReady = true;
                console.log('NEC2C engine initialization complete');
            });
            
            // Set a timeout to catch stalled initialization
            const initTimeout = setTimeout(() => {
                if (!this.isReady) {
                    console.warn('NEC2C engine initialization taking longer than expected...');
                    // 5초 후에도 초기화되지 않으면 fallback 버전을 시도
                    if (!this.isReady && this.engine) {
                        console.warn('Initialization timeout - attempting to use non-optimized engine');
                        this._initFallbackEngine();
                    }
                }
            }, 5000);
            
        } catch (error) {
            console.error('NEC2C engine initialization failed:', error);
            // Try to initialize with non-optimized engine if optimized failed
            this._initFallbackEngine();
        }
    }
    
    /**
     * 비최적화 엔진으로 폴백 초기화를 시도합니다
     * @private
     */
    async _initFallbackEngine() {
        try {
            console.log('Retrying with non-optimized engine...');
            this.engine = new NEC2Engine(false, (error) => {
                if (error) {
                    console.error('Non-optimized engine initialization failed (callback):', error);
                    this.isReady = false;
                    // UI에 오류 상태를 표시할 수 있는 이벤트 발생
                    this._fireEngineInitEvent(false, 'Failed to initialize NEC2C engine');
                    return;
                }
                
                this.isReady = true;
                console.log('NEC2C engine initialization complete (non-optimized)');
                // UI에 성공 상태를 표시
                this._fireEngineInitEvent(true);
            });
        } catch (fallbackError) {
            console.error('Fallback engine initialization also failed:', fallbackError);
            this.isReady = false;
            // UI에 오류 상태를 표시
            this._fireEngineInitEvent(false, 'Failed to initialize NEC2 engine: ' + fallbackError.message);
            throw new Error('Failed to initialize NEC2 engine: ' + fallbackError.message);
        }
    }
    
    /**
     * NEC2C 엔진 초기화 이벤트를 발생시킵니다
     * @private
     * @param {boolean} success - 초기화 성공 여부
     * @param {string} errorMessage - 오류 메시지 (실패한 경우)
     */
    _fireEngineInitEvent(success, errorMessage) {
        // 브라우저 환경인지 확인 (테스트에서는 Node.js 환경일 수 있음)
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            try {
                // 사용자 정의 이벤트를 사용하여 엔진 상태 변경을 알림
                const event = new CustomEvent('nec2c-engine-status', {
                    detail: {
                        ready: success,
                        error: errorMessage || null
                    },
                    bubbles: true
                });
                document.dispatchEvent(event);
            } catch (error) {
                console.error('Failed to dispatch engine status event:', error);
            }
        } else {
            // Node.js 환경에서는 단순히 로그만 출력
            if (success) {
                console.log('NEC2C engine initialized successfully');
            } else {
                console.error('NEC2C engine initialization failed:', errorMessage || 'Unknown error');
            }
        }
    }
    
    /**
     * Wait until the engine is ready
     * @private
     */
    async _waitForEngine() {
        if (this.isReady) return;
        
        console.log('Waiting for NEC2C engine to be ready...');
        
        return new Promise((resolve, reject) => {
            const maxWaitTime = 20000; // 20 seconds max wait time
            const startTime = Date.now();
            
            const checkInterval = setInterval(() => {
                if (this.isReady) {
                    clearInterval(checkInterval);
                    console.log('NEC2C engine is now ready');
                    resolve();
                    return;
                }
                
                // Check if we've waited too long
                if (Date.now() - startTime > maxWaitTime) {
                    clearInterval(checkInterval);
                    const errorMsg = 'Timeout waiting for NEC2C engine initialization';
                    console.error(errorMsg);
                    
                    // 타임아웃 발생 시 UI에 오류 상태 표시
                    this._fireEngineInitEvent(false, errorMsg);
                    
                    // Promise 거부
                    reject(new Error(errorMsg));
                }
            }, 100);
        });
    }
    
    /**
     * 안테나 모델을 NEC2C 입력으로 변환합니다
     * @private
     * @param {object} antennaModel 안테나 모델
     * @param {number} frequency 주파수 (MHz)
     * @returns {object} NEC2C 입력 모델
     */
    _convertModelToNEC(antennaModel, frequency) {
        // 엘리먼트를 위치별로 정렬
        const elements = [...antennaModel.elements].sort((a, b) => a.position - b.position);
        
        // NEC2C 입력 모델 준비
        return {
            frequency,
            elements: elements.map(el => ({
                type: el.type,
                length: el.length,  // mm
                position: el.position, // mm
                diameter: el.diameter // mm
            })),
            boomDiameter: antennaModel.boomDiameter,
            boomMaterial: antennaModel.boomMaterial === 'metal' ? 'metal' : 'nonmetal',
            groundType: antennaModel.groundType || 'free-space'
        };
    }

    /**
     * Calculate antenna performance at a specific frequency
     * @param {object} antennaModel The antenna model to analyze
     * @param {number} frequency Optional specific frequency (MHz), defaults to center frequency
     * @returns {object} Results including gain, F/B ratio, impedance, VSWR, etc.
     */
    async calculateAntennaPerformance(antennaModel, frequency = null) {
        try {
            // Wait for the engine to be ready
            await this._waitForEngine();
            
            // Use model center frequency (if not specified)
            const freq = frequency || antennaModel.centerFrequency;
            
            // Validate frequency
            if (!freq || freq <= 0) {
                throw new Error('Invalid frequency value. Must be positive.');
            }
            
            // Return default values if there are no elements
            if (!antennaModel.elements || antennaModel.elements.length === 0) {
                console.log('Calculating with empty model - returning default values');
                return {
                    gain: 0,
                    fbRatio: 0,
                    impedance: { r: 0, x: 0 },
                    vswr: 999,
                    beamwidth: 360,
                    frequency: freq
                };
            }
            
            // Validate model structure
            if (!antennaModel.elements.every(el => el.type && el.length && typeof el.position !== 'undefined' && el.diameter)) {
                throw new Error('Invalid antenna model: elements missing required properties');
            }
            console.log(`Calculating performance at ${freq} MHz`);
            
            // Convert antenna model to NEC2 format
            const necModel = this._convertModelToNEC(antennaModel, freq);
            
            // Initialize NEC2 engine
            console.log('Resetting NEC2 engine...');
            await this.engine.reset();
            
            // Add elements
            console.log(`Adding ${necModel.elements.length} elements to simulation...`);
            for (const element of necModel.elements) {
                // Driven element is centered, others extend half length in both directions
                const halfLength = element.length / 2;
                const segments = Math.max(3, Math.floor(element.length / 100)); // Minimum 3 segments
                
                try {
                    await this.engine.addWireSegment(
                        element.position, -halfLength, 0,  // Start point (x, y, z)
                        element.position, halfLength, 0,   // End point (x, y, z)
                        element.diameter / 2,              // Radius
                        segments // Number of segments
                    );
                } catch (elemError) {
                    console.error(`Error adding element at position ${element.position}:`, elemError);
                    throw new Error(`Failed to add element at position ${element.position}: ${elemError.message}`);
                }
            }
            
            // Add feed point to driven element
            const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
            if (drivenIndex !== -1) {
                const drivenElement = necModel.elements[drivenIndex];
                const segments = Math.max(3, Math.floor(drivenElement.length / 100));
                const segmentIndex = Math.floor(segments / 2); // Center segment
                
                console.log(`Adding feed point to driven element (index ${drivenIndex}, segment ${segmentIndex})`);
                try {
                    // Add feed point to the center of the driven element (card 5)
                    await this.engine.addExcitation(drivenIndex + 1, segmentIndex);
                } catch (excitError) {
                    console.error('Error adding excitation:', excitError);
                    throw new Error(`Failed to add excitation: ${excitError.message}`);
                }
            } else {
                console.warn('No driven element found in antenna model');
                throw new Error('Antenna must have a driven element for analysis');
            }
            
            // Set frequency
            console.log(`Setting frequency to ${freq} MHz`);
            try {
                await this.engine.setFrequency(freq);
            } catch (freqError) {
                console.error('Error setting frequency:', freqError);
                throw new Error(`Failed to set frequency: ${freqError.message}`);
            }
            
            // Run analysis
            console.log('Running NEC2 analysis...');
            let result;
            try {
                result = await this.engine.runAnalysis();
                console.log('Analysis completed successfully');
            } catch (analysisError) {
                console.error('Error running analysis:', analysisError);
                throw new Error(`Analysis execution failed: ${analysisError.message}`);
            }
            
            if (!result || !result.impedance) {
                console.error('Invalid result returned from analysis:', result);
                throw new Error('Analysis returned invalid data');
            }
            
            // Extract impedance
            const impedance = {
                r: result.impedance.resistance,
                x: result.impedance.reactance
            };
            
            // Calculate VSWR
            const vswr = this.calculateVSWR(result.impedance);
            
            const performanceResult = {
                gain: result.gain || 0,
                fbRatio: result.fbRatio || 0,
                impedance: impedance,
                vswr: vswr,
                beamwidth: this._calculateBeamwidth(result),
                frequency: freq
            };
            
            console.log('Calculation results:', performanceResult);
            return performanceResult;
        } catch (error) {
            console.error('Error calculating antenna performance:', error);
            // Generate a more detailed error for debug purposes
            let errorDetails = error.message;
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
            
            return {
                error: 'Simulation failed: ' + errorDetails,
                frequency: freq,
                success: false
            };
        }
    }
    
    /**
     * Calculate antenna beamwidth
     * @private
     * @param {object} result Simulation result
     * @returns {number} Approximate beamwidth in degrees
     */
    _calculateBeamwidth(result) {
        // Approximate beamwidth based on gain
        const gain = result.gain;
        
        // Higher gain results in narrower beamwidth
        // Approximate formula: beamwidth ≈ 70 / sqrt(gain)
        let beamwidth = 70 / Math.sqrt(Math.pow(10, gain / 10));
        
        // Limit to a reasonable range
        return Math.max(10, Math.min(180, beamwidth));
    }

    /**
     * Calculate antenna performance across a frequency range
     * @param {object} antennaModel The antenna model to analyze
     * @param {number} startFreq Start frequency in MHz
     * @param {number} endFreq End frequency in MHz
     * @param {number} steps Number of frequency points
     * @returns {object} Results including arrays of frequency, gain, vswr, etc.
     */
    async calculateFrequencySweep(antennaModel, startFreq, endFreq, steps) {
        try {
            // Wait for the engine to be ready
            await this._waitForEngine();
            
            console.log(`Starting frequency sweep from ${startFreq} to ${endFreq} MHz with ${steps} steps`);
            
            const results = {
                frequencies: [],
                gains: [],
                fbRatios: [],
                vswrs: [],
                impedances: []
            };
            
            // 안테나 모델을 NEC2 형식으로 초기 변환
            const necModel = this._convertModelToNEC(antennaModel, startFreq);
            
            // 요소 설정 (한 번만 수행)
            console.log('Resetting NEC2 engine for frequency sweep...');
            await this.engine.reset();
            
            // 요소 추가
            console.log(`Adding ${necModel.elements.length} elements to simulation...`);
            for (const element of necModel.elements) {
                const halfLength = element.length / 2;
                const segments = Math.max(3, Math.floor(element.length / 100)); // Minimum 3 segments
                
                try {
                    await this.engine.addWireSegment(
                        element.position, -halfLength, 0,  // Start point (x, y, z)
                        element.position, halfLength, 0,   // End point (x, y, z)
                        element.diameter / 2,              // Radius
                        segments // Number of segments
                    );
                } catch (elemError) {
                    console.error(`Error adding element at position ${element.position}:`, elemError);
                    throw new Error(`Failed to add element at position ${element.position}: ${elemError.message}`);
                }
            }
        
            // Add feed point to driven element
            const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
            if (drivenIndex !== -1) {
                const drivenElement = necModel.elements[drivenIndex];
                const segments = Math.max(3, Math.floor(drivenElement.length / 100));
                const segmentIndex = Math.floor(segments / 2); // Center segment
                
                console.log(`Adding feed point to driven element (index ${drivenIndex}, segment ${segmentIndex})`);
                try {
                    // Add feed point to the center of the driven element (card 5)
                    await this.engine.addExcitation(drivenIndex + 1, segmentIndex);
                } catch (excitError) {
                    console.error('Error adding excitation:', excitError);
                    throw new Error(`Failed to add excitation: ${excitError.message}`);
                }
            } else {
                console.warn('No driven element found in antenna model');
                throw new Error('Antenna must have a driven element for analysis');
            }
        
            // Create frequency points
            const freqStep = (endFreq - startFreq) / (steps - 1);
            
            // Calculate performance at each frequency
            console.log(`Calculating performance at ${steps} frequency points...`);
            for (let i = 0; i < steps; i++) {
                const frequency = startFreq + (freqStep * i);
                results.frequencies.push(frequency);
                console.log(`Processing frequency point ${i+1}/${steps}: ${frequency.toFixed(2)} MHz`);

            
                try {
                    // Set frequency (keeping the same geometry)
                    await this.engine.setFrequency(frequency);
                    
                    // Run analysis
                    const result = await this.engine.runAnalysis();
                    
                    if (!result || !result.impedance) {
                        throw new Error('Invalid result returned from analysis');
                    }
                    
                    // Extract impedance
                    const impedance = {
                        r: result.impedance.resistance,
                        x: result.impedance.reactance
                    };
                    
                    // Calculate VSWR
                    const vswr = this.calculateVSWR(impedance);
                    
                    // Store results
                    results.gains.push(result.gain || 0);
                    results.fbRatios.push(result.fbRatio || 0);
                    results.vswrs.push(vswr);
                    results.impedances.push(impedance);
                    
                    if (i % 5 === 0 || i === steps-1) {
                        console.log(`Progress: ${Math.round((i+1)/steps*100)}% complete`);
                    }
                } catch (error) {
                    console.error(`Error calculating at frequency ${frequency}MHz:`, error);
                    
                    // Add default values in case of error
                    results.gains.push(0);
                    results.fbRatios.push(0);
                    results.vswrs.push(999);
                    results.impedances.push({ r: 0, x: 0 });
                }
        }
        
            console.log('Frequency sweep completed successfully');
            return results;
        } catch (error) {
            console.error('Error during frequency sweep:', error);
            return {
                error: 'Frequency sweep failed: ' + error.message,
                frequencies: [],
                gains: [],
                fbRatios: [],
                vswrs: [],
                impedances: [],
                success: false
            };
        }
    }

    /**
     * Calculate 3D radiation pattern
     * @param {object} antennaModel The antenna model to analyze
     * @param {number} frequency Frequency in MHz
     * @param {number} angleStep Step size for calculation in degrees
     * @returns {object} Radiation pattern data in 3D coordinates
     */
    async calculateRadiationPattern(antennaModel, frequency, angleStep = 5) {
        try {
            // Wait for the engine to be ready
            await this._waitForEngine();
            
            console.log(`Calculating radiation pattern at ${frequency} MHz with ${angleStep}° step size`);
    
            // Convert antenna model to NEC2 format
            const necModel = this._convertModelToNEC(antennaModel, frequency);
            
            // Initialize engine and set up model
            console.log('Resetting NEC2 engine for radiation pattern...');
            await this.engine.reset();
        
            // Add wire segments
            console.log(`Adding ${necModel.elements.length} elements to simulation...`);
            for (const element of necModel.elements) {
                const halfLength = element.length / 2;
                const segments = Math.max(3, Math.floor(element.length / 100)); // Minimum 3 segments
                
                try {
                    await this.engine.addWireSegment(
                        element.position, -halfLength, 0,  // Start point (x, y, z)
                        element.position, halfLength, 0,   // End point (x, y, z)
                        element.diameter / 2,              // Radius
                        segments // Number of segments
                    );
                } catch (elemError) {
                    console.error(`Error adding element at position ${element.position}:`, elemError);
                    throw new Error(`Failed to add element at position ${element.position}: ${elemError.message}`);
                }
            }
        
            // Add feed point to driven element
            const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
            if (drivenIndex !== -1) {
                const drivenElement = necModel.elements[drivenIndex];
                const segments = Math.max(3, Math.floor(drivenElement.length / 100));
                const segmentIndex = Math.floor(segments / 2); // Center segment
                
                console.log(`Adding feed point to driven element (index ${drivenIndex}, segment ${segmentIndex})`);
                try {
                    // Add feed point to the center of the driven element
                    await this.engine.addExcitation(drivenIndex + 1, segmentIndex);
                } catch (excitError) {
                    console.error('Error adding excitation:', excitError);
                    throw new Error(`Failed to add excitation: ${excitError.message}`);
                }
            } else {
                console.warn('No driven element found in antenna model');
                throw new Error('Antenna must have a driven element for analysis');
            }
        
            // Set frequency
            console.log(`Setting frequency to ${frequency} MHz`);
            try {
                await this.engine.setFrequency(frequency);
            } catch (freqError) {
                console.error('Error setting frequency:', freqError);
                throw new Error(`Failed to set frequency: ${freqError.message}`);
            }
            
            // Run basic analysis to find maximum gain
            console.log('Running basic analysis to find maximum gain...');
            let baseResult;
            try {
                baseResult = await this.engine.runAnalysis();
                if (!baseResult || typeof baseResult.gain === 'undefined') {
                    throw new Error('Invalid base result returned from analysis');
                }
                console.log(`Found maximum gain: ${baseResult.gain.toFixed(2)} dBi`);
            } catch (analysisError) {
                console.error('Error running base analysis:', analysisError);
                throw new Error(`Base analysis failed: ${analysisError.message}`);
            }
            
            const maxGain = baseResult.gain;
        
        // Create arrays to store pattern data
            const azimuthPoints = Math.ceil(360 / angleStep);
            const elevationPoints = Math.ceil(180 / angleStep) + 1;
            
            const pattern = {
                azimuth: new Array(azimuthPoints),       // Horizontal plane (0-360°)
                elevation: new Array(elevationPoints),   // Vertical plane (0-180°)
                data3D: []                               // Full 3D pattern
            };
            
            // Calculate radiation pattern for each direction
        
            // Calculate horizontal plane (azimuth) pattern (elevation 90 degrees)
            console.log('Calculating horizontal plane pattern...');
            for (let i = 0; i < azimuthPoints; i++) {
                const azimuth = i * angleStep;
                try {
                    // Calculate gain for specific direction using NEC2C engine
                    const gainResult = await this.engine.calculateRadiationPattern(azimuth, 90);
                    // Normalize using maximum gain (0-1 range)
                    pattern.azimuth[i] = Math.pow(10, (gainResult.gain - maxGain) / 20);
                } catch (error) {
                    console.error(`Error calculating radiation pattern at azimuth ${azimuth} degrees:`, error);
                    pattern.azimuth[i] = 0; // Set to 0 on error
                }
                
                if (i % 10 === 0) {
                    console.log(`Horizontal scan progress: ${Math.round((i+1)/azimuthPoints*100)}%`);
                }
            }
        
            // Calculate vertical plane (elevation) pattern (azimuth 0 degrees)
            console.log('Calculating vertical plane pattern...');
            for (let i = 0; i < elevationPoints; i++) {
                const elevation = i * angleStep;
                try {
                    const gainResult = await this.engine.calculateRadiationPattern(0, elevation);
                    pattern.elevation[i] = Math.pow(10, (gainResult.gain - maxGain) / 20);
                } catch (error) {
                    console.error(`Error calculating radiation pattern at elevation ${elevation} degrees:`, error);
                    pattern.elevation[i] = 0;
                }
                
                if (i % 5 === 0) {
                    console.log(`Vertical scan progress: ${Math.round((i+1)/elevationPoints*100)}%`);
                }
            }
        
            // Calculate 3D radiation pattern
            console.log('Calculating 3D radiation pattern...');
            let totalPoints = Math.ceil(360/angleStep) * Math.ceil(180/angleStep);
            let pointsProcessed = 0;
            
            for (let az = 0; az < 360; az += angleStep) {
                for (let el = 0; el <= 180; el += angleStep) {
                    let gain = 0;
                    try {
                        // Calculate gain for all directions using NEC2C engine
                        const gainResult = await this.engine.calculateRadiationPattern(az, el);
                        // Normalize using maximum gain (0-1 range)
                        gain = Math.pow(10, (gainResult.gain - maxGain) / 20);
                    } catch (error) {
                        console.error(`Error calculating radiation pattern at azimuth ${az} degrees, elevation ${el} degrees:`, error);
                    }
                    
                    // Convert spherical coordinates to Cartesian coordinates
                    const r = gain;
                    const phi = az * Math.PI / 180;
                    const theta = el * Math.PI / 180;
                    
                    const x = r * Math.sin(theta) * Math.cos(phi);
                    const y = r * Math.sin(theta) * Math.sin(phi);
                    const z = r * Math.cos(theta);
                    
                    pattern.data3D.push({
                        x, y, z,
                        gain,
                        azimuth: az,
                        elevation: el
                    });
                    
                    pointsProcessed++;
                    if (pointsProcessed % 50 === 0 || pointsProcessed === totalPoints) {
                        console.log(`3D pattern progress: ${Math.round(pointsProcessed/totalPoints*100)}%`);
                    }
                }
            }
        
            console.log('Radiation pattern calculation completed successfully');
            return pattern;
        } catch (error) {
            console.error('Error during radiation pattern calculation:', error);
            return {
                error: 'Radiation pattern calculation failed: ' + error.message,
                azimuth: [],
                elevation: [],
                data3D: [],
                success: false
            };
        }
    }

    /**
     * Calculate VSWR from impedance
     * @param {object} impedance Complex impedance {r, x}
     * @param {number} z0 Reference impedance (typically 50 ohms)
     * @returns {number} VSWR value
     */
    calculateVSWR(impedance, z0 = 50) {
        // Support both naming conventions (r/x and resistance/reactance)
        const r = impedance.r !== undefined ? impedance.r : impedance.resistance || 0;
        const x = impedance.x !== undefined ? impedance.x : impedance.reactance || 0;
        
        // Calculate reflection coefficient magnitude using the correct formula for complex impedance
        // For complex impedance Z1 = r + jx and Z0 = z0 (real), the reflection coefficient Γ is:
        // Γ = (Z1 - Z0) / (Z1 + Z0) = ((r - z0) + jx) / ((r + z0) + jx)
        // |Γ| = |Z1 - Z0| / |Z1 + Z0| = sqrt((r-z0)² + x²) / sqrt((r+z0)² + x²)
        
        // Calculate numerator: |Z1 - Z0| = sqrt((r-z0)² + x²)
        const numerator = Math.sqrt(Math.pow(r - z0, 2) + Math.pow(x, 2));
        
        // Calculate denominator: |Z1 + Z0| = sqrt((r+z0)² + x²)
        const denominator = Math.sqrt(Math.pow(r + z0, 2) + Math.pow(x, 2));
        
        // Calculate reflection coefficient magnitude |Γ| = |Z1 - Z0| / |Z1 + Z0|
        const reflectionCoeff = denominator !== 0 ? numerator / denominator : 1;
        
        // Calculate VSWR from reflection coefficient: VSWR = (1 + |Γ|) / (1 - |Γ|)
        // Prevent division by zero and handle edge cases
        if (reflectionCoeff >= 0.9999) {
            return 999; // Practically infinite VSWR (avoid actual infinity)
        }
        
        const vswr = (1 + reflectionCoeff) / (1 - reflectionCoeff);
        return vswr;
    }
}
