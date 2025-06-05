import { create } from 'zustand'

interface AntennaState {
  antennaModel: any | null
  setAntennaModel: (model: any) => void
}

export const useAntennaStore = create<AntennaState>((set) => ({
  antennaModel: null,
  setAntennaModel: (model) => set({ antennaModel: model })
})) 