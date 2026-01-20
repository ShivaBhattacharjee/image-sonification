import { FileUpload } from "@/components/ui/file-upload"
import type { Mode } from "./types"

interface ImageUploaderProps {
  mode: Mode
  onFileChange: (files: File[]) => void
  multiple?: boolean
}

export function ImageUploader({ mode, onFileChange, multiple = false }: ImageUploaderProps) {
  const getAcceptedFiles = () => {
    switch (mode) {
      case "image-to-wav":
        return "PNG, JPG, WEBP"
      case "wav-to-image":
        return "WAV audio files"
      case "file-to-image":
        return "Any file type"
      case "image-to-file":
        return "PNG images (encoded)"
      default:
        return "All files"
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50">
      <FileUpload onChange={onFileChange} multiple={multiple} />
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          {multiple 
            ? `Select multiple files (${getAcceptedFiles()})`
            : `Accepted: ${getAcceptedFiles()}`
          }
        </p>
      </div>
    </div>
  )
}
