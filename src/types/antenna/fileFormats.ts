// File format types for antenna design import/export

import { AntennaParams } from '@/utils/nec2c'

/**
 * Supported file formats for antenna design files
 */
export type SupportedFileFormat = 'yc6' | 'nec' | 'json'

/**
 * File format metadata
 */
export interface FileFormatInfo {
  extension: string
  name: string
  description: string
  mimeType: string
}

/**
 * File format registry
 */
export const FILE_FORMATS: Record<SupportedFileFormat, FileFormatInfo> = {
  yc6: {
    extension: '.yc6',
    name: 'YagiCAD',
    description: 'YagiCAD antenna design file',
    mimeType: 'application/octet-stream',
  },
  nec: {
    extension: '.nec',
    name: 'NEC',
    description: 'Numerical Electromagnetics Code input file',
    mimeType: 'text/plain',
  },
  json: {
    extension: '.json',
    name: 'OpenUda JSON',
    description: 'OpenUda internal antenna design format',
    mimeType: 'application/json',
  },
}

/**
 * YagiCAD .yc6 file structure
 */
export interface YagiCADData {
  frequency: number // MHz
  elements: YagiCADElement[]
  title?: string
  description?: string
}

export interface YagiCADElement {
  position: number // mm from reflector
  length: number // mm
  diameter: number // mm
  segments?: number
}

/**
 * NEC file structure (simplified)
 */
export interface NECData {
  frequency: number
  wires: NECWire[]
  excitation?: NECExcitation
  ground?: NECGround
  comments: string[]
}

export interface NECWire {
  tag: number
  segments: number
  x1: number
  y1: number
  z1: number
  x2: number
  y2: number
  z2: number
  radius: number
}

export interface NECExcitation {
  wireTag: number
  segment: number
  voltage: number
  phase: number
}

export interface NECGround {
  type: 'perfect' | 'real' | 'none'
  conductivity?: number
  dielectric?: number
}

/**
 * OpenUda internal JSON format
 */
export interface OpenUdaDesign {
  version: string
  metadata: {
    name: string
    description?: string
    author?: string
    created: string
    modified: string
  }
  antenna: AntennaParams
  simulation?: {
    results?: Record<string, unknown>
    settings?: Record<string, unknown>
  }
}

/**
 * File parsing result
 */
export interface FileParseResult {
  success: boolean
  data?: AntennaParams
  metadata?: Record<string, unknown>
  error?: string
  warnings?: string[]
}

/**
 * File export options
 */
export interface FileExportOptions {
  format: SupportedFileFormat
  filename?: string
  metadata?: {
    name?: string
    description?: string
    author?: string
  }
  includeSimulationResults?: boolean
}

/**
 * Drag and drop file info
 */
export interface DroppedFileInfo {
  file: File
  format: SupportedFileFormat | 'unknown'
  size: number
  lastModified: Date
}
