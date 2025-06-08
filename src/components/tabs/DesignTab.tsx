/**
 * Design Tab Component - Main antenna design interface
 */

import { useState } from 'react'
import { Card, CardBody, Tab, Tabs, Button, Select, SelectItem } from '@heroui/react'
import {
  CubeIcon,
  AdjustmentsHorizontalIcon,
  BeakerIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline'
import { PresetSelector } from '../antenna/PresetSelector'
import { ParameterForm } from '../antenna/ParameterForm'
import { Antenna3D } from '../antenna/Antenna3D'
import { FileUploadDropzone } from '../antenna/FileUploadDropzone'
import { FileExportModal } from '../antenna/FileExportModal'
import { useAntennaStore } from '@/stores/antenna/antennaStore'
import { useSimulationStore } from '@/stores/simulation.store'
import type { AntennaPreset } from '@/types/antenna/presets'
import type { AntennaParams } from '@/utils/nec2c'

type DesignMode = 'preset' | 'manual' | 'import'

export function DesignTab() {
  const {
    frequency,
    elements,
    selectedPresetId,
    setFrequency,
    setElements,
    setSelectedPresetId,
    resetDesign,
    runOptimization,
  } = useAntennaStore()
  const { isOptimizing } = useSimulationStore()

  const [designMode, setDesignMode] = useState<DesignMode>('preset')
  const [showExportModal, setShowExportModal] = useState(false)
  const [optimizationTarget, setOptimizationTarget] = useState<'gain' | 'fbRatio'>('gain')

  // Handle preset selection
  const handlePresetSelect = (preset: AntennaPreset) => {
    setSelectedPresetId(preset.id)
    setFrequency(preset.frequency)
    setElements(preset.elements)
  }

  // Handle manual mode switch
  const handleManualMode = () => {
    setDesignMode('manual')
    setSelectedPresetId(undefined)
    // If no elements exist, start with a simple 3-element design
    if (elements.length === 0) {
      setElements([
        { type: 'reflector', position: -200, length: 500, diameter: 10 },
        { type: 'driven', position: 0, length: 480, diameter: 10 },
        { type: 'director', position: 150, length: 460, diameter: 10 },
      ])
    }
  }

  // Handle file import
  const handleFileLoaded = (antennaParams: AntennaParams, metadata?: Record<string, unknown>) => {
    setFrequency(antennaParams.frequency)
    setElements(antennaParams.elements)
    setSelectedPresetId(undefined)
    setDesignMode('manual')
    console.log('File loaded:', { antennaParams, metadata })
  }

  // Handle export button click
  const handleExport = () => {
    setShowExportModal(true)
  }

  const handleOptimize = () => {
    runOptimization(optimizationTarget)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Design Input */}
      <div className="space-y-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Antenna Design
            </h2>

            {/* Design Mode Tabs */}
            <Tabs
              selectedKey={designMode}
              onSelectionChange={key => setDesignMode(key as DesignMode)}
              fullWidth
              size="sm"
              classNames={{
                tabList: 'mb-4',
              }}
            >
              <Tab
                key="preset"
                title={
                  <div className="flex items-center gap-2">
                    <CubeIcon className="w-4 h-4" />
                    <span>Presets</span>
                  </div>
                }
              />
              <Tab
                key="manual"
                title={
                  <div className="flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                    <span>Manual</span>
                  </div>
                }
              />
              <Tab
                key="import"
                title={
                  <div className="flex items-center gap-2">
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    <span>Import</span>
                  </div>
                }
              />
            </Tabs>

            {/* Content based on mode */}
            {designMode === 'preset' ? (
              <>
                <PresetSelector
                  selectedPresetId={selectedPresetId}
                  onPresetSelect={handlePresetSelect}
                />

                {selectedPresetId && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      onPress={handleManualMode}
                      startContent={<AdjustmentsHorizontalIcon className="w-4 h-4" />}
                    >
                      Customize This Design
                    </Button>
                  </div>
                )}
              </>
            ) : designMode === 'manual' ? (
              <ParameterForm
                frequency={frequency}
                elements={elements}
                onFrequencyChange={setFrequency}
                onElementsChange={setElements}
              />
            ) : (
              <FileUploadDropzone onFileLoaded={handleFileLoaded} className="min-h-[200px]" />
            )}
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white dark:bg-gray-800">
          <CardBody className="flex flex-row gap-3 items-center">
            <Button
              color="primary"
              variant="flat"
              size="sm"
              startContent={<BeakerIcon className="w-4 h-4" />}
              isDisabled={elements.length === 0 || isOptimizing}
              onPress={handleOptimize}
              isLoading={isOptimizing}
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize'}
            </Button>
            <Select
              aria-label="Optimization Target"
              size="sm"
              placeholder="Target"
              className="max-w-[150px]"
              selectedKeys={[optimizationTarget]}
              onSelectionChange={keys =>
                setOptimizationTarget(Array.from(keys)[0] as 'gain' | 'fbRatio')
              }
              isDisabled={elements.length === 0 || isOptimizing}
            >
              <SelectItem key="gain">Gain</SelectItem>
              <SelectItem key="fbRatio">F/B Ratio</SelectItem>
            </Select>

            <Button color="default" variant="flat" size="sm" onPress={resetDesign}>
              Reset
            </Button>

            <div className="flex-1" />

            <Button
              color="success"
              variant="flat"
              size="sm"
              isDisabled={elements.length === 0}
              onPress={handleExport}
              startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              Export
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Right Panel - 3D Visualization */}
      <div className="space-y-4">
        <Card className="h-full min-h-[600px] bg-white dark:bg-gray-800">
          <CardBody className="p-0">
            {elements.length > 0 ? (
              <Antenna3D
                elements={elements}
                frequency={frequency}
                showGrid={true}
                showLabels={false}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <CubeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No Antenna Design</p>
                  <p className="text-sm">Select a preset or create a manual design to visualize</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* File Export Modal */}
      <FileExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        antennaParams={{ frequency, elements, groundType: 'perfect' }}
        defaultFilename="uda_antenna_design"
      />
    </div>
  )
}
