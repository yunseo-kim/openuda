import type { PresetElement } from '@/types/antenna/presets'
import { simulateAntenna, type AntennaParams, type SimulationResults } from '../nec2c'

// --- 유전 알고리즘 상수 ---
const POPULATION_SIZE = 50 // 한 세대의 개체 수
const NUM_GENERATIONS = 30 // 총 세대 수
const MUTATION_RATE = 0.05 // 돌연변이 확률 (5%)
const MUTATION_AMOUNT = 0.1 // 돌연변이 시 변경량 (최대 10%)
const ELITISM_COUNT = 2 // 다음 세대에 그대로 전달될 엘리트 개체 수

// --- 타입 정의 ---
export type OptimizationTarget = 'gain' | 'fbRatio' | 'balanced'

interface Individual {
  elements: PresetElement[]
  fitness: number
  results?: SimulationResults
}

export interface OptimizerOptions {
  initialElements: PresetElement[]
  frequency: number
  target: OptimizationTarget
  onProgress: (log: string) => void
}

// --- 핵심 유전 알고리즘 클래스 ---
export class AntennaOptimizer {
  private population: Individual[] = []
  private options: OptimizerOptions

  constructor(options: OptimizerOptions) {
    this.options = options
  }

  public async run(): Promise<PresetElement[]> {
    // 이전 로그 기록을 지워 메모리 부담을 줄입니다.
    console.clear()
    this.options.onProgress('Initializing population...')
    this.initializePopulation()

    for (let i = 0; i < NUM_GENERATIONS; i++) {
      this.options.onProgress(`--- Generation ${i + 1} / ${NUM_GENERATIONS} ---`)
      await this.evaluatePopulation()

      // 적합도 순으로 정렬 (내림차순)
      this.population.sort((a, b) => b.fitness - a.fitness)

      const bestIndividual = this.population[0]
      this.options.onProgress(
        `Best Fitness: ${bestIndividual.fitness.toFixed(4)} (Gain: ${bestIndividual.results?.gain.toFixed(
          2
        )} dBi, F/B: ${bestIndividual.results?.frontToBackRatio.toFixed(2)} dB, VSWR: ${bestIndividual.results?.vswr.toFixed(
          2
        )})`
      )

      if (i < NUM_GENERATIONS - 1) {
        this.createNewGeneration()
      }
    }

    this.options.onProgress('Optimization finished.')
    const finalBest = this.population[0]
    this.options.onProgress(
      `Final best design found. Gain: ${finalBest.results?.gain.toFixed(
        2
      )} dBi, F/B Ratio: ${finalBest.results?.frontToBackRatio.toFixed(2)} dB`
    )

    const bestElements = finalBest.elements
    // --- 명시적 메모리 해제 ---
    // 최적화 완료 후 거대한 population 배열을 비워서 GC가 메모리를 쉽게 회수하도록 돕습니다.
    this.population = []

    return bestElements
  }

  private initializePopulation(): void {
    this.population = []
    for (let i = 0; i < POPULATION_SIZE; i++) {
      // 첫 번째 개체는 원본, 나머지는 약간 변형된 버전
      const newElements =
        i === 0
          ? this.options.initialElements
          : this.options.initialElements.map(el => ({
              ...el,
              length: el.length * (1 + (Math.random() - 0.5) * MUTATION_AMOUNT),
              position: el.position * (1 + (Math.random() - 0.5) * MUTATION_AMOUNT),
            }))
      this.population.push({ elements: newElements, fitness: 0 })
    }
  }

  private async evaluatePopulation(): Promise<void> {
    // 병렬 실행 시 WebAssembly 모듈의 내부 상태 충돌로 인해 순차적으로 실행합니다.
    // 이는 안정성을 보장하지만, 최적화 속도는 다소 느려질 수 있습니다.
    for (const individual of this.population) {
      const params: AntennaParams = {
        frequency: this.options.frequency,
        elements: individual.elements,
        groundType: 'none',
      }
      try {
        const results = await simulateAntenna(params)
        individual.results = results
        individual.fitness = this.calculateFitness(results)
      } catch (error) {
        console.error('Simulation failed for individual:', error)
        individual.fitness = -Infinity // 시뮬레이션 실패 시 최악의 점수 부여
      }
    }
  }

  private calculateFitness(results: SimulationResults): number {
    let fitness = 0
    const { gain, frontToBackRatio, vswr } = results

    switch (this.options.target) {
      case 'gain':
        fitness = gain
        break
      case 'fbRatio':
        fitness = frontToBackRatio
        break
      case 'balanced':
        // 이득과 F/B 비율에 가중치를 두어 합산
        // 정규화 없이 간단한 가중치 합으로 시작
        fitness = gain * 0.6 + frontToBackRatio * 0.4
        break
    }

    // VSWR 페널티: VSWR이 3을 초과하면 급격히 페널티 부여
    if (vswr > 3.0) {
      fitness *= 1 / (1 + (vswr - 3.0) * 2)
    }

    return fitness
  }

  private createNewGeneration(): void {
    const newPopulation: Individual[] = []

    // 1. 엘리티즘 (Elitism)
    for (let i = 0; i < ELITISM_COUNT; i++) {
      newPopulation.push(this.population[i])
    }

    // 2. 교차 및 돌연변이
    while (newPopulation.length < POPULATION_SIZE) {
      const parent1 = this.tournamentSelection()
      const parent2 = this.tournamentSelection()
      const childElements = this.crossover(parent1, parent2)
      const mutatedChildElements = this.mutate(childElements)
      newPopulation.push({ elements: mutatedChildElements, fitness: 0 })
    }

    this.population = newPopulation
  }

  private tournamentSelection(): PresetElement[] {
    const tournamentSize = 5
    let best = null
    let bestFitness = -Infinity

    for (let i = 0; i < tournamentSize; i++) {
      const individual = this.population[Math.floor(Math.random() * this.population.length)]
      if (individual.fitness > bestFitness) {
        best = individual
        bestFitness = individual.fitness
      }
    }
    return best!.elements
  }

  private crossover(parent1: PresetElement[], parent2: PresetElement[]): PresetElement[] {
    // 단일점 교차
    const crossoverPoint = Math.floor(Math.random() * parent1.length)
    const childElements = parent1.slice(0, crossoverPoint).concat(parent2.slice(crossoverPoint))
    return childElements
  }

  private mutate(elements: PresetElement[]): PresetElement[] {
    return elements.map(el => {
      let { length, position } = el
      // 길이 돌연변이
      if (Math.random() < MUTATION_RATE) {
        length *= 1 + (Math.random() - 0.5) * MUTATION_AMOUNT
      }
      // 위치 돌연변이 (단, driven element의 위치는 0으로 고정)
      if (el.type !== 'driven' && Math.random() < MUTATION_RATE) {
        position *= 1 + (Math.random() - 0.5) * MUTATION_AMOUNT
      }
      return { ...el, length, position }
    })
  }
}

export async function runGeneticAlgorithm(options: OptimizerOptions): Promise<PresetElement[]> {
  const optimizer = new AntennaOptimizer(options)
  return optimizer.run()
}
