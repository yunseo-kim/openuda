// Drag and drop file upload component for antenna design files

import React, { useState, useCallback } from 'react'
import {
  Card,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { FileParseResult, FILE_FORMATS } from '@/types/antenna/fileFormats'
import { parseAntennaFile, createDroppedFileInfo } from '@/utils/antenna/fileFormats'
import { AntennaParams } from '@/utils/nec2c'

interface FileUploadDropzoneProps {
  onFileLoaded: (antennaParams: AntennaParams, metadata?: Record<string, unknown>) => void
  className?: string
  disabled?: boolean
}

export function FileUploadDropzone({
  onFileLoaded,
  className = '',
  disabled = false,
}: FileUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null)

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (files.length === 0 || disabled) return

      const file = files[0]
      const fileInfo = createDroppedFileInfo(file)

      // Check file format
      if (fileInfo.format === 'unknown') {
        setParseResult({
          success: false,
          error: `Unsupported file format. Please select a valid antenna design file: ${Object.values(
            FILE_FORMATS
          )
            .map(f => f.extension)
            .join(', ')}`,
        })
        setShowErrorModal(true)
        return
      }

      // Check file size (10MB limit)
      if (fileInfo.size > 10 * 1024 * 1024) {
        setParseResult({
          success: false,
          error: 'File too large. Please select a file smaller than 10MB.',
        })
        setShowErrorModal(true)
        return
      }

      setIsProcessing(true)

      try {
        const result = await parseAntennaFile(file)
        setParseResult(result)

        if (result.success && result.data) {
          onFileLoaded(result.data, result.metadata)

          // Show warnings if any
          if (result.warnings && result.warnings.length > 0) {
            setShowErrorModal(true)
          }
        } else {
          setShowErrorModal(true)
        }
      } catch (error) {
        setParseResult({
          success: false,
          error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
        setShowErrorModal(true)
      } finally {
        setIsProcessing(false)
      }
    },
    [onFileLoaded, disabled]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragOver(true)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)

      if (disabled) return

      const files = e.dataTransfer.files
      handleFileSelect(files)
    },
    [handleFileSelect, disabled]
  )

  const openFileDialog = useCallback(() => {
    if (disabled) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = Object.values(FILE_FORMATS)
      .map(f => f.extension)
      .join(',')
    input.onchange = e => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        handleFileSelect(target.files)
      }
    }
    input.click()
  }, [handleFileSelect, disabled])

  return (
    <>
      <Card
        className={`
          relative border-2 border-dashed transition-all duration-200 cursor-pointer
          ${
            isDragOver && !disabled
              ? 'border-primary bg-primary/5 scale-105'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        isPressable={!disabled}
        onPress={openFileDialog}
      >
        <CardBody className="py-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <>
                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-gray-600 dark:text-gray-400">Processing file...</div>
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {isDragOver ? 'Drop file here' : 'Import Antenna Design'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop a file here, or click to browse
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    {Object.values(FILE_FORMATS).map(format => (
                      <span
                        key={format.extension}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                      >
                        {format.extension}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Error/Warning Modal */}
      <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} size="md">
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            {parseResult?.success ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            ) : (
              <DocumentIcon className="w-5 h-5 text-red-500" />
            )}
            {parseResult?.success ? 'Import Warning' : 'Import Error'}
          </ModalHeader>
          <ModalBody>
            {parseResult?.success ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  File loaded successfully, but there were some warnings:
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                    {parseResult.warnings?.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Failed to import the antenna design file:
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {parseResult?.error || 'Unknown error occurred'}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Supported formats:</p>
                  <ul className="mt-1 space-y-1">
                    {Object.entries(FILE_FORMATS).map(([key, format]) => (
                      <li key={key}>
                        <strong>{format.extension}</strong> - {format.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setShowErrorModal(false)}>
              {parseResult?.success ? 'Continue' : 'OK'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default FileUploadDropzone
