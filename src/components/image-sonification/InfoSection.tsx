import { Card, CardContent } from "@/components/ui/card"
import { IconPhoto, IconMusic, IconFile, IconFileCode } from "@tabler/icons-react"

export function InfoSection() {
  return (
    <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto">
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconPhoto className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg mb-2">Image to Sound</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Convert images into unique audio signatures using advanced sonification techniques
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconMusic className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg mb-2">Sound to Image</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reconstruct original images from previously generated audio files
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconFile className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg mb-2">File to Image</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Encode any file type into a PNG image for visual data storage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconFileCode className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg mb-2">Image to File</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Decode PNG images back to their original file format
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
