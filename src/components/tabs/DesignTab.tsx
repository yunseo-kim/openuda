/**
 * Design Tab Component - Main antenna design interface
 */

import { useState } from 'react'
import { Card, CardBody, Tab, Tabs, Button, Divider } from '@nextui-org/react'
import { CubeIcon, AdjustmentsHorizontalIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { PresetSelector } from '../antenna/PresetSelector'
import { ParameterForm } from '../antenna/ParameterForm'
import { Antenna3D } from '../antenna/Antenna3D'
import { useAntennaStore } from '@/stores/antenna/antennaStore'
import type { AntennaPreset } from '@/types/antenna/presets'

type DesignMode = 'preset' | 'manual'

export function DesignTab() {
  const [designMode, setDesignMode] = useState<DesignMode>('preset')
  
  // Get antenna design state from store
  const {
    frequency,
    elements,
    selectedPresetId,
    setFrequency,
    setElements,
    setSelectedPresetId,
    resetDesign
  } = useAntennaStore()

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
        { type: 'director', position: 150, length: 460, diameter: 10 }
      ])
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Design Input */}
      <div className="space-y-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Antenna Design</h2>
            
            {/* Design Mode Tabs */}
            <Tabs 
              selectedKey={designMode}
              onSelectionChange={(key) => setDesignMode(key as DesignMode)}
              fullWidth
              size="sm"
              classNames={{
                tabList: "mb-4"
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
            ) : (
              <ParameterForm
                frequency={frequency}
                elements={elements}
                onFrequencyChange={setFrequency}
                onElementsChange={setElements}
              />
            )}
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white dark:bg-gray-800">
          <CardBody className="flex flex-row gap-3">
            <Button
              color="primary"
              variant="flat"
              size="sm"
              startContent={<BeakerIcon className="w-4 h-4" />}
              isDisabled={elements.length === 0}
            >
              Simulate
            </Button>
            
            <Button
              color="default"
              variant="flat"
              size="sm"
              onPress={resetDesign}
            >
              Reset
            </Button>
            
            <div className="flex-1" />
            
            <Button
              color="success"
              variant="flat"
              size="sm"
              isDisabled={elements.length === 0}
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
    </div>
  )
} 