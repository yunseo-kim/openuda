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
        this.elitism = 2; // Number of best individuals to keep unchanged
        
        // Check if NEC2C engine is ready
        this._checkCalculatorReady();
    }
    
    /**
     * Check if the calculator module has initialized the NEC2C engine
     * @private
     */
    async _checkCalculatorReady() {
        try {
            if (this.calculator && typeof this.calculator._waitForEngine === 'function') {
                await this.calculator._waitForEngine();
                console.log('NEC2C engine ready - optimization prepared');
            } else {
                console.warn('Calculator module may not have properly initialized the NEC2C engine.');
            }
        } catch (error) {
            console.error('Error checking NEC2C engine initialization:', error);
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
                
                // Calculate antenna performance using NEC2C engine
                const performance = await this.calculator.calculateAntennaPerformance(testModel);
                
                // Validate performance results
                if (!performance || typeof performance !== 'object') {
                    console.warn('Invalid performance results:', performance);
                    return -1; // Invalid result
                }
                
                // Apply penalty for abnormal performance indicators
                if (performance.vswr > 10 || performance.gain < -20 || isNaN(performance.gain)) {
                    console.warn('Unrealistic performance values detected:', 
                                 `VSWR: ${performance.vswr}, Gain: ${performance.gain}`);
                    return -5; // Major penalty for physically unrealistic values
                }
                
                // Calculate fitness according to the goal
                let fitness = 0;
                
                switch (goal) {
                    case 'maxGain':
                        // Maximize gain
                        fitness = performance.gain;
                        // Bonus if gain is positive and VSWR is in a reasonable range
                        if (performance.gain > 0 && performance.vswr < 2.0) {
                            fitness *= 1.1; // 10% bonus
                        }
                        break;
                        
                    case 'maxFBRatio':
                        // Maximize front-to-back ratio
                        fitness = performance.fbRatio;
                        // Bonus if F/B ratio is high with good gain and VSWR
                        if (performance.fbRatio > 10 && performance.gain > 5 && performance.vswr < 2.5) {
                            fitness *= 1.1;
                        }
                        break;
                        
                    case 'minVSWR':
                        // Minimize VSWR (ideally 1.0)
                        // Transform to a maximization problem
                        fitness = 15 / (performance.vswr + 0.2);
                        // Bonus if VSWR is very low and gain is reasonable
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
                console.error('Error calculating fitness:', error);
                return -10; // Apply larger penalty for serious errors
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
        
        // Batch size for parallel computation (distributing NEC2C engine load)
        const batchSize = 5; // Process 5 individuals at a time
        
        // Evaluate initial population in batches
        let fitnessValues = [];
        for (let i = 0; i < population.length; i += batchSize) {
            const batch = population.slice(i, i + batchSize);
            try {
                const batchResults = await Promise.all(
                    batch.map(individual => fitnessFunction(individual))
                );
                fitnessValues.push(...batchResults);
            } catch (error) {
                console.error(`Error evaluating initial population (batch ${i})`, error);
                // Assign low fitness values to individuals that caused errors
                fitnessValues.push(...Array(batch.length).fill(-5));
            }
        }
        
        // Find initial best individual
        const validFitnessValues = fitnessValues.map(v => isFinite(v) ? v : -100);
        let bestIndex = validFitnessValues.indexOf(Math.max(...validFitnessValues));
        let bestIndividual = { ...population[bestIndex] };
        let bestFitness = validFitnessValues[bestIndex];
        
        // Generation evolution
        const generationHistory = [];
        
        // Track generations without improvement (early stopping condition)
        let stagnantGenerations = 0;
        const maxStagnantGenerations = 5; // Consider early stopping if no improvement for 5 generations
        
        // Execute generational evolution
        for (let gen = 0; gen < this.maxGenerations; gen++) {
            // Record current best
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
                    // Select parents
                    const parent1 = this.selectParent(population, fitnessValues);
                    const parent2 = this.selectParent(population, fitnessValues);
                    
                    // Crossover
                    let offspring;
                    if (Math.random() < this.crossoverRate) {
                        offspring = this.crossover(parent1, parent2);
                    } else {
                        // Copy one parent without crossover
                        offspring = Math.random() < 0.5 ? { ...parent1 } : { ...parent2 };
                    }
                    
                    // Mutation
                    this.mutate(offspring, constraints);
                    
                        // Add offspring to population
                    newPopulation.push(offspring);
                } catch (error) {
                    console.warn('Error creating offspring:', error);
                    // Create random individual in case of error
                    
                    newPopulation.push(this.createRandomIndividual(constraints));
                }
            }
            
            // Replace population
            population = newPopulation;
            
            // Evaluate new population (batch processing)
            fitnessValues = [];
            for (let i = 0; i < population.length; i += batchSize) {
                const batch = population.slice(i, i + batchSize);
                try {
                    const batchResults = await Promise.all(
                        batch.map(individual => fitnessFunction(individual))
                    );
                    fitnessValues.push(...batchResults);
                } catch (error) {
                    console.error(`Generation ${gen}, error evaluating population (batch ${i})`, error);
                    fitnessValues.push(...Array(batch.length).fill(-5));
                }
            }
            
            // Check if we need to update the best individual
            const newValidFitnessValues = fitnessValues.map(v => isFinite(v) ? v : -100);
            const newBestIndex = newValidFitnessValues.indexOf(Math.max(...newValidFitnessValues));
            const newBestFitness = newValidFitnessValues[newBestIndex];
            
            if (newBestFitness > bestFitness) {
                bestIndividual = { ...population[newBestIndex] };
                bestFitness = newBestFitness;
                stagnantGenerations = 0; // Reset stagnation counter as we've improved
            } else {
                stagnantGenerations++;
            }
            
            // Log progress
            console.log(`Generation ${gen+1}/${this.maxGenerations}, best fitness: ${bestFitness.toFixed(2)}, average: ${averageFitness.toFixed(2)}`);
            
            // Early termination condition: no improvement for several generations
            if (stagnantGenerations >= maxStagnantGenerations && gen > this.maxGenerations / 2) {
                console.log(`No improvement for ${maxStagnantGenerations} generations, terminating optimization early`);
                break;
            }
        }
        
        // Record final generation statistics
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
                
                // Determine mutation type: Gaussian or uniform distribution
                if (Math.random() < 0.7) {
                    // Gaussian mutation: small changes around current value (fine-tuning)
                    const currentValue = individual.lengths[i];
                    const range = constraint.max - constraint.min;
                    const sigma = range * 0.1; // Standard deviation is 10% of range
                    
                    // Sample from Gaussian distribution (Box-Muller transform)
                    let u = 0, v = 0;
                    while (u === 0) u = Math.random();
                    while (v === 0) v = Math.random();
                    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                    
                    // Add Gaussian noise to current value
                    let newValue = currentValue + z * sigma;
                    
                    // Ensure value is within constraints
                    newValue = Math.max(constraint.min, Math.min(constraint.max, newValue));
                    individual.lengths[i] = newValue;
                } else {
                    // Uniform distribution mutation: completely new random value (maintains exploration diversity)
                    individual.lengths[i] = this.randomInRange(constraint.min, constraint.max);
                }
            }
        }
        
        // Mutate spacings
        for (let i = 0; i < individual.spacings.length; i++) {
            if (Math.random() < this.mutationRate) {
                // Get constraints for this spacing
                const constraint = spacingConstraints[i];
                
                // Determine mutation type
                if (Math.random() < 0.7) {
                    // Gaussian mutation
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
                    // Uniform distribution mutation
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
        
        // Generate random lengths
        const lengths = lengthConstraints.map(constraint => 
            this.randomInRange(constraint.min, constraint.max)
        );
        
        // Generate random spacings
        const spacings = spacingConstraints.map(constraint => 
            this.randomInRange(constraint.min, constraint.max)
        );
        
        return { lengths, spacings };
    }
}
