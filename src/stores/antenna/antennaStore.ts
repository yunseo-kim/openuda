import { create } from 'zustand'
import type { PresetElement } from '@/types/antenna/presets'
import { simulateAntenna, type AntennaParams } from '@/utils/nec2c'
import { useSimulationStore } from '../simulation.store'
import { runGeneticAlgorithm, type OptimizationTarget } from '@/utils/antenna/optimizer'

interface AntennaState {
  // Design parameters
  frequency: number
  elements: PresetElement[]
  selectedPresetId?: string

  // Actions
  setFrequency: (frequency: number) => void
  setElements: (elements: PresetElement[]) => void
  setSelectedPresetId: (id?: string) => void
  resetDesign: () => void
  runSimulation: () => Promise<void>
  runOptimization: (target: OptimizationTarget) => Promise<void>
}

const defaultDesign = {
  frequency: 146, // 2m band default
  elements: [] as PresetElement[],
  selectedPresetId: undefined,
}

export const useAntennaStore = create<AntennaState>((set, get) => ({
  ...defaultDesign,

  setFrequency: frequency => {
    set({ frequency })
    get().runSimulation()
  },

  setElements: elements => {
    set({ elements })
    get().runSimulation()
  },

  setSelectedPresetId: selectedPresetId => set({ selectedPresetId }),

  resetDesign: () => {
    set(defaultDesign)
    useSimulationStore.getState().clearResults()
  },

  runSimulation: async () => {
    const { frequency, elements } = get()
    console.log('🔄 Starting simulation:', { frequency, elementCount: elements.length })

    if (elements.length === 0) {
      console.log('❌ No elements, clearing results')
      useSimulationStore.getState().clearResults()
      return
    }

    const { setIsLoading, setResults, setError } = useSimulationStore.getState()
    setIsLoading(true)

    try {
      const antennaParams: AntennaParams = {
        frequency,
        elements,
        groundType: 'none', // Or get this from state if configurable
      }
      console.log('📡 Running antenna simulation...')
      const results = await simulateAntenna(antennaParams)
      console.log('✅ Simulation complete:', results)
      setResults(results)
    } catch (err) {
      console.error('❌ Simulation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown simulation error')
    }
  },

  runOptimization: async target => {
    console.log('🚀 Optimization started with target:', target)
    const { setOptimizing, addOptimizationLog, clearOptimizationLog } =
      useSimulationStore.getState()
    const { frequency, elements, setElements: setOptimizedElements } = get()

    if (elements.length === 0) {
      addOptimizationLog('Cannot optimize an empty design.')
      return
    }

    clearOptimizationLog()
    setOptimizing(true)

    try {
      const bestElements = await runGeneticAlgorithm({
        initialElements: elements,
        frequency,
        target,
        onProgress: addOptimizationLog,
      })

      // 최적화된 결과로 상태 업데이트
      setOptimizedElements(bestElements)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown optimization error'
      addOptimizationLog(`❌ Optimization failed: ${errorMessage}`)
      console.error('Optimization process error:', error)
    } finally {
      setOptimizing(false)
    }
  },
}))
