import * as React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IconDownload, IconRefresh, IconLoader2, IconCheck, IconX, IconPlayerPlay, IconPlayerPause, IconZoomIn } from "@tabler/icons-react"
import type { Mode } from "./types"
import type { QualityMode } from "@/services/sonification"
import type { ProcessedFile } from "./types"
import { ImageUploader } from "./ImageUploader"
import { QualitySelector } from "./QualitySelector"
import { ImageMagnifierDialog } from "./ImageMagnifierDialog"

interface BulkUploadViewProps {
  mode: Mode
  files: File[]
  processedFiles: ProcessedFile[]
  isProcessing: boolean
  currentIndex: number
  quality?: QualityMode
  onQualityChange?: (quality: QualityMode) => void
  onFileChange: (files: File[]) => void
  onProcess: () => void
  onDownloadAll: () => void
  onRemoveFile: (index: number) => void
  onReset: () => void
}

export function BulkUploadView({
  mode,
  files,
  processedFiles,
  isProcessing,
  currentIndex,
  quality,
  onQualityChange,
  onFileChange,
  onProcess,
  onDownloadAll,
  onRemoveFile,
  onReset,
}: BulkUploadViewProps) {
  const [playingIndex, setPlayingIndex] = React.useState<number | null>(null)
  const audioRefs = React.useRef<Record<number, HTMLAudioElement | null>>({})
  const [magnifiedImage, setMagnifiedImage] = React.useState<{ url: string; name: string } | null>(null)

  if (files.length === 0) {
    return <ImageUploader mode={mode} onFileChange={onFileChange} multiple />
  }

  const handlePlayPause = (index: number) => {
    const audio = audioRefs.current[index]
    if (!audio) return

    if (playingIndex === index) {
      audio.pause()
      setPlayingIndex(null)
    } else {
      // Pause any currently playing audio
      if (playingIndex !== null && audioRefs.current[playingIndex]) {
        audioRefs.current[playingIndex]?.pause()
      }
      audio.play()
      setPlayingIndex(index)
    }
  }

  const handleAudioEnded = () => {
    setPlayingIndex(null)
  }

  const handleImageClick = (url: string, name: string) => {
    setMagnifiedImage({ url, name })
  }

  const completedCount = processedFiles.filter(f => f.status === "completed").length
  const errorCount = processedFiles.filter(f => f.status === "error").length

  const isImageToWav = mode === "image-to-wav"
  const isFileToImage = mode === "file-to-image"
  const isImageToFile = mode === "image-to-file"
  
  const getFileExtension = () => {
    if (isImageToWav) return "wav"
    if (isFileToImage) return "png"
    if (isImageToFile) return "bin" // Will be replaced with actual extension
    return "png"
  }
  
  const fileExtension = getFileExtension()

  return (
    <div className="space-y-4">
      {quality !== undefined && onQualityChange && (
        <QualitySelector
          quality={quality}
          onQualityChange={onQualityChange}
          disabled={isProcessing}
        />
      )}

      {isProcessing && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <IconLoader2 className="h-5 w-5 text-primary animate-spin" />
            <div>
              <p className="font-medium text-primary">Processing...</p>
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} of {files.length} files
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-2 max-h-96 overflow-y-auto">
        {processedFiles.map((pf, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
          >
            {pf.previewUrl && (
              <div 
                className="relative group shrink-0 cursor-pointer"
                onClick={() => handleImageClick(pf.previewUrl!, pf.file.name)}
              >
                <img
                  src={pf.previewUrl}
                  alt={pf.file.name}
                  className="h-10 w-10 rounded object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded pointer-events-none">
                  <IconZoomIn className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
            {pf.status === "completed" && pf.resultUrl && (mode === "wav-to-image" || mode === "file-to-image") && (
              <div 
                className="relative group shrink-0 cursor-pointer"
                onClick={() => handleImageClick(pf.resultUrl, pf.file.name)}
              >
                <img
                  src={pf.resultUrl}
                  alt={pf.file.name}
                  className="h-10 w-10 rounded object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded pointer-events-none">
                  <IconZoomIn className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pf.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(pf.file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              {pf.status === "completed" && pf.resultInfo.size && (
                <p className="text-xs text-primary">→ {pf.resultInfo.size}</p>
              )}
              {pf.status === "completed" && pf.resultInfo.dimensions && (
                <p className="text-xs text-primary">{pf.resultInfo.dimensions}</p>
              )}
              {pf.status === "error" && (
                <p className="text-xs text-destructive">{pf.error}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pf.status === "processing" && isProcessing && index === currentIndex && (
                <IconLoader2 className="h-4 w-4 text-primary animate-spin" />
              )}
              {pf.status === "completed" && (
                <>
                  <IconCheck className="h-4 w-4 text-green-500" />
                  {pf.resultUrl && (
                    <>
                      {isImageToWav && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePlayPause(index)}
                              >
                                {playingIndex === index ? (
                                  <IconPlayerPause className="h-4 w-4" />
                                ) : (
                                  <IconPlayerPlay className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{playingIndex === index ? "Pause" : "Play"}</p></TooltipContent>
                          </Tooltip>
                          <audio
                            ref={(el) => {
                              audioRefs.current[index] = el
                            }}
                            src={pf.resultUrl}
                            onEnded={handleAudioEnded}
                            className="hidden"
                          />
                        </>
                      )}
                      {!isImageToWav && pf.audioUrl && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePlayPause(index)}
                              >
                                {playingIndex === index ? (
                                  <IconPlayerPause className="h-4 w-4" />
                                ) : (
                                  <IconPlayerPlay className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{playingIndex === index ? "Pause" : "Play"}</p></TooltipContent>
                          </Tooltip>
                          <audio
                            ref={(el) => {
                              audioRefs.current[index] = el
                            }}
                            src={pf.audioUrl}
                            onEnded={handleAudioEnded}
                            className="hidden"
                          />
                        </>
                      )}
                    </>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const link = document.createElement("a")
                          link.href = pf.resultUrl
                          
                          let filename: string
                          if (isImageToWav) {
                            filename = `${pf.file.name.split(".")[0]}.wav`
                          } else if (isFileToImage || mode === "wav-to-image") {
                            filename = `${pf.file.name.split(".")[0]}.png`
                          } else if (isImageToFile) {
                            // Use original filename from decoded metadata
                            filename = (pf as any).originalFileName || pf.file.name.replace(/\.(png|jpg|jpeg)$/i, '_decoded')
                          } else {
                            filename = `${pf.file.name.split(".")[0]}.${fileExtension}`
                          }
                          
                          link.download = filename
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                      >
                        <IconDownload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download</p></TooltipContent>
                  </Tooltip>
                </>
              )}
              {pf.status === "error" && (
                <IconX className="h-4 w-4 text-destructive" />
              )}
              {!isProcessing && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveFile(index)}
                    >
                      <IconX className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Remove</p></TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>

      {magnifiedImage && (
        <ImageMagnifierDialog
          open={!!magnifiedImage}
          onOpenChange={(open) => !open && setMagnifiedImage(null)}
          imageUrl={magnifiedImage.url}
          fileName={magnifiedImage.name}
        />
      )}

      <div className="flex gap-2">
        {!isProcessing && completedCount === 0 && (
          <Button className="flex-1" size="lg" onClick={onProcess}>
            Convert All ({files.length} files)
          </Button>
        )}
        {completedCount > 0 && !isProcessing && (
          <>
            <Button className="flex-1" size="lg" onClick={onDownloadAll}>
              <IconDownload className="h-4 w-4" />
              Download All ({completedCount})
            </Button>
            <Button variant="outline" size="lg" onClick={onReset}>
              <IconRefresh className="h-4 w-4" />
            </Button>
          </>
        )}
        {isProcessing && (
          <Button className="flex-1" size="lg" disabled>
            <IconLoader2 className="h-4 w-4 animate-spin" />
            Processing...
          </Button>
        )}
      </div>

      {completedCount > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{files.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="font-medium text-green-500">{completedCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="font-medium text-destructive">{errorCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
