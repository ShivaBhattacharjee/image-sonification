import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioWaveform } from "@/components/ui/waveform";
import {
  IconPhoto,
  IconMusic,
  IconDownload,
  IconRefresh,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconInfoCircle,
  IconBrandGithub,
  IconPlayerPlay,
  IconPlayerPause,
  IconShare,
  IconBrandX,
} from "@tabler/icons-react";
import { useTheme } from "@/components/theme-provider";
import {
  imageToAudio,
  audioToImage,
  formatBytes,
  formatDuration,
  type QualityMode,
} from "@/services/sonification";

type Mode = "image-to-wav" | "wav-to-image";

interface ModeState {
  uploadedFile: File | null
  resultUrl: string | null
  resultBlob: Blob | null
  previewUrl: string | null
  audioUrl: string | null
  isProcessing: boolean
  error: string | null
  resultInfo: {
    size?: string
    duration?: string
    dimensions?: string
    compressionRatio?: string
  } | null
}

export function ImageSonification() {
  const [mode, setMode] = React.useState<Mode>("image-to-wav");
  const [quality, setQuality] = React.useState<QualityMode>("compressed");
  
  // Separate state for each mode
  const [imageToWavState, setImageToWavState] = React.useState<ModeState>({
    uploadedFile: null,
    resultUrl: null,
    resultBlob: null,
    previewUrl: null,
    audioUrl: null,
    isProcessing: false,
    error: null,
    resultInfo: null,
  })
  
  const [wavToImageState, setWavToImageState] = React.useState<ModeState>({
    uploadedFile: null,
    resultUrl: null,
    resultBlob: null,
    previewUrl: null,
    audioUrl: null,
    isProcessing: false,
    error: null,
    resultInfo: null,
  })
  
  // Current state based on mode
  const currentState = mode === "image-to-wav" ? imageToWavState : wavToImageState
  const setCurrentState = mode === "image-to-wav" ? setImageToWavState : setWavToImageState
  
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const currentIndex = themes.indexOf(theme as "light" | "dark" | "system");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <IconSun className="h-4 w-4" />;
      case "dark":
        return <IconMoon className="h-4 w-4" />;
      default:
        return <IconDeviceDesktop className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System";
    }
  };

  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      
      setCurrentState(prev => ({
        ...prev,
        uploadedFile: file,
        resultUrl: null,
        resultBlob: null,
        error: null,
        resultInfo: null,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        audioUrl: (file.type.startsWith("audio/") || file.name.endsWith(".wav")) ? URL.createObjectURL(file) : null,
      }))
    }
  };

  const handleProcess = async () => {
    if (!currentState.uploadedFile) return

    setCurrentState(prev => ({ ...prev, isProcessing: true, error: null, resultInfo: null, resultBlob: null }))

    try {
      if (mode === "image-to-wav") {
        const result = await imageToAudio(currentState.uploadedFile, { quality })
        setCurrentState(prev => ({
          ...prev,
          resultUrl: result.audioUrl,
          resultBlob: result.audioBlob,
          resultInfo: {
            size: formatBytes(result.audioBlob.size),
            duration: formatDuration(result.duration),
            compressionRatio: result.compressionRatio && result.compressionRatio > 1
              ? `${result.compressionRatio.toFixed(1)}x`
              : undefined,
          },
          isProcessing: false,
        }))
      } else {
        const result = await audioToImage(currentState.uploadedFile)
        setCurrentState(prev => ({
          ...prev,
          resultUrl: result.imageUrl,
          resultBlob: result.imageBlob,
          resultInfo: {
            dimensions: `${result.width} x ${result.height}`,
            size: formatBytes(result.imageBlob.size),
          },
          isProcessing: false,
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed"
      setCurrentState(prev => ({ ...prev, error: message, isProcessing: false }))
      console.error("Processing error:", err)
    }
  };

  const handleDownload = () => {
    if (!currentState.resultUrl) return;

    const link = document.createElement("a");
    link.href = currentState.resultUrl;
    link.download =
      mode === "image-to-wav"
        ? `${currentState.uploadedFile?.name.split(".")[0] || "sonified"}.wav`
        : `${currentState.uploadedFile?.name.split(".")[0] || "reconstructed"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!currentState.resultBlob || !currentState.uploadedFile) return

    const fileName = mode === "image-to-wav"
      ? `${currentState.uploadedFile.name.split(".")[0] || "sonified"}.wav`
      : `${currentState.uploadedFile.name.split(".")[0] || "reconstructed"}.png`

    const fileToShare = new File(
      [currentState.resultBlob],
      fileName,
      { type: currentState.resultBlob.type }
    )

    if (navigator.share && navigator.canShare({ files: [fileToShare] })) {
      try {
        await navigator.share({
          title: "Image Sonification",
          text: mode === "image-to-wav"
            ? "Check out this image converted to sound!"
            : "Check out this image reconstructed from sound!",
          files: [fileToShare],
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err)
        }
      }
    } else {
      alert("Sharing is not supported on this device. Please use the download button.")
    }
  }

  const handleShareToTwitter = () => {
    const text = mode === "image-to-wav"
      ? "Just converted an image to sound using Image Sonification! 🎵🖼️"
      : "Just reconstructed an image from sound using Image Sonification! 🖼️🎵"
    const url = "https://sonification.shiva.codes"
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(tweetUrl, "_blank", "noopener,noreferrer")
  };

  const handleReset = () => {
    setCurrentState({
      uploadedFile: null,
      resultUrl: null,
      resultBlob: null,
      previewUrl: null,
      audioUrl: null,
      isProcessing: false,
      error: null,
      resultInfo: null,
    })
    setIsPlaying(false)
  };

  const handleModeChange = (value: string) => {
    setMode(value as Mode);
    setIsPlaying(false);
    // Don't reset - preserve state for each mode
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Image Sonification
            </h1>
            <p className="mt-2 text-muted-foreground font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
              Convert images to sound and back again
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  className="shrink-0"
                >
                  <a
                    href="https://github.com/Shivabhattacharjee/image-sonification"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconBrandGithub className="h-4 w-4" />
                    <span className="sr-only">GitHub Repository</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View on GitHub</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={cycleTheme}
                  className="shrink-0"
                >
                  {getThemeIcon()}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Theme: {getThemeLabel()}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>



        {/* Tabs */}
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="image-to-wav" className="flex-1 gap-2 cursor-pointer">
              <IconPhoto className="h-4 w-4" />
              <span className="hidden sm:inline">Image to Sound</span>
              <span className="sm:hidden">Img to Audio</span>
            </TabsTrigger>
            <TabsTrigger value="wav-to-image" className="flex-1 gap-2">
              <IconMusic className="h-4 w-4" />
              <span className="hidden sm:inline">Sound to Image</span>
              <span className="sm:hidden">Audio to Img</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image-to-wav" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>Convert Image to Sound</CardTitle>
                    <CardDescription>
                      Upload an image to convert it into a WAV audio file
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
                        This process encodes your image data into audio
                        frequencies, creating a unique sound signature.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentState.error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{currentState.error}</p>
                  </div>
                )}
                {!currentState.uploadedFile ? (
                  <ImageUploader mode="image-to-wav" onFileChange={handleFileChange} />
                ) : (
                  <UploadedFileView
                    file={currentState.uploadedFile}
                    previewUrl={currentState.previewUrl}
                    mode="image-to-wav"
                    isProcessing={currentState.isProcessing}
                    resultUrl={currentState.resultUrl}
                    resultBlob={currentState.resultBlob}
                    resultInfo={currentState.resultInfo}
                    quality={quality}
                    onQualityChange={setQuality}
                    onReset={handleReset}
                    onProcess={handleProcess}
                    onDownload={handleDownload}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wav-to-image" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>Convert Sound to Image</CardTitle>
                    <CardDescription>
                      Upload a WAV file to reconstruct the original image
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
                        The audio file contains encoded image data that can be
                        decoded back to the original image.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentState.error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{currentState.error}</p>
                  </div>
                )}
                {!currentState.uploadedFile ? (
                  <ImageUploader mode="wav-to-image" onFileChange={handleFileChange} />
                ) : (
                  <div className="space-y-4">
                    {/* Audio Player for WAV input */}
                    {currentState.audioUrl && (
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <IconMusic className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {currentState.uploadedFile.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {(currentState.uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={togglePlayPause}
                                  className="shrink-0"
                                >
                                  {isPlaying ? (
                                    <IconPlayerPause className="h-4 w-4" />
                                  ) : (
                                    <IconPlayerPlay className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isPlaying ? "Pause" : "Play"} audio</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleReset}
                                  className="shrink-0"
                                >
                                  <IconRefresh className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Upload a different file</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Waveform Visualization */}
                        <div className="rounded-lg bg-background/50 p-2">
                          <AudioWaveform
                            audioRef={audioRef}
                            playing={isPlaying}
                            height={48}
                            barWidth={3}
                            barGap={2}
                            barRadius={1}
                            barColor="#e11d48"
                          />
                        </div>

                        <audio
                          ref={audioRef}
                          src={currentState.audioUrl}
                          onEnded={() => setIsPlaying(false)}
                          className="hidden"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}

                    {/* Process Button */}
                    {!currentState.resultUrl && (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleProcess}
                        disabled={currentState.isProcessing}
                      >
                        {currentState.isProcessing ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Processing...
                          </>
                        ) : (
                          "Convert to Image"
                        )}
                      </Button>
                    )}

                    {/* Result */}
                    {currentState.resultUrl && (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                              <IconPhoto className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-primary">
                                Conversion Complete
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Your image file is ready
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4">
                          <p className="mb-2 text-sm font-medium">Preview</p>
                          <img
                            src={currentState.resultUrl}
                            alt="Reconstructed"
                            className="mx-auto max-h-64 rounded-lg object-contain"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            size="lg"
                            onClick={handleDownload}
                          >
                            <IconDownload className="h-4 w-4" />
                            Download
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="lg" onClick={handleShare}>
                                <IconShare className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Share image</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="lg" onClick={handleShareToTwitter}>
                                <IconBrandX className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Share on X (Twitter)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconPhoto className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Image to Sound</p>
                  <p className="text-sm text-muted-foreground">
                    Upload PNG, JPG, or WEBP images to convert them into unique
                    audio signatures
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconMusic className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Sound to Image</p>
                  <p className="text-sm text-muted-foreground">
                    Upload a previously generated WAV file to reconstruct the
                    original image
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Frequently Asked Questions
          </h2>
          <Card>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    What is image sonification?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Image sonification is the process of converting visual
                      data from an image into audio. Each pixel's color and
                      position is mapped to specific audio frequencies and
                      characteristics, creating a unique sound representation of
                      the image.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    What image formats are supported?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      We support common image formats including PNG, JPG/JPEG,
                      and WEBP. For best results, use images with clear contrast
                      and reasonable file sizes (under 10MB recommended).
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    Can I reconstruct any audio file to an image?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      No, only WAV files that were generated by this tool can be
                      reconstructed back to images. The audio file contains
                      specially encoded data that maps back to the original
                      image pixels.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    Is my data stored on your servers?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      No, all processing happens locally in your browser. Your
                      images and audio files are never uploaded to any server.
                      This ensures complete privacy for your data.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    Why does my reconstructed image look different?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      The reconstruction process aims to be lossless, but some
                      minor variations may occur depending on the encoding
                      parameters used. For best results, use the same tool
                      version for both encoding and decoding.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>© Shiva Bhattacharjee {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
}

function ImageUploader({
  mode,
  onFileChange,
}: {
  mode: Mode;
  onFileChange: (files: File[]) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50">
      <FileUpload onChange={onFileChange} />
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">
          Accepted:{" "}
          {mode === "image-to-wav" ? "PNG, JPG, WEBP" : "WAV audio files"}
        </p>
      </div>
    </div>
  );
}

function UploadedFileView({
  file,
  previewUrl,
  mode,
  isProcessing,
  resultUrl,
  resultBlob,
  resultInfo,
  quality,
  onQualityChange,
  onReset,
  onProcess,
  onDownload,
}: {
  file: File
  previewUrl: string | null
  mode: Mode
  isProcessing: boolean
  resultUrl: string | null
  resultBlob: Blob | null
  resultInfo: { size?: string; duration?: string; dimensions?: string; compressionRatio?: string } | null
  quality?: QualityMode
  onQualityChange?: (quality: QualityMode) => void
  onReset: () => void
  onProcess: () => void
  onDownload: () => void
}) {
  const resultAudioRef = React.useRef<HTMLAudioElement>(null);
  const [isResultPlaying, setIsResultPlaying] = React.useState(false);

  const toggleResultPlayPause = () => {
    if (resultAudioRef.current) {
      if (isResultPlaying) {
        resultAudioRef.current.pause();
      } else {
        resultAudioRef.current.play();
      }
      setIsResultPlaying(!isResultPlaying);
    }
  };

  const handleShare = async () => {
    if (!resultBlob) return

    const fileName = mode === "image-to-wav"
      ? `${file.name.split(".")[0] || "sonified"}.wav`
      : `${file.name.split(".")[0] || "reconstructed"}.png`

    const fileToShare = new File(
      [resultBlob],
      fileName,
      { type: resultBlob.type }
    )

    if (navigator.share && navigator.canShare({ files: [fileToShare] })) {
      try {
        await navigator.share({
          title: "Image Sonification",
          text: mode === "image-to-wav"
            ? "Check out this image converted to sound!"
            : "Check out this image reconstructed from sound!",
          files: [fileToShare],
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err)
        }
      }
    } else {
      // Fallback: copy link or show message
      alert("Sharing is not supported on this device. Please use the download button.")
    }
  }

  const handleShareToTwitter = () => {
    const text = mode === "image-to-wav"
      ? "Just converted an image to sound using Image Sonification! 🎵🖼️"
      : "Just reconstructed an image from sound using Image Sonification! 🖼️🎵"
    const url = "https://sonification.shiva.codes"
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(tweetUrl, "_blank", "noopener,noreferrer")
  };
  return (
    <div className="space-y-4">
      {/* File Preview */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {mode === "image-to-wav" ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <IconPhoto className="h-6 w-6 text-primary" />
                )}
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <IconMusic className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="shrink-0"
              >
                <IconRefresh className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload a different file</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Quality Selector (only for image-to-wav) */}
      {mode === "image-to-wav" && !resultUrl && quality && onQualityChange && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium">Output Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onQualityChange("compressed")}
              className={`rounded-lg border p-3 text-left transition-all ${
                quality === "compressed"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium text-sm">Compact</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                JPEG, ~100KB-1MB
              </p>
            </button>
            <button
              type="button"
              onClick={() => onQualityChange("full")}
              className={`rounded-lg border p-3 text-left transition-all ${
                quality === "full"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium text-sm">Lossless</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PNG quality, larger
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Process Button */}
      {!resultUrl && (
        <Button
          className="w-full"
          size="lg"
          onClick={onProcess}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : mode === "image-to-wav" ? (
            "Convert to Sound"
          ) : (
            "Convert to Image"
          )}
        </Button>
      )}

      {/* Result */}
      {resultUrl && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                {mode === "image-to-wav" ? (
                  <IconMusic className="h-5 w-5 text-primary" />
                ) : (
                  <IconPhoto className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-primary">Conversion Complete</p>
                <p className="text-sm text-muted-foreground">
                  Your {mode === "image-to-wav" ? "audio" : "image"} file is ready
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

          {/* Audio Preview with Waveform for WAV output */}
          {mode === "image-to-wav" && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Preview</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleResultPlayPause}
                      className="shrink-0"
                    >
                      {isResultPlaying ? (
                        <IconPlayerPause className="h-4 w-4" />
                      ) : (
                        <IconPlayerPlay className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isResultPlaying ? "Pause" : "Play"} audio</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <AudioWaveform
                  audioRef={resultAudioRef}
                  playing={isResultPlaying}
                  height={48}
                  barWidth={3}
                  barGap={2}
                  barRadius={1}
                  barColor="#e11d48"
                />
              </div>
              <audio
                ref={resultAudioRef}
                src={resultUrl}
                onEnded={() => setIsResultPlaying(false)}
                className="hidden"
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* Image Preview for Image output */}
          {mode === "wav-to-image" && (
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">Preview</p>
              <img
                src={resultUrl}
                alt="Reconstructed"
                className="mx-auto max-h-64 rounded-lg object-contain"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" size="lg" onClick={onDownload}>
              <IconDownload className="h-4 w-4" />
              Download
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <IconShare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share {mode === "image-to-wav" ? "audio" : "image"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="lg" onClick={handleShareToTwitter}>
                  <IconBrandX className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share on X (Twitter)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageSonification;
