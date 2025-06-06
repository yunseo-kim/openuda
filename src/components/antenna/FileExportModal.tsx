// File export modal component for antenna design files

import { useState, useCallback } from 'react'
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
  Chip,
  type Selection,
  type SelectedItemProps,
} from '@heroui/react'
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
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
  const [exportSuccess, setExportSuccess] = useState<boolean | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    if (isExporting) return

    setIsExporting(true)
    setExportSuccess(null)
    setExportError(null)

    try {
      // Validate inputs
      const finalFilename = (filename || defaultFilename).trim()
      if (!finalFilename) {
        throw new Error('Please enter a valid filename')
      }

      const options: FileExportOptions = {
        format,
        filename: finalFilename,
        metadata: {
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          author: author.trim() || undefined,
        },
        includeSimulationResults: includeSimulation,
      }

      console.log('Exporting with options:', options)
      const result = exportAntennaFile(antennaParams, options)
      console.log('Export result:', {
        filename: result.filename,
        contentLength: result.content.length,
        mimeType: result.mimeType,
      })

      downloadFile(result.content, result.filename, result.mimeType)
      setExportSuccess(true)

      // Close modal after a brief success indication
      setTimeout(() => {
        onClose()
        setExportSuccess(null)
      }, 1500)
    } catch (error) {
      console.error('Export failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setExportError(errorMessage)
      setExportSuccess(false)
    } finally {
      setIsExporting(false)
    }
  }, [
    isExporting,
    filename,
    defaultFilename,
    format,
    name,
    description,
    author,
    includeSimulation,
    antennaParams,
    onClose,
  ])

  const handleClose = useCallback(() => {
    if (!isExporting) {
      setExportSuccess(null)
      setExportError(null)
      onClose()
    }
  }, [isExporting, onClose])

  const fileExtension = FILE_FORMATS[format]?.extension || ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      placement="center"
      backdrop="opaque"
      scrollBehavior="inside"
      closeButton
      isDismissable={!isExporting}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex gap-2 items-center">
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export Antenna Design
            </ModalHeader>
            <ModalBody className="space-y-4 py-6">
              {/* Export Status */}
              {exportSuccess === true && (
                <Chip
                  color="success"
                  variant="flat"
                  startContent={<CheckCircleIcon className="w-4 h-4" />}
                  className="w-full justify-start"
                >
                  File exported successfully!
                </Chip>
              )}

              {exportSuccess === false && exportError && (
                <Chip
                  color="danger"
                  variant="flat"
                  startContent={<ExclamationTriangleIcon className="w-4 h-4" />}
                  className="w-full justify-start"
                >
                  Export failed: {exportError}
                </Chip>
              )}

              {/* File Format Selection */}
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <Select
                  label="File Format"
                  placeholder="Select a file format..."
                  selectedKeys={[format]}
                  onSelectionChange={(keys: Selection) => {
                    const selectedFormat = Array.from(keys as Set<string>)[0] as SupportedFileFormat
                    setFormat(selectedFormat)
                  }}
                  renderValue={(items: SelectedItemProps<object>[]) => {
                    if (items.length === 0) return 'Select a file format...'
                    const selectedFormat = items[0].key as SupportedFileFormat
                    const formatInfo = FILE_FORMATS[selectedFormat]
                    return `${formatInfo.name} (${formatInfo.extension}) - ${formatInfo.description}`
                  }}
                  classNames={{
                    trigger: 'bg-gray-50 dark:bg-gray-700',
                    value: 'text-foreground',
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

                  <Switch
                    isSelected={includeSimulation}
                    onValueChange={setIncludeSimulation}
                    size="sm"
                  >
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
                    <strong>NEC format:</strong> Standard Numerical Electromagnetics Code input
                    file. Can be used with NEC simulation tools.
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
            <ModalFooter className="flex gap-2 justify-end">
              <Button
                color="default"
                variant="flat"
                onPress={handleClose}
                disabled={isExporting}
                size="md"
              >
                {exportSuccess === true ? 'Close' : 'Cancel'}
              </Button>

              {/* Conditionally render different buttons to force re-render */}
              {exportSuccess === true ? (
                <Button
                  key="exported-button"
                  color="success"
                  variant="flat"
                  onPress={handleExport}
                  disabled={true}
                  startContent={<CheckCircleIcon className="w-4 h-4" />}
                  size="md"
                  className="!bg-green-100 !text-green-700 !border-green-300 cursor-default"
                >
                  Exported
                </Button>
              ) : (
                <Button
                  key="export-button"
                  color="primary"
                  variant="solid"
                  onPress={handleExport}
                  isLoading={isExporting}
                  disabled={isExporting || !antennaParams.elements?.length}
                  startContent={
                    !isExporting ? <ArrowDownTrayIcon className="w-4 h-4" /> : undefined
                  }
                  size="md"
                  className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600 font-medium"
                >
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

export default FileExportModal
