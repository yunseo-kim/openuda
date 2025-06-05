/**
 * Predefined antenna presets for quick start
 */

import type { AntennaPreset } from '@/types/antenna/presets'

// Calculate wavelength in mm from frequency in MHz
// const calculateWavelength = (freqMHz: number): number => {
//   const speedOfLight = 299792458 // m/s
//   return (speedOfLight / (freqMHz * 1e6)) * 1000 // Convert to mm
// }

// Create preset data
export const antennaPresets: AntennaPreset[] = [
  {
    id: 'fm-broadcast-3el',
    name: '3-Element FM Broadcast',
    description: 'Simple 3-element Yagi for FM radio reception (88-108 MHz)',
    frequency: 98,
    category: 'beginner',
    tags: ['FM', 'broadcast', 'reception'],
    elements: [
      {
        type: 'reflector',
        position: -408,
        length: 1530,
        diameter: 10,
      },
      {
        type: 'driven',
        position: 0,
        length: 1428,
        diameter: 10,
      },
      {
        type: 'director',
        position: 306,
        length: 1377,
        diameter: 10,
      },
    ],
  },
  {
    id: '2m-amateur-5el',
    name: '5-Element 2m Amateur Radio',
    description: 'Medium gain Yagi for 2-meter amateur band (144-148 MHz)',
    frequency: 146,
    category: 'intermediate',
    tags: ['2m', 'amateur', 'VHF'],
    elements: [
      {
        type: 'reflector',
        position: -274,
        length: 1027,
        diameter: 8,
      },
      {
        type: 'driven',
        position: 0,
        length: 959,
        diameter: 8,
      },
      {
        type: 'director',
        position: 206,
        length: 925,
        diameter: 8,
      },
      {
        type: 'director',
        position: 481,
        length: 918,
        diameter: 8,
      },
      {
        type: 'director',
        position: 822,
        length: 911,
        diameter: 8,
      },
    ],
  },
  {
    id: '70cm-amateur-7el',
    name: '7-Element 70cm Amateur Radio',
    description: 'High gain Yagi for 70cm amateur band (430-440 MHz)',
    frequency: 435,
    category: 'intermediate',
    tags: ['70cm', 'amateur', 'UHF'],
    elements: [
      {
        type: 'reflector',
        position: -92,
        length: 345,
        diameter: 6,
      },
      {
        type: 'driven',
        position: 0,
        length: 322,
        diameter: 6,
      },
      {
        type: 'director',
        position: 69,
        length: 310,
        diameter: 6,
      },
      {
        type: 'director',
        position: 161,
        length: 308,
        diameter: 6,
      },
      {
        type: 'director',
        position: 276,
        length: 306,
        diameter: 6,
      },
      {
        type: 'director',
        position: 414,
        length: 304,
        diameter: 6,
      },
      {
        type: 'director',
        position: 575,
        length: 302,
        diameter: 6,
      },
    ],
  },
  {
    id: 'wifi-2.4ghz-11el',
    name: '11-Element WiFi 2.4GHz',
    description: 'Long range WiFi antenna for 2.4GHz band',
    frequency: 2450,
    category: 'advanced',
    tags: ['WiFi', '2.4GHz', 'long-range'],
    elements: [
      {
        type: 'reflector',
        position: -16.3,
        length: 61.2,
        diameter: 3,
      },
      {
        type: 'driven',
        position: 0,
        length: 57.1,
        diameter: 3,
      },
      {
        type: 'director',
        position: 12.2,
        length: 55.1,
        diameter: 3,
      },
      {
        type: 'director',
        position: 28.6,
        length: 54.7,
        diameter: 3,
      },
      {
        type: 'director',
        position: 49.0,
        length: 54.3,
        diameter: 3,
      },
      {
        type: 'director',
        position: 73.5,
        length: 53.9,
        diameter: 3,
      },
      {
        type: 'director',
        position: 102.0,
        length: 53.5,
        diameter: 3,
      },
      {
        type: 'director',
        position: 134.7,
        length: 53.1,
        diameter: 3,
      },
      {
        type: 'director',
        position: 171.4,
        length: 52.7,
        diameter: 3,
      },
      {
        type: 'director',
        position: 212.2,
        length: 52.3,
        diameter: 3,
      },
      {
        type: 'director',
        position: 257.1,
        length: 51.8,
        diameter: 3,
      },
    ],
  },
  {
    id: 'experimental-wideband',
    name: 'Experimental Wideband Design',
    description: 'Experimental design for wideband applications',
    frequency: 300,
    category: 'experimental',
    tags: ['wideband', 'experimental', 'research'],
    elements: [
      {
        type: 'reflector',
        position: -200,
        length: 500,
        diameter: 12,
      },
      {
        type: 'driven',
        position: 0,
        length: 480,
        diameter: 10,
      },
      {
        type: 'director',
        position: 150,
        length: 460,
        diameter: 8,
      },
      {
        type: 'director',
        position: 320,
        length: 450,
        diameter: 8,
      },
      {
        type: 'director',
        position: 500,
        length: 440,
        diameter: 8,
      },
      {
        type: 'director',
        position: 690,
        length: 430,
        diameter: 8,
      },
    ],
  },
]

export const getPresetById = (id: string): AntennaPreset | undefined => {
  return antennaPresets.find(preset => preset.id === id)
}

export const getPresetsByCategory = (category: AntennaPreset['category']): AntennaPreset[] => {
  return antennaPresets.filter(preset => preset.category === category)
}

export const getPresetsByTag = (tag: string): AntennaPreset[] => {
  return antennaPresets.filter(preset => preset.tags.includes(tag))
}
