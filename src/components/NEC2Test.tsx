import { useState } from 'react'
import { Button, Card, CardBody, CardHeader, Divider, Spinner, Code } from '@nextui-org/react'
import { CheckCircleIcon, XCircleIcon, PlayIcon } from '@heroicons/react/24/outline'
import { testNEC2Engine, nec2Engine, simulateAntenna, type AntennaParams, type SimulationResults } from '../utils/nec2c'

/**
 * NEC2C Engine Test Component
 * 
 * This component provides a user interface for testing the NEC2C WebAssembly engine.
 * It includes engine loading status, basic functionality tests, and a simple antenna simulation.
 */
export function NEC2Test() {
  const [engineStatus, setEngineStatus] = useState<{ loaded: boolean; loading: boolean }>({ loaded: false, loading: false })
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [simulationResult, setSimulationResult] = useState<SimulationResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load NEC2C engine
  const handleLoadEngine = async () => {
    try {
      setError(null)
      setEngineStatus({ loaded: false, loading: true })
      
      await nec2Engine.loadModule()
      setEngineStatus(nec2Engine.getStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load engine')
      setEngineStatus({ loaded: false, loading: false })
    }
  }

  // Run engine test
  const handleRunTest = async () => {
    try {
      setError(null)
      setIsRunningTest(true)
      setTestResult(null)
      
      const result = await testNEC2Engine()
      setTestResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
      setTestResult(false)
    } finally {
      setIsRunningTest(false)
    }
  }

  // Run simple antenna simulation
  const handleSimulateAntenna = async () => {
    try {
      setError(null)
      setSimulationResult(null)
      
      // Simple 3-element Yagi antenna for 146 MHz
      const antennaParams: AntennaParams = {
        frequency: 146,
        elements: [
          {
            type: 'reflector',
            position: -0.15,  // 15cm behind driven element
            length: 1.04,     // 104cm
            diameter: 0.006,  // 6mm
            segments: 21
          },
          {
            type: 'driven',
            position: 0,      // origin
            length: 1.0,      // 100cm  
            diameter: 0.006,  // 6mm
            segments: 21
          },
          {
            type: 'director',
            position: 0.12,   // 12cm in front of driven element
            length: 0.96,     // 96cm
            diameter: 0.006,  // 6mm
            segments: 21
          }
        ],
        groundType: 'perfect'
      }
      
      const result = await simulateAntenna(antennaParams)
      setSimulationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">NEC2C Engine Test</h1>
        <p className="text-gray-600">Test the WebAssembly-compiled NEC2C electromagnetic simulation engine</p>
      </div>

      {/* Engine Status */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Engine Status</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Engine Loaded:</span>
              <div className="flex items-center gap-2">
                {engineStatus.loading ? (
                  <Spinner size="sm" />
                ) : engineStatus.loaded ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className={engineStatus.loaded ? 'text-green-600' : 'text-red-600'}>
                  {engineStatus.loading ? 'Loading...' : engineStatus.loaded ? 'Ready' : 'Not Loaded'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                color="primary"
                variant="solid"
                onPress={handleLoadEngine}
                isDisabled={engineStatus.loaded || engineStatus.loading}
                isLoading={engineStatus.loading}
              >
                Load Engine
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Engine Test */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Engine Test</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-4">
            <p className="text-gray-600">
              Run a basic test to verify the engine can perform electromagnetic simulations.
            </p>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Test Result:</span>
              <div className="flex items-center gap-2">
                {isRunningTest ? (
                  <Spinner size="sm" />
                ) : testResult === true ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : testResult === false ? (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                ) : null}
                <span className={
                  testResult === true ? 'text-green-600' : 
                  testResult === false ? 'text-red-600' : 'text-gray-500'
                }>
                  {isRunningTest ? 'Running...' : 
                   testResult === true ? 'Passed' : 
                   testResult === false ? 'Failed' : 'Not Run'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                color="primary"
                variant="solid"
                startContent={<PlayIcon className="h-4 w-4" />}
                onPress={handleRunTest}
                isDisabled={!engineStatus.loaded || isRunningTest}
                isLoading={isRunningTest}
              >
                Run Test
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Antenna Simulation Test */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Antenna Simulation Test</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-4">
            <p className="text-gray-600">
              Simulate a 3-element Yagi antenna for 146 MHz (2m amateur radio band).
            </p>
            
            <div className="flex gap-3">
              <Button
                color="secondary"
                variant="solid"
                startContent={<PlayIcon className="h-4 w-4" />}
                onPress={handleSimulateAntenna}
                isDisabled={!engineStatus.loaded}
              >
                Simulate Antenna
              </Button>
            </div>
            
            {simulationResult && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Simulation Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Gain:</span>
                        <span className="font-mono">{simulationResult.gain.toFixed(2)} dBi</span>
                      </div>
                      <div className="flex justify-between">
                        <span>F/B Ratio:</span>
                        <span className="font-mono">{simulationResult.frontToBackRatio.toFixed(2)} dB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VSWR:</span>
                        <span className="font-mono">{simulationResult.vswr.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efficiency:</span>
                        <span className="font-mono">{simulationResult.efficiency.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Input Impedance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Resistance:</span>
                        <span className="font-mono">{simulationResult.inputImpedance.resistance.toFixed(1)} Ω</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reactance:</span>
                        <span className="font-mono">{simulationResult.inputImpedance.reactance.toFixed(1)} Ω</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frequency:</span>
                        <span className="font-mono">{simulationResult.frequency} MHz</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <CardBody>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <XCircleIcon className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <Code color="danger" className="text-sm">
                {error}
              </Code>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Instructions</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="space-y-3 text-sm text-gray-600">
            <p>1. <strong>Load Engine:</strong> First, load the NEC2C WebAssembly module.</p>
            <p>2. <strong>Run Test:</strong> Verify the engine works with a simple dipole test.</p>
            <p>3. <strong>Simulate Antenna:</strong> Test with a realistic 3-element Yagi antenna.</p>
            <p className="mt-4 text-xs text-gray-500">
              Note: The engine may take a few seconds to load initially due to WebAssembly compilation.
              SharedArrayBuffer support enables multithreaded simulation for better performance.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
} 