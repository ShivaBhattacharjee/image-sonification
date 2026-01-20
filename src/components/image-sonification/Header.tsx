import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IconBrandGithub, IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react"

interface HeaderProps {
  theme: string
  onThemeChange: () => void
  getThemeLabel: () => string
}

export function Header({ theme, onThemeChange, getThemeLabel }: HeaderProps) {
  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <IconSun className="h-4 w-4" />
      case "dark":
        return <IconMoon className="h-4 w-4" />
      default:
        return <IconDeviceDesktop className="h-4 w-4" />
    }
  }

  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          Image Sonification
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
          Convert images to sound, files to images, and back again
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
              onClick={onThemeChange}
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
  )
}
