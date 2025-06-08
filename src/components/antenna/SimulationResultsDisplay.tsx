import { Card, CardBody, CardHeader, Divider, Spinner } from '@heroui/react'
import { useSimulationStore } from '@/stores/simulation.store'

/**
 * Displays the results of the antenna simulation.
 * It shows loading spinners, error messages, or the formatted simulation results.
 */
export function SimulationResultsDisplay() {
  const { results, isLoading, error, isOptimizing, optimizationLog } = useSimulationStore()

  const renderContent = () => {
    if (isOptimizing) {
      return (
        <div className="p-4 m-2 rounded-lg bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <Spinner color="primary" />
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Optimizing...</h3>
          </div>
          <pre className="whitespace-pre-wrap text-xs font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-4 rounded border h-32 overflow-y-auto">
            {optimizationLog.join('\\n')}
          </pre>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-3 p-6 text-gray-600 dark:text-gray-400">
          <Spinner color="primary" />
          <p className="font-medium">Running simulation...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-4 m-2 rounded-lg bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 dark:text-red-400 text-lg">❌</span>
            <h3 className="font-semibold text-red-800 dark:text-red-200">Simulation Error</h3>
          </div>
          <p className="text-red-700 dark:text-red-200 text-sm bg-white dark:bg-gray-800 p-3 rounded border">
            {error}
          </p>
        </div>
      )
    }

    if (!results) {
      return (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          <p>Simulation results will be displayed here.</p>
          <p className="text-sm">Enter antenna parameters to start.</p>
        </div>
      )
    }

    // Format results for display
    const formattedResults = `
Gain:               ${results.gain.toFixed(2)} dBi
Front-to-Back Ratio: ${results.frontToBackRatio.toFixed(2)} dB
VSWR:               ${results.vswr.toFixed(2)}
Input Impedance:    ${results.inputImpedance.resistance.toFixed(2)} + j${results.inputImpedance.reactance.toFixed(2)} Ω
Efficiency:         ${results.efficiency.toFixed(1)} %
    `.trim()

    return (
      <div className="p-4 m-2 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
          <h3 className="font-semibold text-green-800 dark:text-green-200">Simulation Complete</h3>
        </div>
        <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-4 rounded border-gray-300 dark:border-gray-600">
          {formattedResults}
        </pre>
      </div>
    )
  }

  return (
    <Card className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700">
      <CardHeader className="bg-gray-50 dark:bg-gray-900 px-6 py-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          📡 Simulation Results
        </h2>
      </CardHeader>
      <Divider className="border-gray-200 dark:border-gray-700" />
      <CardBody>{renderContent()}</CardBody>
    </Card>
  )
}
