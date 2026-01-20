import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconPhoto, IconMusic, IconFile, IconFileCode } from "@tabler/icons-react"
import { useTheme } from "@/components/theme-provider"
import type { QualityMode } from "@/services/sonification"
import type { Mode, BulkState } from "./types"
import { Header } from "./Header"
import { ImageToAudioTab } from "./ImageToAudioTab"
import { AudioToImageTab } from "./AudioToImageTab"
import { FileToImageTab } from "./FileToImageTab"
import { ImageToFileTab } from "./ImageToFileTab"
import { InfoSection } from "./InfoSection"
import { FAQSection } from "./FAQSection"
import { useImageSonificationHandlers } from "./useImageSonificationHandlers"

export function ImageSonification() {
  const [mode, setMode] = React.useState<Mode>("image-to-wav")
  const [quality, setQuality] = React.useState<QualityMode>("compressed")
  
  const [imageToWavBulkState, setImageToWavBulkState] = React.useState<BulkState>({
    files: [],
    processedFiles: [],
    isProcessing: false,
    currentIndex: 0,
  })
  
  const [wavToImageBulkState, setWavToImageBulkState] = React.useState<BulkState>({
    files: [],
    processedFiles: [],
    isProcessing: false,
    currentIndex: 0,
  })
  
  const [fileToImageBulkState, setFileToImageBulkState] = React.useState<BulkState>({
    files: [],
    processedFiles: [],
    isProcessing: false,
    currentIndex: 0,
  })
  
  const [imageToFileBulkState, setImageToFileBulkState] = React.useState<BulkState>({
    files: [],
    processedFiles: [],
    isProcessing: false,
    currentIndex: 0,
  })
  
  const getCurrentBulkState = () => {
    switch (mode) {
      case "image-to-wav": return imageToWavBulkState
      case "wav-to-image": return wavToImageBulkState
      case "file-to-image": return fileToImageBulkState
      case "image-to-file": return imageToFileBulkState
    }
  }
  
  const getCurrentSetBulkState = () => {
    switch (mode) {
      case "image-to-wav": return setImageToWavBulkState
      case "wav-to-image": return setWavToImageBulkState
      case "file-to-image": return setFileToImageBulkState
      case "image-to-file": return setImageToFileBulkState
    }
  }
  
  const currentBulkState = getCurrentBulkState()
  const setCurrentBulkState = getCurrentSetBulkState()
  
  const { theme, setTheme } = useTheme()

  const handlers = useImageSonificationHandlers({
    mode,
    quality,
    bulkState: currentBulkState,
    setBulkState: setCurrentBulkState,
  })

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"]
    const currentIndex = themes.indexOf(theme as "light" | "dark" | "system")
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light"
      case "dark":
        return "Dark"
      default:
        return "System"
    }
  }

  const handleModeChange = (value: string) => {
    setMode(value as Mode)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <Header 
          theme={theme}
          onThemeChange={cycleTheme}
          getThemeLabel={getThemeLabel}
        />

        <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
            <TabsTrigger 
              value="image-to-wav" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-1 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <IconPhoto className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden md:inline ml-1 sm:ml-0">Image → Audio</span>
              <span className="hidden sm:inline md:hidden ml-1">Img→Audio</span>
              <span className="sm:hidden text-[10px] ml-0.5">I→A</span>
            </TabsTrigger>
            <TabsTrigger 
              value="wav-to-image" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-1 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <IconMusic className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden md:inline ml-1 sm:ml-0">Audio → Image</span>
              <span className="hidden sm:inline md:hidden ml-1">Audio→Img</span>
              <span className="sm:hidden text-[10px] ml-0.5">A→I</span>
            </TabsTrigger>
            <TabsTrigger 
              value="file-to-image" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-1 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <IconFile className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden md:inline ml-1 sm:ml-0">File → Image</span>
              <span className="hidden sm:inline md:hidden ml-1">File→Img</span>
              <span className="sm:hidden text-[10px] ml-0.5">F→I</span>
            </TabsTrigger>
            <TabsTrigger 
              value="image-to-file" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-1 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <IconFileCode className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden md:inline ml-1 sm:ml-0">Image → File</span>
              <span className="hidden sm:inline md:hidden ml-1">Img→File</span>
              <span className="sm:hidden text-[10px] ml-0.5">I→F</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image-to-wav" className="mt-6">
            <ImageToAudioTab
              bulkState={currentBulkState}
              quality={quality}
              onQualityChange={setQuality}
              onFileChange={handlers.handleFileChange}
              onBulkProcess={handlers.handleBulkProcess}
              onBulkDownloadAll={handlers.handleBulkDownloadAll}
              onRemoveBulkFile={handlers.handleRemoveBulkFile}
              onReset={handlers.handleReset}
            />
          </TabsContent>

          <TabsContent value="wav-to-image" className="mt-6">
            <AudioToImageTab
              bulkState={currentBulkState}
              onFileChange={handlers.handleFileChange}
              onBulkProcess={handlers.handleBulkProcess}
              onBulkDownloadAll={handlers.handleBulkDownloadAll}
              onRemoveBulkFile={handlers.handleRemoveBulkFile}
              onReset={handlers.handleReset}
            />
          </TabsContent>

          <TabsContent value="file-to-image" className="mt-6">
            <FileToImageTab
              bulkState={currentBulkState}
              onFileChange={handlers.handleFileChange}
              onBulkProcess={handlers.handleBulkProcess}
              onBulkDownloadAll={handlers.handleBulkDownloadAll}
              onRemoveBulkFile={handlers.handleRemoveBulkFile}
              onReset={handlers.handleReset}
            />
          </TabsContent>

          <TabsContent value="image-to-file" className="mt-6">
            <ImageToFileTab
              bulkState={currentBulkState}
              onFileChange={handlers.handleFileChange}
              onBulkProcess={handlers.handleBulkProcess}
              onBulkDownloadAll={handlers.handleBulkDownloadAll}
              onRemoveBulkFile={handlers.handleRemoveBulkFile}
              onReset={handlers.handleReset}
            />
          </TabsContent>
        </Tabs>

        <InfoSection />
        <FAQSection />

        <footer className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>© Shiva Bhattacharjee {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  )
}

export default ImageSonification
