// File export modal component for antenna design files

import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
  Textarea,
  Switch,
  type Selection,
} from '@heroui/react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { AntennaParams } from '@/utils/nec2c'
import { SupportedFileFormat, FileExportOptions, FILE_FORMATS } from '@/types/antenna/fileFormats'
import { exportAntennaFile, downloadFile } from '@/utils/antenna/fileFormats'

interface FileExportModalProps {
  isOpen: boolean
  onClose: () => void
  antennaParams: AntennaParams
  defaultFilename?: string
}

export function FileExportModal({
  isOpen,
  onClose,
  antennaParams,
  defaultFilename = 'antenna_design',
}: FileExportModalProps) {
  const [format, setFormat] = useState<SupportedFileFormat>('json')
  const [filename, setFilename] = useState(defaultFilename)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [includeSimulation, setIncludeSimulation] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const options: FileExportOptions = {
        format,
        filename: filename || defaultFilename,
        metadata: {
          name: name || undefined,
          description: description || undefined,
          author: author || undefined,
        },
        includeSimulationResults: includeSimulation,
      }

      const result = exportAntennaFile(antennaParams, options)
      downloadFile(result.content, result.filename, result.mimeType)

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      // TODO: Show error notification
    } finally {
      setIsExporting(false)
    }
  }

  const formatDescription = FILE_FORMATS[format]?.description || ''
  const fileExtension = FILE_FORMATS[format]?.extension || ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader className="flex gap-2 items-center">
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export Antenna Design
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* File Format Selection */}
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <Select
              label="File Format"
              description={formatDescription}
              selectedKeys={[format]}
              onSelectionChange={(keys: Selection) => {
                const selectedFormat = Array.from(keys as Set<string>)[0] as SupportedFileFormat
                setFormat(selectedFormat)
              }}
              classNames={{
                trigger: 'bg-gray-50 dark:bg-gray-700',
              }}
            >
              <SelectItem key="yc6">{FILE_FORMATS.yc6.name} (.yc6)</SelectItem>
              <SelectItem key="nec">{FILE_FORMATS.nec.name} (.nec)</SelectItem>
              <SelectItem key="json">{FILE_FORMATS.json.name} (.json)</SelectItem>
            </Select>
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Input
              label="Filename"
              value={filename}
              onValueChange={setFilename}
              endContent={<span className="text-sm text-gray-500">{fileExtension}</span>}
              classNames={{
                inputWrapper: 'bg-gray-50 dark:bg-gray-700',
              }}
            />
          </div>

          {/* Metadata (for JSON format) */}
          {format === 'json' && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Metadata (Optional)
              </h4>

              <Input
                label="Design Name"
                value={name}
                onValueChange={setName}
                placeholder="Enter a name for this antenna design"
                classNames={{
                  inputWrapper: 'bg-white dark:bg-gray-700',
                }}
              />

              <Input
                label="Author"
                value={author}
                onValueChange={setAuthor}
                placeholder="Your name"
                classNames={{
                  inputWrapper: 'bg-white dark:bg-gray-700',
                }}
              />

              <Textarea
                label="Description"
                value={description}
                onValueChange={setDescription}
                placeholder="Describe this antenna design..."
                maxRows={3}
                classNames={{
                  inputWrapper: 'bg-white dark:bg-gray-700',
                }}
              />

              <Switch isSelected={includeSimulation} onValueChange={setIncludeSimulation} size="sm">
                <span className="text-sm">Include simulation results</span>
              </Switch>
            </div>
          )}

          {/* Format-specific notes */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {format === 'yc6' && (
              <p>
                <strong>YagiCAD format:</strong> Compatible with YagiCAD software. Includes
                frequency and element positions/dimensions.
              </p>
            )}
            {format === 'nec' && (
              <p>
                <strong>NEC format:</strong> Standard Numerical Electromagnetics Code input file.
                Can be used with NEC simulation tools.
              </p>
            )}
            {format === 'json' && (
              <p>
                <strong>OpenUda JSON:</strong> Native format with full design data and metadata.
                Recommended for sharing and backup.
              </p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="default" variant="flat" onPress={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleExport}
            isLoading={isExporting}
            startContent={!isExporting && <ArrowDownTrayIcon className="w-4 h-4" />}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default FileExportModal
