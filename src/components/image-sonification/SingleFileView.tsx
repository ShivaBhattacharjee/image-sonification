import { Button } from "@/components/ui/button"
import { IconDownload, IconPhoto, IconMusic, IconFile } from "@tabler/icons-react"
import type { QualityMode } from "@/services/sonification"
import type { Mode, ProcessedFile } from "./types"
import { FilePreview } from "./FilePreview"
import { QualitySelector } from "./QualitySelector"
import { AudioPreview } from "./AudioPreview"
import { ShareButtons } from "./ShareButtons"

interface SingleFileViewProps {
  processedFile: ProcessedFile
  mode: Mode
  quality?: QualityMode
  onQualityChange?: (quality: QualityMode) => void
  onReset: () => void
}

export function SingleFileView({
  processedFile,
  mode,
  quality,
  onQualityChange,
  onReset,
}: SingleFileViewProps) {
  const { file, previewUrl, resultUrl, resultBlob, resultInfo } = processedFile
  
  const getFileName = () => {
    if (mode === "image-to-wav") {
      return `${file.name.split(".")[0] || "sonified"}.wav`
    } else if (mode === "file-to-image") {
      return `${file.name.split(".")[0] || "encoded"}.png`
    } else if (mode === "image-to-file") {
      // Use the original filename from the decoded metadata
      return processedFile.originalFileName || file.name.replace(/\.(png|jpg|jpeg)$/i, '_decoded')
    }
    return `${file.name.split(".")[0] || "reconstructed"}.png`
  }
  
  const fileName = getFileName()

  const handleDownload = () => {
    if (!resultUrl) return
    const link = document.createElement("a")
    link.href = resultUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <FilePreview 
        file={file}
        previewUrl={previewUrl || null}
        mode={mode}
        onReset={onReset}
      />

      {mode === "image-to-wav" && !resultUrl && quality && onQualityChange && (
        <QualitySelector
          quality={quality}
          onQualityChange={onQualityChange}
        />
      )}

      {resultUrl && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                {mode === "image-to-wav" ? (
                  <IconMusic className="h-5 w-5 text-primary" />
                ) : mode === "file-to-image" || mode === "wav-to-image" ? (
                  <IconPhoto className="h-5 w-5 text-primary" />
                ) : (
                  <IconFile className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-primary">Conversion Complete</p>
                <p className="text-sm text-muted-foreground">
                  Your {mode === "image-to-wav" ? "audio" : mode === "image-to-file" ? "file" : "image"} is ready
                </p>
                {resultInfo && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {resultInfo.size && <span>Size: {resultInfo.size}</span>}
                    {resultInfo.duration && <span>Duration: {resultInfo.duration}</span>}
                    {resultInfo.dimensions && <span>Dimensions: {resultInfo.dimensions}</span>}
                    {resultInfo.compressionRatio && <span>Compression: {resultInfo.compressionRatio}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {mode === "image-to-wav" && <AudioPreview audioUrl={resultUrl} />}

          {(mode === "wav-to-image" || mode === "file-to-image") && (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Preview</p>
              <img
                src={resultUrl}
                alt="Result"
                className="mx-auto max-h-64 rounded-lg object-contain"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" size="lg" onClick={handleDownload}>
              <IconDownload className="h-4 w-4" />
              Download
            </Button>
            <ShareButtons 
              resultBlob={resultBlob}
              fileName={fileName}
              mode={mode}
            />
          </div>
        </div>
      )}
    </div>
  )
}
