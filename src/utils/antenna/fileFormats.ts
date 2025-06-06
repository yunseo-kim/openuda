// File format parsers and generators for antenna design files

import { AntennaParams, AntennaElement } from '@/utils/nec2c'
import {
  SupportedFileFormat,
  FileParseResult,
  FileExportOptions,
  OpenUdaDesign,
  DroppedFileInfo,
  FILE_FORMATS,
} from '@/types/antenna/fileFormats'

/**
 * Detect file format from file extension or content
 */
export function detectFileFormat(file: File): SupportedFileFormat | 'unknown' {
  const extension = file.name.toLowerCase().split('.').pop()

  switch (extension) {
    case 'yc6':
      return 'yc6'
    case 'nec':
      return 'nec'
    case 'json':
      return 'json'
    default:
      return 'unknown'
  }
}

/**
 * Create dropped file info from File object
 */
export function createDroppedFileInfo(file: File): DroppedFileInfo {
  return {
    file,
    format: detectFileFormat(file),
    size: file.size,
    lastModified: new Date(file.lastModified),
  }
}

/**
 * Parse antenna design file
 */
export async function parseAntennaFile(file: File): Promise<FileParseResult> {
  const format = detectFileFormat(file)

  if (format === 'unknown') {
    return {
      success: false,
      error: `Unsupported file format. Expected: ${Object.values(FILE_FORMATS)
        .map(f => f.extension)
        .join(', ')}`,
    }
  }

  try {
    const text = await file.text()

    switch (format) {
      case 'yc6':
        return parseYagiCADFile(text)
      case 'nec':
        return parseNECFile(text)
      case 'json':
        return parseJSONFile(text)
      default:
        return {
          success: false,
          error: 'Unsupported file format',
        }
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse YagiCAD .yc6 file
 */
function parseYagiCADFile(content: string): FileParseResult {
  try {
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*****'))

    if (lines.length < 15) {
      return {
        success: false,
        error: 'Invalid YagiCAD file: insufficient data',
      }
    }

    // Parse header
    if (!lines[0].includes('YAGICAD') || !lines[0].includes('FILE')) {
      return {
        success: false,
        error: 'Invalid YagiCAD file: missing header',
      }
    }

    // Parse metadata (lines 1-4)
    const title = lines[1] === 'NONE' ? 'Untitled Antenna' : lines[1]
    const date = lines[2] === 'NONE' ? '' : lines[2]
    const author = lines[3] === 'NONE' ? '' : lines[3]
    const description = lines[4] === 'NONE' ? '' : lines[4]

    // Parse performance parameters (lines 5-9)
    const antennaGain = parseFloat(lines[5]) // 안테나 이득 (dBi)
    const fbRatio = parseFloat(lines[6]) // F/B ratio (dB)
    const inputResistance = parseFloat(lines[7]) // 입력 임피던스 실수부 (옴)
    const inputReactance = parseFloat(lines[8]) // 입력 임피던스 허수부

    // Parse element count (line 9)
    const elementCount = parseInt(lines[9])
    if (isNaN(elementCount) || elementCount <= 0) {
      return {
        success: false,
        error: 'Invalid YagiCAD file: invalid element count',
      }
    }

    // Parse element data (lines 10 to 10+elementCount-1)
    const elements: AntennaElement[] = []
    const warnings: string[] = []

    for (let i = 0; i < elementCount; i++) {
      const lineIndex = 10 + i
      if (lineIndex >= lines.length) {
        warnings.push(`Missing element data for element ${i + 1}`)
        continue
      }

      const line = lines[lineIndex]
      const values = line
        .split(/\s+/)
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v))

      if (values.length >= 9) {
        // YagiCAD format: length, position, diameter, 0, 0, segments, type_flag, 0, 0
        const [length, position, diameter, , , segments, typeFlag] = values

        // Determine element type based on type flag and position
        let type: 'reflector' | 'driven' | 'director'
        if (typeFlag === 1) {
          type = 'reflector'
        } else if (position === 0) {
          type = 'driven'
        } else {
          type = 'director'
        }

        // Values are in meters in YagiCAD files, convert to mm for UI
        const element: AntennaElement = {
          type,
          position: Math.abs(position) * 1000, // Convert m to mm
          length: length * 1000, // Convert m to mm
          diameter: diameter * 1000, // Convert m to mm
          segments: Math.floor(segments) || 21,
        }

        elements.push(element)
      } else {
        warnings.push(
          `Line ${lineIndex + 1}: Could not parse element data - expected 9 values, got ${values.length}`
        )
      }
    }

    if (elements.length === 0) {
      return {
        success: false,
        error: 'No valid antenna elements found in YagiCAD file',
      }
    }

    // Parse frequency (line after element data)
    const frequencyLineIndex = 10 + elementCount
    if (frequencyLineIndex >= lines.length) {
      return {
        success: false,
        error: 'Missing frequency data in YagiCAD file',
      }
    }

    const frequency = parseFloat(lines[frequencyLineIndex])
    if (isNaN(frequency)) {
      return {
        success: false,
        error: 'Invalid frequency data in YagiCAD file',
      }
    }

    // Parse efficiency (next line after frequency)
    const efficiencyLineIndex = frequencyLineIndex + 1
    const efficiency =
      efficiencyLineIndex < lines.length ? parseFloat(lines[efficiencyLineIndex]) : null

    // Parse transmission line impedance (찾을 수 있으면)
    let transmissionLineImpedance = 50 // default
    for (let i = frequencyLineIndex + 2; i < Math.min(lines.length, frequencyLineIndex + 15); i++) {
      const value = parseFloat(lines[i])
      if (value === 50 || value === 75 || (value >= 25 && value <= 600)) {
        transmissionLineImpedance = value
        break
      }
    }

    // Sort elements by position
    elements.sort((a, b) => a.position - b.position)

    // Ensure we have at least one driven element
    if (!elements.some(e => e.type === 'driven')) {
      // Find element at position 0 or closest to 0
      let drivenIndex = 0
      let minDistance = Math.abs(elements[0].position)

      for (let i = 1; i < elements.length; i++) {
        const distance = Math.abs(elements[i].position)
        if (distance < minDistance) {
          minDistance = distance
          drivenIndex = i
        }
      }

      elements[drivenIndex].type = 'driven'
    }

    const antennaParams: AntennaParams = {
      frequency,
      elements,
      groundType: 'perfect',
    }

    const metadata = {
      name: title,
      author,
      description,
      date,
      originalFormat: 'yc6',
      performanceData: {
        antennaGain,
        fbRatio,
        inputResistance,
        inputReactance,
        efficiency,
        transmissionLineImpedance,
      },
    }

    return {
      success: true,
      data: antennaParams,
      metadata,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse YagiCAD file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse NEC .nec file
 */
function parseNECFile(content: string): FileParseResult {
  try {
    const lines = content.split('\n').map(line => line.trim())
    const elements: AntennaElement[] = []
    let frequency = 146 // default frequency
    const warnings: string[] = []

    for (const line of lines) {
      if (line.startsWith('CM') || line.startsWith('CE')) {
        // Comment lines - extract frequency if mentioned
        const freqMatch = line.match(/(\d+(?:\.\d+)?)\s*MHz/i)
        if (freqMatch) {
          frequency = parseFloat(freqMatch[1])
        }
        continue
      }

      // Parse GW (wire geometry) lines
      if (line.startsWith('GW')) {
        const parts = line.split(/\s+/)
        if (parts.length >= 8) {
          try {
            const tag = parseInt(parts[1])
            const segments = parseInt(parts[2])
            const x1 = parseFloat(parts[3])
            const y1 = parseFloat(parts[4])
            const y2 = parseFloat(parts[7])
            const radius = parseFloat(parts[8])

            // Calculate element properties
            const length = Math.abs(y2 - y1)
            const position = x1
            const diameter = radius * 2

            const element: AntennaElement = {
              type: tag === 1 ? 'reflector' : tag === 2 ? 'driven' : 'director',
              position,
              length,
              diameter,
              segments,
            }

            elements.push(element)
          } catch {
            warnings.push(`Could not parse wire geometry: ${line}`)
          }
        }
      }

      // Parse FR (frequency) lines
      if (line.startsWith('FR')) {
        const parts = line.split(/\s+/)
        if (parts.length >= 6) {
          frequency = parseFloat(parts[5])
        }
      }
    }

    if (elements.length === 0) {
      return {
        success: false,
        error: 'No antenna elements found in NEC file',
      }
    }

    const antennaParams: AntennaParams = {
      frequency,
      elements,
      groundType: 'perfect',
    }

    return {
      success: true,
      data: antennaParams,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse NEC file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse OpenUda JSON file
 */
function parseJSONFile(content: string): FileParseResult {
  try {
    const data = JSON.parse(content) as OpenUdaDesign

    // Validate JSON structure
    if (!data.antenna || !data.antenna.frequency || !data.antenna.elements) {
      return {
        success: false,
        error: 'Invalid OpenUda JSON format: missing required antenna properties',
      }
    }

    return {
      success: true,
      data: data.antenna,
      metadata: data.metadata,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON file: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
    }
  }
}

/**
 * Export antenna design to file
 */
export function exportAntennaFile(
  antennaParams: AntennaParams,
  options: FileExportOptions
): { content: string; filename: string; mimeType: string } {
  const formatInfo = FILE_FORMATS[options.format]
  const filename = options.filename || `antenna_design${formatInfo.extension}`

  let content: string

  switch (options.format) {
    case 'yc6':
      content = generateYagiCADFile(antennaParams)
      break
    case 'nec':
      content = generateNECFile(antennaParams, options.metadata)
      break
    case 'json':
      content = generateJSONFile(antennaParams, options)
      break
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }

  return {
    content,
    filename,
    mimeType: formatInfo.mimeType,
  }
}

/**
 * Generate YagiCAD .yc6 file content
 */
function generateYagiCADFile(antennaParams: AntennaParams): string {
  const lines: string[] = []
  const currentDate = new Date()
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '/')

  // Header
  lines.push('VK3DIP YAGICAD 6.0 FILE')
  lines.push('OpenUda Antenna Design')
  lines.push(currentDate)
  lines.push('OpenUda')
  lines.push('Exported from OpenUda Web Application')

  // Performance parameters (approximations for compatibility)
  lines.push('8.0') // Antenna gain estimate (dBi)
  lines.push('12.0') // F/B ratio approximation (dB)
  lines.push('50.0') // Input resistance approximation (ohm)
  lines.push('0.0') // Input reactance approximation

  // Element count
  lines.push(antennaParams.elements.length.toString())

  // Element data (YagiCAD format: length, position, diameter, 0, 0, segments, type_flag, 0, 0)
  // Convert mm to meters for YagiCAD format
  antennaParams.elements.forEach(element => {
    const length = (element.length / 1000).toFixed(6) // Convert mm to m
    const position = (element.position / 1000).toFixed(8) // Convert mm to m
    const diameter = (element.diameter / 1000).toFixed(3) // Convert mm to m
    const segments = element.segments || 21

    // Element type flag: 1 for reflector, 0 for others
    let typeFlag = 0 // driven/director
    if (element.type === 'reflector') {
      typeFlag = 1
    }

    lines.push(
      `${length}      ${position}      ${diameter}      0      0      ${segments}      ${typeFlag}      0      0`
    )
  })

  // Frequency (MHz)
  lines.push(antennaParams.frequency.toFixed(1))

  // Additional parameters
  lines.push('100') // Efficiency (%)
  lines.push('DIRECT') // Polarization
  lines.push('0')
  lines.push('0')
  lines.push('0')
  lines.push('0')
  lines.push('0')
  lines.push('0')
  lines.push('0')
  lines.push('50') // Transmission line impedance (ohm)
  lines.push('0')
  lines.push('0')
  lines.push('0')
  lines.push('')
  lines.push('*****EOF*****')

  return lines.join('\n')
}

/**
 * Generate NEC .nec file content
 */
function generateNECFile(antennaParams: AntennaParams, metadata?: Record<string, unknown>): string {
  const lines: string[] = []

  // Header comments
  lines.push(`CM OpenUda Yagi-Uda Antenna Design`)
  if (metadata?.name) {
    lines.push(`CM Name: ${metadata.name}`)
  }
  if (metadata?.description) {
    lines.push(`CM Description: ${metadata.description}`)
  }
  lines.push(`CM Frequency: ${antennaParams.frequency} MHz`)
  lines.push(`CE`)

  // Wire geometry
  // Convert mm to meters for NEC format
  antennaParams.elements.forEach((element, index) => {
    const tag = index + 1
    const segments = element.segments || 21
    const position = element.position / 1000 // Convert mm to m
    const length = element.length / 1000 // Convert mm to m
    const diameter = element.diameter / 1000 // Convert mm to m
    const halfLength = length / 2
    const radius = diameter / 2

    lines.push(
      `GW ${tag} ${segments} ${position.toFixed(4)} ${(-halfLength).toFixed(4)} 0 ` +
        `${position.toFixed(4)} ${halfLength.toFixed(4)} 0 ${radius.toFixed(6)}`
    )
  })

  // End geometry
  lines.push('GE 0')

  // Find driven element
  const drivenIndex = antennaParams.elements.findIndex(e => e.type === 'driven') || 0
  const drivenSegment = Math.floor((antennaParams.elements[drivenIndex].segments || 21) / 2) + 1

  // Excitation
  lines.push(`EX 0 ${drivenIndex + 1} ${drivenSegment} 0 1 0`)

  // Ground
  if (antennaParams.groundType === 'perfect') {
    lines.push('GN 1')
  } else if (antennaParams.groundType === 'real') {
    const conductivity = antennaParams.groundConductivity || 0.005
    const dielectric = antennaParams.groundDielectric || 13
    lines.push(`GN 2 0 0 0 ${conductivity} ${dielectric}`)
  }

  // Frequency
  lines.push(`FR 0 1 0 0 ${antennaParams.frequency} 0`)

  // End
  lines.push('EN')

  return lines.join('\n')
}

/**
 * Generate OpenUda JSON file content
 */
function generateJSONFile(antennaParams: AntennaParams, options: FileExportOptions): string {
  const design: OpenUdaDesign = {
    version: '1.0.0',
    metadata: {
      name: options.metadata?.name || 'Untitled Antenna Design',
      description: options.metadata?.description,
      author: options.metadata?.author,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    antenna: antennaParams,
  }

  return JSON.stringify(design, null, 2)
}

/**
 * Download file to user's device
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
