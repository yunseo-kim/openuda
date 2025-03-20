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
        // Normalized VSWR (1 is perfect, higher is worse)
        const vswrNorm = Math.min(3, performance.vswr) / 3;
        
        // Weight the different performance metrics
        return (
            (0.4 * performance.gain) +           // 40% weight on gain
            (0.4 * performance.fbRatio / 10) +   // 40% weight on F/B ratio (normalized)
            (0.2 * (1 - vswrNorm))               // 20% weight on VSWR (inverted so lower is better)
        );
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
                
                // Calculate antenna performance
                const performance = await this.calculator.calculateAntennaPerformance(testModel);
                
                // Calculate fitness based on goal
                let fitness = 0;
                
                switch (goal) {
                    case 'maxGain':
                        // Maximize gain
                        fitness = performance.gain;
                        break;
                        
                    case 'maxFBRatio':
                        // Maximize front-to-back ratio
                        fitness = performance.fbRatio;
                        break;
                        
                    case 'minVSWR':
                        // Minimize VSWR (ideal is 1.0)
                        // Transform to a maximization problem
                        fitness = 10 / (performance.vswr + 0.1);
                        break;
                        
                    case 'balancedPerformance':
                        // Balanced performance metric
                        fitness = this.calculateBalancedMetric(performance);
                        break;
                        
                    default:
                        // Default to maximizing gain
                        fitness = performance.gain;
                }
                
                return fitness;
            } catch (error) {
                console.error('Error calculating fitness:', error);
                return -1; // Indicate an invalid solution
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
        
        // Evaluate initial population
        let fitnessValues = await Promise.all(
            population.map(individual => fitnessFunction(individual))
        );
        
        // Find initial best
        let bestIndex = fitnessValues.indexOf(Math.max(...fitnessValues));
        let bestIndividual = { ...population[bestIndex] };
        let bestFitness = fitnessValues[bestIndex];
        
        // Generation evolution
        const generationHistory = [];
        
        for (let gen = 0; gen < this.maxGenerations; gen++) {
            // Store current best in history
            generationHistory.push({
                generation: gen,
                bestFitness: bestFitness,
                averageFitness: fitnessValues.reduce((sum, val) => sum + val, 0) / fitnessValues.length
            });
            
            // Create new population through selection, crossover, mutation
            const newPopulation = [];
            
            // Elitism: keep the best individuals
            const sortedIndices = fitnessValues
                .map((val, idx) => ({ val, idx }))
                .sort((a, b) => b.val - a.val)
                .map(item => item.idx);
            
            for (let i = 0; i < this.elitism; i++) {
                if (i < sortedIndices.length) {
                    newPopulation.push({ ...population[sortedIndices[i]] });
                }
            }
            
            // Fill the rest with offspring
            while (newPopulation.length < this.populationSize) {
                // Select parents
                const parent1 = this.selectParent(population, fitnessValues);
                const parent2 = this.selectParent(population, fitnessValues);
                
                // Crossover
                let offspring;
                if (Math.random() < this.crossoverRate) {
                    offspring = this.crossover(parent1, parent2);
                } else {
                    // No crossover, just copy one parent
                    offspring = Math.random() < 0.5 ? { ...parent1 } : { ...parent2 };
                }
                
                // Mutation
                this.mutate(offspring, constraints);
                
                // Add to new population
                newPopulation.push(offspring);
            }
            
            // Replace population
            population = newPopulation;
            
            // Evaluate new population
            fitnessValues = await Promise.all(
                population.map(individual => fitnessFunction(individual))
            );
            
            // Update best individual if improved
            bestIndex = fitnessValues.indexOf(Math.max(...fitnessValues));
            if (fitnessValues[bestIndex] > bestFitness) {
                bestIndividual = { ...population[bestIndex] };
                bestFitness = fitnessValues[bestIndex];
            }
        }
        
        // Add final generation to history
        generationHistory.push({
            generation: this.maxGenerations,
            bestFitness: bestFitness,
            averageFitness: fitnessValues.reduce((sum, val) => sum + val, 0) / fitnessValues.length
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
                
                // Apply random mutation within constraints
                individual.lengths[i] = this.randomInRange(constraint.min, constraint.max);
            }
        }
        
        // Mutate spacings
        for (let i = 0; i < individual.spacings.length; i++) {
            if (Math.random() < this.mutationRate) {
                // Get constraints for this spacing
                const constraint = spacingConstraints[i];
                
                // Apply random mutation within constraints
                individual.spacings[i] = this.randomInRange(constraint.min, constraint.max);
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
}
