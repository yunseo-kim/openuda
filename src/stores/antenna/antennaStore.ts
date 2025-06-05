import { create } from 'zustand'
import type { PresetElement } from '@/types/antenna/presets'

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
}

const defaultDesign = {
  frequency: 146, // 2m band default
  elements: [] as PresetElement[],
  selectedPresetId: undefined
}

export const useAntennaStore = create<AntennaState>((set) => ({
  ...defaultDesign,
  
  setFrequency: (frequency) => set({ frequency }),
  
  setElements: (elements) => set({ elements }),
  
  setSelectedPresetId: (selectedPresetId) => set({ selectedPresetId }),
  
  resetDesign: () => set(defaultDesign)
})) 