/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Antenna Calculator Module
 * 
 * This module handles the antenna performance calculations including gain,
 * front-to-back ratio, impedance, and radiation pattern calculations.
 * It implements simplified models and can be extended to use a more
 * sophisticated NEC engine for accurate simulations.
 */

export class AntennaCalculator {
    constructor() {
        // Speed of light in free space (mm/s)
        this.c = 299792458 * 1000;
        
        // Reference impedance for VSWR calculations
        this.referenceImpedance = 50; // ohms
    }

    /**
     * Calculate antenna performance at a specific frequency
     * @param {object} antennaModel The antenna model to analyze
     * @param {number} frequency Optional specific frequency (MHz), defaults to center frequency
     * @returns {object} Results including gain, F/B ratio, impedance, VSWR, etc.
     */
    async calculateAntennaPerformance(antennaModel, frequency = null) {
        // Use model center frequency if not specified
        const freq = frequency || antennaModel.centerFrequency;
        
        // This is a placeholder for future NEC integration
        // For now, we'll use simplified approximation models
        
        // Calculate wavelength in mm
        const wavelength = this.c / (freq * 1000000);
        
        // Check if we have valid elements
        if (antennaModel.elements.length === 0) {
            return {
                gain: 0,
                fbRatio: 0,
                impedance: { r: 0, x: 0 },
                vswr: 999,
                beamwidth: 360
            };
        }
        
        // Sort elements by position to ensure proper analysis
        const elements = [...antennaModel.elements].sort((a, b) => a.position - b.position);
        
        // Element spacing relative to driven element (in wavelengths)
        const drivenIndex = elements.findIndex(el => el.type === 'driven');
        if (drivenIndex === -1) {
            return { error: 'No driven element found' };
        }
        
        const drivenPos = elements[drivenIndex].position;
        const spacings = elements.map(el => (el.position - drivenPos) / wavelength);
        
        // Element lengths in wavelengths
        const lengths = elements.map(el => el.length / wavelength);
        
        // Calculate gain using approximation formulas
        // This is a simplified model - for more accuracy we'll use NEC engine
        let gain = 7.8; // Base gain for 3-element Yagi
        
        // Additional gain from directors (diminishing returns)
        const directorCount = elements.filter(el => el.type === 'director').length;
        if (directorCount > 0) {
            // First director contributes ~2 dB, with diminishing returns for additional directors
            gain += 2 * Math.sqrt(directorCount);
        }
        
        // Calculate front-to-back ratio
        // This is a simplified approximation
        let fbRatio = 12;  // Base value for simple Yagi
        
        if (directorCount > 0) {
            fbRatio += 3 * Math.log2(directorCount + 1);
        }
        
        // Reflector spacing affects F/B ratio
        const reflectorIndex = elements.findIndex(el => el.type === 'reflector');
        if (reflectorIndex !== -1) {
            const reflectorSpacing = Math.abs(spacings[reflectorIndex]);
            
            // Optimal reflector spacing is typically 0.15-0.25 wavelengths
            if (reflectorSpacing >= 0.15 && reflectorSpacing <= 0.25) {
                fbRatio += 8;
            } else if (reflectorSpacing > 0 && reflectorSpacing < 0.4) {
                // Less optimal spacing
                fbRatio += 3;
            }
        }
        
        // Calculate impedance (simplified model)
        // In reality, this depends on complex mutual coupling between elements
        let impedance = { r: 50, x: 0 }; // Start with ideal case
        
        // Adjust based on driven element length
        const drivenLength = lengths[drivenIndex];
        if (drivenLength > 0.46 && drivenLength < 0.49) {
            // Near resonance for a half-wave dipole
            impedance.r = 67;
            impedance.x = (drivenLength - 0.475) * 1000; // approximation for reactance
        } else if (drivenLength >= 0.49 && drivenLength <= 0.51) {
            // Very close to resonance
            impedance.r = 73;
            impedance.x = (drivenLength - 0.5) * 600;
        } else {
            // Away from resonance
            impedance.r = 50;
            impedance.x = (drivenLength - 0.475) * 1500;
        }
        
        // Director spacing affects impedance
        if (directorCount > 0) {
            // Directors typically lower the impedance
            impedance.r -= 5 * Math.min(3, directorCount);
        }
        
        // Calculate VSWR based on impedance
        const vswr = this.calculateVSWR(impedance, this.referenceImpedance);
        
        // Calculate beamwidth (approximation)
        let beamwidth = 60;  // Base value for a typical Yagi
        
        // More directors = narrower beam
        if (directorCount > 0) {
            beamwidth -= 5 * Math.sqrt(directorCount);
        }
        
        // Longer antennas have narrower beamwidths
        beamwidth = Math.max(20, beamwidth); // limit minimum beamwidth
        
        // Return all calculated values
        return {
            gain,
            fbRatio,
            impedance,
            vswr,
            beamwidth,
            frequency: freq
        };
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
        const results = {
            frequencies: [],
            gains: [],
            fbRatios: [],
            vswrs: [],
            impedances: []
        };
        
        // Generate frequency points
        const freqStep = (endFreq - startFreq) / (steps - 1);
        
        for (let i = 0; i < steps; i++) {
            const frequency = startFreq + (freqStep * i);
            results.frequencies.push(frequency);
            
            // Calculate performance at this frequency
            const perfResult = await this.calculateAntennaPerformance(antennaModel, frequency);
            
            // Store results
            results.gains.push(perfResult.gain);
            results.fbRatios.push(perfResult.fbRatio);
            results.vswrs.push(perfResult.vswr);
            results.impedances.push(perfResult.impedance);
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
        // Calculate max gain for normalization
        const perfResult = await this.calculateAntennaPerformance(antennaModel, frequency);
        const maxGain = perfResult.gain;
        const wavelength = this.c / (frequency * 1000000);
        
        // Create arrays to store pattern data
        const azimuthPoints = Math.ceil(360 / angleStep);
        const elevationPoints = Math.ceil(180 / angleStep) + 1;
        
        const pattern = {
            azimuth: new Array(azimuthPoints),       // Horizontal plane (0-360°)
            elevation: new Array(elevationPoints),   // Vertical plane (0-180°)
            data3D: []                               // Full 3D pattern
        };
        
        // Sort elements by position
        const elements = [...antennaModel.elements].sort((a, b) => a.position - b.position);
        
        // Element positions in wavelengths
        const positions = elements.map(el => el.position / wavelength);
        
        // Calculate azimuth pattern (horizontal plane)
        for (let i = 0; i < azimuthPoints; i++) {
            const azimuth = i * angleStep;
            pattern.azimuth[i] = this.calculatePatternGain(azimuth, 90, elements, positions, wavelength, maxGain);
        }
        
        // Calculate elevation pattern (vertical plane along main beam)
        for (let i = 0; i < elevationPoints; i++) {
            const elevation = i * angleStep;
            pattern.elevation[i] = this.calculatePatternGain(0, elevation, elements, positions, wavelength, maxGain);
        }
        
        // Calculate full 3D pattern
        for (let az = 0; az < 360; az += angleStep) {
            for (let el = 0; el <= 180; el += angleStep) {
                const gain = this.calculatePatternGain(az, el, elements, positions, wavelength, maxGain);
                
                // Convert to 3D coordinates using spherical to cartesian conversion
                // r = gain, theta = elevation, phi = azimuth
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
     * Calculate radiation pattern gain at a specific direction
     * @param {number} azimuth Azimuth angle in degrees
     * @param {number} elevation Elevation angle in degrees
     * @param {array} elements Array of antenna elements
     * @param {array} positions Array of element positions in wavelengths
     * @param {number} wavelength Wavelength in mm
     * @param {number} maxGain Maximum gain for normalization
     * @returns {number} Normalized gain (0-1)
     */
    calculatePatternGain(azimuth, elevation, elements, positions, wavelength, maxGain) {
        // Convert angles to radians
        const azRad = azimuth * Math.PI / 180;
        const elRad = elevation * Math.PI / 180;
        
        // Reference to the first element position
        const refPos = positions[0];
        
        // Simplify for now - use array factor calculation
        // This is a basic approximation - future versions will use NEC for accuracy
        
        // Each element has a relative amplitude and phase
        const amplitudes = elements.map(el => {
            if (el.type === 'reflector') return 0.7;
            if (el.type === 'driven') return 1.0;
            if (el.type === 'director') return 0.6;
            return 0.5;
        });
        
        // Phase is affected by element position and excitation
        const phases = elements.map((el, idx) => {
            // Forward direction is at azimuth = 0
            if (el.type === 'driven') return 0;
            if (el.type === 'reflector') return -30 * Math.PI / 180; // arbitrary phase lag for reflector
            return 0; // directors are in phase with driven element in this simplified model
        });
        
        // Calculate array factor
        let realSum = 0;
        let imagSum = 0;
        
        for (let i = 0; i < elements.length; i++) {
            // Phase difference due to position and direction
            const posDiff = positions[i] - refPos;
            const phaseDiff = 2 * Math.PI * posDiff * Math.cos(azRad) * Math.sin(elRad);
            
            // Total phase including element excitation
            const totalPhase = phaseDiff + phases[i];
            
            // Add contribution from this element
            realSum += amplitudes[i] * Math.cos(totalPhase);
            imagSum += amplitudes[i] * Math.sin(totalPhase);
        }
        
        // Calculate pattern magnitude
        let magnitude = Math.sqrt(realSum * realSum + imagSum * imagSum);
        
        // Normalize to max gain
        magnitude = Math.pow(magnitude, 2) * (maxGain / 15); // Scale to match max gain
        
        // Ensure back lobes are not too small (more realistic)
        magnitude = Math.max(magnitude, 0.05);
        
        // Scale to 0-1 range for visualization
        return magnitude;
    }

    /**
     * Calculate VSWR from impedance
     * @param {object} impedance Complex impedance {r, x}
     * @param {number} z0 Reference impedance (typically 50 ohms)
     * @returns {number} VSWR value
     */
    calculateVSWR(impedance, z0) {
        // Calculate reflection coefficient (Γ)
        const numerator = Math.sqrt(
            Math.pow(impedance.r - z0, 2) + Math.pow(impedance.x, 2)
        );
        const denominator = Math.sqrt(
            Math.pow(impedance.r + z0, 2) + Math.pow(impedance.x, 2)
        );
        
        const gamma = numerator / denominator;
        
        // Calculate VSWR from reflection coefficient
        const vswr = (1 + gamma) / (1 - gamma);
        
        return vswr;
    }
}
