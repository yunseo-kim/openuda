/**
 * Antenna Parameter Input Form Component
 */

import { useState } from 'react'
import { Button, Card, CardBody, Input, Select, SelectItem, ScrollShadow } from '@heroui/react'
import { PlusIcon, TrashIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import type { PresetElement } from '@/types/antenna/presets'

interface ParameterFormProps {
  frequency: number
  elements: PresetElement[]
  onFrequencyChange: (frequency: number) => void
  onElementsChange: (elements: PresetElement[]) => void
}

const elementTypes = [
  { value: 'reflector', label: 'Reflector', color: '#ff6b6b' },
  { value: 'driven', label: 'Driven Element', color: '#4ecdc4' },
  { value: 'director', label: 'Director', color: '#45b7d1' },
] as const

export function ParameterForm({
  frequency,
  elements,
  onFrequencyChange,
  onElementsChange,
}: ParameterFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validate frequency
  const validateFrequency = (value: number) => {
    if (value < 1 || value > 30000) {
      setErrors(prev => ({ ...prev, frequency: 'Frequency must be between 1 and 30,000 MHz' }))
      return false
    }
    setErrors(prev => ({ ...prev, frequency: '' }))
    return true
  }

  // Handle frequency change
  const handleFrequencyChange = (value: string) => {
    const freq = parseFloat(value)
    if (!isNaN(freq)) {
      if (validateFrequency(freq)) {
        onFrequencyChange(freq)
      }
    }
  }

  // Add new element
  const addElement = () => {
    const newElement: PresetElement = {
      type: 'director',
      position: elements.length > 0 ? Math.max(...elements.map(e => e.position)) + 100 : 0,
      length: 100,
      diameter: 6,
    }
    onElementsChange([...elements, newElement])
  }

  // Remove element
  const removeElement = (index: number) => {
    onElementsChange(elements.filter((_, i) => i !== index))
  }

  // Duplicate element
  const duplicateElement = (index: number) => {
    const element = elements[index]
    const newElement: PresetElement = {
      ...element,
      position: element.position + 50,
    }
    const newElements = [...elements]
    newElements.splice(index + 1, 0, newElement)
    onElementsChange(newElements)
  }

  // Update element
  const updateElement = (index: number, field: keyof PresetElement, value: string | number) => {
    const newElements = [...elements]
    newElements[index] = {
      ...newElements[index],
      [field]: field === 'type' ? value : parseFloat(value as string) || 0,
    }
    onElementsChange(newElements)
  }

  // Sort elements by position
  const sortedElements = [...elements].sort((a, b) => a.position - b.position)

  // Calculate wavelength
  const wavelength = (299792458 / (frequency * 1e6)) * 1000 // in mm

  return (
    <div className="space-y-4">
      {/* Frequency input */}
      <Card className="bg-gray-50 dark:bg-gray-700">
        <CardBody className="space-y-4">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Operating Frequency
          </h3>

          <Input
            type="number"
            label="Frequency"
            placeholder="Enter frequency"
            value={frequency.toString()}
            onValueChange={handleFrequencyChange}
            endContent={<span className="text-gray-500 dark:text-gray-400">MHz</span>}
            errorMessage={errors.frequency}
            isInvalid={!!errors.frequency}
            description={`Wavelength: ${(wavelength / 1000).toFixed(3)} m`}
            classNames={{
              inputWrapper: 'bg-white dark:bg-gray-800',
            }}
          />
        </CardBody>
      </Card>

      {/* Elements */}
      <Card className="bg-gray-50 dark:bg-gray-700">
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Antenna Elements
            </h3>
            <Button
              size="sm"
              color="primary"
              startContent={<PlusIcon className="w-4 h-4" />}
              onPress={addElement}
            >
              Add Element
            </Button>
          </div>

          {elements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No elements added yet.</p>
              <p className="text-sm mt-1">Click "Add Element" to start designing.</p>
            </div>
          ) : (
            <ScrollShadow className="max-h-[400px]">
              <div className="space-y-4">
                {sortedElements.map((element, index) => {
                  const originalIndex = elements.findIndex(e => e === element)

                  return (
                    <Card key={originalIndex} className="bg-white dark:bg-gray-800">
                      <CardBody className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: elementTypes.find(t => t.value === element.type)
                                  ?.color,
                              }}
                            />
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              Element {index + 1}
                            </span>
                          </div>

                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              onPress={() => duplicateElement(originalIndex)}
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              color="danger"
                              variant="flat"
                              onPress={() => removeElement(originalIndex)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            size="sm"
                            label="Type"
                            selectedKeys={[element.type]}
                            onSelectionChange={keys => {
                              const value = Array.from(keys)[0] as string
                              updateElement(originalIndex, 'type', value)
                            }}
                            classNames={{
                              trigger: 'bg-gray-50 dark:bg-gray-700',
                            }}
                          >
                            {elementTypes.map(type => (
                              <SelectItem key={type.value}>{type.label}</SelectItem>
                            ))}
                          </Select>

                          <Input
                            size="sm"
                            type="number"
                            label="Position"
                            value={element.position.toString()}
                            onValueChange={value => updateElement(originalIndex, 'position', value)}
                            endContent={
                              <span className="text-xs text-gray-500 dark:text-gray-400">mm</span>
                            }
                            classNames={{
                              inputWrapper: 'bg-gray-50 dark:bg-gray-700',
                            }}
                          />

                          <Input
                            size="sm"
                            type="number"
                            label="Length"
                            value={element.length.toString()}
                            onValueChange={value => updateElement(originalIndex, 'length', value)}
                            endContent={
                              <span className="text-xs text-gray-500 dark:text-gray-400">mm</span>
                            }
                            classNames={{
                              inputWrapper: 'bg-gray-50 dark:bg-gray-700',
                            }}
                          />

                          <Input
                            size="sm"
                            type="number"
                            label="Diameter"
                            value={element.diameter.toString()}
                            onValueChange={value => updateElement(originalIndex, 'diameter', value)}
                            endContent={
                              <span className="text-xs text-gray-500 dark:text-gray-400">mm</span>
                            }
                            classNames={{
                              inputWrapper: 'bg-gray-50 dark:bg-gray-700',
                            }}
                          />
                        </div>

                        {/* Wavelength ratios */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                          Length: {(element.length / wavelength).toFixed(3)}λ • Position:{' '}
                          {(element.position / wavelength).toFixed(3)}λ
                        </div>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </ScrollShadow>
          )}
        </CardBody>
      </Card>

      {/* Quick actions */}
      {elements.length > 0 && (
        <Card className="bg-gray-50 dark:bg-gray-700">
          <CardBody className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Quick Actions
            </h3>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  // Sort elements by position
                  const sorted = [...elements].sort((a, b) => a.position - b.position)
                  onElementsChange(sorted)
                }}
              >
                Sort by Position
              </Button>

              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  // Clear all elements
                  if (window.confirm('Remove all elements?')) {
                    onElementsChange([])
                  }
                }}
                color="danger"
              >
                Clear All
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
