import { create } from 'zustand'
import type { PresetElement } from '@/types/antenna/presets'
import { simulateAntenna, type AntennaParams } from '@/utils/nec2c'
import { useSimulationStore } from '../simulation.store'

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
  runOptimization: (target: 'gain' | 'fbRatio') => Promise<void>
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
    if (elements.length === 0) {
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
      const results = await simulateAntenna(antennaParams)
      setResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown simulation error')
    }
  },

  runOptimization: async target => {
    const { setOptimizing, addOptimizationLog, clearOptimizationLog } =
      useSimulationStore.getState()

    clearOptimizationLog()
    setOptimizing(true)
    addOptimizationLog(`Starting optimization for: ${target}...`)

    // Placeholder for actual optimization logic
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate work

    addOptimizationLog('Iteration 1: Adjusting elements...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    addOptimizationLog('Optimization finished.')
    setOptimizing(false)
  },
}))
