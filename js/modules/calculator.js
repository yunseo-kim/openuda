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
            this.engine = new NEC2Engine(true, () => {
                this.isReady = true;
                console.log('NEC2C engine initialization complete');
            });
        } catch (error) {
            console.error('NEC2C engine initialization failed:', error);
        }
    }
    
    /**
     * Wait until the engine is ready
     * @private
     */
    async _waitForEngine() {
        if (this.isReady) return;
        
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (this.isReady) {
                    clearInterval(checkInterval);
                    resolve();
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
        // Wait for the engine to be ready
        await this._waitForEngine();
        
        // Use model center frequency (if not specified)
        const freq = frequency || antennaModel.centerFrequency;
        
        // Return default values if there are no elements
        if (!antennaModel.elements || antennaModel.elements.length === 0) {
            return {
                gain: 0,
                fbRatio: 0,
                impedance: { r: 0, x: 0 },
                vswr: 999,
                beamwidth: 360,
                frequency: freq
            };
        }
        
        try {
            // Convert antenna model to NEC2 format
            const necModel = this._convertModelToNEC(antennaModel, freq);
            
            // Initialize NEC2 engine
            await this.engine.reset();
            
            // Add elements
            for (const element of necModel.elements) {
                // Driven element is centered, others extend half length in both directions
                const halfLength = element.length / 2;
                
                await this.engine.addWireSegment(
                    element.position, -halfLength, 0,  // Start point (x, y, z)
                    element.position, halfLength, 0,   // End point (x, y, z)
                    element.diameter / 2,              // Radius
                    Math.max(3, Math.floor(element.length / 100)) // Number of segments (minimum 3)
                );
            }
            
            // Add feed point to driven element
            const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
            if (drivenIndex !== -1) {
                const drivenElement = necModel.elements[drivenIndex];
                // Add feed point to the center of the driven element (card 5)
                await this.engine.addExcitation(drivenIndex + 1, Math.floor(Math.max(3, Math.floor(drivenElement.length / 100)) / 2));
            }
            
            // Set frequency
            await this.engine.setFrequency(freq);
            
            // Run analysis
            const result = await this.engine.runAnalysis();
            
            // Extract impedance
            const impedance = {
                r: result.impedance.resistance,
                x: result.impedance.reactance
            };
            
            // Calculate VSWR
            const vswr = this.calculateVSWR(result.impedance);
            
            // Return results
            return {
                gain: result.gain,
                fbRatio: result.fbRatio,
                impedance: impedance,
                vswr: vswr,
                beamwidth: this._calculateBeamwidth(result),
                frequency: freq
            };
        } catch (error) {
            console.error('Error calculating antenna performance:', error);
            return {
                error: 'Simulation failed: ' + error.message,
                frequency: freq
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
        // Wait for the engine to be ready
        await this._waitForEngine();
        
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
        await this.engine.reset();
        
        // 요소 추가
        for (const element of necModel.elements) {
            const halfLength = element.length / 2;
            await this.engine.addWireSegment(
                element.position, -halfLength, 0,  // Start point (x, y, z)
                element.position, halfLength, 0,   // End point (x, y, z)
                element.diameter / 2,              // Radius
                Math.max(3, Math.floor(element.length / 100)) // Number of segments (minimum 3)
            );
        }
        
        // Add feed point to driven element
        const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
        if (drivenIndex !== -1) {
            const drivenElement = necModel.elements[drivenIndex];
            // Add feed point to the center of the driven element (card 5)
            await this.engine.addExcitation(drivenIndex + 1, Math.floor(Math.max(3, Math.floor(drivenElement.length / 100)) / 2));
        }
        
        // Create frequency points
        const freqStep = (endFreq - startFreq) / (steps - 1);
        
        // Calculate performance at each frequency
        for (let i = 0; i < steps; i++) {
            const frequency = startFreq + (freqStep * i);
            results.frequencies.push(frequency);
            
            try {
                // Set frequency (keeping the same geometry)
                await this.engine.setFrequency(frequency);
                
                // Run analysis
                const result = await this.engine.runAnalysis();
                
                // Extract impedance
                const impedance = {
                    r: result.impedance.resistance,
                    x: result.impedance.reactance
                };
                
                // Calculate VSWR
                const vswr = this.calculateVSWR(impedance);
                
                // Store results
                results.gains.push(result.gain);
                results.fbRatios.push(result.fbRatio);
                results.vswrs.push(vswr);
                results.impedances.push(impedance);
            } catch (error) {
                console.error(`Error calculating at frequency ${frequency}MHz:`, error);
                
                // Add default values in case of error
                results.gains.push(0);
                results.fbRatios.push(0);
                results.vswrs.push(999);
                results.impedances.push({ r: 0, x: 0 });
            }
        }
        
        return results;
    }

    /**
     * Calculate 3D radiation pattern
     * @param {object} antennaModel The antenna model to analyze
     * @param {number} frequency Frequency in MHz
     * @param {number} angleStep Step size for calculation in degrees
     * @returns {object} Radiation pattern data in 3D coordinates
     */
    async calculateRadiationPattern(antennaModel, frequency, angleStep = 5) {
        // Wait for the engine to be ready
        await this._waitForEngine();

        // Convert antenna model to NEC2 format
        const necModel = this._convertModelToNEC(antennaModel, frequency);
        
        // Initialize engine and set up model
        await this.engine.reset();
        
        // Add wire segments
        for (const element of necModel.elements) {
            const halfLength = element.length / 2;
            await this.engine.addWireSegment(
                element.position, -halfLength, 0,  // Start point (x, y, z)
                element.position, halfLength, 0,   // End point (x, y, z)
                element.diameter / 2,              // Radius
                Math.max(3, Math.floor(element.length / 100)) // Number of segments
            );
        }
        
        // Add feed point to driven element
        const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
        if (drivenIndex !== -1) {
            const drivenElement = necModel.elements[drivenIndex];
            // Add feed point to the center of the driven element
            await this.engine.addExcitation(drivenIndex + 1, Math.floor(Math.max(3, Math.floor(drivenElement.length / 100)) / 2));
        }
        
        // Set frequency
        await this.engine.setFrequency(frequency);
        
        // Run basic analysis to find maximum gain
        const baseResult = await this.engine.runAnalysis();
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
        }
        
        // Calculate vertical plane (elevation) pattern (azimuth 0 degrees)
        for (let i = 0; i < elevationPoints; i++) {
            const elevation = i * angleStep;
            try {
                const gainResult = await this.engine.calculateRadiationPattern(0, elevation);
                pattern.elevation[i] = Math.pow(10, (gainResult.gain - maxGain) / 20);
            } catch (error) {
                console.error(`Error calculating radiation pattern at elevation ${elevation} degrees:`, error);
                pattern.elevation[i] = 0;
            }
        }
        
        // Calculate 3D radiation pattern
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
            }
        }
        
        return pattern;
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
