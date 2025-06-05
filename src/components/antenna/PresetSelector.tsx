/**
 * Antenna Preset Selector Component
 */

import { Card, CardBody, CardHeader, Chip, Input, ScrollShadow } from '@nextui-org/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useState, useMemo } from 'react'
import { antennaPresets } from '@/utils/antenna/presets'
import type { AntennaPreset } from '@/types/antenna/presets'

interface PresetSelectorProps {
  selectedPresetId?: string
  onPresetSelect: (preset: AntennaPreset) => void
}

const categoryColors = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
  experimental: 'secondary'
} as const

const categoryLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  experimental: 'Experimental'
} as const

export function PresetSelector({ selectedPresetId, onPresetSelect }: PresetSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AntennaPreset['category'] | 'all'>('all')

  // Filter presets based on search and category
  const filteredPresets = useMemo(() => {
    return antennaPresets.filter(preset => {
      const matchesSearch = searchQuery === '' || 
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="space-y-3">
        <Input
          type="search"
          placeholder="Search presets..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
          classNames={{
            input: "text-sm",
            inputWrapper: "h-10 bg-gray-50 dark:bg-gray-700"
          }}
        />
        
        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          <Chip
            variant={selectedCategory === 'all' ? 'solid' : 'bordered'}
            color="default"
            size="sm"
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Chip>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Chip
              key={key}
              variant={selectedCategory === key ? 'solid' : 'bordered'}
              color={categoryColors[key as AntennaPreset['category']]}
              size="sm"
              className="cursor-pointer"
              onClick={() => setSelectedCategory(key as AntennaPreset['category'])}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Presets list */}
      <ScrollShadow className="h-[400px]">
        <div className="space-y-3 pr-2">
          {filteredPresets.map(preset => (
            <Card
              key={preset.id}
              isPressable
              isHoverable
              className={`cursor-pointer transition-all bg-gray-50 dark:bg-gray-700 ${
                selectedPresetId === preset.id 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : ''
              }`}
              onPress={() => onPresetSelect(preset)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between w-full">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{preset.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {preset.frequency} MHz • {preset.elements.length} elements
                    </p>
                  </div>
                  <Chip 
                    size="sm" 
                    color={categoryColors[preset.category]}
                    variant="flat"
                  >
                    {categoryLabels[preset.category]}
                  </Chip>
                </div>
              </CardHeader>
              
              <CardBody className="pt-0">
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                  {preset.description}
                </p>
                
                {/* Element breakdown */}
                <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {preset.elements.filter(e => e.type === 'reflector').length} Refl
                  </span>
                  <span>
                    {preset.elements.filter(e => e.type === 'driven').length} Driven
                  </span>
                  <span>
                    {preset.elements.filter(e => e.type === 'director').length} Dir
                  </span>
                </div>
                
                {/* Tags */}
                {preset.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {preset.tags.map(tag => (
                      <Chip key={tag} size="sm" variant="flat" className="text-xs">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
          
          {filteredPresets.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No presets found matching your criteria.</p>
              <p className="text-sm mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  )
} 