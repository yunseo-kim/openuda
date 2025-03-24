/**
 * OpenUda - Yagi-Uda Antenna Design Web App
 * Optimizer Module
 * 
 * This module implements a genetic algorithm and other optimization methods
 * to find the optimal dimensions and spacing for Yagi-Uda antenna elements
 * based on various optimization goals.
 */

export class Optimizer {
    constructor(antennaModel, calculator) {
        this.antennaModel = antennaModel;
        this.calculator = calculator;
        
        // Optimization parameters
        this.populationSize = 30;
        this.maxGenerations = 20;
        this.mutationRate = 0.15;
        this.crossoverRate = 0.8;
        this.elitism = 2; // 변경 없이 유지할 최상위 개체 수
        
        // NEC2C 엔진 준비 확인
        this._checkCalculatorReady();
    }
    
    /**
     * 계산기 모듈이 NEC2C 엔진을 초기화했는지 확인
     * @private
     */
    async _checkCalculatorReady() {
        try {
            if (this.calculator && typeof this.calculator._waitForEngine === 'function') {
                await this.calculator._waitForEngine();
                console.log('NEC2C 엔진 준비 완료 - 최적화 준비됨');
            } else {
                console.warn('계산기 모듈이 NEC2C 엔진을 제대로 초기화하지 않았을 수 있습니다.');
            }
        } catch (error) {
            console.error('NEC2C 엔진 초기화 확인 중 오류:', error);
        }
    }

    /**
     * Run optimization with the selected goal
     * @param {string} goal Optimization goal (maxGain, maxFBRatio, minVSWR, balancedPerformance)
     * @returns {object} Optimization results
     */
    async optimize(goal) {
        // Save original model to compare improvement
        const originalModel = this.antennaModel.clone();
        const originalPerf = await this.calculator.calculateAntennaPerformance(originalModel);
        
        // Create optimization constraints
        const constraints = this.createConstraints(originalModel);
        
        // Create the fitness function based on the goal
        const fitnessFunction = this.createFitnessFunction(goal);
        
        // Run genetic algorithm
        const result = await this.runGeneticAlgorithm(constraints, fitnessFunction);
        
        // Apply the optimized parameters to create the result model
        const optimizedModel = this.createModelFromParameters(originalModel, result.bestParameters);
        
        // Calculate the performance of the optimized model
        const optimizedPerf = await this.calculator.calculateAntennaPerformance(optimizedModel);
        
        // Calculate improvement percentage based on the goal
        let originalValue, optimizedValue;
        
        switch (goal) {
            case 'maxGain':
                originalValue = originalPerf.gain;
                optimizedValue = optimizedPerf.gain;
                break;
            case 'maxFBRatio':
                originalValue = originalPerf.fbRatio;
                optimizedValue = optimizedPerf.fbRatio;
                break;
            case 'minVSWR':
                // For VSWR, lower is better, so we invert the improvement calculation
                originalValue = 1/originalPerf.vswr;
                optimizedValue = 1/optimizedPerf.vswr;
                break;
            case 'balancedPerformance':
                // For balanced, use a weighted average of gain, FB ratio, and VSWR
                originalValue = this.calculateBalancedMetric(originalPerf);
                optimizedValue = this.calculateBalancedMetric(optimizedPerf);
                break;
            default:
                originalValue = originalPerf.gain;
                optimizedValue = optimizedPerf.gain;
        }
        
        // Calculate percentage improvement
        const improvement = ((optimizedValue - originalValue) / Math.abs(originalValue)) * 100;
        
        return {
            model: optimizedModel,
            performance: optimizedPerf,
            originalPerformance: originalPerf,
            improvement: improvement,
            generations: result.generations,
            bestFitness: result.bestFitness
        };
    }

    /**
     * Calculate a balanced performance metric
     * @param {object} performance Performance object with gain, fbRatio, vswr
     * @returns {number} Balanced metric value
     */
    calculateBalancedMetric(performance) {
        // 입력값 유효성 검사
        if (!performance || typeof performance !== 'object') return -1;
        if (isNaN(performance.gain) || isNaN(performance.fbRatio) || isNaN(performance.vswr)) return -1;
        
        // 정규화된 VSWR (1이 이상적, 높을수록 좋지 않음)
        const vswrNorm = Math.min(3, performance.vswr) / 3;
        
        // 정규화된 이득 (최대 15dBi 기준)
        const gainNorm = Math.min(15, Math.max(0, performance.gain)) / 15;
        
        // 정규화된 전/후방비 (최대 20dB 기준)
        const fbRatioNorm = Math.min(20, Math.max(0, performance.fbRatio)) / 20;
        
        // 성능 지표 가중치 적용
        return (
            (0.4 * gainNorm) +                 // 40% 이득 가중치
            (0.4 * fbRatioNorm) +              // 40% 전/후방비 가중치
            (0.2 * (1 - vswrNorm))             // 20% VSWR 가중치 (역수로 변환하여 낮을수록 좋도록 함)
        ) * 10; // 0-10 범위로 스케일링
    }

    /**
     * Create constraints for optimization based on the current model
     * @param {AntennaModel} model The reference antenna model
     * @returns {object} Constraints object
     */
    createConstraints(model) {
        const wavelength = model.getWavelength();
        const elements = model.elements;
        
        // Setup constraints for each element's length
        const lengthConstraints = elements.map(element => {
            let minLength, maxLength;
            
            switch (element.type) {
                case 'reflector':
                    // Reflector is typically 0.5-0.52 wavelength
                    minLength = wavelength * 0.48;
                    maxLength = wavelength * 0.55;
                    break;
                case 'driven':
                    // Driven element is typically 0.46-0.49 wavelength
                    minLength = wavelength * 0.44;
                    maxLength = wavelength * 0.51;
                    break;
                case 'director':
                    // Directors are typically 0.4-0.45 wavelength
                    minLength = wavelength * 0.38;
                    maxLength = wavelength * 0.48;
                    break;
                default:
                    minLength = wavelength * 0.4;
                    maxLength = wavelength * 0.5;
            }
            
            return {
                min: minLength,
                max: maxLength,
                current: element.length
            };
        });
        
        // Setup constraints for element spacing
        const spacingConstraints = [];
        
        // We constrain the relative spacing between adjacent elements
        for (let i = 1; i < elements.length; i++) {
            const currentSpacing = elements[i].position - elements[i-1].position;
            
            spacingConstraints.push({
                min: wavelength * 0.1,  // Minimum spacing (0.1 wavelength)
                max: wavelength * 0.4,  // Maximum spacing (0.4 wavelength)
                current: currentSpacing
            });
        }
        
        return {
            lengthConstraints,
            spacingConstraints
        };
    }

    /**
     * Create a fitness function based on the optimization goal
     * @param {string} goal Optimization goal
     * @returns {Function} Fitness function
     */
    createFitnessFunction(goal) {
        return async (parameters) => {
            try {
                // Create a model with the current parameters
                const testModel = this.createModelFromParameters(
                    this.antennaModel, 
                    parameters
                );
                
                // NEC2C 엔진을 사용하여 안테나 성능 계산
                const performance = await this.calculator.calculateAntennaPerformance(testModel);
                
                // 성능 결과 유효성 검사
                if (!performance || typeof performance !== 'object') {
                    console.warn('Invalid performance results:', performance);
                    return -1; // 유효하지 않은 결과
                }
                
                // 특정 성능 지표가 비정상적인 경우 페널티 적용
                if (performance.vswr > 10 || performance.gain < -20 || isNaN(performance.gain)) {
                    console.warn('Unrealistic performance values detected:', 
                                 `VSWR: ${performance.vswr}, Gain: ${performance.gain}`);
                    return -5; // 물리적으로 비현실적인 값에 큰 페널티
                }
                
                // 목표에 따른 적합도 계산
                let fitness = 0;
                
                switch (goal) {
                    case 'maxGain':
                        // Maximize gain
                        fitness = performance.gain;
                        // 이득이 양수이면서 합리적인 VSWR 범위 내에 있는 경우 보너스
                        if (performance.gain > 0 && performance.vswr < 2.0) {
                            fitness *= 1.1; // 10% 보너스
                        }
                        break;
                        
                    case 'maxFBRatio':
                        // Maximize front-to-back ratio
                        fitness = performance.fbRatio;
                        // 전/후방비가 높으면서 양호한 이득과 VSWR을 가질 경우 보너스
                        if (performance.fbRatio > 10 && performance.gain > 5 && performance.vswr < 2.5) {
                            fitness *= 1.1;
                        }
                        break;
                        
                    case 'minVSWR':
                        // VSWR 최소화 (이상적으로 1.0)
                        // 최대화 문제로 변환
                        fitness = 15 / (performance.vswr + 0.2);
                        // VSWR이 매우 낮고 이득이 합리적인 경우 보너스
                        if (performance.vswr < 1.5 && performance.gain > 0) {
                            fitness *= 1.15;
                        }
                        break;
                        
                    case 'balancedPerformance':
                        // Balanced performance metric
                        fitness = this.calculateBalancedMetric(performance);
                        break;
                        
                    default:
                        // Default to maximizing gain
                        fitness = performance.gain;
                }
                
                return isFinite(fitness) ? fitness : -1;
            } catch (error) {
                console.error('적합도 계산 중 오류:', error);
                return -10; // 심각한 오류에는 더 큰 페널티 부여
            }
        };
    }

    /**
     * Create a model with the given parameter set
     * @param {AntennaModel} baseModel Base model to start from
     * @param {object} parameters Parameter set from optimizer
     * @returns {AntennaModel} New model with updated parameters
     */
    createModelFromParameters(baseModel, parameters) {
        const { lengths, spacings } = parameters;
        const newModel = baseModel.clone();
        const elements = newModel.elements;
        
        // Update element lengths
        for (let i = 0; i < elements.length; i++) {
            if (i < lengths.length) {
                elements[i].length = lengths[i];
            }
        }
        
        // Update element positions based on spacings
        if (elements.length > 1) {
            // Keep first element position fixed
            const firstPos = elements[0].position;
            
            // Update subsequent element positions
            for (let i = 1; i < elements.length; i++) {
                if (i - 1 < spacings.length) {
                    elements[i].position = firstPos + spacings.slice(0, i).reduce((sum, spacing) => sum + spacing, 0);
                }
            }
        }
        
        return newModel;
    }

    /**
     * Run the genetic algorithm optimization
     * @param {object} constraints Constraints object
     * @param {Function} fitnessFunction Fitness function
     * @returns {object} Optimization results
     */
    async runGeneticAlgorithm(constraints, fitnessFunction) {
        const { lengthConstraints, spacingConstraints } = constraints;
        
        // Initialize population
        let population = this.initializePopulation(constraints);
        
        // 병렬 계산을 위한 배치 크기 (NEC2C 엔진 부하 분산)
        const batchSize = 5; // 한 번에 5개씩 처리
        
        // 배치 단위로 초기 개체군 평가
        let fitnessValues = [];
        for (let i = 0; i < population.length; i += batchSize) {
            const batch = population.slice(i, i + batchSize);
            try {
                const batchResults = await Promise.all(
                    batch.map(individual => fitnessFunction(individual))
                );
                fitnessValues.push(...batchResults);
            } catch (error) {
                console.error(`초기 개체군 평가 중 오류 (배치 ${i})`, error);
                // 오류 발생 시 해당 개체들에 낮은 적합도 부여
                fitnessValues.push(...Array(batch.length).fill(-5));
            }
        }
        
        // 초기 최상위 개체 찾기
        const validFitnessValues = fitnessValues.map(v => isFinite(v) ? v : -100);
        let bestIndex = validFitnessValues.indexOf(Math.max(...validFitnessValues));
        let bestIndividual = { ...population[bestIndex] };
        let bestFitness = validFitnessValues[bestIndex];
        
        // Generation evolution
        const generationHistory = [];
        
        // 변화 없는 세대 추적 (조기 종료 조건)
        let stagnantGenerations = 0;
        const maxStagnantGenerations = 5; // 5세대 동안 개선이 없으면 조기 종료 고려
        
        // 세대별 진화 실행
        for (let gen = 0; gen < this.maxGenerations; gen++) {
            // 현재 최상위 기록
            const validValues = fitnessValues.filter(v => isFinite(v) && v > -50);
            const averageFitness = validValues.length > 0 ? 
                validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
                
            generationHistory.push({
                generation: gen,
                bestFitness: bestFitness,
                averageFitness: averageFitness,
                validSolutions: validValues.length
            });
            
            // Create new population through selection, crossover, mutation
            const newPopulation = [];
            
            // Elitism: keep the best individuals
            const sortedIndices = fitnessValues
                .map((val, idx) => ({ val: isFinite(val) ? val : -Infinity, idx }))
                .sort((a, b) => b.val - a.val)
                .map(item => item.idx);
            
            for (let i = 0; i < this.elitism; i++) {
                if (i < sortedIndices.length && fitnessValues[sortedIndices[i]] > -50) {
                    newPopulation.push({ ...population[sortedIndices[i]] });
                }
            }
            
            // Fill the rest with offspring
            while (newPopulation.length < this.populationSize) {
                try {
                    // 부모 선택
                    const parent1 = this.selectParent(population, fitnessValues);
                    const parent2 = this.selectParent(population, fitnessValues);
                    
                    // 교배
                    let offspring;
                    if (Math.random() < this.crossoverRate) {
                        offspring = this.crossover(parent1, parent2);
                    } else {
                        // 교배 없이 한 부모 복사
                        offspring = Math.random() < 0.5 ? { ...parent1 } : { ...parent2 };
                    }
                    
                    // 변이
                    this.mutate(offspring, constraints);
                    
                        // 자손을 개체군에 추가
                    newPopulation.push(offspring);
                } catch (error) {
                    console.warn('자손 생성 중 오류:', error);
                    // 오류 발생 시 무작위 개체 생성하여 추가
                    newPopulation.push(this.createRandomIndividual(constraints));
                }
            }
            
            // Replace population
            population = newPopulation;
            
            // 새 개체군 평가 (배치 방식)
            fitnessValues = [];
            for (let i = 0; i < population.length; i += batchSize) {
                const batch = population.slice(i, i + batchSize);
                try {
                    const batchResults = await Promise.all(
                        batch.map(individual => fitnessFunction(individual))
                    );
                    fitnessValues.push(...batchResults);
                } catch (error) {
                    console.error(`세대 ${gen}, 개체군 평가 중 오류 (배치 ${i})`, error);
                    fitnessValues.push(...Array(batch.length).fill(-5));
                }
            }
            
            // 최상위 개체 갱신 여부 확인
            const newValidFitnessValues = fitnessValues.map(v => isFinite(v) ? v : -100);
            const newBestIndex = newValidFitnessValues.indexOf(Math.max(...newValidFitnessValues));
            const newBestFitness = newValidFitnessValues[newBestIndex];
            
            if (newBestFitness > bestFitness) {
                bestIndividual = { ...population[newBestIndex] };
                bestFitness = newBestFitness;
                stagnantGenerations = 0; // 개선되었으므로 정체 카운터 초기화
            } else {
                stagnantGenerations++;
            }
            
            // 진행 상황 로깅
            console.log(`세대 ${gen+1}/${this.maxGenerations}, 최고 적합도: ${bestFitness.toFixed(2)}, 평균: ${averageFitness.toFixed(2)}`);
            
            // 조기 종료 조건: 일정 세대 동안 개선 없음
            if (stagnantGenerations >= maxStagnantGenerations && gen > this.maxGenerations / 2) {
                console.log(`${maxStagnantGenerations}세대 동안 개선이 없어 최적화 조기 종료`);
                break;
            }
        }
        
        // 최종 세대 기록
        const finalValidValues = fitnessValues.filter(v => isFinite(v) && v > -50);
        const finalAverageFitness = finalValidValues.length > 0 ? 
            finalValidValues.reduce((sum, val) => sum + val, 0) / finalValidValues.length : 0;
            
        generationHistory.push({
            generation: this.maxGenerations,
            bestFitness: bestFitness,
            averageFitness: finalAverageFitness,
            validSolutions: finalValidValues.length
        });
        
        return {
            bestParameters: bestIndividual,
            bestFitness: bestFitness,
            generations: generationHistory
        };
    }

    /**
     * Initialize population with random individuals within constraints
     * @param {object} constraints Constraints object
     * @returns {Array} Initial population
     */
    initializePopulation(constraints) {
        const population = [];
        const { lengthConstraints, spacingConstraints } = constraints;
        
        for (let i = 0; i < this.populationSize; i++) {
            // Random lengths within constraints
            const lengths = lengthConstraints.map(constraint => 
                this.randomInRange(constraint.min, constraint.max)
            );
            
            // Random spacings within constraints
            const spacings = spacingConstraints.map(constraint => 
                this.randomInRange(constraint.min, constraint.max)
            );
            
            population.push({ lengths, spacings });
        }
        
        return population;
    }

    /**
     * Select a parent using tournament selection
     * @param {Array} population Population array
     * @param {Array} fitnessValues Array of fitness values
     * @returns {object} Selected parent
     */
    selectParent(population, fitnessValues) {
        const tournamentSize = 3;
        const tournamentIndices = [];
        
        // Select random individuals for tournament
        for (let i = 0; i < tournamentSize; i++) {
            tournamentIndices.push(Math.floor(Math.random() * population.length));
        }
        
        // Find the best in the tournament
        let bestIndex = tournamentIndices[0];
        for (let i = 1; i < tournamentSize; i++) {
            if (fitnessValues[tournamentIndices[i]] > fitnessValues[bestIndex]) {
                bestIndex = tournamentIndices[i];
            }
        }
        
        return population[bestIndex];
    }

    /**
     * Perform crossover between two parents
     * @param {object} parent1 First parent
     * @param {object} parent2 Second parent
     * @returns {object} Offspring
     */
    crossover(parent1, parent2) {
        const offspring = {
            lengths: [],
            spacings: []
        };
        
        // Uniform crossover for lengths
        for (let i = 0; i < parent1.lengths.length; i++) {
            offspring.lengths.push(
                Math.random() < 0.5 ? parent1.lengths[i] : parent2.lengths[i]
            );
        }
        
        // Uniform crossover for spacings
        for (let i = 0; i < parent1.spacings.length; i++) {
            offspring.spacings.push(
                Math.random() < 0.5 ? parent1.spacings[i] : parent2.spacings[i]
            );
        }
        
        return offspring;
    }

    /**
     * Apply mutation to an individual
     * @param {object} individual Individual to mutate
     * @param {object} constraints Constraints object
     */
    mutate(individual, constraints) {
        const { lengthConstraints, spacingConstraints } = constraints;
        
        // Mutate lengths
        for (let i = 0; i < individual.lengths.length; i++) {
            if (Math.random() < this.mutationRate) {
                // Get constraints for this length
                const constraint = lengthConstraints[i];
                
                // 변이 타입 결정: 가우시안 또는 균등 분포
                if (Math.random() < 0.7) {
                    // 가우시안 변이: 현재 값 주변에서 작은 변화 (미세 조정)
                    const currentValue = individual.lengths[i];
                    const range = constraint.max - constraint.min;
                    const sigma = range * 0.1; // 표준편차는 범위의 10%
                    
                    // 가우시안 분포에서 샘플링 (Box-Muller 변환)
                    let u = 0, v = 0;
                    while (u === 0) u = Math.random();
                    while (v === 0) v = Math.random();
                    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                    
                    // 현재 값에 가우시안 노이즈 추가
                    let newValue = currentValue + z * sigma;
                    
                    // 제약 범위 내에 있도록 보정
                    newValue = Math.max(constraint.min, Math.min(constraint.max, newValue));
                    individual.lengths[i] = newValue;
                } else {
                    // 균등 분포 변이: 완전히 새로운 무작위 값 (탐색 다양성 유지)
                    individual.lengths[i] = this.randomInRange(constraint.min, constraint.max);
                }
            }
        }
        
        // Mutate spacings
        for (let i = 0; i < individual.spacings.length; i++) {
            if (Math.random() < this.mutationRate) {
                // Get constraints for this spacing
                const constraint = spacingConstraints[i];
                
                // 변이 타입 결정
                if (Math.random() < 0.7) {
                    // 가우시안 변이
                    const currentValue = individual.spacings[i];
                    const range = constraint.max - constraint.min;
                    const sigma = range * 0.1;
                    
                    let u = 0, v = 0;
                    while (u === 0) u = Math.random();
                    while (v === 0) v = Math.random();
                    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                    
                    let newValue = currentValue + z * sigma;
                    newValue = Math.max(constraint.min, Math.min(constraint.max, newValue));
                    individual.spacings[i] = newValue;
                } else {
                    // 균등 분포 변이
                    individual.spacings[i] = this.randomInRange(constraint.min, constraint.max);
                }
            }
        }
    }

    /**
     * Generate a random number within a range
     * @param {number} min Minimum value
     * @param {number} max Maximum value
     * @returns {number} Random number within range
     */
    randomInRange(min, max) {
        return min + Math.random() * (max - min);
    }
    
    /**
     * Create a random individual within constraints
     * @param {object} constraints Constraints object
     * @returns {object} Random individual
     */
    createRandomIndividual(constraints) {
        const { lengthConstraints, spacingConstraints } = constraints;
        
        // 무작위 길이 생성
        const lengths = lengthConstraints.map(constraint => 
            this.randomInRange(constraint.min, constraint.max)
        );
        
        // 무작위 간격 생성
        const spacings = spacingConstraints.map(constraint => 
            this.randomInRange(constraint.min, constraint.max)
        );
        
        return { lengths, spacings };
    }
}
