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
                console.log('NEC2C 엔진 초기화 완료');
            });
        } catch (error) {
            console.error('NEC2C 엔진 초기화 실패:', error);
        }
    }
    
    /**
     * 엔진이 준비될 때까지 기다립니다
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
        // 엔진이 준비될 때까지 기다림
        await this._waitForEngine();
        
        // 모델 중앙 주파수 사용(지정되지 않은 경우)
        const freq = frequency || antennaModel.centerFrequency;
        
        // 요소가 없는 경우 기본값 반환
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
            // 안테나 모델을 NEC2 형식으로 변환
            const necModel = this._convertModelToNEC(antennaModel, freq);
            
            // NEC2 엔진 초기화
            await this.engine.reset();
            
            // 요소 추가
            for (const element of necModel.elements) {
                // 구동 요소는 중앙에 위치, 나머지는 길이의 절반씩 양쪽으로
                const halfLength = element.length / 2;
                
                await this.engine.addWireSegment(
                    element.position, -halfLength, 0,  // 시작점 (x, y, z)
                    element.position, halfLength, 0,   // 끝점 (x, y, z)
                    element.diameter / 2,              // 반지름
                    Math.max(3, Math.floor(element.length / 100)) // 세그먼트 수 (최소 3)
                );
            }
            
            // 구동 요소에 급전점 추가
            const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
            if (drivenIndex !== -1) {
                const drivenElement = necModel.elements[drivenIndex];
                // 드라이븐 요소의 중앙에 급전점 추가 (카드 5)
                await this.engine.addExcitation(drivenIndex + 1, Math.floor(Math.max(3, Math.floor(drivenElement.length / 100)) / 2));
            }
            
            // 주파수 설정
            await this.engine.setFrequency(freq);
            
            // 분석 실행
            const result = await this.engine.runAnalysis();
            
            // 임피던스 추출
            const impedance = {
                r: result.impedance.resistance,
                x: result.impedance.reactance
            };
            
            // VSWR 계산
            const vswr = this._calculateVSWR(result.impedance);
            
            // 결과 반환
            return {
                gain: result.gain,
                fbRatio: result.fbRatio,
                impedance: impedance,
                vswr: vswr,
                beamwidth: this._calculateBeamwidth(result),
                frequency: freq
            };
        } catch (error) {
            console.error('안테나 성능 계산 중 오류:', error);
            return {
                error: '시뮬레이션 실패: ' + error.message,
                frequency: freq
            };
        }
    }
    
    /**
     * 임피던스로부터 VSWR 계산
     * @private
     * @param {object} impedance r과 x 속성을 가진 객체 (복소 임피던스)
     * @param {number} z0 기준 임피던스 (일반적으로 50 옴)
     * @returns {number} VSWR 값
     */
    _calculateVSWR(impedance, z0 = 50) {
        const r = impedance.resistance;
        const x = impedance.reactance;
        
        // 반사 계수 (크기) 계산
        const z = Math.sqrt(r * r + x * x);
        const reflectionCoeff = Math.abs((z - z0) / (z + z0));
        
        // 반사 계수에서 VSWR 계산
        // 0으로 나누기 방지
        if (reflectionCoeff === 1) {
            return 999; // 사실상 무한대 VSWR
        }
        
        const vswr = (1 + reflectionCoeff) / (1 - reflectionCoeff);
        return vswr;
    }
    
    /**
     * 대략적인 빔폭 계산
     * @private
     * @param {object} result 시뮬레이션 결과
     * @returns {number} 대략적인 빔폭 (도)
     */
    _calculateBeamwidth(result) {
        // 이득에 기반한 대략적인 빔폭
        const gain = result.gain;
        
        // 이득이 높을수록 빔폭이 좁아짐
        // 대략적인 공식: beamwidth ≈ 70 / sqrt(gain)
        let beamwidth = 70 / Math.sqrt(Math.pow(10, gain / 10));
        
        // 합리적인 범위로 제한
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
        // 엔진이 준비될 때까지 기다림
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
                element.position, -halfLength, 0,  // 시작점 (x, y, z)
                element.position, halfLength, 0,   // 끝점 (x, y, z)
                element.diameter / 2,              // 반지름
                Math.max(3, Math.floor(element.length / 100)) // 세그먼트 수 (최소 3)
            );
        }
        
        // 구동 요소에 급전점 추가
        const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
        if (drivenIndex !== -1) {
            const drivenElement = necModel.elements[drivenIndex];
            // 드라이븐 요소의 중앙에 급전점 추가 (카드 5)
            await this.engine.addExcitation(drivenIndex + 1, Math.floor(Math.max(3, Math.floor(drivenElement.length / 100)) / 2));
        }
        
        // 주파수 포인트 생성
        const freqStep = (endFreq - startFreq) / (steps - 1);
        
        // 각 주파수에서 성능 계산
        for (let i = 0; i < steps; i++) {
            const frequency = startFreq + (freqStep * i);
            results.frequencies.push(frequency);
            
            try {
                // 주파수 설정 (형상은 동일하게 유지)
                await this.engine.setFrequency(frequency);
                
                // 분석 실행
                const result = await this.engine.runAnalysis();
                
                // 임피던스 추출
                const impedance = {
                    r: result.impedance.resistance,
                    x: result.impedance.reactance
                };
                
                // VSWR 계산
                const vswr = this._calculateVSWR(impedance);
                
                // 결과 저장
                results.gains.push(result.gain);
                results.fbRatios.push(result.fbRatio);
                results.vswrs.push(vswr);
                results.impedances.push(impedance);
            } catch (error) {
                console.error(`주파수 ${frequency}MHz에서 계산 중 오류:`, error);
                
                // 오류 발생 시 기본값 추가
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
        // 엔진이 준비될 때까지 기다림
        await this._waitForEngine();

        // 안테나 모델을 NEC2 형식으로 변환
        const necModel = this._convertModelToNEC(antennaModel, frequency);
        
        // 엔진 초기화 및 모델 설정
        await this.engine.reset();
        
        // 와이어 세그먼트 추가
        for (const element of necModel.elements) {
            const halfLength = element.length / 2;
            await this.engine.addWireSegment(
                element.position, -halfLength, 0,  // 시작점 (x, y, z)
                element.position, halfLength, 0,   // 끝점 (x, y, z)
                element.diameter / 2,              // 반지름
                Math.max(3, Math.floor(element.length / 100)) // 세그먼트 수
            );
        }
        
        // 구동 요소에 급전점 추가
        const drivenIndex = necModel.elements.findIndex(el => el.type === 'driven');
        if (drivenIndex !== -1) {
            const drivenElement = necModel.elements[drivenIndex];
            // 드라이븐 요소의 중앙에 급전점 추가
            await this.engine.addExcitation(drivenIndex + 1, Math.floor(Math.max(3, Math.floor(drivenElement.length / 100)) / 2));
        }
        
        // 주파수 설정
        await this.engine.setFrequency(frequency);
        
        // 기본 분석 실행하여 최대 이득 확인
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
        
        // 각 방향에 대해 방사 패턴 계산
        
        // 수평면(azimuth) 패턴 계산 (고도 90도)
        for (let i = 0; i < azimuthPoints; i++) {
            const azimuth = i * angleStep;
            try {
                // NEC2C 엔진으로 특정 방향의 이득 계산
                const gainResult = await this.engine.calculateRadiationPattern(azimuth, 90);
                // 최대 이득으로 정규화 (0-1 범위)
                pattern.azimuth[i] = Math.pow(10, (gainResult.gain - maxGain) / 20);
            } catch (error) {
                console.error(`방위각 ${azimuth}도에서 방사 패턴 계산 중 오류:`, error);
                pattern.azimuth[i] = 0; // 오류 시 0으로 설정
            }
        }
        
        // 수직면(elevation) 패턴 계산 (방위각 0도)
        for (let i = 0; i < elevationPoints; i++) {
            const elevation = i * angleStep;
            try {
                const gainResult = await this.engine.calculateRadiationPattern(0, elevation);
                pattern.elevation[i] = Math.pow(10, (gainResult.gain - maxGain) / 20);
            } catch (error) {
                console.error(`고도 ${elevation}도에서 방사 패턴 계산 중 오류:`, error);
                pattern.elevation[i] = 0;
            }
        }
        
        // 3D 방사 패턴 계산
        for (let az = 0; az < 360; az += angleStep) {
            for (let el = 0; el <= 180; el += angleStep) {
                let gain = 0;
                try {
                    // NEC2C 엔진으로 모든 방향에 대한 이득 계산
                    const gainResult = await this.engine.calculateRadiationPattern(az, el);
                    // 최대 이득으로 정규화 (0-1 범위)
                    gain = Math.pow(10, (gainResult.gain - maxGain) / 20);
                } catch (error) {
                    console.error(`방위각 ${az}도, 고도 ${el}도에서 방사 패턴 계산 중 오류:`, error);
                }
                
                // 구형 좌표계를 직교 좌표계로 변환
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
     * @deprecated 이 메서드는 더 이상 사용되지 않으며 NEC2C 엔진이 직접 방사 패턴을 계산합니다.
     */
    calculatePatternGain(azimuth, elevation, elements, positions, wavelength, maxGain) {
        console.warn('calculatePatternGain은 더 이상 사용되지 않으며, NEC2C 엔진이 직접 방사 패턴을 계산합니다.');
        return 0;
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
