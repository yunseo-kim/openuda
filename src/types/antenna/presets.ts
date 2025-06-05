/**
 * Antenna preset type definitions
 */

export interface AntennaPreset {
  id: string
  name: string
  description: string
  frequency: number // MHz
  elements: PresetElement[]
  category: 'beginner' | 'intermediate' | 'advanced' | 'experimental'
  tags: string[]
}

export interface PresetElement {
  type: 'reflector' | 'driven' | 'director'
  position: number // Position relative to driven element (mm)
  length: number // Element length (mm)
  diameter: number // Element diameter (mm)
}

export interface AntennaDesignParams {
  frequency: number
  elements: PresetElement[]
  boomLength?: number
  boomDiameter?: number
} 