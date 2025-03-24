/**
 * NEC-2 Web Worker
 * This worker runs the NEC-2 WebAssembly module in a separate thread
 * 
 * 멀티스레딩 및 SIMD 벡터화 최적화 지원
 * 유전 알고리즘 기반 안테나 최적화 병렬 처리 지원
 */

let necModule = null;
let isReady = false;
let isOptimized = false;
let modulePath = '';

// 유전 알고리즘 파라미터
const GA_CONFIG = {
    populationSize: 30,
    maxGenerations: 20,
    mutationRate: 0.15,
    crossoverRate: 0.8,
    elitism: 2 // 최상위 개체 보존 수
};

// 병렬 시뮬레이션 관리
let simulationQueue = [];
let isSimulating = false;

// 메인 스레드에서 오는 메시지 처리
self.onmessage = async function(event) {
    const data = event.data;
    
    try {
        switch (data.type) {
            case 'init':
                // WebAssembly 모듈 초기화
                modulePath = data.modulePath || './nec2_direct.js';
                await initializeModule();
                break;
            
        case 'addWireSegment':
            if (!checkReady(data.callbackId)) return;
            
            const segResult = necModule.ccall(
                'nec2_add_wire_segment',
                'number',
                ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
                [
                    data.params.x1, 
                    data.params.y1, 
                    data.params.z1, 
                    data.params.x2, 
                    data.params.y2, 
                    data.params.z2, 
                    data.params.radius, 
                    data.params.segments
                ]
            );
            
            postResult(data.callbackId, segResult);
            break;
            
        case 'setFrequency':
            if (!checkReady(data.callbackId)) return;
            
            const freqResult = necModule.ccall(
                'nec2_set_frequency',
                'number',
                ['number'],
                [data.params.freqMhz]
            );
            
            postResult(data.callbackId, freqResult);
            break;
            
        case 'calculateRadiationPattern':
            if (!checkReady(data.callbackId)) return;
            
            const patternResult = necModule.ccall(
                'nec2_calculate_radiation_pattern',
                'number',
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [
                    data.params.thetaStart, 
                    data.params.thetaEnd, 
                    data.params.thetaSteps, 
                    data.params.phiStart, 
                    data.params.phiEnd, 
                    data.params.phiSteps
                ]
            );
            
            postResult(data.callbackId, patternResult);
            break;
            
        case 'getGain':
            if (!checkReady(data.callbackId)) return;
            
            const gain = necModule.ccall(
                'nec2_get_gain',
                'number',
                ['number', 'number'],
                [data.params.theta, data.params.phi]
            );
            
            postResult(data.callbackId, gain);
            break;
            
        case 'calculateImpedance':
            if (!checkReady(data.callbackId)) return;
            
            const resistancePtr = necModule._malloc(8); // double
            const reactancePtr = necModule._malloc(8); // double
            
            const impedanceResult = necModule.ccall(
                'nec2_calculate_impedance',
                'number',
                ['number', 'number'],
                [resistancePtr, reactancePtr]
            );
            
            const resistance = necModule.getValue(resistancePtr, 'double');
            const reactance = necModule.getValue(reactancePtr, 'double');
            
            necModule._free(resistancePtr);
            necModule._free(reactancePtr);
            
            postResult(data.callbackId, { 
                resistance, 
                reactance, 
                status: impedanceResult 
            });
            break;
            
        case 'runAnalysis':
            if (!checkReady(data.callbackId)) return;
            
            const gainPtr = necModule._malloc(8); // double
            const fbRatioPtr = necModule._malloc(8); // double
            const resistancePtr = necModule._malloc(8); // double
            const reactancePtr = necModule._malloc(8); // double
            
            const analysisResult = necModule.ccall(
                'nec2_run_analysis',
                'number',
                ['number', 'number', 'number', 'number'],
                [gainPtr, fbRatioPtr, resistancePtr, reactancePtr]
            );
            
            const gain = necModule.getValue(gainPtr, 'double');
            const fbRatio = necModule.getValue(fbRatioPtr, 'double');
            const resistance = necModule.getValue(resistancePtr, 'double');
            const reactance = necModule.getValue(reactancePtr, 'double');
            
            necModule._free(gainPtr);
            necModule._free(fbRatioPtr);
            necModule._free(resistancePtr);
            necModule._free(reactancePtr);
            
            // Calculate VSWR assuming 50 ohm reference impedance
            const z0 = 50.0;
            const z = Math.sqrt(resistance * resistance + reactance * reactance);
            const rho = Math.abs((z - z0) / (z + z0));
            const vswr = (1 + rho) / (1 - rho);
            
            postResult(data.callbackId, {
                gain,
                fbRatio,
                vswr,
                impedance: { resistance, reactance },
                status: analysisResult
            });
            break;
            
        case 'runSimulation':
                if (!checkReady(data.callbackId)) return;
                
                // NEC2 입력 파일 생성 및 시뮬레이션 실행
                try {
                    const result = await runNEC2Simulation(data.options);
                    postResult(data.callbackId, result);
                } catch (error) {
                    postError(data.callbackId, error.message);
                }
                break;
                
            case 'runParallelSimulations':
                if (!checkReady(data.callbackId)) return;
                
                // 병렬 시뮬레이션 실행 (유전 알고리즘용)
                try {
                    const results = await runParallelSimulations(data.designs);
                    postResult(data.callbackId, results);
                } catch (error) {
                    postError(data.callbackId, error.message);
                }
                break;
                
            case 'optimizeAntenna':
                if (!checkReady(data.callbackId)) return;
                
                // 유전 알고리즘 기반 안테나 최적화
                try {
                    const result = await runGeneticOptimization(data.params);
                    postResult(data.callbackId, result);
                } catch (error) {
                    postError(data.callbackId, error.message);
                }
                break;
                
            case 'cleanup':
                // 리소스 정리
                if (isReady && necModule) {
                    try {
                        // 가상 파일 시스템 내 불필요한 파일 정리
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
 * NEC-2 WebAssembly 모듈 초기화
 * ES 모듈 형식으로 가져오기
 */
async function initializeModule() {
    try {
        // 동적 모듈 임포트 (importScripts 대신 ES 모듈 사용)
        const moduleUrl = new URL(modulePath, self.location.href).href;
        const module = await import(moduleUrl);
        const moduleClass = module.default;
        
        if (!moduleClass) {
            throw new Error(`모듈 클래스를 찾을 수 없습니다: ${modulePath}`);
        }
        
        // 모듈 초기화
        console.log('NEC2 WebAssembly 모듈 초기화 중...');
        necModule = await moduleClass();
        
        // SIMD 지원 확인
        isOptimized = typeof WebAssembly.validate === 'function' && 
            WebAssembly.validate(new Uint8Array([
                0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60,
                0x00, 0x01, 0x7b, 0x03, 0x02, 0x01, 0x00, 0x07, 0x08, 0x01, 0x04, 0x74,
                0x65, 0x73, 0x74, 0x00, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0f,
                0x00, 0x00, 0x00, 0x00, 0x0b
            ]));
        
        // NEC2 메인 프로그램이 직접 main() 함수를 호출하므로 별도의 초기화 함수 호출 불필요
        isReady = true;
        
        // 준비 완료 알림
        self.postMessage({ 
            type: 'ready',
            optimized: isOptimized,
            success: isReady
        });
        
        console.log(`NEC2 엔진 초기화 완료 (최적화: ${isOptimized ? '사용' : '미사용'})`);
    } catch (error) {
        console.error('워커에서 NEC2 모듈 초기화 실패:', error);
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
 * 결과를 메인 스레드로 전송
 * @param {string} callbackId - 콜백 ID
 * @param {*} result - 결과 데이터
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
 * 오류를 메인 스레드로 전송
 * @param {string} callbackId - 콜백 ID
 * @param {string} errorMessage - 오류 메시지
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
 * NEC2 입력 파일을 생성합니다.
 * @param {Object} options - 시뮬레이션 옵션
 * @returns {string} NEC2 입력 파일 내용
 */
function generateNEC2Input(options) {
    const lines = [];
    
    // 주석 카드
    lines.push('CM NEC2 Input File Generated by OpenUda');
    lines.push(`CM Frequency: ${options.frequency || 300} MHz`);
    
    // 와이어 카드
    if (options.wires && Array.isArray(options.wires)) {
        options.wires.forEach((wire, index) => {
            // GW tag segments x1 y1 z1 x2 y2 z2 radius
            lines.push(`GW ${wire.tag || index + 1} ${wire.segments} ${wire.start.x.toFixed(6)} ${wire.start.y.toFixed(6)} ${wire.start.z.toFixed(6)} ${wire.end.x.toFixed(6)} ${wire.end.y.toFixed(6)} ${wire.end.z.toFixed(6)} ${wire.radius.toFixed(6)}`);
        });
    }
    
    // 지오메트리 종료 카드
    lines.push('GE');
    
    // 지면 카드
    const ground = options.ground || { type: 'free' };
    if (ground.type === 'perfect') {
        lines.push('GN 1');
    } else if (ground.type === 'real') {
        lines.push(`GN 0 0 0 0 ${ground.dielectric || 13} ${ground.conductivity || 0.005}`);
    } else { // free space
        lines.push('GN -1');
    }
    
    // 주파수 카드
    lines.push(`FR 0 1 0 0 ${options.frequency || 300}`);
    
    // 급전 카드
    const excitation = options.excitation || { type: 'voltage', segment: 1, tag: 1 };
    lines.push(`EX 0 ${excitation.tag || 1} ${excitation.segment || 1} 0 1 0 0 0 0 0`);
    
    // 방사 패턴 카드
    const pattern = options.pattern || { 
        thetaStart: 0, thetaEnd: 180, thetaSteps: 19,
        phiStart: 0, phiEnd: 360, phiSteps: 37
    };
    const thetaStep = (pattern.thetaEnd - pattern.thetaStart) / (pattern.thetaSteps - 1);
    const phiStep = (pattern.phiEnd - pattern.phiStart) / (pattern.phiSteps - 1);
    
    lines.push(`RP 0 ${pattern.thetaSteps} ${pattern.phiSteps} 0 0 0 0 ${pattern.thetaStart} ${thetaStep} ${pattern.phiStart} ${phiStep}`);
    
    // 종료 카드
    lines.push('EN');
    
    return lines.join('\n');
}

/**
 * NEC2 출력 데이터를 파싱합니다.
 * @param {string} outputData - NEC2 출력 내용
 * @returns {Object} 파싱된 결과
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
        // 에러 메시지 확인
        if (outputData.includes('ERROR')) {
            const errorMatch = outputData.match(/ERROR[^\n]*/g);
            if (errorMatch) {
                result.errors = errorMatch;
            }
        }
        
        // 임피던스 추출
        const impedanceMatch = outputData.match(/IMPEDANCE\s*=\s*(\d+\.\d+)\s*([+-]\s*j\s*\d+\.\d+)/i);
        if (impedanceMatch) {
            result.impedance.resistance = parseFloat(impedanceMatch[1]);
            
            // 리액턴스 부호 처리
            const reactanceStr = impedanceMatch[2].replace(/\s+/g, '');
            if (reactanceStr.includes('+j')) {
                result.impedance.reactance = parseFloat(reactanceStr.replace('+j', ''));
            } else if (reactanceStr.includes('-j')) {
                result.impedance.reactance = -parseFloat(reactanceStr.replace('-j', ''));
            }
        }
        
        // VSWR 계산 (50 ohm 기준)
        const r = result.impedance.resistance;
        const x = result.impedance.reactance;
        const z0 = 50;
        
        const numerator = Math.sqrt((r - z0) ** 2 + x ** 2);
        const denominator = Math.sqrt((r + z0) ** 2 + x ** 2);
        
        if (denominator - numerator !== 0) {
            result.vswr = (numerator + denominator) / (denominator - numerator);
        } else {
            result.vswr = 999; // 무한대 VSWR
        }
        
        // 방사 패턴 데이터 추출
        const patternSection = outputData.match(/RADIATION PATTERNS[\s\S]*?END OF RUN/i);
        if (patternSection) {
            const patternLines = patternSection[0].split('\n');
            let frontGain = null;
            let backGain = null;
            
            for (const line of patternLines) {
                // 이득 데이터 행 형식: THETA PHI ... POWER GAINS...
                const gainMatch = line.match(/^\s*(\d+\.\d+)\s+(\d+\.\d+)\s+.*\s+(\d+\.\d+)\s*$/);
                if (gainMatch) {
                    const theta = parseFloat(gainMatch[1]);
                    const phi = parseFloat(gainMatch[2]);
                    const gainDb = parseFloat(gainMatch[3]);
                    
                    // 최대 이득 업데이트
                    if (gainDb > result.gain.max) {
                        result.gain.max = gainDb;
                    }
                    
                    // 방사 패턴 데이터 저장
                    result.gain.data.push({ theta, phi, gain: gainDb });
                    
                    // 전후방비 계산을 위한 데이터 수집
                    if (Math.abs(theta - 90) < 0.1) {
                        if (Math.abs(phi) < 0.1 || Math.abs(phi - 360) < 0.1) {
                            frontGain = gainDb; // 전방 이득 (90°, 0°)
                        } else if (Math.abs(phi - 180) < 0.1) {
                            backGain = gainDb; // 후방 이득 (90°, 180°)
                        }
                    }
                }
            }
            
            // 전후방비 계산
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
 * NEC2 시뮬레이션을 실행합니다.
 * @param {Object} options - 시뮬레이션 옵션
 * @returns {Promise<Object>} 시뮬레이션 결과
 */
async function runNEC2Simulation(options) {
    if (!isReady || !necModule) {
        throw new Error('NEC2 모듈이 준비되지 않았습니다');
    }
    
    try {
        // NEC2 입력 파일 생성
        const inputData = generateNEC2Input(options);
        
        // 가상 파일 시스템에 입력 파일 작성
        necModule.FS.writeFile('input.nec', inputData);
        
        // NEC2 실행
        const result = necModule.ccall('main', 'number', ['number', 'array'], 
            [4, ['nec2c', '-c', 'input.nec', 'output.nec']]);
        
        if (result !== 0) {
            console.warn(`NEC2 시뮬레이션 리턴 코드: ${result}`);
        }
        
        // 출력 파일 읽기
        let outputData;
        try {
            outputData = necModule.FS.readFile('output.nec', { encoding: 'utf8' });
        } catch (err) {
            console.error('출력 파일 읽기 오류:', err);
            throw new Error('NEC2 출력 파일을 읽을 수 없습니다');
        }
        
        // 결과 파싱 및 반환
        return parseNEC2Output(outputData);
    } catch (error) {
        console.error('NEC2 시뮬레이션 오류:', error);
        throw error;
    }
}

/**
 * 여러 안테나 설계를 병렬로 시뮬레이션합니다.
 * @param {Array<Object>} designs - 안테나 설계 배열
 * @returns {Promise<Array<Object>>} 시뮬레이션 결과 배열
 */
async function runParallelSimulations(designs) {
    if (!Array.isArray(designs) || designs.length === 0) {
        throw new Error('유효한 설계 배열이 필요합니다');
    }
    
    // WebAssembly는 싱글 스레드이므로 실제로는 순차 실행
    // SharedArrayBuffer 접근 충돌 방지를 위해 큐 사용
    const results = [];
    
    // 모든 설계에 대해 시뮬레이션 실행
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
 * 안테나 설계의 적합도를 계산합니다.
 * @param {Object} result - 시뮬레이션 결과
 * @param {Object} goals - 최적화 목표
 * @returns {number} 적합도 점수 (높을수록 좋음)
 */
function calculateFitness(result, goals) {
    // 결과 검증
    if (!result) {
        console.error('시뮬레이션 결과가 없습니다');
        return -999;
    }
    
    // 오류가 있으면 최저 점수 반환
    if (result.errors && result.errors.length > 0) {
        console.warn('시뮬레이션 오류 발견:', result.errors);
        return -999;
    }
    
    try {
        let fitness = 0;
        const weights = goals.weights || {
            gain: 1.0,
            frontToBack: 0.5,
            vswr: 2.0,
            balanced: 1.5 // 균형 잡힌 성능에 대한 가중치
        };
        
        // NaN이나 undefined 값 확인
        if (!result.gain || isNaN(result.gain.max)) {
            console.warn('이득 데이터가 유효하지 않음');
            return -888; // 다른 오류 코드 사용
        }
        
        if (isNaN(result.frontToBackRatio)) {
            console.warn('전후방비 데이터가 유효하지 않음');
            return -888;
        }
        
        if (isNaN(result.vswr)) {
            console.warn('VSWR 데이터가 유효하지 않음');
            return -888;
        }
        
        // 이득 (높을수록 좋음)
        if (goals.includeGain !== false) {
            const gainWeight = weights.gain || 1.0;
            const normalizedGain = Math.min(Math.max(result.gain.max, 0), 15) / 15; // 0~15dBi를 0~1로 정규화
            fitness += gainWeight * normalizedGain * 10; // 스케일링
        }
        
        // 전후방비 (높을수록 좋음)
        if (goals.includeFrontToBack !== false) {
            const fbWeight = weights.frontToBack || 0.5;
            const normalizedFB = Math.min(result.frontToBackRatio, 30) / 30; // 0~30dB를 0~1로 정규화
            fitness += fbWeight * normalizedFB * 10; // 스케일링
        }
        
        // VSWR (낮을수록 좋음, 역변환)
        if (goals.includeVSWR !== false) {
            const vswrWeight = weights.vswr || 2.0;
            let vswrScore;
            
            if (result.vswr <= 1.5) {
                // VSWR이 1.5 이하면 최대 점수
                vswrScore = 1.0;
            } else if (result.vswr <= 3.0) {
                // 1.5~3.0 범위는 선형 감소
                vswrScore = 1.0 - (result.vswr - 1.5) / 1.5;
            } else {
                // 3.0 초과는 매우 낮은 점수
                vswrScore = Math.max(0, 0.5 - (result.vswr - 3.0) / 14.0); // 3~10 범위에서 0.5~0
            }
            
            fitness += vswrWeight * vswrScore * 10; // 스케일링
        }
        
        // 균형 잡힌 성능 (모든 값이 평균 이상이면 보너스)
        if (goals.includeBalanced !== false) {
            const balancedWeight = weights.balanced || 1.5;
            
            // 각 지표가 평균적으로 좋은지 확인
            let balanceScore = 0;
            
            if (result.gain.max >= 8) balanceScore++; // 8dBi 이상
            if (result.frontToBackRatio >= 15) balanceScore++; // 15dB 이상
            if (result.vswr <= 2.0) balanceScore++; // 2.0 이하
            
            // 모든 지표가 평균 이상이면 추가 보너스
            if (balanceScore === 3) {
                balanceScore = 4;
            }
            
            fitness += balancedWeight * (balanceScore / 4) * 10; // 스케일링
        }
        
        // 페널티: 임피던스가 비정상적인 경우
        const impedance = result.impedance;
        if (!impedance || !impedance.resistance) {
            console.warn('임피던스 데이터가 유효하지 않음');
            fitness -= 5; // 약한 페널티
        } else {
            // 임피던스 범위 확인 (10~300 ohm이 적절한 범위)
            if (impedance.resistance < 10 || impedance.resistance > 300) {
                const penalty = Math.min(10, Math.abs(impedance.resistance < 10 ? 
                    10 - impedance.resistance : impedance.resistance - 300) / 10);
                fitness -= penalty;
            }
        }
        
        return fitness;
    } catch (error) {
        console.error('적합도 계산 중 오류 발생:', error);
        return -777; // 다른 오류 코드 사용
    }
}

/**
 * 두 부모 설계로부터 자식 설계를 생성합니다.
 * @param {Object} parent1 - 첫 번째 부모 설계
 * @param {Object} parent2 - 두 번째 부모 설계
 * @param {number} crossoverRate - 교차 확률
 * @param {number} mutationRate - 변이 확률
 * @returns {Object} 자식 설계
 */
function crossoverDesigns(parent1, parent2, crossoverRate, mutationRate) {
    const child = JSON.parse(JSON.stringify(parent1)); // 깊은 복사
    
    // 교차
    if (Math.random() < crossoverRate) {
        // 와이어 요소 교차
        if (child.wires && parent2.wires && child.wires.length === parent2.wires.length) {
            for (let i = 0; i < child.wires.length; i++) {
                // 랜덤하게 부모 선택
                if (Math.random() < 0.5) {
                    child.wires[i] = JSON.parse(JSON.stringify(parent2.wires[i]));
                }
            }
        }
        
        // 주파수 교차
        if (Math.random() < 0.5) {
            child.frequency = parent2.frequency;
        }
    }
    
    // 변이
    if (Math.random() < mutationRate) {
        // 모든 와이어에 대해 변이 적용 기회 부여
        if (child.wires && child.wires.length > 0) {
            for (let i = 0; i < child.wires.length; i++) {
                const wire = child.wires[i];
                
                // 시작점 변이
                if (Math.random() < mutationRate) {
                    wire.start.x += (Math.random() - 0.5) * 0.1;
                    wire.start.y += (Math.random() - 0.5) * 0.1;
                    wire.start.z += (Math.random() - 0.5) * 0.1;
                }
                
                // 끝점 변이
                if (Math.random() < mutationRate) {
                    wire.end.x += (Math.random() - 0.5) * 0.1;
                    wire.end.y += (Math.random() - 0.5) * 0.1;
                    wire.end.z += (Math.random() - 0.5) * 0.1;
                }
                
                // 반지름 변이 (10% 내외)
                if (Math.random() < mutationRate) {
                    wire.radius *= 0.9 + Math.random() * 0.2; // 0.9~1.1 배
                }
                
                // 세그먼트 수 변이
                if (Math.random() < mutationRate) {
                    // 세그먼트 수는 정수여야 함
                    const change = Math.random() < 0.5 ? -1 : 1;
                    wire.segments = Math.max(3, wire.segments + change); // 최소 3개 세그먼트 유지
                }
            }
        }
        
        // 주파수 변이 (5% 내외)
        if (Math.random() < mutationRate) {
            child.frequency *= 0.95 + Math.random() * 0.1; // 0.95~1.05 배
        }
    }
    
    return child;
}

/**
 * 유전 알고리즘을 사용하여 안테나 설계를 최적화합니다.
 * @param {Object} params - 최적화 매개변수
 * @returns {Promise<Object>} 최적화 결과
 */
async function runGeneticOptimization(params) {
    try {
        // 기본 유전 알고리즘 설정으로 GA_CONFIG 사용, 사용자 설정으로 오버라이드
        const config = { ...GA_CONFIG, ...params.gaConfig };
        
        // 설정 검증 및 보정
        if (config.populationSize < 10) {
            console.warn('집단 크기가 너무 작습니다. 최소 10으로 조정합니다.');
            config.populationSize = 10;
        }
        
        if (config.mutationRate < 0.01 || config.mutationRate > 0.5) {
            console.warn(`변이율이 적절하지 않습니다(${config.mutationRate}). 0.01~0.5 범위로 조정합니다.`);
            config.mutationRate = Math.max(0.01, Math.min(0.5, config.mutationRate));
        }
        
        if (config.crossoverRate < 0.5 || config.crossoverRate > 1.0) {
            console.warn(`교차율이 적절하지 않습니다(${config.crossoverRate}). 0.5~1.0 범위로 조정합니다.`);
            config.crossoverRate = Math.max(0.5, Math.min(1.0, config.crossoverRate));
        }
        
        if (config.elitism < 0 || config.elitism > config.populationSize / 3) {
            console.warn(`엘리트 개체 수가 적절하지 않습니다. 집단 크기의 1/3 이하로 조정합니다.`);
            config.elitism = Math.max(0, Math.min(Math.floor(config.populationSize / 3), config.elitism));
        }
        
        // 초기 설계 모델 검증
        if (!params.initialDesign) {
            throw new Error('초기 설계 모델이 필요합니다');
        }
        
        // 최적화 목표 설정 - 균형 잡힌 성능 목표 추가
        const goals = params.goals || {
            includeGain: true,
            includeFrontToBack: true,
            includeVSWR: true,
            includeBalanced: true, // 균형 잡힌 성능 목표 추가
            weights: {
                gain: 1.0,
                frontToBack: 0.5,
                vswr: 2.0,
                balanced: 1.5 // 균형 가중치
            }
        };
    
    // 초기 개체군 생성
    let population = [];
    const baseDesign = params.initialDesign;
    
    // 기본 모델 포함
    population.push(JSON.parse(JSON.stringify(baseDesign)));
    
    // 나머지 개체들은 기본 모델의 변형으로 생성
    for (let i = 1; i < config.populationSize; i++) {
        const design = JSON.parse(JSON.stringify(baseDesign));
        
        // 설계 변형 (초기 다양성 확보)
        if (design.wires) {
            for (const wire of design.wires) {
                // 시작점과 끝점에 랜덤 변형 (±10%)
                wire.start.x += (Math.random() - 0.5) * 0.2 * Math.abs(wire.start.x || 0.1);
                wire.start.y += (Math.random() - 0.5) * 0.2 * Math.abs(wire.start.y || 0.1);
                wire.start.z += (Math.random() - 0.5) * 0.2 * Math.abs(wire.start.z || 0.1);
                
                wire.end.x += (Math.random() - 0.5) * 0.2 * Math.abs(wire.end.x || 0.1);
                wire.end.y += (Math.random() - 0.5) * 0.2 * Math.abs(wire.end.y || 0.1);
                wire.end.z += (Math.random() - 0.5) * 0.2 * Math.abs(wire.end.z || 0.1);
                
                // 반지름에 랜덤 변형 (±20%)
                wire.radius *= 0.8 + Math.random() * 0.4; // 0.8~1.2 배
            }
        }
        
        // 주파수에 랜덤 변형 (±5%)
        if (design.frequency) {
            design.frequency *= 0.95 + Math.random() * 0.1; // 0.95~1.05 배
        }
        
        population.push(design);
    }
    
    // 세대별 최적 결과 기록
    const generationResults = [];
    let bestDesign = null;
    let bestFitness = -Infinity;
    let bestResult = null;
    
    // 세대 진화 시작
    for (let generation = 0; generation < config.maxGenerations; generation++) {
        console.log(`세대 ${generation + 1}/${config.maxGenerations} 시뮬레이션 중...`);
        
        // 모든 설계에 대한 시뮬레이션 실행
        const simResults = await runParallelSimulations(population);
        
        // 적합도 계산 및 설계에 할당
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
                    
                    // 유효한 적합도 검증
                    if (fitness > -700) { // 심각한 오류가 아니면 (-999, -888, -777보다 큰 값)
                        validDesignCount++;
                        
                        populationWithFitness.push({
                            design: population[i],
                            fitness: fitness,
                            result: simResult.data
                        });
                        
                        // 세대 내 최적 설계 업데이트
                        if (fitness > generationBestFitness) {
                            generationBestFitness = fitness;
                            generationBestDesign = JSON.parse(JSON.stringify(population[i]));
                            generationBestResult = simResult.data;
                        }
                        
                        // 전체 최적 설계 업데이트
                        if (fitness > bestFitness) {
                            bestFitness = fitness;
                            bestDesign = JSON.parse(JSON.stringify(population[i]));
                            bestResult = simResult.data;
                        }
                    } else {
                        console.warn(`설계 #${i}: 유효하지 않은 적합도 (${fitness})`);
                        populationWithFitness.push({
                            design: population[i],
                            fitness: -600, // 유효하지 않지만 완전히 실패는 아닌 경우
                            result: null
                        });
                    }
                } catch (error) {
                    console.error(`설계 #${i} 적합도 계산 중 오류:`, error);
                    populationWithFitness.push({
                        design: population[i],
                        fitness: -800, // 오류 발생
                        result: null
                    });
                }
            } else {
                // 시뮬레이션 실패한 설계에 패널티 적합도 부여
                console.warn(`설계 #${i}: 시뮬레이션 실패 또는 결과 없음`);
                populationWithFitness.push({
                    design: population[i],
                    fitness: -999, // 완전 실패
                    result: null
                });
            }
        }
        
        // 유효한 설계 수가 너무 적으면 경고
        if (validDesignCount < config.populationSize * 0.3) {
            console.warn(`경고: 유효한 설계 수가 너무 적습니다. ${validDesignCount}/${config.populationSize} (${Math.round(validDesignCount/config.populationSize*100)}%)`);
        }
        
        // 세대 결과 기록
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
        
        // 마지막 세대면 진화 종료
        if (generation >= config.maxGenerations - 1) {
            break;
        }
        
        // 적합도에 따라 정렬
        populationWithFitness.sort((a, b) => b.fitness - a.fitness);
        
        // 새 세대 생성
        const newPopulation = [];
        
        // 엘리트주의: 상위 설계 직접 다음 세대로 전달
        for (let i = 0; i < config.elitism; i++) {
            if (i < populationWithFitness.length) {
                newPopulation.push(JSON.parse(JSON.stringify(populationWithFitness[i].design)));
            }
        }
        
        // 나머지는 선택 및 교차로 채우기
        while (newPopulation.length < config.populationSize) {
            // 룰렛 휠 선택
            const fitnessSum = populationWithFitness.reduce((sum, p) => sum + Math.max(0, p.fitness + 1000), 0);
            
            // 부모 선택 함수
            const selectParent = () => {
                const threshold = Math.random() * fitnessSum;
                let sum = 0;
                
                for (const p of populationWithFitness) {
                    sum += Math.max(0, p.fitness + 1000); // 모든 적합도를 양수로 만들기 위해 1000 추가
                    if (sum >= threshold) {
                        return p.design;
                    }
                }
                
                // 기본값으로 최상위 설계 반환
                return populationWithFitness[0].design;
            };
            
            // 두 부모 선택
            const parent1 = selectParent();
            const parent2 = selectParent();
            
            // 자식 생성 및 추가
            const child = crossoverDesigns(parent1, parent2, config.crossoverRate, config.mutationRate);
            newPopulation.push(child);
        }
        
        // 새 세대로 교체
        population = newPopulation;
    }
    
    // 최종 최적화 결과 반환
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
        console.error('유전 알고리즘 최적화 중 심각한 오류 발생:', error);
        return {
            error: error.message,
            stack: error.stack,
            status: 'failed',
            optimizationTime: new Date().toISOString()
        };
    }
}
