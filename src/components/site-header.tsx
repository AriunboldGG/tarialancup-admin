"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { logout } from "@/lib/auth"
import { IconDownload } from "@tabler/icons-react"

export function SiteHeader({
  currentSport,
  onExport
}: {
  currentSport?: string
  onExport?: () => void
}) {
  const router = useRouter()

  const getSportDisplayName = (sport: string) => {
    switch (sport) {
      case "Сагсан бөмбөг":
        return "Сагсан бөмбөг"
      case "Дартс":
        return "Дартс"
      case "Ширээний теннис":
        return "Ширээний теннис"
      default:
        return "Баг бүртгэлийн хүсэлтүүд"
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 size-7 sm:size-8" />
        <Separator
          orientation="vertical"
          className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-sm sm:text-base font-medium truncate">
          {currentSport ? getSportDisplayName(currentSport) : "Баг бүртгэлийн хүсэлтүүд"}
        </h1>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {onExport && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs sm:text-sm"
              onClick={onExport}
            >
              <IconDownload className="size-4 mr-1" />
              <span className="hidden sm:inline">Download</span>
              <span className="sm:hidden">DL</span>
            </Button>
          )}
          <ThemeToggle />
          <Button
            size="sm"
            variant="outline"
            className="text-xs sm:text-sm"
            onClick={() => {
              logout()
              toast.success("Logged out")
              router.replace("/")
            }}
          >
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
