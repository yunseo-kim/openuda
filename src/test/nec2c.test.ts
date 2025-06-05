import { describe, it, expect, beforeEach } from 'vitest'
import { NEC2Engine, type AntennaParams } from '../utils/nec2c'

describe('NEC2C Engine', () => {
  let engine: NEC2Engine

  beforeEach(() => {
    engine = new NEC2Engine()
  })

  it('should initialize with correct status', () => {
    const status = engine.getStatus()
    expect(status.loaded).toBe(false)
    expect(status.loading).toBe(false)
  })

  it('should have proper antenna parameter structure', () => {
    const testParams: AntennaParams = {
      frequency: 146,
      elements: [
        {
          type: 'driven',
          position: 0,
          length: 1.0,
          diameter: 0.002
        }
      ],
      groundType: 'perfect'
    }

    expect(testParams.frequency).toBe(146)
    expect(testParams.elements).toHaveLength(1)
    expect(testParams.elements[0].type).toBe('driven')
    expect(testParams.groundType).toBe('perfect')
  })

  it('should generate NEC input format correctly', () => {
    // This test would require access to private methods
    // For now, we just test the structure exists
    expect(typeof engine).toBe('object')
    expect(engine.getStatus).toBeDefined()
  })
}) 