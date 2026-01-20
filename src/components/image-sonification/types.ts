export type Mode = "image-to-wav" | "wav-to-image" | "file-to-image" | "image-to-file"

export interface ProcessedFile {
  file: File
  resultUrl: string
  resultBlob: Blob
  previewUrl?: string
  audioUrl?: string
  resultInfo: {
    size?: string
    duration?: string
    dimensions?: string
    compressionRatio?: string
  }
  status: "processing" | "completed" | "error"
  error?: string
  originalFileName?: string // For image-to-file conversion
}

export interface BulkState {
  files: File[]
  processedFiles: ProcessedFile[]
  isProcessing: boolean
  currentIndex: number
}
