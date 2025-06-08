import { Button, Card, CardBody, CardHeader, Divider } from '@heroui/react'
import { useState } from 'react'
import { nec2Engine, testNEC2Engine, type AntennaParams } from '@/utils/nec2c'

/**
 * NEC2C Engine Test Component
 *
 * This component provides a user interface for testing the NEC2C WebAssembly engine.
 * It includes engine loading status, basic functionality tests, and a simple antenna simulation.
 */
export function NEC2Test() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleLoadEngine = async () => {
    setIsLoading(true)
    setError('')
    setResult('')

    try {
      await nec2Engine.loadModule()
      setResult('Engine loaded successfully!')
    } catch (err) {
      console.error('Failed to load engine:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestEngine = async () => {
    setIsLoading(true)
    setError('')
    setResult('')

    try {
      const success = await testNEC2Engine()
      if (success) {
        setResult('Engine test passed! Basic dipole simulation completed.')
      } else {
        setError('Engine test failed')
      }
    } catch (err) {
      console.error('Test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunSimulation = async () => {
    setIsLoading(true)
    setError('')
    setResult('')

    try {
      // Test with a 3-element Yagi antenna
      const params: AntennaParams = {
        frequency: 146, // 2m band
        elements: [
          {
            type: 'reflector',
            position: -310, // mm
            length: 1020, // mm
            diameter: 10, // mm
          },
          {
            type: 'driven',
            position: 0,
            length: 980,
            diameter: 10,
          },
          {
            type: 'director',
            position: 250,
            length: 940,
            diameter: 10,
          },
        ],
        groundType: 'none',
      }

      const results = await nec2Engine.simulate(params)

      setResult(
        `
Simulation Results:
- Gain: ${results.gain.toFixed(2)} dBi
- F/B Ratio: ${results.frontToBackRatio.toFixed(2)} dB
- VSWR: ${results.vswr.toFixed(2)}
- Input Impedance: ${results.inputImpedance.resistance.toFixed(2)} + j${results.inputImpedance.reactance.toFixed(2)} Ω
- Efficiency: ${results.efficiency.toFixed(1)}%
      `.trim()
      )
    } catch (err) {
      console.error('Simulation failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const engineStatus = nec2Engine.getStatus()

  return (
    <Card className="m-4 max-w-4xl">
      <CardHeader>
        <h2 className="text-xl font-bold">NEC2C Engine Test</h2>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm">
            Engine Status:{' '}
            <span
              className={
                engineStatus.loaded
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {engineStatus.loaded ? '✅ Loaded' : '❌ Not Loaded'}
            </span>
          </p>
          {engineStatus.loading && <p className="text-sm text-yellow-600">⏳ Loading...</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            color="primary"
            variant="solid"
            onPress={handleLoadEngine}
            isLoading={isLoading && !engineStatus.loaded}
            isDisabled={engineStatus.loaded}
            className="min-w-[120px]"
          >
            {engineStatus.loaded ? 'Loaded' : 'Load Engine'}
          </Button>

          <Button
            color="secondary"
            variant="solid"
            onPress={handleTestEngine}
            isLoading={isLoading && engineStatus.loaded}
            isDisabled={!engineStatus.loaded}
            className="min-w-[120px]"
          >
            Run Basic Test
          </Button>

          <Button
            color="success"
            variant="solid"
            onPress={handleRunSimulation}
            isLoading={isLoading && engineStatus.loaded}
            isDisabled={!engineStatus.loaded}
            className="min-w-[160px]"
          >
            Run Antenna Simulation
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <h3 className="font-bold text-sm mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>First click "Load Engine" to load the NEC2C WebAssembly module.</li>
            <li>Use "Run Basic Test" to verify the engine works correctly.</li>
            <li>Use "Run Antenna Simulation" to simulate a 3-element Yagi antenna.</li>
          </ol>
        </div>
      </CardBody>
    </Card>
  )
}
