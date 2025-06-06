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
      .filter(line => line)

    if (lines.length < 2) {
      return {
        success: false,
        error: 'Invalid YagiCAD file: insufficient data',
      }
    }

    // Parse frequency (first line should contain frequency info)
    const frequencyMatch = lines[0].match(/(\d+(?:\.\d+)?)/)
    if (!frequencyMatch) {
      return {
        success: false,
        error: 'Could not parse frequency from YagiCAD file',
      }
    }

    const frequency = parseFloat(frequencyMatch[1])
    const elements: AntennaElement[] = []
    const warnings: string[] = []

    // Parse elements data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = line
        .split(/\s+/)
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v))

      if (values.length >= 2) {
        const [position, length, diameter = 6] = values // default 6mm diameter

        // Convert mm to meters for internal format
        const element: AntennaElement = {
          type: i === 1 ? 'reflector' : i === 2 ? 'driven' : 'director',
          position: position / 1000, // mm to m
          length: length / 1000, // mm to m
          diameter: diameter / 1000, // mm to m
          segments: 21,
        }

        elements.push(element)
      } else {
        warnings.push(`Line ${i + 1}: Could not parse element data`)
      }
    }

    if (elements.length === 0) {
      return {
        success: false,
        error: 'No valid antenna elements found in YagiCAD file',
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

  // Header with frequency
  lines.push(`${antennaParams.frequency.toFixed(1)} MHz`)

  // Element data (convert meters to mm)
  antennaParams.elements.forEach(element => {
    const position = (element.position * 1000).toFixed(1)
    const length = (element.length * 1000).toFixed(1)
    const diameter = (element.diameter * 1000).toFixed(1)
    lines.push(`${position} ${length} ${diameter}`)
  })

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
  antennaParams.elements.forEach((element, index) => {
    const tag = index + 1
    const segments = element.segments || 21
    const halfLength = element.length / 2
    const radius = element.diameter / 2

    lines.push(
      `GW ${tag} ${segments} ${element.position.toFixed(4)} ${(-halfLength).toFixed(4)} 0 ` +
        `${element.position.toFixed(4)} ${halfLength.toFixed(4)} 0 ${radius.toFixed(6)}`
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
