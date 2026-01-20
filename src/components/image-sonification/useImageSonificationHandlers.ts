import * as React from "react"
import { imageToAudio, audioToImage, formatBytes, formatDuration, type QualityMode } from "@/services/sonification"
import { fileToImage, imageToFile } from "@/services/file-image-conversion"
import type { Mode, BulkState } from "./types"

interface UseImageSonificationHandlersProps {
  mode: Mode
  quality: QualityMode
  bulkState: BulkState
  setBulkState: React.Dispatch<React.SetStateAction<BulkState>>
}

export function useImageSonificationHandlers({
  mode,
  quality,
  bulkState,
  setBulkState,
}: UseImageSonificationHandlersProps) {
  const handleFileChange = (files: File[]) => {
    if (files.length === 0) return
    
    setBulkState({
      files,
      processedFiles: files.map(file => ({
        file,
        resultUrl: "",
        resultBlob: new Blob(),
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        audioUrl: (file.type.startsWith("audio/") || file.name.endsWith(".wav")) ? URL.createObjectURL(file) : undefined,
        resultInfo: {},
        status: "processing" as const,
      })),
      isProcessing: false,
      currentIndex: 0,
    })
  }

  const handleBulkProcess = async () => {
    if (bulkState.files.length === 0) return

    setBulkState(prev => ({ ...prev, isProcessing: true }))

    for (let i = 0; i < bulkState.files.length; i++) {
      const file = bulkState.files[i]
      
      setBulkState(prev => ({ ...prev, currentIndex: i }))

      try {
        if (mode === "image-to-wav") {
          const result = await imageToAudio(file, { quality })
          
          setBulkState(prev => ({
            ...prev,
            processedFiles: prev.processedFiles.map((pf, idx) =>
              idx === i
                ? {
                    ...pf,
                    resultUrl: result.audioUrl,
                    resultBlob: result.audioBlob,
                    resultInfo: {
                      size: formatBytes(result.audioBlob.size),
                      duration: formatDuration(result.duration),
                      compressionRatio: result.compressionRatio && result.compressionRatio > 1
                        ? `${result.compressionRatio.toFixed(1)}x`
                        : undefined,
                    },
                    status: "completed",
                  }
                : pf
            ),
          }))
        } else if (mode === "wav-to-image") {
          const result = await audioToImage(file)
          
          setBulkState(prev => ({
            ...prev,
            processedFiles: prev.processedFiles.map((pf, idx) =>
              idx === i
                ? {
                    ...pf,
                    resultUrl: result.imageUrl,
                    resultBlob: result.imageBlob,
                    resultInfo: {
                      dimensions: `${result.width} x ${result.height}`,
                      size: formatBytes(result.imageBlob.size),
                    },
                    status: "completed",
                  }
                : pf
            ),
          }))
        } else if (mode === "file-to-image") {
          const result = await fileToImage(file)
          
          setBulkState(prev => ({
            ...prev,
            processedFiles: prev.processedFiles.map((pf, idx) =>
              idx === i
                ? {
                    ...pf,
                    resultUrl: result.imageUrl,
                    resultBlob: result.imageBlob,
                    resultInfo: {
                      dimensions: `${result.width} x ${result.height}`,
                      size: formatBytes(result.imageBlob.size),
                    },
                    status: "completed",
                  }
                : pf
            ),
          }))
        } else if (mode === "image-to-file") {
          const result = await imageToFile(file)
          
          setBulkState(prev => ({
            ...prev,
            processedFiles: prev.processedFiles.map((pf, idx) =>
              idx === i
                ? {
                    ...pf,
                    resultUrl: result.fileUrl,
                    resultBlob: result.fileBlob,
                    resultInfo: {
                      size: formatBytes(result.fileSize),
                    },
                    status: "completed",
                    // Store the original filename for download
                    originalFileName: result.fileName,
                  }
                : pf
            ),
          }))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Processing failed"
        console.error(`Error processing file ${i}:`, err)
        
        setBulkState(prev => ({
          ...prev,
          processedFiles: prev.processedFiles.map((pf, idx) =>
            idx === i
              ? { ...pf, status: "error", error: message }
              : pf
          ),
        }))
      }
    }

    setBulkState(prev => ({ ...prev, isProcessing: false }))
  }

  const handleBulkDownloadAll = () => {
    bulkState.processedFiles.forEach((pf, index) => {
      if (pf.status === "completed" && pf.resultUrl) {
        setTimeout(() => {
          const link = document.createElement("a")
          link.href = pf.resultUrl
          
          let filename: string
          if (mode === "image-to-wav") {
            filename = `${pf.file.name.split(".")[0]}.wav`
          } else if (mode === "wav-to-image" || mode === "file-to-image") {
            filename = `${pf.file.name.split(".")[0]}.png`
          } else if (mode === "image-to-file") {
            // Use the original filename from the decoded metadata
            filename = pf.originalFileName || pf.file.name.replace(/\.(png|jpg|jpeg)$/i, '_decoded')
          } else {
            filename = pf.file.name
          }
          
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, index * 100)
      }
    })
  }

  const handleRemoveBulkFile = (index: number) => {
    setBulkState(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
      processedFiles: prev.processedFiles.filter((_, i) => i !== index),
    }))
  }

  const handleReset = () => {
    setBulkState({
      files: [],
      processedFiles: [],
      isProcessing: false,
      currentIndex: 0,
    })
  }

  return {
    handleFileChange,
    handleBulkProcess,
    handleBulkDownloadAll,
    handleRemoveBulkFile,
    handleReset,
  }
}
