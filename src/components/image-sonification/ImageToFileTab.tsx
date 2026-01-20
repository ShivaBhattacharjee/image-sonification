import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IconInfoCircle } from "@tabler/icons-react"
import type { BulkState } from "./types"
import { BulkUploadView } from "./BulkUploadView"

interface ImageToFileTabProps {
  bulkState: BulkState
  onFileChange: (files: File[]) => void
  onBulkProcess: () => void
  onBulkDownloadAll: () => void
  onRemoveBulkFile: (index: number) => void
  onReset: () => void
}

export function ImageToFileTab({
  bulkState,
  onFileChange,
  onBulkProcess,
  onBulkDownloadAll,
  onRemoveBulkFile,
  onReset,
}: ImageToFileTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle>Convert Image to File</CardTitle>
            <CardDescription>
              Upload one or multiple encoded PNG images to decode them back to original files
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <IconInfoCircle className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">More info</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Upload PNG images that were created using the File→Img converter. The original files will be reconstructed.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <BulkUploadView
          mode="image-to-file"
          files={bulkState.files}
          processedFiles={bulkState.processedFiles}
          isProcessing={bulkState.isProcessing}
          currentIndex={bulkState.currentIndex}
          onFileChange={onFileChange}
          onProcess={onBulkProcess}
          onDownloadAll={onBulkDownloadAll}
          onRemoveFile={onRemoveBulkFile}
          onReset={onReset}
        />
      </CardContent>
    </Card>
  )
}
