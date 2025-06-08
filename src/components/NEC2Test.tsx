import { Button, Card, CardBody, CardHeader, Divider } from '@heroui/react'
import { useEffect, useState } from 'react'
import { nec2Engine, testNEC2Engine, type AntennaParams } from '@/utils/nec2c'

/**
 * NEC2C Engine Test Component
 *
 * This component provides a user interface for testing the NEC2C WebAssembly engine.
 * It includes engine loading status, basic functionality tests, and a simple antenna simulation.
 */
export function NEC2Test() {
  const [isLoading, setIsLoading] = useState(false)
  const [isEngineLoaded, setIsEngineLoaded] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    setIsEngineLoaded(nec2Engine.getStatus().loaded)
  }, [])

  const handleLoadEngine = async () => {
    setIsLoading(true)
    setError('')
    setResult('')

    try {
      await nec2Engine.loadModule()
      setResult('Engine loaded successfully!')
      setIsEngineLoaded(true)
    } catch (err) {
      console.error('Failed to load engine:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsEngineLoaded(false)
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
      setIsEngineLoaded(false)
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
      setIsEngineLoaded(false)
    }
  }

  return (
    <Card className="m-4 max-w-4xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
      <CardHeader className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">🧪 NEC2C Engine Test</h2>
      </CardHeader>
      <Divider className="border-gray-200 dark:border-gray-700" />
      <CardBody className="space-y-4 p-6">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-blue-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🔧 Engine Status:
            </p>
            <span
              className={`text-sm font-semibold px-2 py-1 rounded-full ${
                isEngineLoaded
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}
            >
              {isEngineLoaded ? '✅ Loaded' : '❌ Not Loaded'}
            </span>
          </div>
          {isLoading && !isEngineLoaded && (
            <div className="mt-2 flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                ⏳ Loading...
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            color="primary"
            variant="solid"
            onPress={handleLoadEngine}
            isLoading={isLoading && !isEngineLoaded}
            isDisabled={isEngineLoaded}
            className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm border-0"
            style={{
              background: isEngineLoaded ? '#10b981' : '#2563eb',
              color: 'white',
              border: 'none',
            }}
          >
            {isEngineLoaded ? '✅ Loaded' : '🔄 Load Engine'}
          </Button>

          <Button
            color="secondary"
            variant="solid"
            onPress={handleTestEngine}
            isLoading={isLoading && isEngineLoaded}
            isDisabled={!isEngineLoaded}
            className="min-w-[120px] bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm border-0"
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
            }}
          >
            🧪 Basic Test
          </Button>

          <Button
            color="success"
            variant="solid"
            onPress={handleRunSimulation}
            isLoading={isLoading && isEngineLoaded}
            isDisabled={!isEngineLoaded}
            className="min-w-[160px] bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm border-0"
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
            }}
          >
            📡 Antenna Simulation
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Execution Results
              </h3>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-green-800 dark:text-green-200 bg-white dark:bg-gray-800 p-3 rounded border">
              {result}
            </pre>
          </div>
        )}

        {error && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900 dark:to-pink-900 rounded-lg border border-red-200 dark:border-red-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 dark:text-red-400 text-lg">❌</span>
              <h3 className="font-semibold text-red-800 dark:text-red-200">Error Occurred</h3>
            </div>
            <p className="text-red-700 dark:text-red-200 text-sm bg-white dark:bg-gray-800 p-3 rounded border">
              {error}
            </p>
          </div>
        )}

        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
            <h3 className="font-bold text-sm text-blue-800 dark:text-blue-200">Instructions</h3>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 dark:text-blue-400">1️⃣</span>
              <span>First click "🔄 Load Engine" to load the NEC2C WebAssembly module.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 dark:text-blue-400">2️⃣</span>
              <span>Use "🧪 Basic Test" to verify the engine works correctly.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 dark:text-blue-400">3️⃣</span>
              <span>Use "📡 Antenna Simulation" to simulate a 3-element Yagi antenna.</span>
            </li>
          </ol>
        </div>
      </CardBody>
    </Card>
  )
}
