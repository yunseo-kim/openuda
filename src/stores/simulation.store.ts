import { create } from 'zustand'
import type { SimulationResults } from '@/utils/nec2c'

interface SimulationState {
  results: SimulationResults | null
  isLoading: boolean
  error: string | null
  isOptimizing: boolean
  optimizationLog: string[]
  setResults: (results: SimulationResults) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearResults: () => void
  setOptimizing: (isOptimizing: boolean) => void
  addOptimizationLog: (log: string) => void
  clearOptimizationLog: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  results: null,
  isLoading: false,
  error: null,
  isOptimizing: false,
  optimizationLog: [],
  setResults: results => set({ results, isLoading: false, error: null }),
  setIsLoading: isLoading => set({ isLoading }),
  setError: error => set({ error, isLoading: false }),
  clearResults: () => set({ results: null, error: null }),
  setOptimizing: isOptimizing => set({ isOptimizing }),
  addOptimizationLog: log => set({ optimizationLog: [...get().optimizationLog, log] }),
  clearOptimizationLog: () => set({ optimizationLog: [] }),
}))
